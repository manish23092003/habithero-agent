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


# ---------------------------------------------------------------------------
# AuthenticatedMailboxClient Tests
# ---------------------------------------------------------------------------

import base64
import json
import contextlib
from mailbox_client import AuthenticatedMailboxClient
from uagents_core.identity import Identity
from uagents_core.config import AgentverseConfig
from uagents.mailbox import StoredEnvelope
from uagents_core.envelope import Envelope
from uagents.dispatch import dispatcher


def test_authenticated_mailbox_client_auth_headers_with_key():
    """Verify AuthenticatedMailboxClient uses Bearer token when mailbox_key is provided."""
    identity = Identity.from_seed("test_seed_authenticated_mailbox_client_1", 0)
    config = AgentverseConfig()
    client = AuthenticatedMailboxClient(
        identity=identity,
        agentverse=config,
        mailbox_key="test_mailbox_key_xyz_789"
    )

    headers = client._get_auth_headers()
    assert headers["Authorization"] == "Bearer test_mailbox_key_xyz_789"
    assert headers["Content-Type"] == "application/json"
    # Ensure key is not leaked in str or repr
    assert "test_mailbox_key_xyz_789" not in str(client)


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_requires_key_no_attestation_fallback():
    """Verify AuthenticatedMailboxClient strictly rejects empty/None mailbox_key and refuses to poll."""
    identity = Identity.from_seed("test_seed_authenticated_mailbox_client_2", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.errors = []
            self.warnings = []
        def error(self, msg): self.errors.append(msg)
        def warning(self, msg): self.warnings.append(msg)
        def info(self, msg): pass

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=identity,
        agentverse=config,
        logger=test_logger,
        mailbox_key=None
    )

    # 1. Calling _get_auth_headers without key raises ValueError preventing silent 401
    with pytest.raises(ValueError, match="AGENT_MAILBOX_KEY is required"):
        client._get_auth_headers()

    # 2. Calling run() without key aborts immediately without scheduling polling loop
    loop_started = False
    async def mock_loop():
        nonlocal loop_started
        loop_started = True

    client._check_mailbox_loop = mock_loop
    await client.run()
    await asyncio.sleep(0.01)

    assert loop_started is False
    assert any("Cannot start AuthenticatedMailboxClient without AGENT_MAILBOX_KEY" in err for err in test_logger.errors)


@pytest.mark.asyncio
async def test_agent_create_without_mailbox_key_completely_disables_mailbox_polling():
    """Verify create_agent safely and completely disables mailbox client when key is missing or empty."""
    from agent import create_agent

    # Test None, empty string, and whitespace-only key
    for empty_key in (None, "", "   "):
        agent = create_agent(
            name=f"HabitHeroNoKey_{hash(empty_key)}",
            seed="test_seed_no_key_disabled",
            port=8095,
            mailbox_key=empty_key
        )

        # Mailbox client MUST be None
        assert agent.mailbox_client is None
        assert agent._mailbox_client is None

        # Internal _use_mailbox state MUST be False
        assert agent._use_mailbox is False

        # Endpoints must not contain Agentverse mailbox endpoint
        for ep in agent._endpoints:
            assert agent._agentverse.mailbox_endpoint not in ep.url

        # Simulate uagents Agent.run_async() task creation to prove no mailbox task is scheduled
        coros = []
        if agent._use_mailbox and agent._mailbox_client is not None:
            coros.append(agent._mailbox_client.run())

        # Zero mailbox tasks scheduled
        assert len(coros) == 0
        assert agent._mailbox_client is None


