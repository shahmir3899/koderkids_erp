"""
Ollama Client for AI Agent
==========================
Handles communication with Ollama LLM server.
Uses phi3:mini model for fast, low-memory inference.
"""

import json
import httpx
import asyncio
from typing import Optional, Dict, Any
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_HOST = getattr(settings, 'OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_MODEL = getattr(settings, 'OLLAMA_MODEL', 'phi3:mini')
OLLAMA_TIMEOUT = getattr(settings, 'OLLAMA_TIMEOUT', 60)  # seconds


class OllamaClient:
    """
    Client for interacting with Ollama LLM server.

    Usage:
        client = OllamaClient()

        # Check if available
        if await client.is_available():
            response = await client.generate(prompt, system_prompt)
    """

    def __init__(self, host: str = None, model: str = None):
        self.host = host or OLLAMA_HOST
        self.model = model or OLLAMA_MODEL
        self.base_url = f"{self.host}/api"

    async def is_available(self) -> bool:
        """Check if Ollama server is running and model is loaded."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get('name', '') for m in data.get('models', [])]
                    # Check if our model is available
                    return any(self.model in m for m in models)
                return False
        except Exception as e:
            logger.warning(f"Ollama not available: {e}")
            return False

    def is_available_sync(self) -> bool:
        """Synchronous version of is_available."""
        try:
            import requests
            logger.info(f"Checking Ollama availability at {self.base_url}/tags")
            response = requests.get(f"{self.base_url}/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = [m.get('name', '') for m in data.get('models', [])]
                logger.info(f"Ollama available models: {models}")
                is_available = any(self.model in m for m in models)
                logger.info(f"Model '{self.model}' available: {is_available}")
                return is_available
            logger.warning(f"Ollama tags endpoint returned status {response.status_code}")
            return False
        except Exception as e:
            logger.warning(f"Ollama not available (sync): {e}")
            return False

    async def generate(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.1,  # Low for consistent JSON output
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Generate a response from the LLM.

        Args:
            prompt: User's message/command
            system_prompt: System instructions (for JSON output format)
            temperature: Creativity level (0.0-1.0)
            max_tokens: Maximum response length

        Returns:
            {
                "success": bool,
                "response": str,  # Raw LLM response
                "parsed": dict,   # Parsed JSON (if valid)
                "error": str,     # Error message (if failed)
                "response_time_ms": int
            }
        """
        import time
        start_time = time.time()

        try:
            # Build messages
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            # Make request to Ollama
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                response = await client.post(
                    f"{self.base_url}/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    }
                )

                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code != 200:
                    return {
                        "success": False,
                        "response": None,
                        "parsed": None,
                        "error": f"Ollama returned status {response.status_code}",
                        "response_time_ms": response_time_ms
                    }

                data = response.json()
                raw_response = data.get('message', {}).get('content', '')

                # Try to parse as JSON
                parsed = self._parse_json_response(raw_response)

                return {
                    "success": True,
                    "response": raw_response,
                    "parsed": parsed,
                    "error": None,
                    "response_time_ms": response_time_ms
                }

        except httpx.TimeoutException:
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": "Ollama request timed out",
                "response_time_ms": int((time.time() - start_time) * 1000)
            }
        except Exception as e:
            logger.error(f"Ollama generate error: {e}")
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": str(e),
                "response_time_ms": int((time.time() - start_time) * 1000)
            }

    def generate_sync(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.1,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """Synchronous version of generate."""
        import time
        import requests

        start_time = time.time()

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            logger.info(f"Ollama request - model: {self.model}, prompt length: {len(prompt)}")

            response = requests.post(
                f"{self.base_url}/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "keep_alive": "10m",  # Keep model loaded for 10 minutes
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                timeout=OLLAMA_TIMEOUT
            )

            response_time_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Ollama response - status: {response.status_code}, time: {response_time_ms}ms")

            if response.status_code != 200:
                error_text = response.text[:500] if response.text else "No response body"
                logger.error(f"Ollama error response: {error_text}")
                return {
                    "success": False,
                    "response": None,
                    "parsed": None,
                    "error": f"Ollama returned status {response.status_code}: {error_text}",
                    "response_time_ms": response_time_ms
                }

            data = response.json()
            raw_response = data.get('message', {}).get('content', '')
            logger.info(f"Ollama raw response (first 200 chars): {raw_response[:200]}")

            parsed = self._parse_json_response(raw_response)
            logger.info(f"Ollama parsed response: {parsed}")

            return {
                "success": True,
                "response": raw_response,
                "parsed": parsed,
                "error": None,
                "response_time_ms": response_time_ms
            }

        except requests.Timeout:
            logger.error("Ollama request timed out")
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": "Ollama request timed out",
                "response_time_ms": int((time.time() - start_time) * 1000)
            }
        except requests.ConnectionError as e:
            logger.error(f"Ollama connection error: {e}")
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": f"Cannot connect to Ollama: {str(e)}",
                "response_time_ms": int((time.time() - start_time) * 1000)
            }
        except Exception as e:
            logger.error(f"Ollama generate_sync error: {e}", exc_info=True)
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": str(e),
                "response_time_ms": int((time.time() - start_time) * 1000)
            }

    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """
        Extract and parse JSON from LLM response.
        Handles cases where LLM might include extra text around JSON.
        """
        if not response:
            return None

        # Clean the response
        response = response.strip()

        # Remove markdown code blocks (```json ... ```)
        if '```' in response:
            # Extract content between code blocks
            import re
            code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
            matches = re.findall(code_block_pattern, response)
            if matches:
                response = matches[0].strip()

        # Try direct parse first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object in response
        try:
            # Find first { and last }
            start = response.find('{')
            end = response.rfind('}')

            if start != -1 and end != -1 and end > start:
                json_str = response[start:end + 1]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Try to find JSON array
        try:
            start = response.find('[')
            end = response.rfind(']')

            if start != -1 and end != -1 and end > start:
                json_str = response[start:end + 1]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        logger.warning(f"Could not parse JSON from response: {response[:200]}")
        return None


# Singleton instance
_client = None

def get_ollama_client() -> OllamaClient:
    """Get singleton Ollama client instance."""
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client
