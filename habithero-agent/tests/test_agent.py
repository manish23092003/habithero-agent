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
from backend_client import BackendClient, backend_client, _sanitize_error_preview
from agent import create_agent, chat_proto, handle_chat_message, handle_acknowledgement, _log_send_status


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


@pytest.mark.asyncio
async def test_unhandled_exception_fallback_delivers_chat_message():
    """Verify that even if forward_to_backend throws an unhandled exception, a fallback ChatMessage is sent so ASI:One does not freeze."""
    from unittest.mock import patch

    ctx = MockContext()
    sender = f"agent1qflow_crash_{uuid.uuid4().hex[:8]}"
    incoming_msg = ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid.uuid4(),
        content=[TextContent(type="text", text="Crashing query test")]
    )

    with patch("agent.backend_client.forward_to_backend", side_effect=RuntimeError("Simulated unhandled pipeline failure")):
        await handle_chat_message(ctx, sender, incoming_msg)

    # Should have sent ChatAcknowledgement and fallback ChatMessage
    assert len(ctx.sent_messages) == 2
    reply = ctx.sent_messages[1]["message"]
    assert isinstance(reply, ChatMessage)
    assert len(reply.content) > 0
    assert "momentary issue" in reply.content[0].text or "Please try" in reply.content[0].text


@pytest.mark.asyncio
async def test_ack_delivery_failure_resilience():
    """Verify that if sending ChatAcknowledgement raises an exception, the agent still delivers the final ChatMessage response."""
    class FlakyAckMockContext(MockContext):
        async def send(self, destination: str, message: object) -> None:
            if isinstance(message, ChatAcknowledgement):
                raise ConnectionResetError("Simulated socket drop during ACK")
            await super().send(destination, message)

    ctx = FlakyAckMockContext()
    sender = f"agent1qack_flaky_{uuid.uuid4().hex[:8]}"
    incoming_msg = ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid.uuid4(),
        content=[TextContent(type="text", text="Hello despite dropped ACK")]
    )

    await handle_chat_message(ctx, sender, incoming_msg)

    # Final response must still be delivered despite failed ACK
    assert len(ctx.sent_messages) == 1
    reply = ctx.sent_messages[0]["message"]
    assert isinstance(reply, ChatMessage)
    assert len(reply.content) > 0


def test_port_configuration_precedence():
    """Verify that get_agent_port prioritizes Render's dynamic PORT over AGENT_PORT, with 8000 default."""
    from unittest.mock import patch
    import os
    from config import get_agent_port

    with patch.dict(os.environ, {"PORT": "10000", "AGENT_PORT": "8080"}):
        assert get_agent_port() == 10000

    with patch.dict(os.environ, {"PORT": "", "AGENT_PORT": "9000"}, clear=False):
        assert get_agent_port() == 9000

    with patch.dict(os.environ, {}, clear=True):
        assert get_agent_port() == 8000


@pytest.mark.asyncio
async def test_health_endpoint_response():
    """Verify that the GET /health REST endpoint returns public agent metadata and never exposes secrets."""
    from agent import agent, HealthResponse

    response = await agent.handle_rest("GET", "/health", None)
    assert isinstance(response, HealthResponse)
    assert response.status == "ok"
    assert response.agent == agent.name
    assert response.address == agent.address
    assert response.address.startswith("agent1")
    # Verify no credentials or private state are leaked
    dumped = response.model_dump()
    assert set(dumped.keys()) == {"status", "agent", "address"}


