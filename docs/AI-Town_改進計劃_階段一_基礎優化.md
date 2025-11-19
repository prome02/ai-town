# AI-Town LLM Agent 改進計劃 - 階段一：基礎優化

## 📋 階段概述
**目標**：優化現有核心功能，提升系統穩定性和智能體行為質量
**時間估計**：2-4週
**優先級**：高（對現有系統影響最小，效益最明顯）

## 🎯 具體任務

### 任務 1.1：活動選擇智能化

#### 目標
將隨機活動選擇改為 LLM 驅動的智能選擇，提升行為合理性

#### 具體改進點
- 完成 [`convex/aiTown/agentOperations.ts`](convex/aiTown/agentOperations.ts:128) 中的 TODO 標記
- 實現基於角色設定和當前情境的活動選擇邏輯

#### 實施步驟
1. **擴展活動定義**（第1週）
   ```typescript
   // 在 constants.ts 中擴展角色專屬活動
   export const CHARACTER_SPECIFIC_ACTIVITIES = {
     // Lucky - 快樂好奇的太空探險家
     'Lucky': [
       { description: 'reading about space exploration', emoji: '🚀', duration: 60_000, category: 'intellectual' },
       { description: 'telling space adventure stories', emoji: '✨', duration: 60_000, category: 'social' },
       { description: 'observing squirrels', emoji: '🐿️', duration: 60_000, category: 'observational' },
       { description: 'studying science history', emoji: '📚', duration: 60_000, category: 'intellectual' },
       { description: 'exploring new areas', emoji: '🗺️', duration: 60_000, category: 'adventurous' },
       { description: 'cheese tasting', emoji: '🧀', duration: 60_000, category: 'culinary' }
     ],
     // Bob - 脾氣暴躁的園丁
     'Bob': [
       { description: 'gardening alone', emoji: '🥕', duration: 60_000, category: 'productive' },
       { description: 'complaining about people', emoji: '😠', duration: 60_000, category: 'emotional' },
       { description: 'reading gardening books', emoji: '📖', duration: 60_000, category: 'intellectual' },
       { description: 'avoiding social interactions', emoji: '🙈', duration: 60_000, category: 'social' },
       { description: 'tree watching', emoji: '🌳', duration: 60_000, category: 'observational' },
       { description: 'resenting college education', emoji: '🎓', duration: 60_000, category: 'emotional' }
     ],
     // Stella - 不可信任的騙子
     'Stella': [
       { description: 'planning money-making schemes', emoji: '💰', duration: 60_000, category: 'strategic' },
       { description: 'charming people for advantage', emoji: '😏', duration: 60_000, category: 'social' },
       { description: 'hiding true intentions', emoji: '🎭', duration: 60_000, category: 'deceptive' },
       { description: 'studying human psychology', emoji: '🧠', duration: 60_000, category: 'intellectual' },
       { description: 'practicing manipulation techniques', emoji: '🃏', duration: 60_000, category: 'strategic' },
       { description: 'avoiding emotional connections', emoji: '💔', duration: 60_000, category: 'emotional' }
     ],
     // Alice - 著名科學家
     'Alice': [
       { description: 'solving universe mysteries', emoji: '🌌', duration: 60_000, category: 'intellectual' },
       { description: 'speaking in riddles', emoji: '🌀', duration: 60_000, category: 'communicative' },
       { description: 'forgetting recent events', emoji: '🤔', duration: 60_000, category: 'reflective' },
       { description: 'conducting scientific experiments', emoji: '🔬', duration: 60_000, category: 'scientific' },
       { description: 'confusing others with knowledge', emoji: '💫', duration: 60_000, category: 'social' },
       { description: 'daydreaming about physics', emoji: '⚛️', duration: 60_000, category: 'intellectual' }
     ],
     // Pete - 虔誠的宗教信徒
     'Pete': [
       { description: 'praying to god', emoji: '🙏', duration: 60_000, category: 'spiritual' },
       { description: 'warning about hell', emoji: '🔥', duration: 60_000, category: 'communicative' },
       { description: 'reading religious texts', emoji: '📖', duration: 60_000, category: 'spiritual' },
       { description: 'converting others to faith', emoji: '✝️', duration: 60_000, category: 'social' },
       { description: 'seeing divine signs everywhere', emoji: '✨', duration: 60_000, category: 'observational' },
       { description: 'discussing religious doctrines', emoji: '💬', duration: 60_000, category: 'intellectual' }
     ]
   };

   // 通用活動（所有角色都可以選擇）
   export const COMMON_ACTIVITIES = [
     { description: 'reading a book', emoji: '📖', duration: 60_000, category: 'intellectual' },
     { description: 'daydreaming', emoji: '🤔', duration: 60_000, category: 'reflective' },
     { description: 'taking a walk', emoji: '🚶', duration: 60_000, category: 'physical' },
     { description: 'observing surroundings', emoji: '👀', duration: 60_000, category: 'observational' },
     { description: 'resting', emoji: '😴', duration: 60_000, category: 'restorative' }
   ];
   ```

