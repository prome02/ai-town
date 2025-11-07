# .env.local 設定說明與常見問題

## ⚠️ 重要警告

**`npx convex dev` 會自動修改 `.env.local` 檔案!**

## 問題說明

### 自動修改的原因

當你執行以下命令時,Convex CLI 會自動管理 `.env.local`:

```bash
# ❌ 會切換到雲端模式
npx convex dev
npx convex dev --once
npx convex deploy

# ✅ 保持本地模式
npx convex dev --url "http://127.0.0.1:3210" --admin-key <KEY>
```

### Convex CLI 的行為

1. **自動添加/更新** `VITE_CONVEX_URL`
2. **自動添加/更新** `CONVEX_DEPLOYMENT`
3. **優先使用雲端部署**(如果沒有指定 `--url`)

## 預防措施

### 1. 使用啟動腳本 (推薦)

```bash
# 執行腳本會自動防護
start-ai-town-local.bat
```

腳本會:
- ✅ 自動檢查 `.env.local` 設定
- ✅ 強制使用本地 URL
- ✅ 在 Convex Dev 啟動後驗證設定

### 2. 手動執行時注意

如果手動執行 `convex dev`,**必須**加上參數:

```bash
npx convex dev \
  --admin-key 0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd \
  --url "http://127.0.0.1:3210" \
  --tail-logs
```

### 3. 使用 .gitignore

`.env.local` 已經在 `.gitignore` 中,不會提交到 Git。

## 快速切換模式

### 切換到本地模式

```bash
# 方法 1: 使用切換腳本
switch-convex-mode.bat

# 方法 2: 手動編輯
# 修改 .env.local:
VITE_CONVEX_URL=http://127.0.0.1:3210
```

### 切換到雲端模式

```bash
# 方法 1: 使用切換腳本
switch-convex-mode.bat

# 方法 2: 手動編輯
# 修改 .env.local:
VITE_CONVEX_URL=https://elegant-lobster-3.convex.cloud
CONVEX_DEPLOYMENT=dev:elegant-lobster-3
```

## 驗證當前模式

### 檢查設定檔

```bash
cat .env.local
```

查看 `VITE_CONVEX_URL`:
- **本地**: `http://127.0.0.1:3210`
- **雲端**: `https://elegant-lobster-3.convex.cloud`

### 檢查瀏覽器

1. 打開 Console (F12)
2. 查看 Network 標籤
3. 觀察請求發送到哪個 URL

## 故障排除

### 問題: `.env.local` 一直被改回雲端

**原因**: 執行了不帶 `--url` 的 `convex` 命令

**解決**:
1. 停止所有 `convex dev` 進程
2. 執行 `switch-convex-mode.bat` 切回本地
3. 使用 `start-ai-town-local.bat` 啟動

### 問題: 前端連接到錯誤的後端

**症狀**:
- LLM 測試失敗 (forbidden)
- 雲端有資料,本地沒有

**解決**:
1. 檢查 `.env.local` 內容
2. 重啟前端開發伺服器
3. 強制刷新瀏覽器 (Ctrl+Shift+R)

### 問題: 不確定當前模式

**檢查步驟**:

```bash
# 1. 檢查設定檔
type .env.local

# 2. 檢查端口
netstat -ano | findstr ":3210"

# 3. 檢查 Convex 進程
tasklist | findstr "convex"
```

## 最佳實踐

### ✅ 推薦做法

1. **使用啟動腳本**
   ```bash
   start-ai-town-local.bat  # 本地開發
   ```

2. **明確指定 URL**
   ```bash
   npx convex dev --url "http://127.0.0.1:3210" --admin-key <KEY>
   ```

3. **定期檢查設定**
   ```bash
   cat .env.local
   ```

### ❌ 避免的做法

1. **不要單獨執行 `npx convex dev`**
   - 會自動切換到雲端

2. **不要混用本地/雲端**
   - 容易產生資料不一致

3. **不要手動編輯後立即執行 convex 命令**
   - 可能會被覆蓋

## 技術細節

### Convex CLI 優先順序

1. 命令列參數 `--url`
2. 環境變數 `CONVEX_DEPLOYMENT`
3. `.env.local` 中的 `CONVEX_DEPLOYMENT`
4. **預設: 使用雲端部署**

### 為什麼需要 --admin-key?

本地 Convex 後端需要 admin key 來:
- 驗證身份
- 同步函數
- 執行管理操作

預設的本地 admin key:
```
0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd
```

## 參考資源

- [TESTING.md](TESTING.md) - 本地開發完整流程
- [啟動腳本使用說明.md](啟動腳本使用說明.md) - 腳本詳細說明
- [Convex 官方文檔](https://docs.convex.dev/)

---

**最後更新**: 2025-01-07
**版本**: 1.0
