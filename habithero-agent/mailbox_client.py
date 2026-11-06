"""
Authenticated Mailbox Client for HabitHero uAgent.

Custom MailboxClient subclass that authenticates Agentverse mailbox requests using the
Agentverse API token (Bearer authentication via AGENT_MAILBOX_KEY).

Background & Problem Solved:
In uagents 0.26.1, MailboxClient hardcodes 'Authorization: Agent {self.attestation}'.
Agentverse's /v2/agents/<address>/mailbox endpoint rejects this header with HTTP 401
'Could not validate credentials', while requiring and accepting Bearer token authentication
via AGENT_MAILBOX_KEY.

Key Capabilities:
1. Bearer token authentication on GET (mailbox polling) and DELETE (envelope cleanup).
2. Clean fallback to agent attestation if no mailbox_key is configured.
3. Preserves official StoredEnvelope parsing, envelope signature verification,
   and dispatcher.dispatch_msg() routing into registered AgentChatProtocol handlers.
4. Bounded deduplication cache providing best-effort duplicate suppression for
   at-least-once delivery during transient network retries.
5. Rate-limited logging for HTTP 401 errors with strict credential sanitization (zero secrets in logs).
6. Exponential backoff on connection errors to avoid busy-wait loops during network dropouts.
"""

import asyncio
import logging
from collections import OrderedDict
from typing import Any
import aiohttp
from aiohttp.client_exceptions import ClientConnectorError
from pydantic import UUID4, ValidationError
from uagents.mailbox import MailboxClient, StoredEnvelope
from uagents_core.config import AgentverseConfig
from uagents_core.envelope import Envelope
from uagents_core.identity import Identity, is_user_address
from uagents.dispatch import dispatcher
from uagents.config import MAILBOX_POLL_INTERVAL_SECONDS
from uagents.utils import get_logger


