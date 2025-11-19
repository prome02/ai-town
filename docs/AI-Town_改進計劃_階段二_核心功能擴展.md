# AI-Town LLM Agent 改進計劃 - 階段二：核心功能擴展

## 📋 階段概述
**目標**：擴展智能體核心能力，實現更複雜的行為模式和互動
**時間估計**：4-6週
**優先級**：中（需要適度架構調整，效益顯著）

## 🎯 具體任務

### 任務 2.1：基礎規劃系統實現

#### 目標
實現簡單的目標設定和任務分解，使智能體行為更具目的性

#### 具體改進點
- 在 [`convex/aiTown/agent.ts`](convex/aiTown/agent.ts:78) 中添加規劃邏輯
- 建立目標管理和任務分解機制

#### 實施步驟
1. **規劃系統架構設計**（第1週）
   ```typescript
   // 新增規劃相關的數據結構
   export interface AgentGoal {
     id: string;
     description: string;
     priority: number; // 1-10
     deadline?: number;
     subTasks: SubTask[];
     status: 'active' | 'completed' | 'failed';
   }

   export interface SubTask {
     description: string;
     type: 'conversation' | 'activity' | 'movement';
     target?: string; // 玩家ID或位置
     conditions: CompletionCondition[];
   }
   ```

2. **目標生成機制**（第2週）
   ```typescript
   // 實現基於角色設定的目標生成
   async function generateGoals(ctx: ActionCtx, agent: SerializedAgent): Promise<AgentGoal[]> {
     const prompt = `你是一個${agent.identity}，你的長期計劃是：${agent.plan}
     請為今天設定3-5個具體目標，按重要性排序。`;
     
     const { content } = await chatCompletion({ messages: [{ role: 'user', content: prompt }] });
     return parseGoals(content, agent);
   }
   ```

3. **任務執行與監控**（第3-4週）
   - 在 `agent.tick()` 中添加目標檢查邏輯
   - 實現任務進度追蹤和動態調整
   - 添加目標完成後的獎勵機制

#### 預期效益
- 行為目的性提升 60%
- 長期連貫性明顯改善
- 支持更複雜的社會模擬場景

### 任務 2.2：環境互動增強

#### 目標
增加與環境物件的基礎互動能力，豐富虛擬世界體驗

#### 具體改進點
- 擴展 [`convex/aiTown/agentOperations.ts`](convex/aiTown/agentOperations.ts:93) 中的行為類型
- 實現物件感知和互動邏輯

#### 實施步驟
1. **環境物件系統擴展**（第1週）
   ```typescript
   // 在 worldMap 中添加物件定義
   export interface WorldObject {
     id: string;
     type: 'furniture' | 'tool' | 'decoration';
     position: { x: number; y: number };
     interactable: boolean;
     description: string;
     usage: string[]; // 可執行的動作
   }
   ```

2. **互動決策邏輯**（第2週）
   ```typescript
   // 實現物件互動選擇
   async function chooseObjectInteraction(
     ctx: ActionCtx, 
     player: SerializedPlayer, 
     objects: WorldObject[]
   ): Promise<InteractionDecision> {
     const prompt = `你看到以下物件：${objects.map(o => o.description).join(', ')}
     作為${player.name}，你想與哪個物件互動？為什麼？`;
     
     // LLM 驅動的互動選擇
   }
   ```

3. **互動行為實現**（第3-4週）
   - 擴展 `agentDoSomething` 支持物件互動
   - 實現互動動畫和效果反饋
   - 添加互動記憶和學習機制

#### 預期效益
- 環境互動可能性增加 5-10 種
- 世界真實感大幅提升
- 用戶參與度明顯改善

### 任務 2.3：個性化深度發展

#### 目標
強化角色個性和價值觀形成，創造更真實的虛擬角色

#### 具體改進點
- 在 [`convex/aiTown/agentDescription.ts`](convex/aiTown/agentDescription.ts:4) 中擴展角色屬性
- 實現個性發展和價值觀形成機制

#### 實施步驟
1. **擴展角色屬性系統**（第1週）
   ```typescript
   // 擴展 AgentDescription
   export class AgentDescription {
     agentId: GameId<'agents'>;
     identity: string;
     plan: string;
     personalityTraits: PersonalityTrait[]; // 新增：個性特質
     values: Value[]; // 新增：價值觀
     preferences: Preference[]; // 新增：偏好
     developmentHistory: DevelopmentEvent[]; // 新增：發展歷史
   }
   ```

2. **個性發展機制**（第2-3週）
   ```typescript
   // 實現基於經驗的個性發展
   async function updatePersonality(
     ctx: ActionCtx,
     agent: AgentDescription,
     recentExperiences: Memory[]
   ): Promise<PersonalityUpdate> {
     // 分析經驗對個性的影響
     // 調整特質和價值觀
   }
   ```

3. **行為個性化**（第4週）
   - 在對話和決策中融入個性因素
   - 實現基於價值觀的選擇偏好
   - 添加個性衝突和調解機制

#### 預期效益
- 角色獨特性提升 70%
- 長期行為一致性改善
- 社會互動複雜度增加

## 🛠️ 技術架構調整

### 新增模組
1. **規劃模組** (`convex/aiTown/planning.ts`)
   - 目標管理
   - 任務分解
   - 進度追蹤

2. **互動模組** (`convex/aiTown/interaction.ts`)
   - 物件感知
   - 互動決策
   - 效果處理

3. **個性模組** (`convex/aiTown/personality.ts`)
   - 個性建模
   - 價值觀系統
   - 發展追蹤

### 數據庫擴展
- 新增 `goals` 表：存儲智能體目標
- 新增 `interactions` 表：記錄互動歷史
- 擴展 `memories` 表：支持個性相關記憶

## 📊 成功指標

### 量化指標
- 目標完成率 ≥ 60%
- 環境互動頻率提升 ≥ 40%
- 個性一致性評分提升 ≥ 50%

### 質化指標
- 角色行為明顯更具獨特性
- 世界互動更豐富多樣
- 長期觀察下行為模式穩定

## 🔄 驗收標準

1. **功能完整性**
   - 規劃系統支持多層次目標管理
   - 環境互動涵蓋主要物件類型
   - 個性系統影響決策行為

2. **系統整合**
   - 新模組與現有系統無縫整合
   - 數據流轉順暢
   - 錯誤處理完善

3. **性能要求**
   - 新增功能不顯著影響系統性能
   - 記憶使用效率合理
   - 擴展性良好

這個階段將 AI-Town 從基礎的對話系統提升為具有真正智能行為的虛擬世界，為階段三的進階功能奠定基礎。