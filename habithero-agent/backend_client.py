import logging
import asyncio
import re
from typing import Optional, Dict, Any
import aiohttp
from config import BACKEND_URL, AGENT_SERVICE_SECRET, get_health_url

logger = logging.getLogger("HabitHeroBackendClient")


def _sanitize_error_preview(text: str, max_len: int = 150) -> str:
    """
    Sanitize and truncate error response body for concise logging.
    Ensures HTML error pages, SVG markup, and template footers are never dumped to logs.
    """
    if not text or not text.strip():
        return "<empty response>"

    lowered = text[:500].lower()
    is_html = "<html" in lowered or "<!doctype" in lowered or "<body" in lowered or "<head" in lowered

    if is_html:
        stripped = re.sub(r"<[^>]+>", " ", text)
        collapsed = " ".join(stripped.split())
        if collapsed:
            preview = collapsed[:max_len].strip()
            return f"[HTML page: {preview}...]"
        return "[HTML error page]"

    collapsed = " ".join(text.split())
    if len(collapsed) > max_len:
        return f"{collapsed[:max_len]}..."
    return collapsed


class BackendClient:
    """
    Client for forwarding messages between the Fetch.ai uAgent and the HabitHero Node.js backend.
    Preserves sender identity isolation and secures service-to-service communication.
    Includes proactive health checks and robust failure handling.
    """

    def __init__(
        self,
        backend_url: str = BACKEND_URL,
        service_secret: str = AGENT_SERVICE_SECRET,
        health_url: Optional[str] = None,
        health_timeout_sec: float = 6.0,
        chat_timeout_sec: float = 24.0,
    ):
        self.backend_url = backend_url
        self.service_secret = service_secret
        self.health_url = health_url or get_health_url(self.backend_url)
        self.health_timeout_sec = health_timeout_sec
        self.chat_timeout_sec = chat_timeout_sec
        self._sender_conversations: Dict[str, str] = {}

    def get_conversation_id(self, sender: str) -> Optional[str]:
        """Retrieve cached conversation ID for a given sender address."""
        return self._sender_conversations.get(sender)

    def set_conversation_id(self, sender: str, conversation_id: str) -> None:
        """Cache conversation ID for a given sender address."""
        if conversation_id and isinstance(conversation_id, str):
            self._sender_conversations[sender] = conversation_id

    def clear_conversation(self, sender: str) -> None:
        """Clear cached conversation ID for a given sender address."""
        self._sender_conversations.pop(sender, None)

    async def check_health(self, timeout_sec: Optional[float] = None) -> Dict[str, Any]:
        """
        Check whether the HabitHero backend API is running and reachable.
        Queries GET /api/health with a short timeout.
        """
        effective_timeout = timeout_sec if timeout_sec is not None else self.health_timeout_sec
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.health_url,
                    timeout=aiohttp.ClientTimeout(total=effective_timeout)
                ) as resp:
                    content_type = resp.headers.get("Content-Type", "").lower()

                    if resp.status == 200:
                        if "application/json" in content_type:
                            try:
                                data = await resp.json()
                            except Exception as json_err:
                                logger.warning(f"Backend health check returned invalid JSON: {json_err}")
                                data = {}
                            return {
                                "available": True,
                                "status": resp.status,
                                "data": data,
                            }
                        else:
                            raw_body = await resp.text()
                            preview = _sanitize_error_preview(raw_body)
                            logger.warning(
                                f"Backend health check at {self.health_url} returned status 200 with non-JSON Content-Type '{content_type}': {preview}"
                            )
                            return {
                                "available": False,
                                "status": resp.status,
                                "error": f"Expected application/json but received {content_type}",
                            }
                    elif resp.status in (502, 503, 504):
                        # Service is up but degraded (503) or warming up on Render free tier (502/504)
                        raw_body = await resp.text()
                        preview = _sanitize_error_preview(raw_body)
                        data: Dict[str, Any] = {}
                        if "application/json" in content_type:
                            try:
                                data = await resp.json()
                            except Exception:
                                data = {}

                        logger.warning(
                            f"HabitHero backend at {self.health_url} returned {resp.status} (warming up / degraded): {preview}"
                        )
                        return {
                            "available": resp.status == 503,
                            "degraded": True,
                            "status": resp.status,
                            "data": data,
                            "error": f"HTTP {resp.status}: {preview}",
                        }
                    else:
                        error_body = await resp.text()
                        preview = _sanitize_error_preview(error_body)
                        logger.warning(
                            f"Backend health check at {self.health_url} returned status {resp.status} ({content_type}): {preview}"
                        )
                        return {
                            "available": False,
                            "status": resp.status,
                            "error": f"HTTP {resp.status}: {preview}",
                        }
        except aiohttp.ClientConnectorError as conn_err:
            logger.warning(
                f"HabitHero backend health check failed at {self.health_url}: Connection refused ({conn_err})"
            )
            return {
                "available": False,
                "error": f"Cannot connect to host: {conn_err}",
            }
        except asyncio.TimeoutError:
            logger.warning(
                f"HabitHero backend health check timed out after {effective_timeout}s at {self.health_url}"
            )
            return {
                "available": False,
                "error": f"Health check timed out after {effective_timeout}s",
            }
        except Exception as e:
            logger.warning(
                f"Unexpected error during backend health check at {self.health_url}: {e}"
            )
            return {
                "available": False,
                "error": str(e),
            }

    async def forward_to_backend(
        self,
        sender: str,
        message: str,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a chat message to the HabitHero backend and receive AI analysis & tool executions.
        Performs a backend health check first, then delivers the payload.
        """
        # 1. Proactive backend health check
        health = await self.check_health()
        if not health.get("available") and not health.get("degraded"):
            logger.warning(
                f"Skipping chat forward to {self.backend_url}: Backend is unreachable at {self.health_url} ({health.get('error')})"
            )
            return {
                "success": False,
                "backend_available": False,
                "reply": (
                    "I cannot reach the HabitHero accountability engine right now. "
                    "Please verify the backend service is running and try again in a moment."
                ),
                "error": f"Backend health check failed: {health.get('error')}",
            }

        # 2. Resolve conversation ID (passed directly or cached from previous turns)
        effective_conv_id = conversation_id or self._sender_conversations.get(sender)

        # 3. Forward payload to backend chat endpoint
        payload: Dict[str, Any] = {
            "sender": sender,
            "message": message,
        }
        if effective_conv_id and isinstance(effective_conv_id, str):
            # Only forward valid MongoDB ObjectId or 'new' command
            if len(effective_conv_id) == 24 or effective_conv_id == "new":
                payload["conversationId"] = effective_conv_id

        headers = {
            "Content-Type": "application/json",
            "x-agent-secret": self.service_secret,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.backend_url,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.chat_timeout_sec)
                ) as response:
                    content_type = response.headers.get("Content-Type", "").lower()

                    if response.status == 200:
                        if "application/json" not in content_type:
                            body_text = await response.text()
                            preview = _sanitize_error_preview(body_text)
                            logger.error(
                                f"Backend returned HTTP 200 with unexpected Content-Type '{content_type}': {preview}"
                            )
                            return {
                                "success": False,
                                "backend_available": True,
                                "reply": "I received an unexpected response format from my accountability engine. Please try again in a moment.",
                                "error": f"Invalid content type: {content_type}",
                            }

                        try:
                            data = await response.json()
                        except Exception as json_err:
                            logger.error(f"Failed to parse backend JSON response: {json_err}")
                            return {
                                "success": False,
                                "backend_available": True,
                                "reply": "I encountered an issue reading data from my accountability engine. Please try again.",
                                "error": f"JSON parse error: {json_err}",
                            }

                        backend_data = data.get("data", {}) if isinstance(data, dict) else {}
                        new_conv_id = backend_data.get("conversationId")
                        if new_conv_id and isinstance(new_conv_id, str):
                            self._sender_conversations[sender] = new_conv_id

                        logger.info(f"Successfully processed message for sender {sender}")
                        return {
                            "success": True,
                            "backend_available": True,
                            "reply": backend_data.get("reply", "Message processed."),
                            "conversationId": new_conv_id,
                            "toolsExecuted": backend_data.get("toolsExecuted", []),
                            "actionProposal": backend_data.get("actionProposal"),
                            "userId": backend_data.get("userId"),
                        }
                    else:
                        error_text = await response.text()
                        preview = _sanitize_error_preview(error_text)
                        logger.error(f"Backend returned HTTP {response.status} ({content_type}): {preview}")

                        if response.status == 401:
                            reply_msg = "HabitHero internal authorization failed. Please check the AGENT_SERVICE_SECRET configuration."
                        elif response.status in (502, 503, 504):
                            reply_msg = "The HabitHero accountability engine is warming up or temporarily unavailable. Please try again in a few moments."
                        elif response.status == 404:
                            reply_msg = "The HabitHero backend service endpoint could not be found. Please verify the backend URL configuration."
                            self._sender_conversations.pop(sender, None)
                        else:
                            reply_msg = "I encountered an issue processing your habits with my backend engine. Please try again."

                        return {
                            "success": False,
                            "backend_available": response.status not in (502, 503, 504),
                            "status": response.status,
                            "reply": reply_msg,
                            "error": f"HTTP {response.status}: {preview}",
                        }
        except aiohttp.ClientConnectorError as conn_err:
            logger.error(f"Cannot connect to HabitHero backend at {self.backend_url}: {conn_err}")
            return {
                "success": False,
                "backend_available": False,
                "reply": "I cannot reach the HabitHero backend right now. Please verify the backend service is running and try again in a moment.",
                "error": str(conn_err),
            }
        except asyncio.TimeoutError:
            logger.error(f"HabitHero backend request timed out after {self.chat_timeout_sec}s at {self.backend_url}")
            return {
                "success": False,
                "backend_available": True,
                "reply": "My accountability engine is taking longer than usual to respond. Your habit data is safe. Please try again in a moment.",
                "error": "Request timed out",
            }
        except Exception as e:
            logger.error(f"Unexpected error communicating with backend: {e}")
            return {
                "success": False,
                "reply": "An unexpected error occurred while processing your message.",
                "error": str(e),
            }

# Default singleton instance
backend_client = BackendClient()
