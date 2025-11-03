# AI Town 監視器UI重設計 - MVP執行計劃

## 📋 項目概述

**目標**：將2D像素地圖遊戲改造為監視器風格的旅館觀察遊戲

**核心概念**：
- 玩家角色：旁觀者（不參與互動）
- 遊戲方式：透過監視器觀察AI角色互動
- 空間系統：從連續像素空間改為離散地點圖
- 樂趣來源：偷窺、發現秘密、拼湊劇情

**預計時間**：2-3週

---

## 🎯 三階段開發策略

### 階段1：並行原型開發（第1週）
- 新UI在 `/prototype` 路由開發
- 舊UI保持在 `/` 運行不變
- 兩者共用後端數據

### 階段2：功能完善與切換（第2週）
- 新UI功能完整
- 切換主路由（新UI → `/`，舊UI → `/legacy`）
- 全面測試

### 階段3：清理與優化（第3週）
- 刪除PIXI.js舊代碼
- 優化性能
- 打磨細節

---

## 📅 詳細任務分解

---

## 第1週：並行原型開發

### Day 1: 環境準備與資料層基礎

#### 任務 1.1：創建開發分支
```bash
git checkout -b feature/location-system
git push -u origin feature/location-system
```

#### 任務 1.2：新增 locations 表
**文件**：`convex/aiTown/schema.ts`

**改動**：
```typescript
// 在 aiTown 部分添加
locations: defineTable({
  worldId: v.id('worlds'),
  locationId: v.string(),
  name: v.string(),
  description: v.string(),
  type: v.union(v.literal('room'), v.literal('public')),
  connectedTo: v.array(v.string()),
  sceneImageUrl: v.optional(v.string()),
  capacity: v.optional(v.number()),
})
.index('worldId', ['worldId'])
.index('locationId', ['worldId', 'locationId']),
```

**驗證**：
- [ ] Schema 編譯成功
- [ ] Convex dashboard 看到新表

---

#### 任務 1.3：創建地點初始化腳本
**新文件**：`convex/aiTown/locations.ts`

**內容**：
```typescript
import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';

// 初始化測試地點
export const initializeTestLocations = internalMutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    // 檢查是否已存在
    const existing = await ctx.db
      .query('locations')
      .withIndex('worldId', q => q.eq('worldId', worldId))
      .first();

    if (existing) {
      console.log('Locations already initialized');
      return { success: false, message: 'Already exists' };
    }

    // 創建測試地點
    const locations = [
      {
        worldId,
        locationId: 'lobby',
        name: '大廳',
        description: 'A spacious hotel lobby with comfortable seating and a reception desk',
        type: 'public' as const,
        connectedTo: ['room101', 'garden', 'dining'],
        capacity: 10,
      },
      {
        worldId,
        locationId: 'room101',
        name: '101號房',
        description: 'A cozy hotel room with a bed, desk, and window with garden view',
        type: 'room' as const,
        connectedTo: ['lobby'],
        capacity: 2,
      },
      {
        worldId,
        locationId: 'garden',
        name: '花園',
        description: 'A peaceful garden with flowers, benches, and a fountain',
        type: 'public' as const,
        connectedTo: ['lobby'],
        capacity: 5,
      },
    ];

    for (const loc of locations) {
      await ctx.db.insert('locations', loc);
    }

    console.log('Test locations created:', locations.length);
    return { success: true, count: locations.length };
  },
});

// 查詢所有地點
export const getAllLocations = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    return await ctx.db
      .query('locations')
      .withIndex('worldId', q => q.eq('worldId', worldId))
      .collect();
  },
});
```

**驗證**：
- [ ] 編譯成功
- [ ] 在 Convex dashboard 手動執行 `initializeTestLocations`
- [ ] 確認 locations 表有3筆資料

---

#### 任務 1.4：擴展 Player 資料結構
**文件**：`convex/aiTown/player.ts`

**改動**：在 Player 類別添加新字段（保留舊的）
```typescript
export class Player {
  // === 保留所有現有字段 ===
  position: Location;
  pathfinding?: PathfindingState;
  // ...其他現有字段...

  // === 新增字段（實驗性）===
  currentLocation?: string;        // 新的地點系統ID
  targetLocation?: string;         // 移動目標地點
  travelStarted?: number;          // 移動開始時間戳
  travelDuration?: number;         // 移動需要的毫秒數

  // 在 serialize() 中添加新字段序列化
  // 在構造函數中添加新字段初始化
}
```

**注意**：
- ⚠️ 不要刪除 `position` 和 `pathfinding`
- 這是過渡期，兩套系統並存

**驗證**：
- [ ] TypeScript 編譯通過
- [ ] 舊UI仍然可以運行

---

### Day 2: 測試UI原型

#### 任務 2.1：創建測試查詢
**新文件**：`convex/testing.ts`