@pytest.mark.asyncio
async def test_agent_create_wires_authenticated_mailbox_client():
    """Verify create_agent wraps default client with exactly one AuthenticatedMailboxClient when mailbox_key is set."""
    from agent import create_agent
    seeded_agent = create_agent(
        name="HabitHeroAuthTest",
        seed="test_seed_agent_wiring_1",
        port=8088,
        mailbox_key="valid_key_123"
    )

    assert isinstance(seeded_agent.mailbox_client, AuthenticatedMailboxClient)
    assert seeded_agent._use_mailbox is True
    assert seeded_agent.mailbox_client._mailbox_key == "valid_key_123"

    # Simulate uagents Agent.run_async() coroutines collection
    coros = []
    if seeded_agent._use_mailbox and seeded_agent._mailbox_client is not None:
        mb_coro = seeded_agent._mailbox_client.run()
        coros.append(mb_coro)
        mb_coro.close()  # Close coroutine to prevent unawaited warning

    # Exactly one mailbox coroutine is scheduled (matching AuthenticatedMailboxClient)
    assert len(coros) == 1
    assert seeded_agent._mailbox_client is seeded_agent.mailbox_client


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_envelope_dispatch_and_delete():
    """Verify valid envelopes are parsed, verified, dispatched via dispatcher, and deleted."""
    sender_id = Identity.from_seed("sender_seed_envelope_test", 0)
    receiver_id = Identity.from_seed("receiver_seed_envelope_test", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.logs = []
        def info(self, msg): self.logs.append(f"INFO: {msg}")
        def warning(self, msg): self.logs.append(f"WARN: {msg}")
        def error(self, msg): self.logs.append(f"ERROR: {msg}")
        def debug(self, msg): self.logs.append(f"DEBUG: {msg}")
        def exception(self, msg): self.logs.append(f"EXC: {msg}")

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key="test_bearer_key_abc"
    )

    # Register receiver address in dispatcher sink
    dispatched_messages = []
    class DummySink:
        async def handle_message(self, sender, schema_digest, message, session):
            dispatched_messages.append((sender, schema_digest, message, session))

    dispatcher.register(receiver_id.address, DummySink())

    deleted_uuids = []
    async def mock_delete_envelope(uuid_val):
        deleted_uuids.append(uuid_val)

    client._delete_envelope = mock_delete_envelope

    # Construct a valid, signed envelope
    envelope = Envelope(
        version=1,
        sender=sender_id.address,
        target=receiver_id.address,
        session=uuid.uuid4(),
        schema_digest="model:test_schema_digest_123",
        protocol_digest=None,
    )
    envelope.encode_payload(json.dumps({"test": "payload_content"}))
    envelope.sign(sender_id)

    env_uuid = uuid.uuid4()
    stored = StoredEnvelope(
        uuid=env_uuid,
        envelope=envelope,
        received_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc),
    )

    # Handle the envelope
    await client._handle_envelope(stored)

    # Verify message was dispatched
    assert len(dispatched_messages) == 1
    assert dispatched_messages[0][0] == sender_id.address
    assert dispatched_messages[0][1] == "model:test_schema_digest_123"
    assert "payload_content" in dispatched_messages[0][2]

    # Verify envelope was deleted
    assert len(deleted_uuids) == 1
    assert deleted_uuids[0] == env_uuid


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_dispatch_failure_preserves_envelope_for_retry():
    """Verify that when message dispatch fails (e.g. backend offline / unhandled error),
    the envelope is NOT deleted from mailbox and NOT marked in deduplication cache,
    allowing the message to be safely retried."""
    sender_id = Identity.from_seed("sender_seed_dispatch_fail_test", 0)
    receiver_id = Identity.from_seed("receiver_seed_dispatch_fail_test", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.logs = []
        def info(self, msg): self.logs.append(f"INFO: {msg}")
        def warning(self, msg): self.logs.append(f"WARN: {msg}")
        def error(self, msg): self.logs.append(f"ERROR: {msg}")
        def debug(self, msg): self.logs.append(f"DEBUG: {msg}")
        def exception(self, msg): self.logs.append(f"EXC: {msg}")

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key="test_bearer_key_retry"
    )

    should_fail = True
    dispatch_attempts = 0

    class FlakySink:
        async def handle_message(self, sender, schema_digest, message, session):
            nonlocal dispatch_attempts
            dispatch_attempts += 1
            if should_fail:
                raise ConnectionError("Simulated backend/dispatcher failure")

    dispatcher.register(receiver_id.address, FlakySink())

    deleted_uuids = []
    async def mock_delete_envelope(uuid_val):
        deleted_uuids.append(uuid_val)

    client._delete_envelope = mock_delete_envelope

    envelope = Envelope(
        version=1,
        sender=sender_id.address,
        target=receiver_id.address,
        session=uuid.uuid4(),
        schema_digest="model:test_schema_retry_123",
        protocol_digest=None,
    )
    envelope.encode_payload(json.dumps({"test": "retry_payload"}))
    envelope.sign(sender_id)

    env_uuid = uuid.uuid4()
    stored = StoredEnvelope(
        uuid=env_uuid,
        envelope=envelope,
        received_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc),
    )

    # 1. First attempt: Dispatch fails with ConnectionError
    await client._handle_envelope(stored)

    assert dispatch_attempts == 1
    # MUST NOT delete envelope from mailbox so it remains available on server
    assert len(deleted_uuids) == 0
    # MUST NOT be added to deduplication cache
    assert str(env_uuid) not in client._processed_envelopes
    assert any("Error dispatching envelope" in log for log in test_logger.logs)

    # 2. Second attempt (retry): Backend/sink has recovered
    should_fail = False
    await client._handle_envelope(stored)

    assert dispatch_attempts == 2
    # Envelope MUST now be deleted from mailbox after successful dispatch
    assert len(deleted_uuids) == 1
    assert deleted_uuids[0] == env_uuid
    # Envelope MUST now be recorded in deduplication cache
    assert str(env_uuid) in client._processed_envelopes


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_duplicate_suppression():
    """Verify duplicate envelopes with identical UUID are suppressed and deleted without re-dispatch."""
    sender_id = Identity.from_seed("sender_seed_dup_test", 0)
    receiver_id = Identity.from_seed("receiver_seed_dup_test", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.logs = []
        def info(self, msg): self.logs.append(f"INFO: {msg}")
        def warning(self, msg): self.logs.append(f"WARN: {msg}")
        def error(self, msg): self.logs.append(f"ERROR: {msg}")
        def debug(self, msg): self.logs.append(f"DEBUG: {msg}")
        def exception(self, msg): self.logs.append(f"EXC: {msg}")

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key="test_bearer_key_dup"
    )

    dispatched = []
    class DummySink:
        async def handle_message(self, *args):
            dispatched.append(args)

    dispatcher.register(receiver_id.address, DummySink())

    deleted_uuids = []
    async def mock_delete_envelope(uuid_val):
        deleted_uuids.append(uuid_val)

    client._delete_envelope = mock_delete_envelope

    envelope = Envelope(
        version=1,
        sender=sender_id.address,
        target=receiver_id.address,
        session=uuid.uuid4(),
        schema_digest="model:test_schema_digest_dup",
        protocol_digest=None,
    )
    envelope.encode_payload(json.dumps({"text": "Hello once"}))
    envelope.sign(sender_id)

    env_uuid = uuid.uuid4()
    stored = StoredEnvelope(
        uuid=env_uuid,
        envelope=envelope,
        received_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc),
    )

    # First delivery: Should dispatch and delete
    await client._handle_envelope(stored)
    assert len(dispatched) == 1
    assert len(deleted_uuids) == 1

    # Second delivery with identical UUID: Should suppress dispatch and re-delete
    await client._handle_envelope(stored)
    assert len(dispatched) == 1  # Not incremented
    assert len(deleted_uuids) == 2  # Re-deleted
    assert any("Duplicate envelope" in log for log in test_logger.logs)


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_envelope_verification_failure():
    """Verify envelopes failing cryptographic verification are not dispatched and are deleted."""
    sender_id = Identity.from_seed("sender_seed_tamper_test", 0)
    tampered_sender = Identity.from_seed("attacker_seed_tamper_test", 0)
    receiver_id = Identity.from_seed("receiver_seed_tamper_test", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.logs = []
        def info(self, msg): self.logs.append(f"INFO: {msg}")
        def warning(self, msg): self.logs.append(f"WARN: {msg}")
        def error(self, msg): self.logs.append(f"ERROR: {msg}")
        def debug(self, msg): self.logs.append(f"DEBUG: {msg}")
        def exception(self, msg): self.logs.append(f"EXC: {msg}")

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key="test_bearer_key_tamper"
    )

    dispatched = []
    class DummySink:
        async def handle_message(self, *args):
            dispatched.append(args)

    dispatcher.register(receiver_id.address, DummySink())

    deleted_uuids = []
    async def mock_delete_envelope(uuid_val):
        deleted_uuids.append(uuid_val)

    client._delete_envelope = mock_delete_envelope

    # Envelope claims to be from sender_id, but signed by attacker tampered_sender
    envelope = Envelope(
        version=1,
        sender=sender_id.address,
        target=receiver_id.address,
        session=uuid.uuid4(),
        schema_digest="model:test_schema_tampered",
        protocol_digest=None,
    )
    envelope.encode_payload(json.dumps({"text": "Tampered payload"}))
    envelope.sign(tampered_sender)

    env_uuid = uuid.uuid4()
    stored = StoredEnvelope(
        uuid=env_uuid,
        envelope=envelope,
        received_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc),
    )

    await client._handle_envelope(stored)

    # Dispatch must NOT have been called
    assert len(dispatched) == 0
    # Envelope must be cleaned up to prevent mailbox clog
    assert len(deleted_uuids) == 1
    assert any("failed verification" in log for log in test_logger.logs)


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_http_401_cooldown_and_no_secret_leak():
    """Verify HTTP 401 logs clear error without credentials, and suppresses log spam on repeat."""
    receiver_id = Identity.from_seed("receiver_seed_401_test", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.errors = []
            self.warnings = []
            self.infos = []
        def error(self, msg): self.errors.append(msg)
        def warning(self, msg): self.warnings.append(msg)
        def info(self, msg): self.infos.append(msg)
        def debug(self, msg): pass
        def exception(self, msg): self.errors.append(msg)

    test_logger = CaptureLogger()
    secret_key = "secret_agentverse_token_9999"
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key=secret_key,
        auth_error_cooldown_seconds=10.0,
    )

    # Mock server returning 401
    mock_app = web.Application()
    async def mock_mailbox_401(_req):
        return web.json_response({"detail": "Could not validate credentials"}, status=401)

    mock_app.router.add_get(f"/v2/agents/{receiver_id.address}/mailbox", mock_mailbox_401)
    runner = web.AppRunner(mock_app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    config.base_url = f"127.0.0.1:{port}"
    config.http_prefix = "http"

    try:
        # Run check_mailbox_loop for a brief moment then cancel
        task = asyncio.create_task(client._check_mailbox_loop())
        await asyncio.sleep(0.15)
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

        # Check logger
        assert len(test_logger.errors) >= 1
        error_msg = test_logger.errors[0]
        assert "Mailbox authentication failed (HTTP 401)" in error_msg
        # Critical security check: Never log secret token
        assert secret_key not in error_msg
        # Cooldown check: Should not have logged on every single attempt
        # Even if multiple attempts ran, cooldown limits error logs
        assert len(test_logger.errors) <= 2
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_authenticated_mailbox_client_delete_envelope_behavior():
    """Verify _delete_envelope sends Bearer authorization and handles 204 success and >= 300 errors."""
    receiver_id = Identity.from_seed("receiver_seed_del_test", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.warnings = []
            self.debugs = []
        def debug(self, msg): self.debugs.append(msg)
        def warning(self, msg): self.warnings.append(msg)
        def error(self, msg): pass
        def info(self, msg): pass
        def exception(self, msg): self.warnings.append(msg)

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key="delete_test_token"
    )

    del_requests = []
    del_env_id = uuid.uuid4()
    random_err_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    mock_app = web.Application()
    async def mock_delete_handler(req):
        uuid_str = req.match_info["uuid"]
        del_requests.append((uuid_str, req.headers.get("Authorization")))
        if uuid_str == str(random_err_id):
            return web.Response(status=500, text="Internal delete error")
        return web.Response(status=204)

    mock_app.router.add_delete("/v2/agents/{address}/mailbox/{uuid}", mock_delete_handler)
    runner = web.AppRunner(mock_app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    config.base_url = f"127.0.0.1:{port}"
    config.http_prefix = "http"

    try:
        # 1. Successful 204 delete
        await client._delete_envelope(del_env_id)
        assert len(del_requests) == 1
        assert del_requests[0][0] == str(del_env_id)
        assert del_requests[0][1] == "Bearer delete_test_token"
        assert any(f"Successfully deleted envelope {del_env_id}" in d for d in test_logger.debugs)

        # 2. Failed delete (500)
        await client._delete_envelope(random_err_id)
        assert any("Failed to delete envelope" in w for w in test_logger.warnings)
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_single_mailbox_client_loop_execution():
    """Verify run() starts exactly one polling task and logs proper auth mode."""
    receiver_id = Identity.from_seed("receiver_seed_single_loop", 0)
    config = AgentverseConfig()

    class CaptureLogger:
        def __init__(self):
            self.infos = []
        def info(self, msg): self.infos.append(msg)
        def debug(self, msg): pass
        def warning(self, msg): pass
        def error(self, msg): pass
        def exception(self, msg): pass

    test_logger = CaptureLogger()
    client = AuthenticatedMailboxClient(
        identity=receiver_id,
        agentverse=config,
        logger=test_logger,
        mailbox_key="single_loop_key"
    )

    loop_called_count = 0
    async def mock_loop():
        nonlocal loop_called_count
        loop_called_count += 1
        while True:
            await asyncio.sleep(0.01)

    client._check_mailbox_loop = mock_loop

    await client.run()
    # Give event loop a cycle to schedule the task
    await asyncio.sleep(0.02)

    assert loop_called_count == 1
    assert any("Starting authenticated mailbox client" in info for info in test_logger.infos)
    assert any("auth mode: Bearer token" in info for info in test_logger.infos)
    assert "single_loop_key" not in test_logger.infos[0]



