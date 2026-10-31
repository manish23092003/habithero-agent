import asyncio
import uuid
from datetime import datetime, timezone
import pytest
from uagents import Agent, Context
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)

import sys
from pathlib import Path
# Ensure habithero-agent root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import AGENT_NAME, AGENT_SEED, AGENT_PORT, BACKEND_URL, AGENT_SERVICE_SECRET
from backend_client import BackendClient
from agent import create_agent, chat_proto, handle_chat_message, handle_acknowledgement


class MockContext:
    """Mock uAgents Context for verifying message dispatch and logging."""
    def __init__(self):
        self.sent_messages = []
        self.logger = self

    async def send(self, recipient: str, message: any):
        self.sent_messages.append({"recipient": recipient, "message": message})

    def info(self, msg: str):
        pass

    def warning(self, msg: str):
        pass

    def error(self, msg: str):
        pass


def test_protocol_specification():
    """Verify official Fetch.ai AgentChatProtocol version and specification."""
    assert chat_protocol_spec.name == "AgentChatProtocol"
    assert chat_protocol_spec.version == "0.3.0"
    assert chat_proto.verify() is True, "Protocol must implement both ChatMessage and ChatAcknowledgement interactions"


def test_agent_initialization():
    """Verify agent creates a deterministic Fetch.ai identity and mounts the protocol."""
    test_agent = create_agent(name="HabitHero", seed="deterministic_seed_for_testing_123")
    assert test_agent.name == "HabitHero"
    assert test_agent.address.startswith("agent1q")
    # Verify the protocol digest is registered in the agent
    assert any("proto:" in p for p in test_agent.protocols.keys())


def test_chat_message_schema():
    """Verify ChatMessage and TextContent model compliance."""
    msg_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    text = "I want to exercise for 20 minutes daily."

    msg = ChatMessage(
        timestamp=now,
        msg_id=msg_id,
        content=[TextContent(type="text", text=text)]
    )

    assert msg.msg_id == msg_id
    assert msg.timestamp == now
    assert len(msg.content) == 1
    assert msg.content[0].type == "text"
    assert msg.content[0].text == text


def test_chat_acknowledgement_schema():
    """Verify ChatAcknowledgement model compliance."""
    msg_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    ack = ChatAcknowledgement(
        timestamp=now,
        acknowledged_msg_id=msg_id
    )

    assert ack.acknowledged_msg_id == msg_id
    assert ack.timestamp == now


@pytest.mark.asyncio
async def test_handle_empty_message():
    """Verify agent responds politely when message content is empty or whitespace."""
    ctx = MockContext()
    sender = "agent1qsender_empty_test"
    incoming_msg = ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid.uuid4(),
        content=[TextContent(type="text", text="   ")]
    )

    await handle_chat_message(ctx, sender, incoming_msg)

    # Must send ChatAcknowledgement first, then a guidance ChatMessage
    assert len(ctx.sent_messages) == 2
    ack = ctx.sent_messages[0]["message"]
    reply = ctx.sent_messages[1]["message"]

    assert isinstance(ack, ChatAcknowledgement)
    assert ack.acknowledged_msg_id == incoming_msg.msg_id

    assert isinstance(reply, ChatMessage)
    assert "HabitHero" in reply.content[0].text


@pytest.mark.asyncio
async def test_handle_acknowledgement_callback():
    """Verify handle_acknowledgement runs cleanly without exceptions."""
    ctx = MockContext()
    sender = "agent1qsender_ack_test"
    ack = ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc),
        acknowledged_msg_id=uuid.uuid4()
    )

    # Should log without throwing
    await handle_acknowledgement(ctx, sender, ack)


@pytest.mark.asyncio
async def test_backend_client_connection_failure():
    """Verify BackendClient gracefully handles unavailable backend without crashing."""
    # Point to an unused local port
    dead_client = BackendClient(
        backend_url="http://localhost:59999/api/agent/chat",
        service_secret="secret"
    )

    res = await dead_client.forward_to_backend(
        sender="agent1qtester",
        message="Hello"
    )

    assert res["success"] is False
    assert "cannot reach" in res["reply"].lower() or "connect" in res["reply"].lower()


@pytest.mark.asyncio
async def test_backend_client_auth_failure():
    """Verify BackendClient handles bad secret from real backend."""
    bad_auth_client = BackendClient(
        backend_url=BACKEND_URL,
        service_secret="completely_invalid_secret_phrase"
    )

    res = await bad_auth_client.forward_to_backend(
        sender="agent1qtester",
        message="Hello"
    )

    assert res["success"] is False
    assert "error" in res


@pytest.mark.asyncio
async def test_end_to_end_backend_integration():
    """Verify end-to-end communication from BackendClient to running Node.js backend."""
    live_client = BackendClient(
        backend_url=BACKEND_URL,
        service_secret=AGENT_SERVICE_SECRET
    )

    sender = f"agent1qintegration_test_{uuid.uuid4().hex[:8]}"
    res = await live_client.forward_to_backend(
        sender=sender,
        message="I want to drink 2 liters of water every day."
    )

    assert res["success"] is True
    assert len(res["reply"]) > 0
    assert res.get("userId") is not None
    assert res.get("conversationId") is not None


@pytest.mark.asyncio
async def test_full_message_flow_with_live_backend():
    """Verify entire handle_chat_message flow: ChatMessage in -> Ack out -> Backend call -> ChatMessage out."""
    ctx = MockContext()
    sender = f"agent1qflow_test_{uuid.uuid4().hex[:8]}"
    incoming_msg = ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid.uuid4(),
        content=[TextContent(type="text", text="Hello! How can you help me stay consistent?")]
    )

    await handle_chat_message(ctx, sender, incoming_msg)

    assert len(ctx.sent_messages) == 2
    ack = ctx.sent_messages[0]["message"]
    reply = ctx.sent_messages[1]["message"]

    assert isinstance(ack, ChatAcknowledgement)
    assert ack.acknowledged_msg_id == incoming_msg.msg_id

    assert isinstance(reply, ChatMessage)
    assert len(reply.content) > 0
    assert len(reply.content[0].text) > 0
