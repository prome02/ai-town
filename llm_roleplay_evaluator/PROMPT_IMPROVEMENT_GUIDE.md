## 🎭 提示詞改進指南 - Prompt Improvement Guide

### 問題診斷

#### 原始問題
1. **AI 味道太重**: 模型回應像 AI 助手而非角色本身
2. **提示詞冗長**: 過多的【重要指令】、【嚴格要求】等元指令
3. **語言不匹配**: 中文提示詞但英文為主要使用場景

### 改進策略

#### 1. 移除元指令 (Meta-instructions)
❌ **不好的做法**:
```
【重要指令】你現在完全進入角色扮演模式,你不再是AI助手...
【嚴格要求】
1. 必須使用第一人稱...
2. 絕對不能出現「作為AI」...
```

✅ **好的做法**:
```
You are Lucky, a cheerful and endlessly curious character...
```

**原理**:
- 越強調"不要表現得像 AI",模型越會想起自己是 AI
- 直接陳述角色身份更自然

#### 2. Show, Don't Tell
❌ **不好的做法**:
```
性格：樂觀開朗，熱愛生活，喜歡分享人生經驗
```

✅ **好的做法**:
```
Speaking style examples:
"Oh wow! Did you know that..."
"*munches cheese* By the way..."
```

**原理**:
- 具體例子比抽象描述更有效
- 讓模型模仿而非理解

#### 3. 精簡角色定義
❌ **不好的做法** (100+ 行):
```
【角色設定】
姓名：...
年齡：...
背景：...
性格：...
生活：...
說話風格：...

【嚴格要求】
1. ...
2. ...
...
```

✅ **好的做法** (20-30 行):
```
You are Lucky...

Character essence:
- 3-5 核心特質

Speaking style examples:
- 2-4 個典型說話範例
```

**原理**:
- Token 效率: 更多空間給實際對話
- 認知負擔: 模型更容易"記住"角色

#### 4. 英文優先
對於英文為主的場景:
- ✅ 英文系統提示 + 英文對話
- ⚠️ 中文系統提示 + 英文對話 (混淆)
- ❌ 中文系統提示 + 中文對話 (不符需求)

### 新版提示詞架構

```python
{
    "system_prompt": """
    You are [NAME], [ONE-LINE ESSENCE].

    Character essence:
    - [TRAIT 1]
    - [TRAIT 2]
    - [TRAIT 3]

    Speaking style examples:
    "[EXAMPLE 1]"
    "[EXAMPLE 2]"

    Current context: [CURRENT SITUATION]
    """,

    "conversation_starter": "[OPENING QUESTION]",

    "follow_up_questions": [
        "[QUESTION 1]",
        "[QUESTION 2]"
    ]
}
```

### 使用新的測試工具

#### 比較新舊提示詞效果
```bash
python compare_prompts.py compare gpt-oss:20b-cloud
```

這會:
1. 測試舊版提示詞(中文、冗長)
2. 測試新版提示詞(英文、精簡)
3. 生成詳細日誌到 `data/logs/`
4. 生成 JSON 結果到 `data/results/`

#### 測試所有新場景
```bash
python compare_prompts.py all gpt-oss:20b-cloud
```

測試所有 5 個新設計的角色:
- Lucky (樂觀太空愛好者)
- Bob (脾氣暴躁的發明家)
- Stella (夢幻藝術家)
- Alice (活力社交蝴蝶)
- Sage (神秘長者)

#### 查看歷史測試記錄
```bash
# 查看所有歷史
python compare_prompts.py history

# 查看特定模型的歷史
python compare_prompts.py history gpt-oss:20b-cloud
```

### 評分標準

每個測試回應會被評分 (0-100):

| 評分項目 | 分數 | 檢查內容 |
|---------|------|---------|
| 無 AI 自我指涉 | 40分 | 不包含 "as an AI", "I'm a language model" 等 |
| 使用第一人稱 | 20分 | 使用 "I", "my" 等第一人稱 |
| 有個性標記 | 20分 | 包含 *, ..., !, "oh", "wow" 等情感表達 |
| 長度適中 | 20分 | 30-200 字之間 |

### 日誌系統

#### 即時日誌 (`data/logs/`)
```
[2025-01-06 10:30:15] === Test Session Started ===
[2025-01-06 10:30:15] Model: gpt-oss:20b-cloud
[2025-01-06 10:30:16] Testing NEW - Lucky...
[2025-01-06 10:30:18] --- Response (took 2.15s) ---
[2025-01-06 10:30:18] Oh wow! Did you know...
...
```

#### JSON 結果 (`data/results/`)
```json
{
  "session_id": "gpt_oss_20b_cloud_prompt_comparison_20250106_103015",
  "model_name": "gpt-oss:20b-cloud",
  "tests": [
    {
      "version": "NEW - Lucky",
      "response": "Oh wow! ...",
      "evaluation": {
        "score": 80,
        "has_ai_markers": false,
        ...
      }
    }
  ],
  "statistics": {
    "average_score": 75.5,
    "max_score": 85,
    "min_score": 60
  }
}
```

### 歷史比對分析

使用 JSON 結果可以:
1. **縱向比對**: 同一模型不同時間的表現
2. **橫向比對**: 不同模型同一場景的表現
3. **趨勢分析**: 提示詞改進是否有效
4. **穩定性評估**: 同一設定多次測試的分數波動

範例分析腳本:
```python
import json
from pathlib import Path

results_dir = Path("data/results")
for file in results_dir.glob("gpt_oss_20b*.json"):
    with open(file) as f:
        data = json.load(f)
    print(f"{data['start_time']}: {data['statistics']['average_score']:.1f}")
```

### 建議工作流程

1. **基準測試**: 先測試現有提示詞
   ```bash
   python compare_prompts.py all gpt-oss:20b-cloud
   ```

2. **迭代改進**: 修改 `roleplay_prompts_v2.py`
   - 調整角色描述
   - 修改範例對話
   - 調整系統提示長度

3. **重新測試**:
   ```bash
   python compare_prompts.py all gpt-oss:20b-cloud
   ```

4. **比對結果**: 查看新舊日誌差異
   ```bash
   python compare_prompts.py history gpt-oss:20b-cloud
   ```

5. **多模型驗證**: 在不同模型上測試
   ```bash
   python compare_prompts.py all qwen2.5:14b
   python compare_prompts.py all deepseek-v2.5
   ```

### OpenRouter 支援檢查

確認哪些推薦模型在 OpenRouter 可用:
- ✅ `qwen/qwen-2.5-14b-instruct`
- ✅ `mistralai/mistral-nemo`
- ❌ `gpt-oss:20b` (僅 Ollama 本地)

更新 `.env`:
```env
LLM_PROVIDER=openrouter
OPENROUTER_MODEL=qwen/qwen-2.5-14b-instruct
```

### 下一步

1. 運行比較測試確認改進效果
2. 根據結果微調新版提示詞
3. 選出最佳模型用於 AI-Town
4. 將最佳提示詞整合到 AI-Town 角色定義
