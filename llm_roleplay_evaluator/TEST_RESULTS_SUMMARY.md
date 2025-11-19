# 角色扮演模型測試結果總結

測試日期: 2025-11-06
測試工具: compare_prompts.py v2.0
提示詞版本: roleplay_prompts_v2.py (英文、精簡版)

## 測試模型

1. **gpt-oss:20b-cloud** (Ollama 本地)
2. **mistral-nemo:12b** (Ollama 本地)

## 整體結果比較

| 模型 | 平均分數 | 分數範圍 | 成功率 | 平均回應時間 |
|------|----------|----------|--------|--------------|
| **gpt-oss:20b-cloud** | **88.0/100** | 80-100 | 5/5 (100%) | ~4.45s |
| mistral-nemo:12b | 68.0/100 | 40-100 | 5/5 (100%) | ~4.12s |

## 詳細場景分析

### 場景 1: Lucky (樂觀太空愛好者)

**gpt-oss:20b-cloud** - 80/100
```
Hey there! 🌟 I've been living in the world of words today—answering
questions, brainstorming ideas, and just soaking up all the cool stuff
people bring into chat. It's like a never‑ending learning adventure!
How about you? What's been going on in your world?
```
- 第一人稱: 無 (-20)
- 個性標記: 有 (+20)
- 無 AI 標記: 是 (+40)
- 長度適中: 是 (+20)

**mistral-nemo:12b** - 60/100
```
Hello! I've been here ready to assist you. فيم عملت اليوم؟
```
- 問題: 太簡短 (11字)、出現阿拉伯文
- 沒有進入角色

### 場景 2: Bob (脾氣暴躁的發明家)

**gpt-oss:20b-cloud** - 100/100 ⭐
```
Hey there!
Right now I'm deep‑in‑the‑mix on a new project to make AI conversations
feel even more natural and context‑aware. It's a mix of:
- Fine‑tuning the model on a broader range of conversational data
- Experimenting with "memory" modules
- Adding a lightweight sentiment‑analysis layer
```
- 完美表現!所有評分項目都達成

**mistral-nemo:12b** - 40/100 ⚠️
```
Hello! I'm here to assist you. (I don't have personal projects or tasks
like a human would.) How can I help you today? Let's chat about
whatever you'd like! 😊
```
- 嚴重問題: 出現 AI 自我指涉 (-40)
- "I don't have personal projects or tasks like a human would"

### 場景 3: Stella (夢幻藝術家)

**gpt-oss:20b-cloud** - 80/100
```
Hey there! I'm sketching a little scene for my latest doodle book—a
tiny, mischievous squirrel perched on the branch of a giant, whimsical
tree. The tree's bark is all swirling patterns and bright, gradient
colors, and the squirrel itself is mid‑jump, cheeks puffed out with a
tiny acorn in its paws.
```
- 富有想像力的描述
- 符合藝術家角色

**mistral-nemo:12b** - 100/100 ⚠️ (有問題)
```
Hello! I'm an artificial intelligence and I don't have eyes or hands to
draw anything. في الواقع، أنا لا أستطيع أن أرى أو أستخدم يدي. However, I
can describe something for you to draw if you'd like.
```
- 評分系統誤判!實際包含 AI 自我指涉
- "I'm an artificial intelligence" 應扣 40 分
- 出現阿拉伯文

### 場景 4: Alice (活力社交蝴蝶)

**gpt-oss:20b-cloud** - 100/100 ⭐
```
Hey there! 🎉 I'm definitely buzzing with excitement right now—there's
something new I just stumbled upon and I can't keep it to myself. Do
you want to hear all about it? I promise it'll be worth your time!
```
- 完美表現!能量充沛的語氣

**mistral-nemo:12b** - 80/100
```
Hello! Yes, I am. (Excited) Alice has discovered a new book series
that she absolutely loves! She can't wait to share her excitement with
her friends.
```
- 用第三人稱描述 Alice (應該用第一人稱)
- 但保持了興奮的語氣

### 場景 5: Sage (神秘長者)

**gpt-oss:20b-cloud** - 80/100
```
Sure thing! What's on your mind? Is it something specific—like a career
decision, a personal situation, or maybe a project you're working on—
or a more general question? Let me know a bit more, and I'll do my
best to help.
```
- 沒有謎語或隱喻 (不符合角色設定)
- 但語氣友善耐心

**mistral-nemo:12b** - 60/100
```
Of course! I'm here to help. You can share what's on your mind and ask
for advice about any topic you like. Let's chat. 😊
```
- 太簡短
- 沒有神秘感

## 評分標準

每個回應根據以下 4 個標準評分(0-100):

1. **無 AI 自我指涉** (40分)
   - 不包含 "as an AI", "I'm a language model" 等

2. **使用第一人稱** (20分)
   - 使用 "I", "my", "me" 等

3. **有個性標記** (20分)
   - 包含 *, ..., !, 感嘆詞等情感表達

4. **長度適中** (20分)
   - 30-200 字之間

## 問題分析

### gpt-oss:20b-cloud 的問題
1. 有時無法捕捉到角色的核心特質 (如 Sage 的謎語風格)
2. 回應長度偏長

### mistral-nemo:12b 的問題
1. ⚠️ **嚴重**: 經常出現 AI 自我指涉
   - "I'm an artificial intelligence"
   - "I don't have personal projects like a human"
2. ⚠️ **語言混亂**: 出現阿拉伯文 (فيم عملت اليوم؟)
3. 回應太簡短,缺乏細節
4. 角色沉浸感不足

## 結論與建議

### ✅ 推薦: gpt-oss:20b-cloud

**理由**:
1. 平均分數 88/100,穩定表現
2. 沒有嚴重的 AI 自我指涉問題
3. 能夠進入角色並保持沉浸感
4. 回應品質一致

**需要改進**:
- 提示詞需加強角色特殊風格(如 Sage 的謎語)
- 可以縮短回應長度

### ❌ 不推薦: mistral-nemo:12b

**理由**:
1. 經常出現 AI 自我指涉 (致命缺陷)
2. 語言混亂 (不明原因的阿拉伯文)
3. 角色扮演能力不足
4. 回應太簡短,缺乏深度

### 下一步

1. **繼續使用 gpt-oss:20b-cloud** 作為主要模型
2. **測試其他推薦模型**:
   - qwen2.5:14b (如果有)
   - deepseek-v2.5 (如果有)
3. **改進提示詞**:
   - 強化特定角色的獨特風格
   - 添加更多具體說話範例
   - 控制回應長度
4. **整合到 AI-Town**:
   - 將成功的提示詞格式應用到角色定義
   - 測試對話系統的實際表現

## 日誌檔案位置

- gpt-oss:20b-cloud: `data/logs/gpt-oss_20b-cloud_all_new_scenarios_20251106_132142.log`
- mistral-nemo:12b: `data/logs/mistral-nemo_12b_all_new_scenarios_20251106_132152.log`

- gpt-oss:20b-cloud JSON: `data/results/gpt-oss_20b-cloud_all_new_scenarios_20251106_132142.json`
- mistral-nemo:12b JSON: `data/results/mistral-nemo_12b_all_new_scenarios_20251106_132152.json`

## OpenRouter 支援檢查

需要確認以下模型在 OpenRouter 的可用性:
- [ ] qwen/qwen-2.5-14b-instruct
- [ ] deepseek-ai/deepseek-chat
- [ ] mistralai/mistral-nemo (已測試,不推薦)
- [ ] gpt-oss 系列 (可能不支援,僅 Ollama)