**內容**：
```typescript
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// 獲取測試用地點
export const getTestLocations = query({
  handler: async (ctx) => {
    const world = await ctx.db.query('worlds').first();
    if (!world) return [];

    return await ctx.db
      .query('locations')
      .withIndex('worldId', q => q.eq('worldId', world._id))
      .collect();
  },
});

// 手動設置角色位置（測試用）
export const setPlayerLocation = mutation({
  args: {
    playerId: v.string(),
    locationId: v.string()
  },
  handler: async (ctx, { playerId, locationId }) => {
    // 獲取 world 和 player
    const world = await ctx.db.query('worlds').first();
    if (!world) throw new Error('No world found');

    // 更新 world 中的 player 位置
    // 注意：這需要解包 world.players，修改對應 player，再存回
    // 簡化版：先在 UI 中手動測試

    console.log(`Setting player ${playerId} to location ${locationId}`);
    return { success: true };
  },
});

// 獲取玩家及其位置
export const getPlayersWithLocations = query({
  handler: async (ctx) => {
    const world = await ctx.db.query('worlds').first();
    if (!world) return [];

    // 從 world 中解析 players
    const players = world.players || [];

    return players.map(p => ({
      id: p.id,
      name: p.name || 'Unknown',
      currentLocation: p.currentLocation || 'unknown',
      targetLocation: p.targetLocation,
    }));
  },
});
```

**驗證**：
- [ ] 可以在 Convex dashboard 執行 query

---

#### 任務 2.2：創建原型UI組件
**新文件**：`src/components/LocationPrototype.tsx`

**內容**：
```typescript
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function LocationPrototype() {
  const locations = useQuery(api.testing.getTestLocations);
  const players = useQuery(api.testing.getPlayersWithLocations);

  if (!locations || !players) {
    return <div style={{ padding: '20px' }}>Loading prototype...</div>;
  }

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <h1>🎬 Location System Prototype</h1>
      <p style={{ color: '#888' }}>監視器UI原型 - 獨立於主遊戲</p>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginTop: '40px',
        flexWrap: 'wrap'
      }}>
        {locations.map(loc => (
          <LocationBox
            key={loc.locationId}
            location={loc}
            players={players.filter(p =>
              p.currentLocation === loc.locationId
            )}
          />
        ))}
      </div>

      <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
        <h3>🐛 Debug Info</h3>
        <details>
          <summary>Locations Data</summary>
          <pre style={{ fontSize: '11px', overflow: 'auto' }}>
            {JSON.stringify(locations, null, 2)}
          </pre>
        </details>
        <details>
          <summary>Players Data</summary>
          <pre style={{ fontSize: '11px', overflow: 'auto' }}>
            {JSON.stringify(players, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function LocationBox({ location, players }: any) {
  return (
    <div style={{
      border: '2px solid #444',
      borderRadius: '8px',
      padding: '20px',
      minWidth: '250px',
      backgroundColor: '#2a2a2a',
      position: 'relative'
    }}>
      {/* 地點標題 */}
      <div style={{
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '10px'
      }}>
        {location.name}
      </div>

      {/* 地點ID */}
      <div style={{
        fontSize: '11px',
        color: '#666',
        marginBottom: '15px'
      }}>
        ID: {location.locationId} | Type: {location.type}
      </div>

      {/* 監視器指示 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        fontSize: '20px'
      }}>
        📷
      </div>

      {/* 角色列表 */}
      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        minHeight: '60px'
      }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          Characters ({players.length}/{location.capacity || '∞'}):
        </div>
        {players.length === 0 ? (
          <div style={{ color: '#555', fontSize: '14px' }}>
            Empty room
          </div>
        ) : (
          players.map((p: any) => (
            <div key={p.id} style={{
              margin: '5px 0',
              padding: '8px',
              backgroundColor: '#333',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              👤 {p.name}
              {p.targetLocation && (
                <span style={{ color: '#888', fontSize: '11px' }}>
                  {' '}→ {p.targetLocation}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* 連接信息 */}
      <div style={{
        marginTop: '15px',
        fontSize: '11px',
        color: '#666',
        borderTop: '1px solid #444',
        paddingTop: '10px'
      }}>
        🚪 Connected to: {location.connectedTo.join(', ')}
      </div>
    </div>
  );
}
```

**驗證**：
- [ ] 組件編譯成功

---

#### 任務 2.3：添加原型路由
**文件**：`src/App.tsx`（或主路由文件）

**改動**：添加新路由
```typescript
import { LocationPrototype } from './components/LocationPrototype';

// 在路由配置中添加
<Route path="/prototype" element={<LocationPrototype />} />

// 保持原有的主路由不變
<Route path="/" element={<Game />} />
```

**驗證**：
- [ ] `npm run dev` 啟動成功
- [ ] 訪問 `http://localhost:3000/` 看到舊UI正常
- [ ] 訪問 `http://localhost:3000/prototype` 看到新原型

