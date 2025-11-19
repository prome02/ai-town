import requests
import json
from typing import List, Dict, Any
from .base import BaseLLMProvider, LLMError, ProviderUnavailableError

class OllamaClient(BaseLLMProvider):
    """Ollama API 客戶端"""
    
    def __init__(self, base_url: str, model: str, max_tokens: int = 500, temperature: float = 0.7):
        super().__init__(model, max_tokens, temperature)
        self.base_url = base_url.rstrip('/')
        # 使用 OpenAI 兼容的 endpoint (角色扮演效果更好)
        self.chat_url = f"{self.base_url}/v1/chat/completions"
        self.generate_url = f"{self.base_url}/api/generate"

    async def chat_completion(self, messages: List[Dict[str, str]]) -> str:
        """使用 Ollama Chat API 進行對話完成 (OpenAI 兼容格式)"""
        try:
            # 使用 OpenAI 格式 (直接傳遞 messages,包含 system role)
            payload = {
                "model": self.model,
                "messages": messages,  # 直接使用完整 messages
                "stream": False,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature
            }

            response = requests.post(self.chat_url, json=payload, timeout=60)
            response.raise_for_status()

            result = response.json()
            # OpenAI 格式的回應結構
            return result["choices"][0]["message"]["content"]
            
        except requests.exceptions.ConnectionError:
            raise ProviderUnavailableError("無法連線到 Ollama 服務")
        except requests.exceptions.Timeout:
            raise LLMError("Ollama 請求超時")
        except requests.exceptions.RequestException as e:
            raise LLMError(f"Ollama 請求錯誤: {str(e)}")
        except KeyError as e:
            raise LLMError(f"Ollama 回應格式錯誤: {str(e)}")
    
    async def health_check(self) -> bool:
        """檢查 Ollama 服務健康狀態"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
    
    def list_models(self) -> List[str]:
        """列出可用的模型"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            response.raise_for_status()
            models_data = response.json()
            return [model["name"] for model in models_data.get("models", [])]
        except requests.exceptions.RequestException:
            return []