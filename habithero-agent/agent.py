import uuid
import logging
import asyncio
from typing import Any
from datetime import datetime, timezone
from uagents import Agent, Context, Protocol, Model
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from config import (
    AGENT_NAME,
    AGENT_HANDLE,
    AGENT_SEED,
    AGENT_PORT,
    AGENT_MAILBOX_KEY,
)
from backend_client import backend_client
from mailbox_client import AuthenticatedMailboxClient

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger("HabitHeroAgent")

# Initialize Chat Protocol from official Fetch.ai specification (version 0.3.0)
chat_proto = Protocol(spec=chat_protocol_spec)


def _log_send_status(logger: Any, msg_type: str, msg_id: Any, sender: str, send_result: Any) -> bool:
    """Inspect and log the delivery status of a sent message."""
    if send_result is None:
        logger.info(f"Dispatched {msg_type} {msg_id} to {sender}")
        return True

    status_val = getattr(send_result, "status", None)
    detail = getattr(send_result, "detail", "")
    status_str = status_val.value if hasattr(status_val, "value") else str(status_val) if status_val else "sent"

    if status_str in ("delivered", "sent"):
        logger.info(f"Delivered {msg_type} {msg_id} to {sender} (status: {status_str})")
        return True
    elif status_str == "failed":
        logger.error(f"Failed to deliver {msg_type} {msg_id} to {sender}: {detail or 'Delivery failed'}")
        return False
    else:
        logger.info(f"Sent {msg_type} {msg_id} to {sender} (status: {status_str})")
        return True


@chat_proto.on_message(model=ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage) -> None:
    """
    Handle incoming chat messages conforming to Fetch.ai AgentChatProtocol 0.3.0.
    1. Send immediate delivery acknowledgement to sender.
    2. Extract and sanitize message text and metadata.
    3. Forward message to HabitHero Node.js AI backend for tool execution and reasoning.
    4. Return AI response back through Fetch.ai Chat Protocol.
    5. Always guarantee a ChatMessage reply so ASI:One never remains stuck in 'Reasoning...'.
    """
    try:
        ctx.logger.info(f"Received ChatMessage {msg.msg_id} from sender {sender}")

        # 1. Immediate acknowledgement of message receipt
        try:
            ack = ChatAcknowledgement(
                timestamp=datetime.now(timezone.utc),
                acknowledged_msg_id=msg.msg_id,
            )
            ack_res = await ctx.send(sender, ack)
            _log_send_status(ctx.logger, "ChatAcknowledgement", msg.msg_id, sender, ack_res)
        except Exception as ack_err:
            ctx.logger.warning(f"Failed to send ChatAcknowledgement to {sender}: {ack_err}")

        # 2. Extract text content and metadata safely from content list
        text_content = ""
        conversation_id = None
        if msg.content:
            for item in msg.content:
                if hasattr(item, "text") and item.text:
                    text_content += item.text.strip() + " "
                elif isinstance(item, dict) and item.get("text"):
                    text_content += str(item["text"]).strip() + " "
                # Extract conversationId from metadata if present and valid ObjectId format
                elif hasattr(item, "metadata") and isinstance(item.metadata, dict):
                    cid = item.metadata.get("conversationId") or item.metadata.get("conversation_id")
                    if cid and isinstance(cid, str) and (len(cid) == 24 or cid == "new"):
                        conversation_id = cid
                elif isinstance(item, dict) and isinstance(item.get("metadata"), dict):
                    cid = item["metadata"].get("conversationId") or item["metadata"].get("conversation_id")
                    if cid and isinstance(cid, str) and (len(cid) == 24 or cid == "new"):
                        conversation_id = cid
        text_content = text_content.strip()

        # 3. Handle empty message edge case
        if not text_content:
            ctx.logger.warning(f"Received empty message content from {sender}")
            empty_reply = ChatMessage(
                timestamp=datetime.now(timezone.utc),
                msg_id=uuid.uuid4(),
                content=[
                    TextContent(
                        type="text",
                        text="Hello! I am HabitHero, your AI accountability companion. What goal or habit would you like to build today?"
                    )
                ]
            )
            send_res = await ctx.send(sender, empty_reply)
            _log_send_status(ctx.logger, "empty guidance ChatMessage", empty_reply.msg_id, sender, send_res)
            return

        # 4. Forward message to HabitHero Node.js backend with timeout protection
        ctx.logger.info(f"Forwarding message to HabitHero backend for sender {sender}: '{text_content[:60]}...'")
        try:
            backend_res = await asyncio.wait_for(
                backend_client.forward_to_backend(
                    sender=sender,
                    message=text_content,
                    conversation_id=conversation_id,
                ),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            ctx.logger.error(f"Timeout waiting for backend forward for sender {sender} after 30.0s")
            backend_res = {
                "reply": "My accountability engine is taking longer than usual to formulate a response. Your habit data is safe. Please send your message again in a moment."
            }

        reply_text = backend_res.get(
            "reply",
            "I'm currently unable to connect to my accountability engine. Please try again in a moment."
        )

        # 5. Return AI response to sender
        response_msg = ChatMessage(
            timestamp=datetime.now(timezone.utc),
            msg_id=uuid.uuid4(),
            content=[TextContent(type="text", text=reply_text)]
        )
        send_res = await ctx.send(sender, response_msg)
        _log_send_status(ctx.logger, "reply ChatMessage", response_msg.msg_id, sender, send_res)

    except Exception as exc:
        ctx.logger.error(f"Unhandled error in handle_chat_message for sender {sender}: {exc}")
        try:
            fallback_msg = ChatMessage(
                timestamp=datetime.now(timezone.utc),
                msg_id=uuid.uuid4(),
                content=[
                    TextContent(
                        type="text",
                        text="I encountered a momentary issue processing your request. Please try sending your message again."
                    )
                ]
            )
            fallback_res = await ctx.send(sender, fallback_msg)
            _log_send_status(ctx.logger, "fallback error ChatMessage", fallback_msg.msg_id, sender, fallback_res)
        except Exception as send_err:
            ctx.logger.error(f"Failed to send fallback ChatMessage to {sender}: {send_err}")


@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement) -> None:
    """
    Handle delivery acknowledgements from recipient agents.
    """
    ctx.logger.info(f"Received ChatAcknowledgement from {sender} for message {msg.acknowledged_msg_id}")