---

#### 任務 2.4：初始化並測試
**操作步驟**：

1. 啟動開發服務器：
```bash
npm run dev
```

2. 在 Convex Dashboard 執行初始化：
   - 找到 `aiTown/locations:initializeTestLocations`
   - 輸入參數：`{ worldId: "<你的world ID>" }`
   - 執行

3. 測試原型UI：
   - 訪問 `/prototype`
   - 應該看到3個地點方框
   - Debug Info 中應該顯示地點資料

4. 手動測試位置更新（臨時方案）：
   - 在 Convex Dashboard 中直接編輯 `worlds` 表
   - 找到某個 player 對象
   - 添加字段 `currentLocation: "lobby"`
   - 檢查原型UI是否顯示該角色

**驗證清單**：
- [ ] 3個地點正確顯示
- [ ] 可以看到地點連接關係
- [ ] 手動修改 player 位置後，UI即時更新
- [ ] 舊的主遊戲仍然正常運行

**Day 1-2 完成標準**：
✅ 有一個能運行的原型，顯示地點和角色（即使角色不會自動移動）

---

### Day 3-4: 簡化移動系統

#### 任務 3.1：創建簡化的移動邏輯
**新文件**：`convex/aiTown/simpleMovement.ts`

**內容**：
```typescript
import { v } from 'convex/values';
import type { Player } from './player';
import type { Location } from './location';

// 檢查兩個地點是否連通
export function isConnected(
  fromLocationId: string,
  toLocationId: string,
  locations: Map<string, any>
): boolean {
  const fromLoc = locations.get(fromLocationId);
  if (!fromLoc) return false;
  return fromLoc.connectedTo.includes(toLocationId);
}

// 計算移動時間（可以根據地點類型調整）
export function calculateTravelTime(
  fromLocationId: string,
  toLocationId: string
): number {
  // 簡單實現：固定5秒
  return 5000;

  // 進階版可以根據地點距離調整
  // if (fromLocationId === toLocationId) return 0;
  // return Math.random() * 3000 + 3000; // 3-6秒
}

// Tick 函數：檢查移動是否完成
export function tickTravel(player: Player, now: number): boolean {
  if (!player.targetLocation) return false;
  if (!player.travelStarted) return false;

  const elapsed = now - player.travelStarted;

  if (elapsed >= (player.travelDuration || 5000)) {
    // 到達目的地
    player.currentLocation = player.targetLocation;
    player.targetLocation = undefined;
    player.travelStarted = undefined;
    player.travelDuration = undefined;
    return true; // 表示完成移動
  }

  return false; // 還在移動中
}
```

---

#### 任務 3.2：修改 Player tick 邏輯
**文件**：`convex/aiTown/player.ts`

**改動**：在 `Player.tick()` 方法中添加新的移動邏輯

```typescript
import { tickTravel } from './simpleMovement';

export class Player {
  // ... 現有代碼 ...

  tick(game: Game, now: number) {
    // === 保留舊的 tick 邏輯（用於舊UI）===
    tickPathfinding(game, now, this);
    tickPosition(game, this, now);

    // === 新增：簡單的地點移動邏輯 ===
    if (this.currentLocation !== undefined) {
      const arrivedAtDestination = tickTravel(this, now);
      if (arrivedAtDestination) {
        console.log(`Player ${this.id} arrived at ${this.currentLocation}`);
      }
    }

    // 現有的其他 tick 邏輯...
  }
}
```

**注意**：這樣舊系統和新系統都能運作

---

#### 任務 3.3：創建移動 Input Handler
**文件**：`convex/aiTown/playerInputs.ts`（或創建新文件）

**內容**：添加新的 input handler
```typescript
import { inputHandler } from './inputHandler';
import { isConnected, calculateTravelTime } from './simpleMovement';

export const moveToLocation = inputHandler({
  args: {
    locationId: v.string(),
  },
  handler: (game, now, args, player) => {
    const { locationId } = args;

    // 檢查是否已經在該地點
    if (player.currentLocation === locationId) {
      return { success: false, reason: 'Already at this location' };
    }

    // 檢查連通性
    const locations = game.world.locations; // 需要在 World 中添加 locations Map
    if (!isConnected(player.currentLocation || 'lobby', locationId, locations)) {
      return { success: false, reason: 'Location not connected' };
    }

    // 設置移動
    player.targetLocation = locationId;
    player.travelStarted = now;
    player.travelDuration = calculateTravelTime(player.currentLocation || 'lobby', locationId);

    console.log(`Player ${player.id} moving to ${locationId}`);
    return { success: true };
  },
});
```

---

#### 任務 3.4：修改 World 載入地點資料
**文件**：`convex/aiTown/world.ts`

