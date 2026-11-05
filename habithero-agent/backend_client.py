import logging
import asyncio
from typing import Optional, Dict, Any
import aiohttp
from config import BACKEND_URL, AGENT_SERVICE_SECRET, get_health_url

logger = logging.getLogger("HabitHeroBackendClient")

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
        health_url: Optional[str] = None
    ):
        self.backend_url = backend_url
        self.service_secret = service_secret
        self.health_url = health_url or get_health_url(self.backend_url)

    async def check_health(self, timeout_sec: float = 10.0) -> Dict[str, Any]:
        """
        Check whether the HabitHero backend API is running and reachable.
        Queries GET /api/health with a short timeout.
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.health_url,
                    timeout=aiohttp.ClientTimeout(total=timeout_sec)
                ) as resp:
                    if resp.status == 200:
                        try:
                            data = await resp.json()
                        except Exception:
                            data = {}
                        return {
                            "available": True,
                            "status": resp.status,
                            "data": data,
                        }
                    elif resp.status == 503:
                        # Service is up but degraded (e.g. database connecting)
                        try:
                            data = await resp.json()
                        except Exception:
                            data = {}
                        logger.warning(
                            f"HabitHero backend at {self.health_url} returned 503 degraded: {data}"
                        )
                        return {
                            "available": True,
                            "degraded": True,
                            "status": resp.status,
                            "data": data,
                        }
                    else:
                        error_body = await resp.text()
                        logger.warning(
                            f"Backend health check at {self.health_url} returned status {resp.status}: {error_body}"
                        )
                        return {
                            "available": False,
                            "status": resp.status,
                            "error": f"HTTP {resp.status}: {error_body}",
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
                f"HabitHero backend health check timed out after {timeout_sec}s at {self.health_url}"
            )
            return {
                "available": False,
                "error": f"Health check timed out after {timeout_sec}s",
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
        if not health.get("available"):
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

        # 2. Forward payload to backend chat endpoint
        payload = {
            "sender": sender,
            "message": message,
        }
        if conversation_id:
            payload["conversationId"] = conversation_id

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
                    timeout=aiohttp.ClientTimeout(total=45)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        backend_data = data.get("data", {})
                        logger.info(f"Successfully processed message for sender {sender}")
                        return {
                            "success": True,
                            "backend_available": True,
                            "reply": backend_data.get("reply", "Message processed."),
                            "conversationId": backend_data.get("conversationId"),
                            "toolsExecuted": backend_data.get("toolsExecuted", []),
                            "actionProposal": backend_data.get("actionProposal"),
                            "userId": backend_data.get("userId"),
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Backend returned status {response.status}: {error_text}")
                        if response.status == 401:
                            reply_msg = "HabitHero internal authorization failed. Please check the AGENT_SERVICE_SECRET configuration."
                        else:
                            reply_msg = "I encountered an issue processing your habits with my backend engine. Please try again."
                        return {
                            "success": False,
                            "backend_available": True,
                            "reply": reply_msg,
                            "error": f"HTTP {response.status}: {error_text}",
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
            logger.error(f"HabitHero backend request timed out at {self.backend_url}")
            return {
                "success": False,
                "backend_available": True,
                "reply": "My accountability engine is taking longer than usual to respond. Please try again in a moment.",
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
