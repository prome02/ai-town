# AI Town 測試流程

## 本地開發測試流程

### 前置步驟

在開始測試之前,**必須**手動啟動本地 Convex 後端伺服器:

```bash
# 從下載資料夾啟動 Convex 本地後端 (Windows)
cd C:\Users\prome\Downloads\convex-local-backend-x86_64-pc-windows-msvc
.\convex-local-backend.exe
```

**重要**:
- 後端伺服器必須在 **port 3210** 上運行
- 請確認 `.env.local` 檔案中的 `VITE_CONVEX_URL=http://127.0.0.1:3210`
- 如果忘記啟動後端,Convex 函式編譯會卡住

### 啟動開發環境

#### 1. 啟動 Convex 本地後端 (必須先執行)

```bash
# Windows
cd C:\Users\prome\Downloads\convex-local-backend-x86_64-pc-windows-msvc
.\convex-local-backend.exe
```

等待看到以下訊息:
```
INFO backend listening on 0.0.0.0:3210
```

#### 2. 編譯並同步 Convex 函式

在新的終端視窗:

```bash
cd ai-town
npx convex dev --admin-key <YOUR_ADMIN_KEY> --url "http://127.0.0.1:3210"
```

等待看到:
```
✔ Convex functions ready!
```

#### 3. 啟動前端開發伺服器

在新的終端視窗:

```bash
cd ai-town
# 直接使用 vite 跳過 predev script (不需要 just 工具)
npx vite --port 5173 --host
```

### 測試路徑

1. **原有 UI (像素座標系統)**
   - 訪問: http://localhost:5173/ai-town/
   - 應該看到角色在地圖上移動

2. **新原型 UI (離散位置系統)**
   - 訪問: http://localhost:5173/ai-town/prototype
   - 應該看到監視器風格的位置卡片界面

### 驗證系統狀態

檢查伺服器是否正常運行:

```bash
# 檢查後端 (應該看到 port 3210)
netstat -ano | findstr ":3210"

# 檢查前端 (應該看到 port 5173)
netstat -ano | findstr ":5173"
```

### 常見問題

#### Convex 編譯卡在 "Preparing Convex functions..."

**原因**: 本地 Convex 後端未啟動

**解決方案**:
1. 確認後端伺服器正在運行 (port 3210)
2. 檢查 `.env.local` 設定為 `http://127.0.0.1:3210`
3. 重啟 `npx convex dev` 指令

#### npm run dev 失敗 ('just' 不是內部或外部命令)

**原因**: `predev` script 需要 `just` 工具

**解決方案**: 直接使用 vite 啟動前端
```bash
npx vite --port 5173 --host
```

#### 資料庫中缺少 locations 資料

**解決方案**: locations 欄位在 gameState 中有預設值 (空陣列)
- 如需測試資料,可透過 Convex dashboard 或初始化函式新增
- 舊有資料載入時會自動使用空陣列作為預設值

### 測試清單

- [ ] Convex 本地後端成功啟動 (port 3210)
- [ ] Convex 函式成功編譯並同步
- [ ] 前端伺服器成功啟動 (port 5173)
- [ ] 原有 UI 可以正常顯示和互動
- [ ] 新原型 UI 可以訪問 (即使沒有 locations 資料也應顯示空狀態)
- [ ] 瀏覽器 console 沒有錯誤訊息

## 位置系統測試 (MVP Day 3-4)

### 已實作功能

1. **資料層** ([convex/aiTown/schema.ts](convex/aiTown/schema.ts))
   - `locations` 表格,包含 locationId, name, description, type, connectedTo 等欄位
   - 兩個索引: `worldId` 和 `locationId`

2. **移動邏輯** ([convex/aiTown/simpleMovement.ts](convex/aiTown/simpleMovement.ts))
   - `isConnected()`: 檢查兩個位置是否相連
   - `calculateTravelTime()`: 計算移動時間 (固定 5 秒)
   - `tickTravel()`: 更新玩家移動狀態
   - `startTravel()`: 開始移動並驗證

3. **Player 整合** ([convex/aiTown/player.ts](convex/aiTown/player.ts))
   - 新增位置相關欄位: currentLocation, targetLocation, travelStarted, travelDuration
   - tick() 方法整合移動處理
   - moveToLocation input handler

4. **遊戲狀態載入** ([convex/aiTown/game.ts](convex/aiTown/game.ts), [convex/aiTown/world.ts](convex/aiTown/world.ts))
   - Game.load() 從資料庫載入 locations
   - World.locations Map 儲存位置資料
   - 後向相容:舊資料使用空陣列

### 手動測試步驟

#### 1. 初始化測試位置資料

透過 Convex dashboard 或函式呼叫:

```typescript
// 使用 convex/aiTown/locations.ts 的 initializeTestLocations
```

#### 2. 測試移動功能

透過瀏覽器 console 或 Convex dashboard:

```typescript
// 取得 playerId
const players = await convex.query("testing:getPlayersWithLocations");

// 觸發移動
await convex.mutation("aiTown:moveToLocation", {
  playerId: "p:<player_id>",
  targetLocationId: "room101"
});
```

#### 3. 驗證結果

- [ ] Player 的 targetLocation 正確設定
- [ ] travelStarted 和 travelDuration 已設定
- [ ] 5 秒後 currentLocation 更新為目標位置
- [ ] 移動完成後 targetLocation 等欄位清除
- [ ] 嘗試移動到未連接的位置會失敗

## 效能測試

- [ ] 多個 player 同時移動不會造成效能問題
- [ ] 資料庫查詢效率正常
- [ ] 前端更新即時且流暢

## 下一步開發

按照 MVP 計劃:
- Day 5: Agent AI 整合 (讓 AI 自動決定移動)
- Day 6: UI 完善 (顯示旅行進度,互動控制)
- Day 7: 測試與整合