**改動**：在 World 類別中添加 locations
```typescript
export class World {
  nextId: number;
  conversations: Map<GameId<'conversations'>, Conversation>;
  players: Map<GameId<'players'>, Player>;
  agents: Map<GameId<'agents'>, Agent>;
  historicalLocations?: Map<GameId<'players'>, ArrayBuffer>;

  // === 新增 ===
  locations?: Map<string, any>; // locationId -> Location
}

// 在 load 函數中載入 locations
export async function load(ctx: ActionCtx, worldId: Id<'worlds'>) {
  // ... 現有載入邏輯 ...

  // 載入 locations
  const locationsData = await ctx.db
    .query('locations')
    .withIndex('worldId', q => q.eq('worldId', worldId))
    .collect();

  world.locations = new Map(
    locationsData.map(loc => [loc.locationId, loc])
  );

  return world;
}
```

**驗證**：
- [ ] World 能成功載入 locations
- [ ] 測試移動 input（在 Convex Dashboard 或通過 UI）

**Day 3-4 完成標準**：
✅ 角色可以透過 input 在地點間移動，UI能看到位置變化

---

### Day 5: Agent AI 整合

#### 任務 5.1：修改 Agent 行為邏輯
**文件**：`convex/aiTown/agent.ts`

**改動**：讓 Agent 使用新的地點系統進行移動決策

```typescript
export class Agent {
  tick(game: Game, now: number) {
    const player = game.world.players.get(this.playerId);
    if (!player) return;

    // === 新增：基於地點的移動決策 ===
    if (player.currentLocation && !player.targetLocation) {
      // 如果角色空閒且有一段時間了，隨機移動到連通地點
      const idleTime = now - (this.lastActivity || now);
      if (idleTime > 30000) { // 30秒
        const currentLoc = game.world.locations?.get(player.currentLocation);
        if (currentLoc && currentLoc.connectedTo.length > 0) {
          // 隨機選擇一個連通地點
          const randomLoc = currentLoc.connectedTo[
            Math.floor(Math.random() * currentLoc.connectedTo.length)
          ];

          // 發送移動 input
          game.submitInput('moveToLocation', { locationId: randomLoc }, this.playerId);
          this.lastActivity = now;
        }
      }
    }

    // 保留現有的對話邏輯等...
  }
}
```

**驗證**：
- [ ] Agent 會自動在地點間移動
- [ ] 在原型UI中能看到角色自動切換地點

---

#### 任務 5.2：修改對話距離檢查
**文件**：`convex/aiTown/conversation.ts`

**改動**：將距離檢查改為地點檢查

```typescript
// 找到檢查距離的函數，例如 canStartConversation

// 舊版：
// const distance = Math.sqrt((p1.x - p2.x)² + (p1.y - p2.y)²);
// if (distance > CONVERSATION_DISTANCE) return false;

// 新版：
function arePlayersInSameLocation(p1: Player, p2: Player): boolean {
  // 如果使用新系統
  if (p1.currentLocation !== undefined && p2.currentLocation !== undefined) {
    return p1.currentLocation === p2.currentLocation;
  }

  // 否則使用舊系統（過渡期）
  const distance = Math.sqrt(
    Math.pow(p1.position.x - p2.position.x, 2) +
    Math.pow(p1.position.y - p2.position.y, 2)
  );
  return distance <= CONVERSATION_DISTANCE;
}
```

**驗證**：
- [ ] 兩個角色在同一地點可以開始對話
- [ ] 不同地點的角色無法對話

**Day 5 完成標準**：
✅ AI角色會自動移動並在同一地點開始對話

---

### Day 6-7: UI 視覺優化

#### 任務 6.1：準備場景圖片
**任務**：
1. 為3個測試地點準備靜態圖片
   - `lobby.jpg` - 大廳
   - `room101.jpg` - 101號房
   - `garden.jpg` - 花園

2. 圖片規格：
   - 尺寸：800x600 或 16:9 比例
   - 風格：監視器視角（可選：魚眼效果、綠色調、掃描線）

3. 放置位置：
   - `public/scenes/lobby.jpg`
   - `public/scenes/room101.jpg`
   - `public/scenes/garden.jpg`

4. 更新資料庫：
```typescript
// 在 initializeTestLocations 中添加
sceneImageUrl: '/scenes/lobby.jpg',
```

**圖片來源選項**：
- 手繪/設計
- AI生成（Midjourney, Stable Diffusion）
- 免費圖庫（Unsplash, Pexels）+ 濾鏡

---

#### 任務 6.2：優化原型UI視覺
**文件**：`src/components/LocationPrototype.tsx`

