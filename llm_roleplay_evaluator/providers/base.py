from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseLLMProvider(ABC):
    """LLM 服務提供者基礎類別"""
    
    def __init__(self, model: str, max_tokens: int = 500, temperature: float = 0.7):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
    
    @abstractmethod
    async def chat_completion(self, messages: List[Dict[str, str]]) -> str:
        """發送聊天完成請求
        
        Args:
            messages: 訊息列表，包含角色和內容
            
        Returns:
            LLM 的回應內容
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """健康檢查
        
        Returns:
            bool: 服務是否正常
        """
        pass
    
    def _build_messages(self, system_prompt: str, user_message: str, conversation_history: List[Dict] = None) -> List[Dict]:
        """建立訊息格式
        
        Args:
            system_prompt: 系統提示詞
            user_message: 使用者訊息
            conversation_history: 對話歷史
            
        Returns:
            格式化後的訊息列表
        """
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": user_message})
        return messages

class LLMError(Exception):
    """LLM 相關錯誤"""
    pass

class ProviderUnavailableError(LLMError):
    """服務提供者不可用錯誤"""
    pass

class RateLimitError(LLMError):
    """速率限制錯誤"""
    pass