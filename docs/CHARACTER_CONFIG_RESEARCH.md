# 角色配置文件化調研報告

## 調研目標

評估將硬編碼的角色配置（`data/characters.ts`）改為獨立配置文件的可行性，實現「一個角色一個文件」的架構。

---

## 一、當前實現分析

### 1.1 現有架構

**角色定義位置**: `data/characters.ts`

```typescript
export const Descriptions = [
  {
    name: 'Lucky',
    character: 'f1',
    identity: `角色描述...`,
    plan: '行為目標',
  },
  // ... 更多角色
];
```

**使用方式**:
- **編譯時導入**: `import { Descriptions } from '../data/characters'`
- **Convex 函式中使用**:
  - `convex/init.ts:4` - 初始化時讀取
  - `convex/aiTown/agentInputs.ts:8` - 創建 agent 時使用
  - `convex/world.ts:138` - 隨機選擇角色外觀

**關鍵發現**:
1. ✅ 數據是**編譯時**通過 TypeScript import 加載
2. ✅ Convex 使用 **esbuild** 打包所有依賴
3. ✅ `data/` 資料夾中的檔案會被打包進 Convex bundle

### 1.2 Convex 打包機制

```
源碼 (TypeScript) → esbuild 打包 → Bundle → 部署到 Convex Runtime
```

- **打包時機**: `npx convex dev` 或 `npx convex deploy`
- **包含內容**: 所有被 `convex/` 下文件 import 的模塊
- **限制**: Bundle 大小上限 32 MiB

---

## 二、環境限制分析

### 2.1 Convex 運行時環境

| 特性 | 標準 Runtime | Node.js Runtime |
|------|-------------|----------------|
| **用途** | Query, Mutation, Action | 僅 Action (`"use node"`) |
| **文件系統訪問** | ❌ 無 | ✅ 有（本地開發時） |
| **動態 import** | ❌ 不支持 | ⚠️ 有限支持 |
| **靜態 import** | ✅ 編譯時解析 | ✅ 編譯時解析 |
| **環境** | V8 isolate (類似 Cloudflare Workers) | Node.js 20/22 |

**關鍵限制**:
- ❌ **標準 Runtime 無法在運行時讀取文件系統**
- ⚠️ **本地 Convex 也運行在隔離環境，無法動態讀取 `data/` 文件夾**
- ✅ **但可以在編譯時通過 import 包含數據**

### 2.2 本地 Convex 的特殊性

您提到「當前使用的是本地端 convex」，重要事實：

1. **本地 Convex = 本地運行的 Convex 後端**
   - 使用 `convex-local-backend.exe`
   - 仍然運行在隔離的 V8 環境
   - **不等於** Node.js 環境

2. **限制與雲端相同**:
   - ❌ 無法使用 `fs.readFileSync()`
   - ❌ 無法使用 `glob()` 動態掃描文件
   - ✅ 只能使用編譯時 import

---

## 三、實作方案評估

### 方案 A: JSON 文件 + 編譯時導入（推薦）

**架構**:
```
data/characters/
├── lucky.json
├── bob.json
├── stella.json
└── alice.json
```

**實作方式**:
```typescript
// data/characters/index.ts
import lucky from './lucky.json';
import bob from './bob.json';
import stella from './stella.json';
import alice from './alice.json';

export const Descriptions = [lucky, bob, stella, alice];
```

#### 優點 ✅
- ✅ **完全兼容 Convex 環境**（編譯時解析）
- ✅ **一個角色一個文件**（滿足原始需求）
- ✅ **易於管理**（可以直接編輯 JSON）
- ✅ **支持熱重載**（Convex dev 會自動重新編譯）
- ✅ **版本控制友好**（單獨 commit 角色文件）
- ✅ **可擴展**（添加/刪除角色只需修改 index.ts）

#### 缺點 ❌
- ⚠️ 仍需手動在 `index.ts` 中 import 新角色
- ⚠️ 不是「完全」動態（需要重新編譯）