**改動**：添加場景圖片顯示
```typescript
function LocationBox({ location, players }: any) {
  return (
    <div style={{
      border: '2px solid #444',
      borderRadius: '8px',
      overflow: 'hidden',
      minWidth: '300px',
      backgroundColor: '#000',
      position: 'relative'
    }}>
      {/* 場景圖片 */}
      {location.sceneImageUrl && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '200px',
          overflow: 'hidden'
        }}>
          <img
            src={location.sceneImageUrl}
            alt={location.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.7) contrast(1.1)', // 監視器效果
            }}
          />

          {/* 監視器UI覆蓋層 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            color: '#0f0', // 綠色文字（監視器風格）
            fontSize: '12px',
            fontFamily: 'monospace',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>📷 CAM-{location.locationId.toUpperCase()}</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>

          {/* 掃描線效果 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, rgba(0,255,0,0.03), rgba(0,255,0,0.03) 1px, transparent 1px, transparent 2px)',
            pointerEvents: 'none'
          }} />
        </div>
      )}

      {/* 其餘內容... */}
    </div>
  );
}
```

---

#### 任務 6.3：創建監視器網格佈局
**改動**：優化 LocationPrototype 主佈局

```typescript
export function LocationPrototype() {
  // ...

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#0f0' // 監視器綠色
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #0f0'
      }}>
        <h1 style={{ margin: 0 }}>
          🎬 HOTEL SURVEILLANCE SYSTEM
        </h1>
        <div>
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* 監視器網格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        {locations.map(loc => (
          <LocationBox key={loc.locationId} location={loc} players={players} />
        ))}
      </div>

      {/* Debug panel 可摺疊 */}
    </div>
  );
}
```

**驗證**：
- [ ] 場景圖片正確顯示
- [ ] 監視器風格效果（綠色、掃描線）
- [ ] 響應式佈局正常

**Day 6-7 完成標準**：
✅ 原型UI有完整的監視器視覺風格，有場景圖

---

## 第1週完成檢查點

### 功能驗證
- [ ] 3個地點正確顯示，有場景圖
- [ ] AI角色會自動在地點間移動
- [ ] 角色在同一地點會開始對話
- [ ] 可以看到對話內容
- [ ] 監視器UI視覺風格完整
- [ ] 舊的像素遊戲仍正常運行（在 `/`）

### 代碼質量
- [ ] 沒有 TypeScript 錯誤
- [ ] 沒有 Console 嚴重錯誤
- [ ] Git commit 清晰
- [ ] 新舊系統互不干擾

### 決策點
**如果通過檢查點** → 進入第2週（擴展功能）
**如果有問題** → 修復後再繼續

---

## 第2週：功能完善與切換

### Day 8-9: 擴展地點與角色

#### 任務 8.1：擴展地點到完整旅館
**文件**：`convex/aiTown/locations.ts`

**改動**：修改 `initializeTestLocations` 添加更多地點

```typescript
const locations = [
  // 公共區域
  {
    locationId: 'lobby',
    name: '大廳',
    description: 'Spacious hotel lobby with reception desk and seating area',
    type: 'public',
    connectedTo: ['room101', 'room102', 'room103', 'dining', 'garden'],
    capacity: 10,
  },
  {
    locationId: 'dining',
    name: '餐廳',
    description: 'Hotel dining room with tables and warm lighting',
    type: 'public',
    connectedTo: ['lobby', 'garden'],
    capacity: 12,
  },
  {
    locationId: 'garden',
    name: '花園',
    description: 'Peaceful outdoor garden with benches and fountain',
    type: 'public',
    connectedTo: ['lobby', 'dining', 'rooftop'],
    capacity: 8,
  },
  {
    locationId: 'rooftop',
    name: '屋頂露台',
    description: 'Rooftop terrace with city view and lounge chairs',
    type: 'public',
    connectedTo: ['garden'],
    capacity: 6,
  },

  // 客房
  {
    locationId: 'room101',
    name: '101號房',
    description: 'Cozy single room with desk and window',
    type: 'room',
    connectedTo: ['lobby'],
    capacity: 2,
  },
  {
    locationId: 'room102',
    name: '102號房',
    description: 'Double room with balcony',
    type: 'room',
    connectedTo: ['lobby'],
    capacity: 2,
  },
  {
    locationId: 'room103',
    name: '103號房（總統套房）',
    description: 'Luxurious presidential suite with living area',
    type: 'room',
    connectedTo: ['lobby'],
    capacity: 3,
  },
  // 可繼續添加 104-106
];
```

**準備場景圖**：為新地點準備圖片

**驗證**：
- [ ] 所有地點在UI正確顯示
- [ ] 連接關係正確

---

#### 任務 8.2：創建更多AI角色
**文件**：`data/characters.ts` 或在初始化腳本中

**改動**：為每個房間分配AI角色

