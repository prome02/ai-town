# Convex 資料庫清理指南

## 概述

本地 Convex 資料庫（`convex_local_backend.sqlite3`）隨著時間會變得很大（可能數 GB），主要原因：

1. **向量嵌入資料**（佔大部分空間）
   - `memoryEmbeddings`: AI agent 的記憶向量
   - `embeddingsCache`: LLM 嵌入快取
   - 每個向量 1024 維度 × 8 bytes = 8KB+

2. **對話訊息**（佔較小空間）
   - `messages`: 角色對話記錄
   - `archivedConversations`: 已結束的對話

3. **其他資料**
   - `memories`: 記憶描述文字
   - `archivedPlayers`, `archivedAgents`: 歷史角色資料

## 快速診斷

### 1. 檢查資料庫大小

```bash
# Windows
dir "f:\download\convex-local-backend-x86_64-pc-windows-msvc\convex_local_backend.sqlite3"

# Linux/Mac
ls -lh ~/convex-local-backend/convex_local_backend.sqlite3
```

### 2. 分析資料分佈

首先，確保 Convex 本地服務運行中：

```bash
npx convex dev
```

然後部署分析函式並執行檢查：

```bash
# 部署會自動包含 convex/exportMessages.ts
node scripts/checkDatabaseSize.js
```

這會顯示：
- 各資料表的記錄數量
- 估算的資料大小
- 向量資料 vs 對話訊息的比例

## 清理策略

### 策略 A: 只導出對話訊息（推薦）

**適用於**: 想保留對話歷史但清理資料庫

```bash
# 1. 導出所有對話（會生成 JSON 和 CSV）
node scripts/exportMessages.ts

# 2. 檢查導出的檔案
ls exports/

# 3. 重置本地資料庫（刪除並重建）
# Windows
del "f:\download\convex-local-backend-x86_64-pc-windows-msvc\convex_local_backend.sqlite3"

# 重啟 Convex
npx convex dev
```

**優點**:
- 最簡單直接
- 完全重置，釋放所有空間
- 保留了對話歷史（JSON/CSV 檔）

**缺點**:
- 需要重新初始化世界

### 策略 B: 選擇性清理

**適用於**: 想保留最近的資料，只刪除舊資料

#### 使用 Convex Dashboard

1. 訪問 Convex Dashboard: http://127.0.0.1:3210
2. 進入 "Functions" 頁面
3. 執行以下函式（先用 `dryRun: true` 預覽）:

```javascript
// 1. 查看統計資訊
await api.exportMessages.getMessageStats.query()
await api.exportMessages.getMemoryStats.query()

// 2. 保留最近 7 天的資料（預覽）
await api.cleanupData.keepRecentData.mutation({
  keepDays: 7,
  dryRun: true
})

// 3. 確認無誤後實際執行
await api.cleanupData.keepRecentData.mutation({
  keepDays: 7,
  dryRun: false
})
```

#### 清理選項

**1. 刪除舊訊息**
```javascript
// 刪除 2024-01-01 之前的訊息
await api.cleanupData.deleteMessagesBefore.mutation({
  beforeTimestamp: new Date('2024-01-01').getTime(),
  dryRun: false
})
```

**2. 清理嵌入快取（釋放最多空間）**
```javascript
// 這會刪除所有 LLM 嵌入快取
// 快取會在需要時重新生成
await api.cleanupData.cleanEmbeddingsCache.mutation({
  dryRun: false
})
```

**3. 刪除特定世界的資料**
```javascript
// 獲取所有世界
const worlds = await api.world.getWorldData.query()

// 刪除舊世界
await api.cleanupData.deleteWorldData.mutation({
  worldId: "舊世界的ID",
  dryRun: false
})
```

### 策略 C: 手動 SQL 清理

**警告**: 直接操作 SQLite 資料庫有風險，請先備份！

```bash
# 1. 停止 Convex
# 關閉 npx convex dev

# 2. 備份資料庫
cp convex_local_backend.sqlite3 convex_local_backend.sqlite3.backup

# 3. 使用 SQLite 清理
# 需要安裝 SQLite: https://www.sqlite.org/download.html

sqlite3 convex_local_backend.sqlite3

# 在 SQLite shell 中執行：
VACUUM;  # 重建資料庫，回收空間
.quit
```

## 導出對話訊息

### 方法 1: 使用 Convex 函式

