import logging
from typing import Optional, Dict, Any
import aiohttp
from config import BACKEND_URL, AGENT_SERVICE_SECRET

logger = logging.getLogger("HabitHeroBackendClient")

class BackendClient:
    """
    Client for forwarding messages between the Fetch.ai uAgent and the HabitHero Node.js backend.
    Preserves sender identity isolation and secures service-to-service communication.
    """

    def __init__(self, backend_url: str = BACKEND_URL, service_secret: str = AGENT_SERVICE_SECRET):
        self.backend_url = backend_url
        self.service_secret = service_secret

    async def forward_to_backend(
        self,
        sender: str,
        message: str,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a chat message to the HabitHero backend and receive AI analysis & tool executions.
        """
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
                            "reply": backend_data.get("reply", "Message processed."),
                            "conversationId": backend_data.get("conversationId"),
                            "toolsExecuted": backend_data.get("toolsExecuted", []),
                            "actionProposal": backend_data.get("actionProposal"),
                            "userId": backend_data.get("userId"),
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Backend returned status {response.status}: {error_text}")
                        return {
                            "success": False,
                            "reply": "I encountered an issue checking your habits. My engine returned an error.",
                            "error": f"HTTP {response.status}: {error_text}",
                        }
        except aiohttp.ClientConnectorError as conn_err:
            logger.error(f"Cannot connect to HabitHero backend at {self.backend_url}: {conn_err}")
            return {
                "success": False,
                "reply": "I cannot reach the HabitHero backend right now. Please ensure the backend server is running on port 5000.",
                "error": str(conn_err),
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