def create_agent(
    name: str = AGENT_NAME,
    seed: str = AGENT_SEED,
    port: int = AGENT_PORT,
    mailbox_key: str | None = AGENT_MAILBOX_KEY,
    handle: str | None = AGENT_HANDLE,
) -> Agent:
    """
    Create and configure the HabitHero Fetch.ai uAgent with Chat Protocol 0.3.0 and Agentverse capabilities.
    """
    clean_mailbox_key = mailbox_key.strip() if (mailbox_key and isinstance(mailbox_key, str)) else None

    agent_instance = Agent(
        name=name,
        seed=seed,
        port=port,
        mailbox=bool(clean_mailbox_key),
        handle=handle,
        publish_agent_details=True,
        description="An AI companion that helps people build consistent habits through personalized plans, daily check-ins, progress tracking and adaptive accountability.",
    )

    if clean_mailbox_key:
        # Use AuthenticatedMailboxClient for Bearer-token authentication against Agentverse mailbox
        agent_instance._mailbox_client = AuthenticatedMailboxClient(
            identity=agent_instance._identity,
            agentverse=agent_instance._agentverse,
            logger=agent_instance._logger,
            mailbox_key=clean_mailbox_key,
        )
        agent_instance._use_mailbox = True
    else:
        # Strictly ensure no default MailboxClient exists or can be scheduled
        agent_instance._mailbox_client = None
        agent_instance._use_mailbox = False
        if hasattr(agent_instance, "_endpoints") and agent_instance._endpoints:
            agent_instance._endpoints = [
                ep for ep in agent_instance._endpoints
                if agent_instance._agentverse.mailbox_endpoint not in ep.url
            ]
        agent_instance._logger.warning(
            "AGENT_MAILBOX_KEY is not configured; mailbox polling is completely disabled."
        )

    # Include the verified Chat Protocol with published manifest
    agent_instance.include(chat_proto, publish_manifest=True)
    return agent_instance


agent = create_agent()


class HealthResponse(Model):
    status: str
    agent: str
    address: str


@agent.on_rest_get("/health", HealthResponse)
async def handle_health(ctx: Context) -> HealthResponse:
    """
    Lightweight health check endpoint for cloud hosting platforms (e.g. Render Web Service).
    Returns basic public status without exposing any secrets, keys, or credentials.
    """
    return HealthResponse(
        status="ok",
        agent=ctx.agent.name,
        address=ctx.agent.address,
    )

if __name__ == "__main__":
    logger.info(f"Starting HabitHero uAgent '{agent.name}' on port {AGENT_PORT}")
    logger.info(f"Agent Address: {agent.address}")
    if agent._handle:
        logger.info(f"Agent Handle: @{agent._handle}")
    agent.run()
