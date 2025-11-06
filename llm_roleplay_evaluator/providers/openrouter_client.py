import requests
import json
from typing import List, Dict, Any
from .base import BaseLLMProvider, LLMError, RateLimitError

class OpenRouterClient(BaseLLMProvider):
    """OpenRouter API 客戶端"""
    
    def __init__(self, api_key: str, model: str, max_tokens: int = 500, temperature: float = 0.7):
        super().__init__(model, max_tokens, temperature)
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/your-repo/llm-roleplay-evaluator",
            "X-Title": "LLM Roleplay Evaluator"
        }
    
    async def chat_completion(self, messages: List[Dict[str, str]]) -> str:
        """使用 OpenRouter API 進行對話完成"""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "stream": False
            }
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 429:
                raise RateLimitError("OpenRouter 速率限制，請稍後再試")
            
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
            
        except requests.exceptions.Timeout:
            raise LLMError("OpenRouter 請求超時")
        except requests.exceptions.RequestException as e:
            raise LLMError(f"OpenRouter 請求錯誤: {str(e)}")
        except KeyError as e:
            raise LLMError(f"OpenRouter 回應格式錯誤: {str(e)}")
    
    async def health_check(self) -> bool:
        """檢查 OpenRouter 服務健康狀態"""
        try:
            response = requests.get(
                f"{self.base_url}/models",
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """取得可用的模型列表"""
        try:
            response = requests.get(
                f"{self.base_url}/models",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.exceptions.RequestException:
            return []
    
    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """取得特定模型的詳細資訊"""
        try:
            response = requests.get(
                f"{self.base_url}/models/{model_id}",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException:
            return {}