class AuthenticatedMailboxClient(MailboxClient):
    """
    Subclass of uagents.mailbox.MailboxClient that authenticates mailbox polling
    and deletion requests using Bearer authentication (AGENT_MAILBOX_KEY).
    """

    def __init__(
        self,
        identity: Identity,
        agentverse: AgentverseConfig,
        logger: logging.Logger | None = None,
        mailbox_key: str | None = None,
        poll_interval: float = MAILBOX_POLL_INTERVAL_SECONDS,
        dedup_capacity: int = 1000,
        auth_error_cooldown_seconds: float = 60.0,
    ):
        super().__init__(identity, agentverse, logger)
        self._mailbox_key: str | None = mailbox_key.strip() if mailbox_key else None
        self._poll_interval: float = poll_interval
        self._dedup_capacity: int = dedup_capacity
        self._processed_envelopes: OrderedDict[str, float] = OrderedDict()
        self._last_auth_error_log_time: float = 0.0
        self._auth_error_cooldown_seconds: float = auth_error_cooldown_seconds

    def _get_auth_headers(self) -> dict[str, str]:
        """
        Construct authorization headers.
        Uses Bearer token authentication via AGENT_MAILBOX_KEY.
        Strictly prohibits silent attestation fallback which fails on Agentverse v2 API.
        """
        if not self._mailbox_key:
            raise ValueError(
                "AGENT_MAILBOX_KEY is required for AuthenticatedMailboxClient; "
                "attestation authentication fallback is disabled to prevent HTTP 401 errors."
            )
        return {
            "Authorization": f"Bearer {self._mailbox_key}",
            "Content-Type": "application/json",
        }

    async def run(self) -> None:
        """Runs the authenticated mailbox client."""
        if not self._mailbox_key:
            self._logger.error(
                "Cannot start AuthenticatedMailboxClient without AGENT_MAILBOX_KEY. Mailbox polling aborted."
            )
            return
        self._logger.info(
            f"Starting authenticated mailbox client for {self._agentverse.url} (auth mode: Bearer token)"
        )
        loop = asyncio.get_running_loop()
        loop.create_task(self._check_mailbox_loop())

    async def _check_mailbox_loop(self) -> None:
        """Retrieves envelopes from the mailbox server and processes them."""
        backoff = self._poll_interval
        max_backoff = 10.0

        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    agents_url = self._agentverse.agents_api
                    headers = self._get_auth_headers()
                    async with session.get(
                        f"{agents_url}/{self._identity.address}/mailbox",
                        headers=headers,
                    ) as resp:
                        if resp.status == 200:
                            backoff = self._poll_interval  # Reset backoff on success
                            items = await resp.json()
                            for item in items:
                                stored_env = StoredEnvelope.model_validate(item)
                                await self._handle_envelope(stored_env)
                        elif resp.status == 401:
                            now = asyncio.get_event_loop().time()
                            if (now - self._last_auth_error_log_time) >= self._auth_error_cooldown_seconds:
                                self._logger.error(
                                    "Mailbox authentication failed (HTTP 401). "
                                    "Please verify AGENT_MAILBOX_KEY configuration."
                                )
                                self._last_auth_error_log_time = now
                        elif resp.status == 404:
                            if not self._missing_mailbox_warning_logged:
                                self._logger.warning(
                                    "Agent mailbox not found: create one using the agent inspector"
                                )
                                self._missing_mailbox_warning_logged = True
                        else:
                            self._logger.error(
                                f"Failed to retrieve messages from mailbox: HTTP {resp.status}"
                            )
            except (ClientConnectorError, asyncio.TimeoutError) as ex:
                self._logger.warning(f"Failed to connect to mailbox server: {ex}")
                backoff = min(backoff * 1.5, max_backoff)
            except Exception as ex:
                self._logger.exception(f"Exception while checking mailbox: {ex}")
                backoff = min(backoff * 1.5, max_backoff)

            await asyncio.sleep(backoff)

    async def _handle_envelope(self, stored_env: StoredEnvelope) -> None:
        """
        Handles an envelope received from the mailbox server.
        Dispatches incoming message and deletes the envelope from the mailbox.
        Employs bounded deduplication as best-effort duplicate suppression.
        """
        uuid_str = str(stored_env.uuid)

        # Check bounded deduplication cache to suppress duplicate dispatches
        if uuid_str in self._processed_envelopes:
            self._logger.info(
                f"Duplicate envelope {uuid_str} received from mailbox; "
                f"skipping duplicate dispatch and re-attempting deletion."
            )
            await self._delete_envelope(stored_env.uuid)
            return

        try:
            env = Envelope.model_validate(stored_env.envelope)
        except ValidationError as val_err:
            self._logger.warning(f"Received invalid envelope {uuid_str}: {val_err}")
            await self._delete_envelope(stored_env.uuid)
            return

        if not is_user_address(env.sender):  # verify signature if sent from agent
            try:
                env.verify()
            except Exception as err:
                self._logger.warning(
                    f"Received envelope {uuid_str} that failed verification: {err}"
                )
                await self._delete_envelope(stored_env.uuid)
                return

        if not dispatcher.contains(env.target):
            self._logger.warning(
                f"Received envelope {uuid_str} for unrecognized target address: {env.target}"
            )
            return

        # Dispatch message to registered protocol handlers (e.g. ChatProtocol 0.3.0)
        try:
            await dispatcher.dispatch_msg(
                sender=env.sender,
                destination=env.target,
                schema_digest=env.schema_digest,
                message=env.decode_payload(),
                session=env.session,
            )
        except Exception as dispatch_err:
            self._logger.exception(f"Error dispatching envelope {uuid_str}: {dispatch_err}")
            return  # Leave envelope in mailbox for retry; do not delete or mark as processed

        # Record in bounded deduplication cache and delete envelope only after successful dispatch
        self._record_processed_envelope(uuid_str)
        await self._delete_envelope(stored_env.uuid)

    def _record_processed_envelope(self, uuid_str: str) -> None:
        """Record envelope in bounded LRU-style cache for duplicate suppression."""
        now = asyncio.get_event_loop().time()
        self._processed_envelopes[uuid_str] = now
        while len(self._processed_envelopes) > self._dedup_capacity:
            self._processed_envelopes.popitem(last=False)

    async def _delete_envelope(self, uuid: UUID4) -> None:
        """
        Deletes envelope from the mailbox server using Bearer authentication.
        """
        try:
            async with aiohttp.ClientSession() as session:
                agents_url = self._agentverse.agents_api
                headers = self._get_auth_headers()
                self._logger.debug(f"Deleting message envelope: {str(uuid)}")
                async with session.delete(
                    f"{agents_url}/{self._identity.address}/mailbox/{str(uuid)}",
                    headers=headers,
                ) as resp:
                    if resp.status >= 300:
                        self._logger.warning(
                            f"Failed to delete envelope {uuid} from mailbox: HTTP {resp.status}"
                        )
                    else:
                        self._logger.debug(f"Successfully deleted envelope {uuid} (HTTP {resp.status})")
        except ClientConnectorError as ex:
            self._logger.warning(f"Failed to connect to mailbox server during delete: {ex}")
        except Exception as ex:
            self._logger.exception(f"Exception while deleting envelope {uuid}: {ex}")