#### 實作步驟
1. 創建 `data/characters/` 資料夾
2. 將每個角色轉換為 JSON 文件
3. 創建 `index.ts` 聚合所有角色
4. 更新 `convex/init.ts` 等文件的 import 路徑

---

### 方案 B: 完全動態載入（Node.js Action）

**架構**:
```
data/characters/
├── lucky.json
├── bob.json
└── ...

convex/loadCharacters.ts (Node.js Action)
```

**實作方式**:
```typescript
// convex/loadCharacters.ts
"use node";

import { action } from './_generated/server';
import fs from 'fs';
import path from 'path';

export const loadCharacters = action({
  args: {},
  handler: async () => {
    const dir = path.join(process.cwd(), 'data/characters');
    const files = fs.readdirSync(dir);
    const characters = files.map(file =>
      JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
    );
    return characters;
  },
});
```

#### 優點 ✅
- ✅ **完全動態**（運行時掃描文件夾）
- ✅ **無需修改代碼**（新增角色直接生效）

#### 缺點 ❌
- ❌ **只在本地開發有效**（雲端部署後無文件系統）
- ❌ **Action 限制**（無法在 Query/Mutation 中直接使用）
- ❌ **需要額外步驟**（初始化時調用 Action 寫入資料庫）
- ❌ **複雜度高**（需要設計資料庫 schema 存儲角色配置）

---

### 方案 C: 資料庫存儲配置

**架構**:
```
convex/schema.ts - 新增 characterConfigs 表

透過 UI 或 CLI 管理角色配置
```

**實作方式**:
```typescript
// convex/schema.ts
characterConfigs: defineTable({
  name: v.string(),
  character: v.string(),
  identity: v.string(),
  plan: v.string(),
  enabled: v.boolean(),
}).index('enabled', ['enabled']),
```

#### 優點 ✅
- ✅ **真正的運行時動態**
- ✅ **支持雲端部署**
- ✅ **可以構建管理 UI**
- ✅ **支持熱更新**（無需重啟）

#### 缺點 ❌
- ❌ **架構變更大**（需要遷移現有系統）
- ❌ **需要管理工具**（導入/導出配置）
- ❌ **失去文件版本控制**（配置在資料庫中）
- ❌ **初始化複雜**（需要種子數據）

---

### 方案 D: 混合方案（實用折衷）

**架構**:
```
data/characters/         # JSON 配置文件（版本控制）
├── lucky.json
├── bob.json
└── ...

scripts/importCharacters.ts  # 導入腳本

convex/characterConfigs 表   # 資料庫存儲（運行時使用）
```

**工作流程**:
1. 在 `data/characters/` 編輯 JSON 文件
2. 運行 `npm run import:characters` 導入到資料庫
3. 運行時從資料庫讀取配置

#### 優點 ✅
- ✅ **文件版本控制** + **運行時靈活性**
- ✅ **支持雲端部署**
- ✅ **易於管理**（編輯 JSON，一鍵導入）
- ✅ **可以構建 UI**（未來擴展）

#### 缺點 ❌
- ⚠️ 需要額外的導入步驟
- ⚠️ 系統複雜度增加

---

## 四、方案對比總結

| 特性 | 方案 A<br>編譯時導入 | 方案 B<br>Node.js Action | 方案 C<br>資料庫 | 方案 D<br>混合 |
|------|---------------------|------------------------|-----------------|---------------|
| **一個角色一個文件** | ✅ | ✅ | ❌ | ✅ |
| **完全動態** | ❌ | ⚠️ 僅本地 | ✅ | ✅ |
| **支持雲端部署** | ✅ | ❌ | ✅ | ✅ |
| **版本控制友好** | ✅ | ✅ | ❌ | ✅ |
| **無需重新編譯** | ❌ | ✅ | ✅ | ✅ |
| **實作複雜度** | 🟢 低 | 🟡 中 | 🔴 高 | 🟡 中 |
| **與現有系統兼容** | ✅ 高 | ⚠️ 中 | ❌ 低 | ⚠️ 中 |

---

## 五、推薦方案

### 🏆 短期推薦：**方案 A - JSON 文件 + 編譯時導入**