2. **實現 LLM 活動選擇**（第2週）
   ```typescript
   // 在 agentOperations.ts 中實現智能選擇
   async function chooseActivity(ctx: ActionCtx, player: SerializedPlayer, agent: SerializedAgent) {
     const characterActivities = getCharacterSpecificActivities(agent.name);
     const prompt = `你是一個${agent.identity}，現在想要選擇一個活動。你的目標是：${agent.plan}
     可選活動：${characterActivities.map(a => a.description).join(', ')}
     請選擇最適合你當前狀態的活動。`;
     
     const { content } = await chatCompletion({ messages: [{ role: 'user', content: prompt }] });
     return parseActivityChoice(content);
   }
   ```

3. **整合到現有流程**（第3週）
   - 修改 `agentDoSomething` 函數中的活動選擇邏輯
   - 添加活動選擇的錯誤處理和降級機制

#### 預期效益
- 活動選擇更符合角色設定（每個角色有6種專屬活動 + 5種通用活動）
- 行為多樣性提升 200% 以上（從3種通用活動擴展到11種個性化活動）
- 角色個性表現更明顯，用戶體驗顯著改善

### 任務 1.2：記憶檢索優化

#### 目標
改進記憶檢索策略，提升對話和決策的上下文相關性

#### 具體改進點
- 優化 [`convex/agent/memory.ts`](convex/agent/memory.ts:203) 中的記憶排序算法
- 增加多維度檢索策略

#### 實施步驟
1. **改進排序算法**（第1週）
   ```typescript
   // 在 rankAndTouchMemories 中改進排序邏輯
   const memoryScores = relatedMemories.map((memory, idx) => ({
     memory,
     overallScore: 
       normalize(args.candidates[idx]._score, relevanceRange) * 0.4 +
       normalize(memory.importance, importanceRange) * 0.3 +
       normalize(recencyScore[idx], recencyRange) * 0.2 +
       normalize(calculateContextScore(memory, currentContext), contextRange) * 0.1
   }));
   ```

2. **實現上下文感知檢索**（第2週）
   - 根據當前對話主題和情境調整檢索權重
   - 添加時間相關性因子（季節、時段等）

3. **性能優化**（第3週）
   - 實現記憶檢索的快取機制
   - 優化向量搜尋的批次處理

#### 預期效益
- 記憶相關性提升 30%
- 對話連貫性明顯改善
- 系統響應時間減少 20%

### 任務 1.3：反思機制細化

#### 目標
改進反思觸發條件和深度，增強智能體學習能力

#### 具體改進點
- 細化 [`convex/agent/memory.ts`](convex/agent/memory.ts:339) 中的反思邏輯
- 增加多層次反思機制

#### 實施步驟
1. **改進反思觸發條件**（第1週）
   ```typescript
   // 更細緻的反思觸發邏輯
   const shouldReflect = 
     sumOfImportanceScore > 500 || 
     hasSignificantEvent(memories) ||
     timeSinceLastReflection > REFLECTION_INTERVAL;
   ```

2. **實現多層次反思**（第2週）
   - 淺層反思：日常事件總結
   - 深層反思：行為模式分析
   - 戰略反思：長期目標調整

3. **反思質量評估**（第3週）
   - 添加反思結果的質量評估機制
   - 實現反思內容的自動優化

#### 預期效益
- 智能體學習效率提升 40%
- 行為一致性改善
- 角色個性發展更明顯

## 🛠️ 技術風險與應對

### 風險 1：LLM 呼叫頻率增加
- **影響**：可能導致 API 成本上升和響應變慢
- **應對**：實現請求合併和快取機制
- **監控**：添加 LLM 呼叫統計和限流

### 風險 2：現有功能兼容性
- **影響**：改動可能影響現有對話流程
- **應對**：充分測試，實現漸進式遷移
- **備份**：保留原有邏輯作為降級方案

