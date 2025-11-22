這是一份基於我們所有討論內容所整理的完整**軟體需求規格書 (Software Requirements Specification, SRS)**。這份文件將作為您開發 **"DramaVille" MVP (最小可行性產品)** 的藍圖。

---

# 軟體需求規格書 (SRS)
## 專案名稱：DramaVille (AI 互動式情境劇模擬器)
**版本：** 1.0 MVP
**日期：** 2025-11-20

---

## 1. 專案概述 (Project Overview)

### 1.1 產品目標
構建一個由 6-10 名 AI Agent 組成的虛擬小鎮，模擬連續劇般的互動情境。使用者作為「觀眾」兼「上帝」，可以觀看 AI 角色之間的愛恨情仇，並透過間接手段（修改環境、植入思維）干預劇情發展。

### 1.2 核心差異化 (Unique Selling Points)
1.  **氛圍優先視覺 (Atmosphere-First Visuals)：** 摒棄傳統像素遊戲的移動畫面，採用「視覺小說」形式。利用 AI 生成抽象、具象徵意義或背影的插圖來表達當下情境，解決 AI 人臉不一致的問題。
2.  **混合模型架構 (Hybrid AI Architecture)：** 採用「導演 (邏輯) - 演員 (扮演) - 攝影師 (視覺)」三權分立的架構，利用不同 LLM 的強項。
3.  **上帝視角干預 (God Mode)：** 玩家不直接扮演角色，而是透過「環境投放」與「思維植入」來間接影響蝴蝶效應。

---

## 2. 系統架構設計 (System Architecture)

系統採用 **Python (Backend)** + **Streamlit (Frontend)** + **Ollama (LLM Inference)** 的架構。

### 2.1 核心 AI 模組 (The Dream Team)

| 模組名稱 | 角色職責 | 推薦模型 (Provider: Ollama) | 輸入/輸出 |
| :--- | :--- | :--- | :--- |
| **The Director**<br>(大腦/邏輯) | **總導演**<br>負責場景調度、記憶檢索、處理上帝指令、決定下一位發言者。 | **DeepSeek-v3.1** (Cloud)<br>*(或 Qwen 2.5 72B)* | **Input:** 歷史對話, 上帝指令<br>**Output:** JSON (意圖、氣氛、下一位講者) |
| **The Actors**<br>(靈魂/扮演) | **演員**<br>負責將導演的指令轉化為具體台詞，包含內心戲與動作。 | **gpt-oss:20b** (Cloud)<br>*(或 Mistral-Nemo 12B Local)* | **Input:** 角色設定, 導演指令<br>**Output:** JSON (內心獨白, 動作, 對白) |
| **The Cinematographer**<br>(視覺/美學) | **攝影師**<br>監聽劇情，將文字情境轉譯為 Stable Diffusion 提示詞。 | **Gemini-3-pro** (Cloud)<br>*(或 Llava Local)* | **Input:** 當前對話, 視覺標籤<br>**Output:** Image Prompt (EN) |
| **The Illustrator**<br>(繪圖引擎) | **繪圖師**<br>根據提示詞生成圖片。 | **Stable Diffusion XL / 1.5**<br>*(via WebUI API)* | **Input:** Image Prompt<br>**Output:** Image (PNG/JPG) |

### 2.2 資料流 (Data Flow)
1.  **初始化：** 載入角色 Profile (JSON) 與初始場景。
2.  **回合開始 (Turn Loop)：**
    *   **Backend:** 彙整最近 5-10 句對話紀錄 + 玩家輸入的上帝指令。
    *   **Director:** 思考並輸出 `Plan JSON`。
    *   **Actor:** 根據 `Plan` 演出，輸出 `Dialogue JSON`。
    *   **Cinematographer:** (若 Director 標記 `new_visual=True`) 生成 `Image Prompt`。
    *   **Illustrator:** 呼叫 SD API 生成圖片 (非同步處理)。
3.  **前端更新：** Streamlit 刷新介面，顯示最新圖片與對話。

---

## 3. 功能需求 (Functional Requirements)

### 3.1 模擬核心 (Simulation Core)
*   **FR-01 自動演繹：** 系統應能自動讓角色輪流發言，無需玩家操作即可推進劇情。
*   **FR-02 記憶系統 (Memory Stream)：** 每個角色需擁有短期記憶（當前場景對話）與長期記憶（摘要）。
*   **FR-03 角色一致性：** 角色必須依照設定檔（Personality, Speaking Style）發言，不得跳脫人設（OOC）。

### 3.2 視覺呈現 (Visual Engine)
*   **FR-04 氛圍生成：** 圖片生成不應頻繁出現角色正面特寫。策略應包含：背影、剪影、局部特寫（手部/物件）、空鏡頭（天氣/環境）。
*   **FR-05 惰性渲染 (Lazy Rendering)：** 僅在「場景切換」、「情緒劇烈轉折」或「新物件出現」時才重新生成圖片，避免畫面閃爍與資源浪費。