```typescript
// 角色設定範例
const characters = [
  {
    name: '神秘作家',
    character: 'writer',
    description: 'A solitary writer working on a mysterious novel, often seen in the garden at night',
    initialLocation: 'room101',
    personality: 'introverted, observant, secretive',
  },
  {
    name: '八卦記者',
    character: 'journalist',
    description: 'A curious journalist always looking for the next big story',
    initialLocation: 'room102',
    personality: 'extroverted, nosy, social',
  },
  {
    name: '退休教授',
    character: 'professor',
    description: 'A wise retired professor who enjoys morning coffee and deep conversations',
    initialLocation: 'room103',
    personality: 'intellectual, kind, nostalgic',
  },
  // 添加更多角色...
];
```

**任務**：
1. 在遊戲初始化時為角色設置 `currentLocation`
2. 確保每個角色有不同的性格和行為模式

---

### Day 10-11: 整合現有對話系統

#### 任務 10.1：完整整合 Messages 組件
**新文件**：`src/components/ConversationPanel.tsx`

**內容**：
```typescript
import { Messages } from './Messages';

export function ConversationPanel({ conversationId }: { conversationId: string }) {
  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      width: '400px',
      maxHeight: '500px',
      backgroundColor: '#1a1a1a',
      border: '2px solid #0f0',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,255,0,0.3)'
    }}>
      <div style={{
        padding: '10px',
        backgroundColor: '#000',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderBottom: '1px solid #0f0'
      }}>
        📡 CONVERSATION MONITOR
      </div>

      <Messages conversationId={conversationId} />
    </div>
  );
}
```

**整合到主UI**：
- 當點擊某個地點的對話時，顯示 ConversationPanel
- 可以同時監視多個對話

---

#### 任務 10.2：添加地點導航側邊欄
**新文件**：`src/components/LocationSidebar.tsx`

```typescript
export function LocationSidebar({
  locations,
  players,
  conversations,
  onLocationClick
}: any) {
  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: '250px',
      backgroundColor: '#0a0a0a',
      borderRight: '2px solid #0f0',
      padding: '20px',
      overflowY: 'auto',
      fontFamily: 'monospace',
      color: '#0f0'
    }}>
      <h3>📍 LOCATIONS</h3>

      {locations.map((loc: any) => {
        const playersHere = players.filter((p: any) =>
          p.currentLocation === loc.locationId
        );
        const hasConversation = conversations.some((c: any) =>
          c.participants.some((pid: string) =>
            playersHere.find((p: any) => p.id === pid)
          )
        );

        return (
          <div
            key={loc.locationId}
            onClick={() => onLocationClick(loc.locationId)}
            style={{
              padding: '10px',
              margin: '8px 0',
              backgroundColor: '#1a1a1a',
              border: '1px solid #0f0',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {loc.name}
              {hasConversation && ' 💬'}
            </div>
            <div style={{ fontSize: '11px', color: '#0a0' }}>
              {playersHere.length} 👤
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

#### 任務 10.3：組合完整的 HotelGame 組件
**新文件**：`src/components/HotelGame.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { LocationSidebar } from './LocationSidebar';
import { CameraGrid } from './CameraGrid';
import { ConversationPanel } from './ConversationPanel';

export function HotelGame() {
  const locations = useQuery(api.testing.getTestLocations);
  const players = useQuery(api.testing.getPlayersWithLocations);
  const [focusedLocation, setFocusedLocation] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  if (!locations || !players) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 左側：地點導航 */}
      <LocationSidebar
        locations={locations}
        players={players}
        conversations={[]}
        onLocationClick={setFocusedLocation}
      />

      {/* 中間：監視器網格 */}
      <div style={{ flex: 1, marginLeft: '250px', padding: '20px', overflowY: 'auto' }}>
        <CameraGrid
          locations={locations}
          players={players}
          focusedLocation={focusedLocation}
          onConversationClick={setActiveConversation}
        />
      </div>

      {/* 右側：對話面板（可關閉）*/}
      {activeConversation && (
        <ConversationPanel conversationId={activeConversation} />
      )}
    </div>
  );
}
```

---

### Day 12: 切換主路由

#### 任務 12.1：備份舊UI
**操作**：
```bash
mkdir src/components/legacy
git mv src/components/PixiGame.tsx src/components/legacy/
git mv src/components/PixiStaticMap.tsx src/components/legacy/
git mv src/components/PixiViewport.tsx src/components/legacy/
git mv src/components/Character.tsx src/components/legacy/
git commit -m "Move legacy UI components to legacy folder"
```

---

#### 任務 12.2：修改主路由
**文件**：`src/App.tsx`

**改動**：
```typescript
import { HotelGame } from './components/HotelGame';
import { Game as LegacyGame } from './components/legacy/Game';

// 路由配置
<Routes>
  <Route path="/" element={<HotelGame />} />          {/* 新UI */}
  <Route path="/legacy" element={<LegacyGame />} />   {/* 舊UI備份 */}
