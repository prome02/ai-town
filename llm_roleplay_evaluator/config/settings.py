import os
from dotenv import load_dotenv

class LLMConfig:
    """LLM 設定管理類別"""
    
    def __init__(self):
        load_dotenv()
        self._validate_config()
    
    def _validate_config(self):
        """驗證必要的環境變數"""
        provider = self.provider
        if provider == "ollama":
            if not self.ollama_base_url:
                raise ValueError("OLLAMA_BASE_URL 環境變數未設定")
        elif provider == "openrouter":
            if not self.openrouter_api_key:
                raise ValueError("OPENROUTER_API_KEY 環境變數未設定")
        else:
            raise ValueError(f"不支援的服務提供者: {provider}")
    
    @property
    def provider(self):
        """取得服務提供者"""
        return os.getenv("LLM_PROVIDER", "ollama").lower()
    
    @property
    def ollama_base_url(self):
        """取得 Ollama 基礎 URL"""
        return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    @property
    def ollama_model(self):
        """取得 Ollama 模型名稱"""
        return os.getenv("OLLAMA_MODEL", "gpt-oss:20b")
    
    @property
    def openrouter_api_key(self):
        """取得 OpenRouter API 金鑰"""
        return os.getenv("OPENROUTER_API_KEY")
    
    @property
    def openrouter_model(self):
        """取得 OpenRouter 模型名稱"""
        return os.getenv("OPENROUTER_MODEL", "gpt-oss:20b")
    
    @property
    def test_rounds(self):
        """取得測試輪數"""
        return int(os.getenv("TEST_ROUNDS", "3"))
    
    @property
    def max_tokens(self):
        """取得最大 token 數"""
        return int(os.getenv("MAX_TOKENS", "500"))
    
    @property
    def temperature(self):
        """取得溫度參數"""
        return float(os.getenv("TEMPERATURE", "0.7"))
    
    @property
    def current_model(self):
        """取得當前使用的模型名稱"""
        if self.provider == "ollama":
            return self.ollama_model
        else:
            return self.openrouter_model

# 全域設定實例
config = LLMConfig()