**理由**:
1. ✅ **滿足核心需求**：一個角色一個文件
2. ✅ **最小改動**：與現有架構完全兼容
3. ✅ **立即可用**：無需設計複雜的導入機制
4. ✅ **本地和雲端通用**：不依賴文件系統
5. ✅ **熱重載**：修改 JSON 後 Convex 自動重新編譯

**適合場景**:
- 角色配置變更頻率不高
- 主要在開發階段修改角色
- 需要通過 Git 追蹤配置變更

### 🔮 長期規劃：**方案 D - 混合方案**

**當需要以下功能時考慮升級**:
- 🎯 需要「無需重啟動態更新」角色
- 🎯 希望構建管理 UI（角色編輯器）
- 🎯 支持用戶自定義角色

---

## 六、方案 A 實作範例

### 6.1 目錄結構

```
data/characters/
├── index.ts           # 聚合所有角色
├── schema.ts          # 角色配置 TypeScript 接口
├── lucky.json
├── bob.json
├── stella.json
├── alice.json
└── pete.json
```

### 6.2 範例文件

**`data/characters/lucky.json`**:
```json
{
  "name": "Lucky",
  "character": "f1",
  "identity": "Lucky is always happy and curious, and he loves cheese...",
  "plan": "You want to hear all the gossip."
}
```

**`data/characters/schema.ts`**:
```typescript
export interface CharacterConfig {
  name: string;
  character: string;
  identity: string;
  plan: string;
}
```

**`data/characters/index.ts`**:
```typescript
import type { CharacterConfig } from './schema';

// 自動導入所有 JSON 文件
import lucky from './lucky.json';
import bob from './bob.json';
import stella from './stella.json';
import alice from './alice.json';
import pete from './pete.json';

export const Descriptions: CharacterConfig[] = [
  lucky,
  bob,
  stella,
  alice,
  pete,
];

export type { CharacterConfig };
```

### 6.3 使用方式（無需修改）

```typescript
// convex/init.ts
import { Descriptions } from '../data/characters'; // 路徑不變

// 使用方式完全一樣
const description = Descriptions[args.descriptionIndex];
```

### 6.4 添加新角色

1. 創建 `data/characters/emma.json`
2. 在 `index.ts` 中添加一行：
   ```typescript
   import emma from './emma.json';
   ```
3. 添加到陣列：
   ```typescript
   export const Descriptions = [..., emma];
   ```
4. Convex 自動重新編譯 ✅

---

## 七、注意事項與風險

### 7.1 方案 A 的限制

1. **仍需手動 import**
   - 新增角色必須修改 `index.ts`
   - 無法做到「放入文件就生效」

2. **編譯時決定**
   - 需要重新啟動 `npx convex dev`
   - 不支持「熱添加」角色

### 7.2 未來升級路徑

如果需要更動態的方案，可以：

**階段 1**: 方案 A（當前推薦）
**階段 2**: 添加 CLI 工具自動生成 `index.ts`
**階段 3**: 升級到方案 D（資料庫 + 文件）

---

## 八、結論

### ✅ 推薦實作

**採用方案 A：JSON 文件 + 編譯時導入**

**實作步驟**:
1. 創建 `data/characters/` 資料夾結構
2. 將現有角色轉換為獨立 JSON 文件
3. 創建 `index.ts` 聚合配置
4. 更新導入路徑（如需要）
5. 測試驗證

**預期效果**:
- ✅ 一個角色一個文件（滿足需求）
- ✅ 易於管理和版本控制
- ✅ 與現有系統完全兼容
- ✅ 支持 Convex 熱重載

### ⚠️ 不推薦

- ❌ 方案 B（僅本地有效，雲端失效）
- ⚠️ 方案 C（當前過度設計）

### 🔮 未來考慮

當需要「零編譯動態更新」或「用戶自定義角色」時，再升級到方案 D。

---

**報告完成時間**: 2025-11-18
**調研者**: Claude (AI Code Assistant)
**狀態**: ✅ 可以開始實作