</Routes>
```

---

#### 任務 12.3：全面測試
**測試清單**：
- [ ] `/` 路由顯示新UI
- [ ] `/legacy` 路由顯示舊UI仍可運行
- [ ] 新UI所有功能正常：
  - [ ] 地點顯示
  - [ ] 角色移動
  - [ ] 對話顯示
  - [ ] 側邊欄導航
  - [ ] 視覺效果

**Day 12 完成標準**：
✅ 新UI成為主介面，舊UI作為備份保留

---

### Day 13-14: 優化與測試

#### 任務 13.1：性能優化
- [ ] 檢查不必要的 re-render
- [ ] 優化 Convex query（添加索引）
- [ ] 圖片懶加載

#### 任務 13.2：UI/UX 打磨
- [ ] 添加載入狀態
- [ ] 添加錯誤處理
- [ ] 改善過渡動畫
- [ ] 響應式佈局調整（手機/平板）

#### 任務 13.3：Bug 修復
- [ ] 測試邊界情況
- [ ] 修復發現的bug
- [ ] 完善錯誤提示

---

## 第2週完成檢查點

### 功能完整性
- [ ] 6-8個地點全部運作
- [ ] 6-8個AI角色正常互動
- [ ] 完整的對話系統
- [ ] 完整的UI（側邊欄、網格、對話面板）
- [ ] 新UI已成為主介面

### 用戶體驗
- [ ] 可以流暢地監視不同地點
- [ ] 對話清晰易讀
- [ ] 能發現角色互動的"秘密"
- [ ] 遊戲可持續運行10分鐘以上不無聊

### 決策點
**如果滿意** → 進入第3週（清理代碼）
**如果需要調整** → 繼續優化

---

## 第3週：清理與發布

### Day 15-16: 刪除舊代碼

#### 任務 15.1：完全移除PIXI.js
**操作**：
```bash
# 刪除舊UI文件
rm -rf src/components/legacy/

# 移除依賴
npm uninstall pixi.js pixi-viewport

# 清理 package.json
# 檢查是否還有其他 PIXI 相關依賴
```

---

#### 任務 15.2：清理後端舊字段
**文件**：`convex/aiTown/player.ts`

**改動**：移除舊的位置系統
```typescript
export class Player {
  // === 刪除 ===
  // position: Location;
  // pathfinding?: PathfindingState;
  // historicalLocations?: ArrayBuffer;

  // === 保留新系統 ===
  currentLocation: string;
  targetLocation?: string;
  travelStarted?: number;
  travelDuration?: number;
}
```

**刪除文件**：
- `convex/aiTown/movement.ts` (A* 尋路算法)
- `convex/aiTown/historicalObject.ts` (位置壓縮)

**驗證**：
- [ ] 編譯通過
- [ ] 遊戲仍正常運行
- [ ] 沒有殘留的舊代碼引用

---

### Day 17-18: 文檔與打磨

#### 任務 17.1：更新 README
**文件**：`README.md`

**添加內容**：
- 遊戲概念說明（監視器旅館）
- 玩家角色定位（旁觀者）
- 地點系統說明
- 開發指南

---

#### 任務 17.2：創建開發文檔
**新文件**：`docs/ARCHITECTURE.md`

記錄：
- 新的地點系統架構
- 資料模型
- 如何添加新地點
- 如何添加新角色

---

#### 任務 17.3：最終視覺打磨
- [ ] 統一配色方案
- [ ] 完善監視器效果
- [ ] 添加音效（可選）
- [ ] Logo 和標題設計

---

### Day 19-21: 測試與發布

#### 任務 19.1：端到端測試
**測試場景**：
1. 新用戶首次進入遊戲
2. 觀察10分鐘遊戲流程
3. 切換不同地點
4. 追蹤一個完整的對話
5. 發現角色之間的互動

**測試清單**：
- [ ] 無崩潰
- [ ] 性能流暢（60fps）
- [ ] 對話品質高
- [ ] UI直覺易懂

---

#### 任務 19.2：用戶反饋收集
**操作**：
1. 邀請2-3人測試
2. 觀察他們的使用方式
3. 收集反饋
4. 快速迭代改進

---

#### 任務 20.1：部署準備
**檢查清單**：
- [ ] 環境變數配置
- [ ] 生產環境圖片資源
- [ ] Convex 生產環境設置
- [ ] 性能優化（bundle size）

---

#### 任務 20.2：Git 整理
```bash
# 確保所有變更已提交
git status

# 合併到主分支
git checkout main
git merge feature/location-system

# 推送
git push origin main