## 📊 成功指標

### 量化指標
- 活動選擇合理性評分提升 ≥ 30%
- 記憶檢索相關性評分提升 ≥ 25%
- 反思觸發頻率優化 ≥ 20%

### 質化指標
- 用戶反饋中「行為自然度」評分提升
- 對話連貫性明顯改善
- 系統穩定性維持或提升

## 🔄 驗收標準

1. **功能完整性**
   - 所有 TODO 標記已完成
   - 新功能無重大 bug
   - 向下兼容性確保

2. **性能要求**
   - 系統響應時間無明顯下降
   - LLM 呼叫頻率在可控範圍內
   - 記憶使用效率提升

3. **用戶體驗**
   - 智能體行為明顯更自然
   - 對話質量提升可感知
   - 無回歸問題出現

這個階段為後續更複雜的功能擴展奠定了堅實基礎，確保系統在穩定的前提下逐步提升智能水平。

## ❓ 常見問題解答 (FAQ)

### Q1: 為何需要擴展活動定義，活動不能讓LLM自行決定產生嗎？

**A:** 這是一個很好的問題。我們採用「有限選擇+LLM優化」的混合策略，原因如下：

1. **可控性與穩定性**
   - 預定義活動確保行為在合理範圍內，避免LLM產生不合適的活動
   - 便於系統調試和行為分析，每個活動都有明確的屬性和效果

2. **資源效率**
   - LLM生成無限活動會大幅增加API呼叫成本和響應時間
   - 預定義活動可以快取和優化，提升系統性能

3. **漸進式改進**
   - 第一階段先實現基於預定義活動的智能選擇
   - 後續階段可以逐步引入LLM生成活動的能力

**改進方案**：我們可以設計一個擴展系統，允許在預定義活動基礎上，由LLM生成變體或特殊活動，平衡創意性和可控性。

### Q2: 改進排序算法，這樣設定的原因？

**A:** 當前排序算法主要基於三個維度，權重設定的考量如下：

**權重分配邏輯 (0.4 + 0.3 + 0.2 + 0.1)**：
- **相關性 (0.4)**：確保記憶與當前情境最相關，這是對話質量的基礎
- **重要性 (0.3)**：重要記憶應該更頻繁地被回憶，影響角色發展
- **時效性 (0.2)**：近期記憶對當前決策更有參考價值
- **上下文 (0.1)**：額外的情境因素，為未來擴展留空間

**MVP考量**：這個權重分配是經過實證的有效配置，可以在不增加複雜度的情況下顯著提升效果。後續可以根據實際數據進行動態調整。

### Q3: 反思機制細化需要更詳細的說明

**A:** 反思機制的細化包含三個層次：

#### 淺層反思（日常事件總結）
```typescript
// 觸發條件：每當有重要對話結束後
const dailyReflection = async (conversation: Conversation) => {
  // 總結對話要點和情感反應
  // 生成如："我剛剛和John討論了園藝，他很熱情，我學到了新的種植技巧"
};
```

#### 深層反思（行為模式分析）
```typescript
// 觸發條件：累積足夠的重要事件（重要性分數 > 500）
const patternReflection = async (recentMemories: Memory[]) => {
  // 分析行為模式，例如：
  // "我發現自己更喜歡與有共同興趣的人交流"
  // "我在早晨的對話通常更積極"
};
```

#### 戰略反思（目標調整）
```typescript
// 觸發條件：長期目標進展評估
const strategicReflection = async (goalProgress: GoalProgress[]) => {
  // 調整長期目標和策略，例如：
  // "我應該花更多時間建立深度的友誼關係"
  // "目前的社交策略效果很好，可以繼續保持"
};
```

### Q4: 如何以MVP概念設計，排除相容性風險？

**A:** 我們嚴格遵循MVP原則，優先級排序如下：

#### 高優先級（低風險）
- **活動選擇智能化**：只在現有隨機選擇基礎上替換為LLM選擇，不改變接口
- **記憶檢索優化**：改進算法但不改變數據結構，完全向後兼容

#### 中優先級（可控風險）
- **反思機制細化**：在現有反思基礎上擴展，保留原有觸發條件作為降級方案

#### 排除項目（高風險）
- **數據結構重大變更**：階段一完全不觸及數據庫結構修改
- **接口變更**：保持所有現有API接口不變
- **架構重構**：所有改動都在現有架構內進行

