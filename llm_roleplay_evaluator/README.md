# LLM 角色扮演能力評估程式

## 功能概述
本程式用於評估大型語言模型（LLM）的角色扮演能力，支援本地Ollama和線上OpenRouter兩種服務提供者。

## 架構設計
```
llm_roleplay_evaluator/
├── config/
│   ├── __init__.py
│   └── settings.py          # 環境變數讀取和設定
├── providers/
│   ├── __init__.py
│   ├── base.py              # 基礎API介面
│   ├── ollama_client.py     # Ollama客戶端
│   └── openrouter_client.py # OpenRouter客戶端
├── prompts/
│   ├── __init__.py
│   └── roleplay_prompts.py  # 角色扮演提示詞範例
├── evaluator/
│   ├── __init__.py
│   ├── test_runner.py       # 測試執行器
│   └── scoring.py           # 評分功能
├── data/
│   └── results/             # 測試結果儲存
├── main.py                  # 主程式
├── example_usage.py         # 使用範例
├── requirements.txt         # 依賴套件
└── .env.example            # 環境變數範例
```

## 核心功能

### 1. 多服務提供者支援
- **Ollama**: 本地部署的LLM服務
- **OpenRouter**: 線上LLM API服務

### 2. 角色扮演測試場景
- **歷史人物模擬** (孔子)
- **虛構角色模擬** (哈利波特)  
- **專業角色模擬** (心理醫生)

### 3. 自動化評分系統
- **角色一致性**: 檢查回應是否符合角色設定
- **流暢度**: 評估語言表達的自然程度
- **上下文連貫性**: 驗證對話的邏輯連貫性

### 4. 結果輸出與儲存
- 即時測試進度顯示
- JSON格式結果儲存
- 詳細統計分析報告

## 快速開始

### 1. 安裝依賴
```bash
pip install -r requirements.txt
```

### 2. 設定環境變數
複製 `.env.example` 為 `.env` 並設定您的API金鑰：
```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```env
# 服務提供者選擇 (ollama 或 openrouter)
LLM_PROVIDER=ollama

# Ollama 設定
OLLAMA_BASE_URL=http://localhost:11434
# 可選模型：gpt-oss:20b, qwen2.5:14b, mistral-nemo:12b
OLLAMA_MODEL=gpt-oss:20b

# OpenRouter 設定
OPENROUTER_API_KEY=your_openrouter_api_key_here
# 可選模型：gpt-oss:20b, qwen2.5:14b, mistral-nemo:12b
OPENROUTER_MODEL=gpt-oss:20b

# 測試參數
TEST_ROUNDS=3
MAX_TOKENS=500
TEMPERATURE=0.7
```

### 3. 執行測試

#### 單一場景測試
```bash
python main.py --scenario historical_figure --rounds 3
```

#### 全面測試（所有場景）
```bash
python main.py --comprehensive
```

#### 列出可用場景
```bash
python main.py --list-scenarios
```

### 4. 程式化使用
參考 `example_usage.py` 瞭解如何以程式方式使用評估工具。

## 評分標準說明

### 角色一致性 (40%)
- 關鍵詞匹配度
- 語義相似度
- 角色特質保持度

### 流暢度 (30%)  
- 句子結構完整性
- 回應長度適中性
- 語法錯誤檢查

### 上下文連貫性 (30%)
- 問題回應相關性
- 對話主題一致性
- 邏輯連貫性

## 支援的模型
程式設計為支援以下三款指定模型：
- `gpt-oss:20b`
- `qwen2.5:14b` 
- `mistral-nemo:12b`

但實際可透過環境變數設定任何支援的模型。

## 擴充性設計

### 新增服務提供者
1. 在 `providers/` 目錄建立新的客戶端類別
2. 繼承 `BaseLLMProvider` 基礎類別
3. 實作 `chat_completion` 和 `health_check` 方法

### 新增測試場景  
1. 在 `prompts/roleplay_prompts.py` 的 `ROLEPLAY_SCENARIOS` 字典中加入新場景
2. 包含完整的系統提示詞、起始問題和後續問題

### 自訂評分標準
修改 `evaluator/scoring.py` 中的評分方法來調整評分邏輯。

## 技術特色

- **模組化設計**: 各功能模組獨立，易於維護和擴充
- **錯誤處理**: 完善的異常處理和服務健康檢查
- **非同步處理**: 使用 asyncio 提升效能
- **配置驅動**: 透過環境變數靈活調整設定
- **結果持久化**: 自動儲存測試結果供後續分析

## 注意事項

1. 使用 OpenRouter 時需要有效的 API 金鑰
2. 使用 Ollama 時需要確保本地服務正常運行
3. 測試結果會自動儲存在 `data/results/` 目錄
4. 建議在測試前確認模型支援中文角色扮演能力

## 開發者指南

詳細的API文件和使用範例請參考原始碼註解和 `example_usage.py` 檔案。