# 打標籤
git tag -a v1.0-mvp -m "MVP: Monitor-style hotel game"
git push origin v1.0-mvp
```

---

## 第3週完成檢查點

### 代碼質量
- [ ] 無舊代碼殘留
- [ ] 無 console warnings
- [ ] TypeScript 無錯誤
- [ ] 代碼註釋完整

### 產品完成度
- [ ] MVP所有功能運作
- [ ] 視覺風格統一
- [ ] 用戶體驗流暢
- [ ] 文檔完整

### 發布就緒
- [ ] 可部署到生產環境
- [ ] 有測試反饋
- [ ] 有改進計劃（Phase 2）

---

## 📊 總體時間表概覽

| 週次 | 重點 | 交付成果 |
|-----|------|---------|
| **Week 1** | 並行原型開發 | 可運行的原型（3地點、自動移動、對話） |
| **Week 2** | 功能完善與切換 | 完整MVP（6-8地點、完整UI、主路由） |
| **Week 3** | 清理與發布 | 生產就緒版本（無舊代碼、已測試） |

---

## 🎯 成功指標

### 技術指標
- ✅ 地點系統完全替代像素地圖
- ✅ AI角色自主移動和對話
- ✅ 新UI完全替代舊UI
- ✅ 無技術債務（舊代碼清除）

### 體驗指標
- ✅ 玩家能持續觀看10分鐘以上
- ✅ 至少發生2-3次有趣的對話
- ✅ 玩家能理解遊戲概念（無需說明）
- ✅ 有"想繼續看下去"的感覺

---

## 🚨 風險與應對

### 風險1：AI對話品質不足
**症狀**：對話無聊、重複、不自然
**應對**：
- 優化 Agent 提示詞
- 增加角色個性差異
- 調整對話觸發頻率

### 風險2：玩家覺得無聊（純觀察）
**症狀**：玩家1分鐘就離開
**應對**：
- 加快劇情節奏
- 製造更多"秘密"事件
- 考慮加入 Phase 2 功能（物品系統）

### 風險3：技術整合困難
**症狀**：新舊系統衝突、Bug多
**應對**：
- 保持並行開發策略
- 逐步遷移，不要一次性刪除
- 保留 `/legacy` 路由作為備份

### 風險4：開發時間超出預期
**症狀**：某個任務卡住太久
**應對**：
- 砍掉非核心功能（例如：音效、動畫）
- 降低視覺品質標準（先用簡單圖片）
- 尋求協助或調整計劃

---

## 📝 每日開發檢查清單

### 開始工作前
- [ ] 拉取最新代碼 (`git pull`)
- [ ] 檢查 Convex 服務運行正常
- [ ] 查看今日任務（本文檔）

### 工作中
- [ ] 小步提交（每個任務完成後 commit）
- [ ] 寫清晰的 commit message
- [ ] 測試改動（確保不破壞現有功能）

### 結束工作時
- [ ] 推送代碼 (`git push`)
- [ ] 更新進度（在本文檔標記完成 ✅）
- [ ] 記錄遇到的問題和解決方案

---

## 📞 需要協助時

### 卡住時的自檢問題
1. 現有代碼是如何運作的？（閱讀源碼）
2. 錯誤訊息具體是什麼？（仔細閱讀）
3. 能否簡化問題？（最小可複現範例）
4. 是否需要調整計劃？（降低複雜度）

### 尋求幫助
- 查看 Convex 文檔
- 查看 React/TypeScript 文檔
- 在專案中搜尋類似實作
- 詢問 AI 助手（提供具體錯誤訊息）

---

## 🎉 完成後的下一步

### Phase 2 功能候選
1. **物品系統**（最高優先）
   - 角色可放置/拿取物品
   - 發現機制（隨機）
   - 秘密傳遞機制

2. **環境感知**
   - 角色感知房間物品
   - 談論環境變化

3. **玩家輕度互動**（方案C）
   - 放置物品
   - 廣播系統
   - 環境控制

4. **天氣與時間系統**
   - 影響角色行為
   - 動態場景圖生成

---

## 📄 附錄

### A. 重要文件清單

**後端（Convex）**：
- `convex/aiTown/schema.ts` - 資料結構定義
- `convex/aiTown/locations.ts` - 地點系統
- `convex/aiTown/player.ts` - 玩家邏輯
- `convex/aiTown/agent.ts` - AI行為
- `convex/aiTown/conversation.ts` - 對話系統
- `convex/aiTown/simpleMovement.ts` - 簡化移動
- `convex/testing.ts` - 測試工具

**前端（React）**：
- `src/components/HotelGame.tsx` - 主組件
- `src/components/LocationSidebar.tsx` - 側邊欄
- `src/components/CameraGrid.tsx` - 監視器網格
- `src/components/ConversationPanel.tsx` - 對話面板
- `src/components/Messages.tsx` - 對話顯示（重用）

### B. 配置文件
- `.env` - 環境變數
- `convex.json` - Convex 配置
- `package.json` - 依賴管理

---

**文檔版本**：v1.0
**最後更新**：2025-11-03
**作者**：Claude AI Assistant
**狀態**：✅ 就緒開始執行