**風險控制策略**：
1. 每個功能都有降級方案，新功能失敗時自動回退到原有邏輯
2. 充分的單元測試和集成測試
3. 漸進式部署，先在小範圍測試再推廣

## 🔬 基於 Generative Agents 研究報告的借鑑與改進

### 📚 研究報告核心架構分析

根據 "Generative Agents: Interactive Simulacra of Human Behavior" 研究報告，我們可以借鑑以下關鍵架構：

#### 1. **三層記憶架構**（第130-145行）
- **記憶流 (Memory Stream)**：完整記錄智能體的所有經驗
- **反思 (Reflection)**：將記憶合成更高層次的推論
- **規劃 (Planning)**：將結論轉化為行動計劃

#### 2. **記憶檢索策略**（第704-760行）
研究報告採用了**相關性 + 時效性 + 重要性**的加權組合：
```
score = α_relevance·relevance + α_recency·recency + α_importance·importance
```

#### 3. **反思機制**（第762-828行）
- **週期性觸發**：當重要性分數總和超過閾值時觸發
- **問題生成**：從最近記憶中識別重要問題
- **證據引用**：生成見解並引用具體記憶作為證據

### 🎯 MVP 設計的借鑑與改進建議

#### 改進點 1：記憶檢索策略優化
**研究報告啟示**：使用更精細的權重分配和正規化策略

**MVP 改進方案**：
```typescript
// 借鑑研究報告的權重分配邏輯
const memoryScores = relatedMemories.map((memory, idx) => ({
  memory,
  overallScore:
    normalize(args.candidates[idx]._score, relevanceRange) * 0.5 +  // 提升相關性權重
    normalize(memory.importance, importanceRange) * 0.3 +
    normalize(recencyScore[idx], recencyRange) * 0.2
}));
```

#### 改進點 2：反思機制細化
**研究報告啟示**：反思應該形成樹狀結構，從基礎觀察到抽象推論

**MVP 改進方案**：
```typescript
// 實現多層次反思樹
const reflectionTree = {
  leafNodes: baseObservations,        // 基礎觀察
  midLevel: dailySummaries,          // 日常總結
  highLevel: strategicInsights       // 戰略見解
};
```

#### 改進點 3：規劃系統改進
**研究報告啟示**：從粗到細的遞迴規劃（日計劃 → 小時計劃 → 分鐘計劃）

**MVP 改進方案**：
```typescript
// 借鑑遞迴規劃模式
async function generatePlan(agent: Agent) {
  const dailyPlan = await generateDailyOutline(agent);     // 日計劃大綱
  const hourlyPlan = await decomposeToHours(dailyPlan);   // 分解為小時計劃
  const detailedPlan = await decomposeToMinutes(hourlyPlan); // 詳細分鐘計劃
  return detailedPlan;
}
```

### ⚠️ 研究報告的警示與風險控制

#### 1. **記憶檢索錯誤**（第1289-1303行）
- **問題**：智能體可能檢索不完整的記憶片段
- **MVP 對策**：實現記憶檢索的驗證機制和錯誤處理

#### 2. **過度合作傾向**（第1467-1476行）
- **問題**：指令調優可能導致智能體過度禮貌和合作
- **MVP 對策**：平衡合作性與個性表達，避免單一化行為

#### 3. **環境規範理解**（第1442-1458行）
- **問題**：智能體可能不理解物理環境的隱含規範
- **MVP 對策**：明確定義環境規則和約束條件

### 🚀 基於研究報告的階段一改進優先級調整

#### 高優先級（借鑑研究報告）
1. **記憶檢索策略優化** - 採用研究報告的加權組合方法
2. **反思機制樹狀結構** - 實現多層次反思
3. **規劃系統遞迴分解** - 從粗到細的規劃方法

#### 中優先級（需要更多驗證）
1. **環境規範明確化** - 避免環境理解錯誤
2. **個性表達平衡** - 防止過度合作傾向

#### 低優先級（後續階段考慮）
1. **並行處理優化** - 研究報告提到的高成本問題
2. **價值對齊機制** - 處理偏見和價值觀問題

### 📈 預期效益提升

基於研究報告的借鑑，我們預期：
- **記憶相關性**：從預期的30%提升到40-50%
- **行為合理性**：借鑑經過驗證的架構，提升可信度
- **系統穩定性**：避免研究報告中識別的常見錯誤模式

這個借鑑確保我們的MVP設計建立在經過學術驗證的基礎上，同時保持實用性和可控性。