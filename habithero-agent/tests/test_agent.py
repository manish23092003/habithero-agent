import asyncio
import uuid
from datetime import datetime, timezone
import pytest
from aiohttp import web
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

from config import (
    AGENT_NAME,
    AGENT_HANDLE,
    AGENT_SEED,
    AGENT_PORT,
    BACKEND_URL,
    AGENT_SERVICE_SECRET,
    normalize_backend_url,
    get_health_url,
)
from backend_client import BackendClient, backend_client
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
    assert any("proto:" in p for p in test_agent.protocols.keys())


def test_agent_handle_preserves_deterministic_identity():
    """Verify passing handle='habithero' sets handle without altering cryptographic address."""
    agent_without_handle = Agent(name=AGENT_NAME, seed=AGENT_SEED)
    agent_with_handle = create_agent(name=AGENT_NAME, seed=AGENT_SEED, handle="habithero")

    assert agent_with_handle.address == agent_without_handle.address
    assert agent_with_handle._handle == "habithero"
    assert agent_with_handle.address == "agent1qghes4q3u28wc48zeateraflnf3uadm3ygam56lwh2m5elxm407256zqkkw"


def test_url_normalization_helpers():
    """Verify backend and health URLs normalize cleanly regardless of trailing slashes or subpaths."""
    assert normalize_backend_url("http://localhost:5000") == "http://localhost:5000/api/agent/chat"
    assert normalize_backend_url("http://localhost:5000/") == "http://localhost:5000/api/agent/chat"
    assert normalize_backend_url("http://localhost:5000/api") == "http://localhost:5000/api/agent/chat"
    assert normalize_backend_url("http://localhost:5000/api/agent") == "http://localhost:5000/api/agent/chat"
    assert normalize_backend_url("http://localhost:5000/api/agent/chat") == "http://localhost:5000/api/agent/chat"

    assert get_health_url("http://localhost:5000/api/agent/chat") == "http://localhost:5000/api/health"
    assert get_health_url("https://habithero.onrender.com/api/agent/chat") == "https://habithero.onrender.com/api/health"


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
async def test_backend_client_health_check_offline():
    """Verify BackendClient health check cleanly flags unreachable server without throwing."""
    dead_client = BackendClient(
        backend_url="http://localhost:59998/api/agent/chat",
        health_url="http://localhost:59998/api/health",
        service_secret="secret"
    )

    health = await dead_client.check_health(timeout_sec=1.0)
    assert health["available"] is False
    assert "error" in health
    err_msg = health["error"].lower()
    assert "timed out" in err_msg or "cannot connect" in err_msg or "refused" in err_msg


@pytest.mark.asyncio
async def test_backend_client_connection_failure():
    """Verify BackendClient forward_to_backend detects offline backend and returns friendly fallback."""
    dead_client = BackendClient(
        backend_url="http://localhost:59999/api/agent/chat",
        health_url="http://localhost:59999/api/health",
        service_secret="secret"
    )

    res = await dead_client.forward_to_backend(
        sender="agent1qtester",
        message="Hello"
    )

    assert res["success"] is False
    assert res.get("backend_available") is False
    assert "cannot reach" in res["reply"].lower() or "port 5000" in res["reply"].lower()


@pytest.mark.asyncio
async def test_backend_client_with_mock_health_and_chat():
    """Verify full success flow with mock Express backend responding on health and chat endpoints."""
    # Set up ephemeral aiohttp web server to mock Express backend
    mock_app = web.Application()

    async def mock_health(_req):
        return web.json_response({
            "status": "ok",
            "service": "HabitHero Backend API",
            "database": "connected"
        })

    async def mock_chat(req):
        secret = req.headers.get("x-agent-secret")
        if secret != "test_secret":
            return web.json_response({"success": False, "error": "Unauthorized"}, status=401)
        body = await req.json()
        sender = body.get("sender")
        return web.json_response({
            "success": True,
            "data": {
                "reply": f"Mock AI: Hello {sender}! What habit shall we build?",
                "conversationId": "mock_conv_123",
                "toolsExecuted": ["create_goal"],
                "userId": "mock_user_abc"
            }
        })

    mock_app.router.add_get("/api/health", mock_health)
    mock_app.router.add_post("/api/agent/chat", mock_chat)

    runner = web.AppRunner(mock_app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    base_url = f"http://127.0.0.1:{port}"

    try:
        test_client = BackendClient(
            backend_url=f"{base_url}/api/agent/chat",
            health_url=f"{base_url}/api/health",
            service_secret="test_secret"
        )

        # 1. Test health check passes
        health = await test_client.check_health()
        assert health["available"] is True
        assert health["data"]["status"] == "ok"

        # 2. Test forward to backend succeeds
        res = await test_client.forward_to_backend(
            sender="agent1qtester_mock",
            message="Exercise daily"
        )
        assert res["success"] is True
        assert res["backend_available"] is True
        assert "Mock AI:" in res["reply"]
        assert res["conversationId"] == "mock_conv_123"
        assert res["toolsExecuted"] == ["create_goal"]

        # 3. Test wrong secret rejection
        bad_client = BackendClient(
            backend_url=f"{base_url}/api/agent/chat",
            health_url=f"{base_url}/api/health",
            service_secret="wrong_secret"
        )
        bad_res = await bad_client.forward_to_backend(
            sender="agent1qtester_mock",
            message="Exercise daily"
        )
        assert bad_res["success"] is False
        assert "authorization failed" in bad_res["reply"].lower()

    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_full_message_flow_offline_fallback():
    """Verify handle_chat_message sends ChatAcknowledgement and helpful fallback message when backend is down."""
    ctx = MockContext()
    sender = f"agent1qflow_test_{uuid.uuid4().hex[:8]}"
    incoming_msg = ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid.uuid4(),
        content=[TextContent(type="text", text="Hello! How can you help me stay consistent?")]
    )

    await handle_chat_message(ctx, sender, incoming_msg)

    # Must always receive 2 messages: Ack, then response
    assert len(ctx.sent_messages) == 2
    ack = ctx.sent_messages[0]["message"]
    reply = ctx.sent_messages[1]["message"]

    assert isinstance(ack, ChatAcknowledgement)
    assert ack.acknowledged_msg_id == incoming_msg.msg_id

    assert isinstance(reply, ChatMessage)
    assert len(reply.content) > 0
    reply_text = reply.content[0].text
    # When backend is offline, reply explains availability or accountability engine status
    assert len(reply_text) > 0
