# 角色配置文件說明

## 📝 概述

AI Town 的角色配置採用 **Markdown 格式**，一個角色一個文件。

**優點**：
- ✅ 易於人類編輯和閱讀
- ✅ 支持多行文本，格式清晰
- ✅ 可以在 GitHub 直接預覽
- ✅ 版本控制友好

---

## 📁 文件結構

```
data/characters/
├── README.md           ← 本說明文件
├── parseMarkdown.ts    ← 解析器（請勿修改）
├── index.ts            ← 自動生成的配置聚合（請勿手動編輯）
├── lucky.md            ← 角色配置文件 ✏️
├── bob.md              ← 角色配置文件 ✏️
├── stella.md           ← 角色配置文件 ✏️
└── ...更多角色
```

---

## 📄 Markdown 格式規範

每個角色文件必須遵循以下格式：

```markdown
# 角色名稱

## Character
sprite_id

## Identity
角色的完整身份描述...
可以多行。

## Plan
角色的行為目標
```

### 字段說明

| 字段 | 必填 | 說明 | 範例 |
|------|------|------|------|
| **# 名稱** | ✅ | H1 標題，角色的名字 | `# Lucky` |
| **## Character** | ✅ | 角色外觀 sprite ID | `f1`、`f2`...`f8` |
| **## Identity** | ✅ | 角色的性格、背景、行為模式 | 可多段文字 |
| **## Plan** | ✅ | 角色的主要目標 | 一句話描述 |

---

## 🎨 可用的 Sprite ID

| ID | 外觀 | 說明 |
|----|------|------|
| `f1` | 👤 | 角色 1 |
| `f2` | 👤 | 角色 2 |
| `f3` | 👤 | 角色 3 |
| `f4` | 👤 | 角色 4 |
| `f5` | 👤 | 角色 5 |
| `f6` | 👤 | 角色 6 |
| `f7` | 👤 | 角色 7 |
| `f8` | 👤 | 角色 8 |

---

## ✏️ 如何編輯角色

### 1. 修改現有角色

直接編輯對應的 `.md` 文件：

```bash
# 編輯 Lucky 的配置
vim data/characters/lucky.md
# 或用任何文本編輯器打開
```

### 2. 新增角色

**步驟 1**: 創建新的 `.md` 文件

```bash
# 範例：創建新角色 Emma
touch data/characters/emma.md
```

**步驟 2**: 編輯文件內容

```markdown
# Emma

## Character
f8

## Identity
Emma is a talented musician who loves jazz and classical music.
She's introverted but passionate when talking about music.
She often hums melodies while thinking and gets lost in her own world.

## Plan
You want to share your love of music with others.
```

**步驟 3**: 重新構建配置

```bash
npm run build:characters
```

**步驟 4**: Convex 會自動重新編譯 ✅

### 3. 刪除角色

**步驟 1**: 刪除對應的 `.md` 文件

```bash
rm data/characters/bob.md
```

**步驟 2**: 重新構建

```bash
npm run build:characters
```

---

## 🛠️ 工作流程

### 日常編輯流程

```bash
# 1. 編輯 Markdown 文件
vim data/characters/lucky.md

# 2. 重新構建配置
npm run build:characters

# 3. Convex 自動重新編譯（如果 convex dev 正在運行）
# 無需手動重啟！
```

### 批量編輯多個角色

```bash
# 編輯多個文件...

# 一次構建即可
npm run build:characters
```

---

## 📋 範例文件

### lucky.md

```markdown
# Lucky

## Character
f1

## Identity
Lucky is always happy and curious, and he loves cheese. He spends most of his time reading about the history of science and traveling through the galaxy on whatever ship will take him. He's very articulate and infinitely patient, except when he sees a squirrel. He's also incredibly loyal and brave.

Lucky has just returned from an amazing space adventure to explore a distant planet and he's very excited to tell people about it.

## Plan
You want to hear all the gossip.
```

---

## ⚠️ 注意事項

### ✅ 可以做的

- ✏️ 直接編輯 `.md` 文件
- 📝 使用多行文本，換行會被保留
- 🎨 修改 Character sprite ID
- ➕ 新增角色
- ➖ 刪除角色

### ❌ 不要做的

- ❌ **不要手動編輯 `index.ts`**（會被覆蓋）
- ❌ 不要修改 `parseMarkdown.ts`（除非你知道在做什麼）
- ❌ 不要使用 H1 或 H2 以外的標題級別
- ❌ 不要在 Identity 或 Plan 中使用反引號 `` ` ``（會導致解析錯誤）

### 📌 特殊字符處理

如果需要在文本中使用特殊字符：
- **單引號 `'`**: 直接使用，會自動轉義
- **雙引號 `"`**: 直接使用
- **換行**: 直接換行即可
- **反引號 `` ` ``**: ⚠️ 避免使用（或使用 `\`` 轉義）

---

## 🔧 故障排除

### 構建失敗

**問題**: `npm run build:characters` 報錯

**解決方案**:
1. 檢查 Markdown 格式是否正確
2. 確保所有必填字段都存在
3. 查看錯誤訊息中的檔名和錯誤原因

**常見錯誤**:
- `Missing character name`: 缺少 H1 標題
- `Missing character sprite ID`: 缺少 `## Character` 區段
- `Missing identity description`: 缺少 `## Identity` 區段
- `Missing plan`: 缺少 `## Plan` 區段

### Convex 編譯錯誤

**問題**: Convex 顯示類型錯誤

**解決方案**:
1. 確保已運行 `npm run build:characters`
2. 檢查 `index.ts` 是否正確生成
3. 重啟 `npx convex dev`

---

## 🚀 進階使用

### 自動構建（可選）

可以設置文件監視，自動構建：

```bash
# 安裝 nodemon（如果還沒安裝）
npm install -g nodemon

# 監視 .md 文件變化並自動構建
nodemon --watch "data/characters/*.md" --exec "npm run build:characters"
```

### Git Hooks（可選）

在提交前自動構建：

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run build:characters
git add data/characters/index.ts
```

---

## 📚 相關文檔

- [角色配置文件化調研報告](../../docs/CHARACTER_CONFIG_RESEARCH.md)
- [AI Town 開發指南](../../CLAUDE.md)

---

**最後更新**: 2025-11-18
**格式版本**: 1.0