def test_sanitize_error_preview_helper():
    """Verify HTML error pages and large payloads are safely sanitized and truncated."""
    # 1. Full Render HTML error page with SVG and footer
    html_page = (
        "<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head>"
        "<body><h1>502 Bad Gateway</h1><p>Render edge proxy</p>"
        "<svg><path d='M15.65.006a5.137 5.137 0 0 0-5.321 4.367c...'></path></svg>"
        "<footer>&copy; Render Inc. All rights reserved.</footer></body></html>"
    )
    sanitized = _sanitize_error_preview(html_page)
    assert "<svg" not in sanitized
    assert "<path" not in sanitized
    assert "M15.65" not in sanitized
    assert "[HTML page:" in sanitized
    assert "502 Bad Gateway" in sanitized

    # 2. JSON error message truncation
    long_msg = "x" * 200
    assert len(_sanitize_error_preview(long_msg, max_len=50)) <= 55
    assert _sanitize_error_preview(long_msg, max_len=50).endswith("...")

    # 3. Empty input handling
    assert _sanitize_error_preview("") == "<empty response>"
    assert _sanitize_error_preview("   ") == "<empty response>"


@pytest.mark.asyncio
async def test_backend_client_502_503_504_gateway_responses():
    """Verify client gracefully handles HTTP 502, 503, 504 gateway errors without crashing or logging raw HTML."""
    mock_app = web.Application()

    current_status = {"code": 502}

    async def mock_health(_req):
        return web.Response(
            text="<!DOCTYPE html><html><body><h1>Warming Up</h1></body></html>",
            status=current_status["code"],
            content_type="text/html"
        )

    async def mock_chat(_req):
        return web.Response(
            text="<!DOCTYPE html><html><body><h1>Gateway Error</h1></body></html>",
            status=current_status["code"],
            content_type="text/html"
        )

    mock_app.router.add_get("/api/health", mock_health)
    mock_app.router.add_post("/api/agent/chat", mock_chat)

    runner = web.AppRunner(mock_app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    base_url = f"http://127.0.0.1:{port}"

    try:
        client = BackendClient(
            backend_url=f"{base_url}/api/agent/chat",
            health_url=f"{base_url}/api/health",
            service_secret="secret",
            health_timeout_sec=2.0,
            chat_timeout_sec=2.0,
        )

        for code in (502, 503, 504):
            current_status["code"] = code
            res = await client.forward_to_backend(
                sender="agent1qtest_gateway",
                message="Check my streak"
            )
            assert res["success"] is False
            assert "warming up or temporarily unavailable" in res["reply"]
            assert f"HTTP {code}" in res["error"]
            assert "<html" not in res["error"].lower()
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_backend_client_invalid_json_and_html_200():
    """Verify client rejects HTTP 200 with HTML content-type (SPA fallback) or malformed JSON syntax."""
    mock_app = web.Application()
    mode = {"mode": "html_200"}

    async def mock_health(_req):
        return web.json_response({"status": "ok"})

    async def mock_chat(_req):
        if mode["mode"] == "html_200":
            return web.Response(
                text="<!DOCTYPE html><html><body><div id='root'></div></body></html>",
                status=200,
                content_type="text/html"
            )
        elif mode["mode"] == "malformed_json":
            return web.Response(
                text="{\"success\": true, \"data\": {malformed",
                status=200,
                content_type="application/json"
            )

    mock_app.router.add_get("/api/health", mock_health)
    mock_app.router.add_post("/api/agent/chat", mock_chat)

    runner = web.AppRunner(mock_app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    base_url = f"http://127.0.0.1:{port}"

    try:
        client = BackendClient(
            backend_url=f"{base_url}/api/agent/chat",
            health_url=f"{base_url}/api/health",
            service_secret="secret",
            health_timeout_sec=2.0,
            chat_timeout_sec=2.0,
        )

        # 1. Test HTML 200 response rejection
        mode["mode"] = "html_200"
        res_html = await client.forward_to_backend(
            sender="agent1qtester",
            message="Hello"
        )
        assert res_html["success"] is False
        assert "unexpected response format" in res_html["reply"]
        assert "Invalid content type" in res_html["error"]

        # 2. Test malformed JSON 200 handling
        mode["mode"] = "malformed_json"
        res_json = await client.forward_to_backend(
            sender="agent1qtester",
            message="Hello again"
        )
        assert res_json["success"] is False
        assert "reading data from my accountability engine" in res_json["reply"]
        assert "JSON parse error" in res_json["error"]
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_backend_client_timeout_handling():
    """Verify backend request timeout triggers clean fallback without throwing unhandled exceptions."""
    mock_app = web.Application()

    async def mock_health(_req):
        return web.json_response({"status": "ok"})

    async def mock_chat(_req):
        await asyncio.sleep(1.0)
        return web.json_response({"success": True, "data": {"reply": "Too late"}})

    mock_app.router.add_get("/api/health", mock_health)
    mock_app.router.add_post("/api/agent/chat", mock_chat)

    runner = web.AppRunner(mock_app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    base_url = f"http://127.0.0.1:{port}"

    try:
        fast_client = BackendClient(
            backend_url=f"{base_url}/api/agent/chat",
            health_url=f"{base_url}/api/health",
            service_secret="secret",
            health_timeout_sec=1.0,
            chat_timeout_sec=0.2,
        )

        res = await fast_client.forward_to_backend(
            sender="agent1qtester_timeout",
            message="Will this timeout?"
        )
        assert res["success"] is False
        assert "taking longer than usual to respond" in res["reply"]
        assert res["error"] == "Request timed out"
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_backend_client_conversation_caching_and_forwarding():
    """Verify BackendClient caches conversationId returned by backend and automatically forwards it on next turn."""
    mock_app = web.Application()
    received_payloads = []

    async def mock_health(_req):
        return web.json_response({"status": "ok"})

    async def mock_chat(req):
        body = await req.json()
        received_payloads.append(body)
        return web.json_response({
            "success": True,
            "data": {
                "reply": "Turn processed",
                "conversationId": "65f123456789abcdef012345",
                "userId": "user_abc"
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
        client = BackendClient(
            backend_url=f"{base_url}/api/agent/chat",
            health_url=f"{base_url}/api/health",
            service_secret="secret",
        )

        sender = "agent1qmultiturn_user"

        # Turn 1: No conversationId cached yet
        res1 = await client.forward_to_backend(sender=sender, message="First turn")
        assert res1["success"] is True
        assert res1["conversationId"] == "65f123456789abcdef012345"
        assert "conversationId" not in received_payloads[0]

        # Verify client cached it
        assert client.get_conversation_id(sender) == "65f123456789abcdef012345"

        # Turn 2: Client should automatically forward cached conversationId
        res2 = await client.forward_to_backend(sender=sender, message="Second turn")
        assert res2["success"] is True
        assert received_payloads[1].get("conversationId") == "65f123456789abcdef012345"

        # Clear conversation
        client.clear_conversation(sender)
        assert client.get_conversation_id(sender) is None
    finally:
        await runner.cleanup()


def test_send_status_inspection_and_logging():
    """Verify _log_send_status handles diverse delivery statuses (delivered, sent, failed, None)."""
    from collections import namedtuple

    class DummyLogger:
        def __init__(self):
            self.infos = []
            self.errors = []
        def info(self, msg): self.infos.append(msg)
        def error(self, msg): self.errors.append(msg)

    logger = DummyLogger()
    StatusObj = namedtuple("StatusObj", ["status", "detail"])

    # 1. None (mock context)
    assert _log_send_status(logger, "ChatMessage", "123", "agent1q", None) is True
    assert "Dispatched" in logger.infos[-1]

    # 2. Delivered
    delivered_obj = StatusObj(status="delivered", detail="")
    assert _log_send_status(logger, "ChatMessage", "123", "agent1q", delivered_obj) is True
    assert "Delivered" in logger.infos[-1]

    # 3. Failed
    failed_obj = StatusObj(status="failed", detail="Route unreachable")
    assert _log_send_status(logger, "ChatMessage", "123", "agent1q", failed_obj) is False
    assert "Failed to deliver" in logger.errors[-1]