### 3.3 上帝視角互動 (Interactivity)
*   **FR-06 環境干預 (Environmental Injection)：**
    *   玩家可輸入指令：「在 [地點] 放置 [物件]，附註 [訊息]」。
    *   系統需將此物件寫入該場景的 Context，角色感知後需做出反應。
    *   *範例：* 放一束花在門口，署名 B。
*   **FR-07 思維植入 (Cognitive Inception)：**
    *   玩家可輸入指令：「對 [角色] 植入念頭：[內容]」。
    *   系統需將此念頭標記為「高權重」並插入該角色的思考流程。
    *   *範例：* 讓 A 突然懷疑 B 在說謊。

---

## 4. 資料結構設計 (Data Structures)

### 4.1 角色設定檔 (Character Profile JSON)
```json
{
  "id": "char_001",
  "name": "Detective Ray",
  "role": "主角/偵探",
  "personality": "多疑, 煙癮重, 講話簡短, 厭惡權威",
  "visual_tags": {
    "basic": "man, trench coat, messy hair, stubble",
    "silhouette": "tall shadow, cigarette smoke",
    "color_theme": "noir, cool blue, desaturated"
  },
  "relationships": {
    "char_002": "Distrust",
    "char_003": "Secretly in love"
  }
}
```

### 4.2 導演輸出格式 (Director Plan JSON)
```json
{
  "next_speaker": "char_001",
  "intent": "質疑對方為什麼出現在這裡",
  "god_instruction_processed": true,  // 是否處理了上帝指令
  "scene_mood": "Tense",
  "trigger_new_visual": true // 是否需要重繪場景
}
```

### 4.3 演員輸出格式 (Actor Dialogue JSON)
```json
{
  "inner_monologue": "這傢伙在說謊，他的眼神在飄...",
  "action": "把手放在槍套上",
  "dialogue": "省省吧。這裡不是你該來的地方。"
}
```

---

## 5. 使用者介面設計 (UI Design)

介面基於 **Streamlit** 開發，佈局如下：

### 5.1 主畫面 (Main Stage)
*   **頂部 (60% 高度)：** 大型圖片顯示區。
    *   圖片需支援 `Fade-in` 轉場效果（若技術可行）。
    *   圖片下方顯示一句簡短的場景描述 (Caption)。
*   **底部 (40% 高度)：** 對話紀錄區 (Scrollable)。
    *   格式：`[頭像] 角色名: 對白`。
    *   樣式：類似聊天室或視覺小說的對話框。

### 5.2 側邊欄 (Control Panel)
*   **上帝控制台：**
    *   下拉選單：選擇干預類型 (環境/思維)。
    *   輸入框：輸入干預內容。
    *   目標選擇：選擇針對的角色。
*   **系統狀態：**
    *   顯示目前回合數。
    *   "Next Turn" 按鈕 (手動推進模式)。
    *   "Auto Play" 開關 (自動播放模式)。

### 5.3 除錯面板 (Debug Expander)
*   折疊式選單，展開後可見：
    *   Director 的思考 JSON。
    *   Actor 的內心獨白 (Inner Monologue)。
    *   生成的 Image Prompt。

---

## 6. 技術限制與非功能需求 (Constraints & NFR)

1.  **回應速度：**
    *   文字生成需在 3-5 秒內完成。
    *   圖片生成允許延遲 (5-10 秒)，在圖片生成完成前，顯示上一張圖片或過渡圖。
2.  **圖像一致性策略：**
    *   Prompt 必須包含 `back view`, `silhouette`, `blurred face` 等關鍵詞作為 Negative Prompt 的對立面，防止生成崩壞的人臉。
3.  **Prompt 安全性：**
    *   系統需在 System Prompt 中強制要求 JSON 格式，並包含 Error Handling 機制（若 JSON 解析失敗，自動重試一次）。

---

## 7. 開發階段規劃 (Roadmap)

### Phase 1: 文字邏輯驗證 (1週)
*   搭建 Ollama + LangChain 環境。
*   實作 Director 與 Actor 的 Prompt Engineering。
*   驗證 DeepSeek 與 gpt-oss 的 JSON 輸出穩定性。
*   **交付物：** 純文字版模擬器，能正確跑出劇情與內心戲。

### Phase 2: 視覺引擎串接 (1週)
*   搭建 Stable Diffusion API (或 Mock API)。
*   實作 Gemini 的「視覺轉譯」Prompt。
*   整合 Streamlit 顯示圖片。
*   **交付物：** 能根據劇情變換圖片的 MVP。

### Phase 3: 互動與優化 (1週)
*   實作「上帝視角」的兩種干預功能。
*   調整 UI/UX，增加自動播放功能。
*   壓力測試 (長對話後的記憶遺忘問題)。
*   **交付物：** 完整可演示的 DramaVille v1.0。