```javascript
// 在 Convex Dashboard 中執行
const result = await api.exportMessages.getAllMessages.query({
  offset: 0,
  limit: 1000
})

console.log(result.messages)
// 如果 hasMore 為 true，繼續獲取下一批
```

### 方法 2: 使用導出腳本

```bash
node scripts/exportMessages.ts
```

會生成：
- `exports/messages_TIMESTAMP.json` - 完整 JSON 格式
- `exports/messages_TIMESTAMP.csv` - CSV 格式（可用 Excel 開啟）

### 導出格式

**JSON**:
```json
[
  {
    "_id": "...",
    "_creationTime": 1234567890,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "worldId": "...",
    "conversationId": 1,
    "author": 1,
    "authorName": "Alice",
    "messageUuid": "...",
    "text": "Hello!"
  }
]
```

**CSV**:
```csv
Timestamp,World ID,Conversation ID,Author,Author Name,Message UUID,Text
2024-01-01T00:00:00.000Z,...,1,1,Alice,...,"Hello!"
```

## 預防措施

### 1. 定期清理

在 `convex/crons.ts` 中設定自動清理（可選）:

```typescript
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// 每週清理一次嵌入快取
crons.weekly(
  "clean embeddings cache",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  api.cleanupData.cleanEmbeddingsCache,
  { dryRun: false }
);

export default crons;
```

### 2. 監控資料庫大小

創建一個監控腳本（可加入啟動腳本）:

```bash
# 在 package.json 中添加
"scripts": {
  "db:check": "node scripts/checkDatabaseSize.js",
  "db:export": "node scripts/exportMessages.ts"
}

# 使用
npm run db:check
```

### 3. 開發環境 vs 生產環境

- **開發環境**: 可以經常重置，不需要保留舊資料
- **生產環境**: 使用 Convex Cloud，自動管理資料庫

## 常見問題

### Q: 對話訊息佔多少空間？

**A**: 根據資料結構分析：
- 每則訊息約 300-500 bytes（文字內容 + metadata）
- 10,000 則訊息 ≈ 3-5 MB
- **向量資料通常佔資料庫 80-90%**

所以 5GB 的資料庫中，對話訊息可能只有 200-500MB。

### Q: 可以只清理向量資料嗎？

**A**: 可以，使用：
```javascript
await api.cleanupData.cleanEmbeddingsCache.mutation({ dryRun: false })
```

這會刪除嵌入快取，但不影響對話訊息。快取會在需要時重新生成。

### Q: 刪除資料會影響 AI agent 嗎？

**A**:
- 刪除 `embeddingsCache`: 不影響，會重新計算
- 刪除 `memories` + `memoryEmbeddings`: 會影響，agent 會失去記憶
- 刪除 `messages`: 不影響當前運行，但歷史對話會消失

### Q: 如何完全重置並重新開始？

**A**:
```bash
# 1. 導出重要資料（可選）
node scripts/exportMessages.ts

# 2. 停止 Convex
# Ctrl+C 停止 npx convex dev

# 3. 刪除資料庫
rm convex_local_backend.sqlite3  # Linux/Mac
del convex_local_backend.sqlite3  # Windows

# 4. 重啟
npx convex dev

# 5. 重新初始化
npm run dev
# 訪問 http://localhost:5173 並點擊 "Initialize" 或 "Reset"
```

## 建議的工作流程

### 日常開發
```bash
# 每週檢查一次
npm run db:check

# 如果超過 1GB，清理快取
# 在 Convex Dashboard 執行
await api.cleanupData.cleanEmbeddingsCache.mutation({ dryRun: false })
```

### 長期專案
```bash
# 每月導出一次對話
npm run db:export

# 保留最近 30 天資料
await api.cleanupData.keepRecentData.mutation({
  keepDays: 30,
  dryRun: false
})
```

### 重大版本更新
```bash
# 完整備份
npm run db:export

# 完全重置
# 刪除資料庫檔案並重啟
```

## 參考資料

- [Convex 文檔](https://docs.convex.dev/)
- [SQLite VACUUM](https://www.sqlite.org/lang_vacuum.html)
- 專案文件: `convex/schema.ts`, `convex/aiTown/schema.ts`

---

**最後更新**: 2025-11-18
**相關檔案**:
- `convex/exportMessages.ts` - 導出函式
- `convex/cleanupData.ts` - 清理函式
- `scripts/exportMessages.ts` - 導出腳本
- `scripts/checkDatabaseSize.js` - 診斷腳本
