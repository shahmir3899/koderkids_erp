"""
Unified LLM Client for AI Agent
================================
Supports multiple LLM backends:
- Ollama (local, for development)
- Groq (cloud, free tier available, for production)

The client automatically falls back to available providers.
"""

import json
import time
import logging
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)

# Groq API URL (constant)
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'


def get_config():
    """Get LLM configuration lazily to ensure Django settings are loaded."""
    return {
        'OLLAMA_HOST': getattr(settings, 'OLLAMA_HOST', 'http://localhost:11434'),
        'OLLAMA_MODEL': getattr(settings, 'OLLAMA_MODEL', 'deepseek-coder:6.7b'),
        'OLLAMA_TIMEOUT': getattr(settings, 'OLLAMA_TIMEOUT', 180),
        'GROQ_API_KEY': getattr(settings, 'GROQ_API_KEY', ''),
        'GROQ_MODEL': getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile'),
        'LLM_PROVIDER': getattr(settings, 'LLM_PROVIDER', 'ollama,groq'),
    }


class LLMClient:
    """
    Unified LLM client that supports multiple backends.

    Usage:
        client = LLMClient()
        result = client.generate_sync(prompt, system_prompt)

        if result['success']:
            action = result['parsed']  # Parsed JSON action
    """

    def __init__(self):
        self._ollama_available = None
        self._groq_available = None
        self._config = None

    @property
    def config(self):
        """Lazy load configuration."""
        if self._config is None:
            self._config = get_config()
        return self._config

    @property
    def providers(self):
        """Get provider list from config."""
        return [p.strip() for p in self.config['LLM_PROVIDER'].split(',')]

    def _check_ollama_available(self) -> bool:
        """Check if Ollama is available."""
        if self._ollama_available is not None:
            return self._ollama_available

        try:
            import requests
            ollama_host = self.config['OLLAMA_HOST']
            ollama_model = self.config['OLLAMA_MODEL']
            response = requests.get(f"{ollama_host}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = [m.get('name', '') for m in data.get('models', [])]
                self._ollama_available = any(ollama_model in m for m in models)
                if self._ollama_available:
                    logger.info(f"Ollama available with model: {ollama_model}")
                return self._ollama_available
        except Exception as e:
            logger.debug(f"Ollama not available: {e}")

        self._ollama_available = False
        return False

    def _check_groq_available(self) -> bool:
        """Check if Groq API key is configured."""
        if self._groq_available is not None:
            return self._groq_available

        groq_key = self.config['GROQ_API_KEY']
        self._groq_available = bool(groq_key and len(groq_key) > 10)
        if self._groq_available:
            logger.info("Groq API configured")
        else:
            logger.warning(f"Groq API key not configured or invalid (length: {len(groq_key) if groq_key else 0})")
        return self._groq_available

    def get_available_provider(self) -> Optional[str]:
        """Get the first available provider based on preference."""
        for provider in self.providers:
            if provider == 'ollama' and self._check_ollama_available():
                return 'ollama'
            elif provider == 'groq' and self._check_groq_available():
                return 'groq'
        return None

    def generate_sync(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.1,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Generate a response from the LLM using available provider.

        Returns:
            {
                "success": bool,
                "response": str,
                "parsed": dict,
                "error": str,
                "response_time_ms": int,
                "provider": str
            }
        """
        provider = self.get_available_provider()

        if not provider:
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": "No LLM provider available. Configure GROQ_API_KEY for production or run Ollama locally.",
                "response_time_ms": 0,
                "provider": None
            }

        if provider == 'ollama':
            result = self._generate_ollama(prompt, system_prompt, temperature, max_tokens)
        elif provider == 'groq':
            result = self._generate_groq(prompt, system_prompt, temperature, max_tokens)
        else:
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": f"Unknown provider: {provider}",
                "response_time_ms": 0,
                "provider": None
            }

        result['provider'] = provider
        return result

    def _generate_ollama(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Generate using Ollama."""
        import requests

        start_time = time.time()
        ollama_host = self.config['OLLAMA_HOST']
        ollama_model = self.config['OLLAMA_MODEL']
        ollama_timeout = self.config['OLLAMA_TIMEOUT']

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            logger.info(f"Ollama request - model: {ollama_model}")

            response = requests.post(
                f"{ollama_host}/api/chat",
                json={
                    "model": ollama_model,
                    "messages": messages,
                    "stream": False,
                    "keep_alive": "10m",
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                timeout=ollama_timeout
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
            parsed = self._parse_json_response(raw_response)

            return {
                "success": True,
                "response": raw_response,
                "parsed": parsed,
                "error": None,
                "response_time_ms": response_time_ms
            }

        except requests.Timeout:
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": "Ollama request timed out",
                "response_time_ms": int((time.time() - start_time) * 1000)
            }
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": str(e),
                "response_time_ms": int((time.time() - start_time) * 1000)
            }

    def _generate_groq(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Generate using Groq API."""
        import requests

        start_time = time.time()
        groq_api_key = self.config['GROQ_API_KEY']
        groq_model = self.config['GROQ_MODEL']

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            logger.info(f"Groq request - model: {groq_model}")

            response = requests.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": groq_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False
                },
                timeout=60
            )

            response_time_ms = int((time.time() - start_time) * 1000)

            if response.status_code != 200:
                error_text = response.text[:500] if response.text else "No response"
                logger.error(f"Groq error: {error_text}")
                return {
                    "success": False,
                    "response": None,
                    "parsed": None,
                    "error": f"Groq returned status {response.status_code}: {error_text}",
                    "response_time_ms": response_time_ms
                }

            data = response.json()

            # Check if Groq returned an error object (sometimes returns 200 with error)
            if 'error' in data:
                error_msg = data.get('error', {})
                if isinstance(error_msg, dict):
                    error_text = error_msg.get('message', str(error_msg))
                else:
                    error_text = str(error_msg)
                logger.error(f"Groq API error in response: {error_text}")
                return {
                    "success": False,
                    "response": None,
                    "parsed": None,
                    "error": f"Groq API error: {error_text}",
                    "response_time_ms": response_time_ms
                }

            raw_response = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            logger.info(f"Groq response (first 200 chars): {raw_response[:200]}")

            parsed = self._parse_json_response(raw_response)

            return {
                "success": True,
                "response": raw_response,
                "parsed": parsed,
                "error": None,
                "response_time_ms": response_time_ms
            }

        except requests.Timeout:
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": "Groq request timed out",
                "response_time_ms": int((time.time() - start_time) * 1000)
            }
        except Exception as e:
            logger.error(f"Groq error: {e}")
            return {
                "success": False,
                "response": None,
                "parsed": None,
                "error": str(e),
                "response_time_ms": int((time.time() - start_time) * 1000)
            }

    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """Extract and parse JSON from LLM response."""
        if not response:
            return None

        response = response.strip()

        # Remove markdown code blocks
        if '```' in response:
            import re
            code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
            matches = re.findall(code_block_pattern, response)
            if matches:
                response = matches[0].strip()

        # Try direct parse
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object
        try:
            start = response.find('{')
            end = response.rfind('}')
            if start != -1 and end != -1 and end > start:
                return json.loads(response[start:end + 1])
        except json.JSONDecodeError:
            pass

        # Try to find JSON array
        try:
            start = response.find('[')
            end = response.rfind(']')
            if start != -1 and end != -1 and end > start:
                return json.loads(response[start:end + 1])
        except json.JSONDecodeError:
            pass

        logger.warning(f"Could not parse JSON from response: {response[:200]}")
        return None


# Singleton instance
_client = None

def get_llm_client() -> LLMClient:
    """Get singleton LLM client instance."""
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
