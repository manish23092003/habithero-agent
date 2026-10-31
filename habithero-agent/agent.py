import uuid
import logging
from datetime import datetime, timezone
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from config import (
    AGENT_NAME,
    AGENT_SEED,
    AGENT_PORT,
    AGENT_MAILBOX_KEY,
)
from backend_client import backend_client

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger("HabitHeroAgent")

# Initialize Chat Protocol from official Fetch.ai specification (version 0.3.0)
chat_proto = Protocol(spec=chat_protocol_spec)

@chat_proto.on_message(model=ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage) -> None:
    """
    Handle incoming chat messages conforming to Fetch.ai AgentChatProtocol 0.3.0.
    1. Send immediate delivery acknowledgement to sender.
    2. Extract and sanitize message text.
    3. Forward message to HabitHero Node.js AI backend for tool execution and reasoning.
    4. Return AI response back through Fetch.ai Chat Protocol.
    """
    ctx.logger.info(f"Received ChatMessage {msg.msg_id} from sender {sender}")

    # 1. Immediate acknowledgement of message receipt
    ack = ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc),
        acknowledged_msg_id=msg.msg_id,
    )
    await ctx.send(sender, ack)
    ctx.logger.info(f"Sent ChatAcknowledgement for {msg.msg_id} to {sender}")

    # 2. Extract text content safely from content list
    text_content = ""
    if msg.content:
        for item in msg.content:
            if hasattr(item, "text") and item.text:
                text_content += item.text.strip() + " "
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
        await ctx.send(sender, empty_reply)
        return

    # 4. Forward message to HabitHero Node.js backend
    ctx.logger.info(f"Forwarding message to HabitHero backend for sender {sender}: '{text_content[:60]}...'")
    backend_res = await backend_client.forward_to_backend(
        sender=sender,
        message=text_content,
    )

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
    await ctx.send(sender, response_msg)
    ctx.logger.info(f"Sent reply ChatMessage {response_msg.msg_id} to {sender}")


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
) -> Agent:
    """
    Create and configure the HabitHero Fetch.ai uAgent with Chat Protocol 0.3.0 and Agentverse capabilities.
    """
    agent_instance = Agent(
        name=name,
        seed=seed,
        port=port,
        mailbox=mailbox_key if mailbox_key else True,
        publish_agent_details=True,
        description="An AI companion that helps people build consistent habits through personalized plans, daily check-ins, progress tracking and adaptive accountability.",
    )

    # Include the verified Chat Protocol with published manifest
    agent_instance.include(chat_proto, publish_manifest=True)
    return agent_instance


agent = create_agent()

if __name__ == "__main__":
    logger.info(f"Starting HabitHero uAgent '{agent.name}' on port {AGENT_PORT}")
    logger.info(f"Agent Address: {agent.address}")
    agent.run()
