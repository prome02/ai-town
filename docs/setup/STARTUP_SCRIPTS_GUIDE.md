# AI Town 啟動腳本使用說明

## 📦 腳本清單

專案根目錄下有以下批次檔:

### 主要啟動腳本
1. **start-ai-town.bat [模式]** - 統一啟動腳本 🌟 核心腳本
   - 支援參數: `dev` (開發模式) 或 `prod` (正式模式)
   - 無參數時預設為正式模式

### 快捷啟動腳本
2. **start-ai-town-local.bat** - 開發模式快捷方式 ⭐ 等同於 `start-ai-town.bat dev`
3. **start-ai-town-production.bat** - 正式模式快捷方式 🚀 等同於 `start-ai-town.bat prod`

### 輔助腳本
4. **stop-ai-town.bat** - 停止所有服務
5. **switch-convex-mode.bat** - 切換本地/雲端模式 (較少使用)

---

## 🚀 快速開始

### 方式 1: 使用快捷腳本 (最簡單)

**開發模式** (包含測試頁面):
```bash
start-ai-town-local.bat
# 或雙擊執行
```

**正式模式** (僅主應用):
```bash
start-ai-town-production.bat
# 或雙擊執行
```

### 方式 2: 使用統一腳本 (更靈活)

**開發模式**:
```bash
start-ai-town.bat dev
```

**正式模式**:
```bash
start-ai-town.bat prod
# 或
start-ai-town.bat
# (無參數時預設為正式模式)
```

### 方式 3: 手動啟動 (完整控制)

參考 [TESTING.md](../testing/TESTING.md) 的詳細步驟。

---

## 🎯 腳本架構說明

新的腳本架構採用統一核心 + 快捷包裝的設計:

```
start-ai-town.bat (核心腳本)
    ├── dev 模式  ← start-ai-town-local.bat 調用
    └── prod 模式 ← start-ai-town-production.bat 調用
```

**優點**:
- 所有邏輯集中在 `start-ai-town.bat`,維護更簡單
- 快捷腳本提供友好的使用方式
- 支援命令列參數,適合自動化腳本

---

## 📋 腳本詳細說明

### 1️⃣ start-ai-town.bat (統一啟動腳本)

**功能**: 根據參數啟動不同模式的環境

**使用方式**:
```bash
start-ai-town.bat [dev|prod]
```

**參數說明**:
- `dev` - 開發/測試模式
- `prod` - 正式/生產模式 (預設)
- 無參數 - 自動使用正式模式

**兩種模式的差異**:

| 項目 | dev 模式 | prod 模式 |
|------|----------|-----------|
| 前端啟動 | `npm run dev` | `npm run dev:frontend` |
| 測試頁面 | ✅ 包含 | ❌ 不包含 |
| Convex 日誌 | `--tail-logs` 啟用 | 標準輸出 |
| 依賴檢查 | 跳過 | 自動檢查安裝 |
| 適用場景 | 快速開發測試 | 正式部署展示 |

**執行流程** (兩種模式相同):
1. 檢查 `.env.local` 是否存在
2. 自動將 `VITE_CONVEX_URL` 切換為本地模式
3. 檢查並安裝專案依賴 (僅 prod 模式)
4. 檢查 Ollama 服務 (port 11434)
5. 檢查並啟動本地 Convex 後端 (port 3210)
6. 啟動 Convex Dev 進行函數同步
7. 啟動前端應用 (根據模式不同)

**開啟的視窗**:
- 視窗 1: Convex Local Backend (port 3210)
- 視窗 2: Convex Dev (函數同步)
- 視窗 3: Vite Frontend (前端)

---

### 2️⃣ start-ai-town-local.bat (開發模式快捷方式)

**功能**: 快捷啟動開發/測試環境

**實際執行**: `start-ai-town.bat dev`

**適用場景**:
- 日常功能開發
- 離線開發 (無需網路)
- 使用本地 Ollama LLM
- 快速迭代測試

**訪問頁面**:
- 測試頁面: http://localhost:5173/ai-town/test.html
- 主應用: http://localhost:5173/ai-town/

---

### 3️⃣ start-ai-town-production.bat (正式模式快捷方式)

**功能**: 快捷啟動正式/生產環境

**實際執行**: `start-ai-town.bat prod`

**適用場景**:
- 正式部署
- 展示與演示
- 長期運行
- 數據持久化

**訪問頁面**:
- 主應用: http://localhost:5173/ai-town/

---

### 4️⃣ stop-ai-town.bat

**功能**: 停止所有 AI Town 相關服務

**執行操作**:
- 停止所有 Node.js 進程 (Convex Dev, Vite)
- 停止 Convex 本地後端
- 驗證端口已釋放 (3210, 5173)

**使用時機**:
- 完成開發想要關閉所有服務
- 遇到端口衝突需要重啟
- 切換到雲端模式前

---

### 5️⃣ switch-convex-mode.bat

**功能**: 在本地/雲端 Convex 之間快速切換

**使用場景**:

**切換到本地模式**:
- 使用本地 Ollama LLM
- 離線開發
- 測試新功能不影響雲端資料

**切換到雲端模式**:
- 需要協作開發
- 部署前測試
- 使用雲端 LLM API

**注意事項**:
- 切換後需要重啟開發環境
- 會自動備份原設定為 `.env.local.backup`
- 建議使用專用的啟動腳本替代手動切換:
  - 本地環境: `start-ai-town-local.bat`
  - 正式環境: `start-ai-town-production.bat`

---

## 🔧 故障排除

### 問題 1: "找不到 Convex 後端執行檔"

**原因**: 本地 Convex 後端未安裝或路徑錯誤

**解決方案**:
1. 下載 convex-local-backend: https://github.com/get-convex/convex-backend
2. 解壓到: `C:\Users\prome\Downloads\convex-local-backend-x86_64-pc-windows-msvc\`
3. 或修改腳本中的 `CONVEX_BACKEND_DIR` 變數

---

### 問題 2: "Ollama 服務未運行"

**原因**: Ollama 未啟動

**解決方案**:
1. 啟動 Ollama 應用程式
2. 或在命令列執行: `ollama serve`
3. 驗證: 訪問 http://127.0.0.1:11434

---

### 問題 3: "Port 3210 已被佔用"

**原因**: 端口衝突或殭屍進程

**解決方案**:
```bash
# 查看佔用進程
netstat -ano | findstr ":3210"

# 強制停止 (用 PID 替換 <PID>)
taskkill /F /PID <PID>

# 或執行停止腳本
stop-ai-town.bat
```

---

### 問題 4: "Convex functions ready 一直不出現"

**原因**:
- Convex 後端未啟動
- TypeScript 編譯錯誤
- 網路連接問題

**解決方案**:
1. 檢查 Convex Dev 視窗的錯誤訊息
2. 確認 Convex 後端視窗顯示 `listening on 0.0.0.0:3210`
3. 檢查 `convex/` 資料夾中的 TypeScript 錯誤

---

## 📊 服務端口總覽

| 服務 | 端口 | 用途 |
|------|------|------|
| Convex 本地後端 | 3210 | 資料庫和 Convex 函數執行 |
| Vite 前端 | 5173 | 前端開發伺服器 |
| Ollama LLM | 11434 | 本地 LLM API 服務 |

---

## 🎯 推薦工作流程

### 日常開發流程 (本地環境)

1. **啟動環境**
   ```
   雙擊: start-ai-town-local.bat
   等待所有視窗啟動完成 (約 15 秒)
   ```

2. **開始開發**
   ```
   訪問: http://localhost:5173/ai-town/
   或測試: http://localhost:5173/ai-town/test.html
   ```

3. **停止環境**
   ```
   雙擊: stop-ai-town.bat
   ```

### 正式部署流程 (生產環境)

1. **停止本地服務** (如正在運行)
   ```
   雙擊: stop-ai-town.bat
   ```

2. **啟動正式環境**
   ```
   雙擊: start-ai-town-production.bat
   等待服務啟動完成 (約 15 秒)
   ```

3. **訪問應用**
   ```
   訪問: http://localhost:5173/ai-town/
   ```

4. **停止環境**
   ```
   雙擊: stop-ai-town.bat
   ```

### 開發測試混合流程

**情境**: 本地開發測試完成,需要在雲端環境驗證

1. **本地開發**
   ```
   start-ai-town-local.bat
   (開發與測試)
   ```

2. **切換到雲端驗證**
   ```
   stop-ai-town.bat
   start-ai-town-production.bat
   (雲端環境驗證)
   ```

3. **回到本地開發**
   ```
   stop-ai-town.bat
   start-ai-town-local.bat
   ```

---

## 💡 進階技巧

### 自訂 Convex 後端路徑

編輯 `start-ai-town-local.bat`:
```batch
set "CONVEX_BACKEND_DIR=你的自訂路徑"
```

### 修改等待時間

如果電腦較慢,可增加等待時間:
```batch
REM 原本
timeout /t 5 /nobreak >nul

REM 修改為
timeout /t 10 /nobreak >nul
```

### 跳過某些檢查

如果確定環境正確,可註解掉檢查:
```batch
REM echo [3/6] 檢查 Ollama 服務...
REM 整段註解掉
```

---

## 📚 相關文檔

- [TESTING.md](../testing/TESTING.md) - 完整測試流程
- [PRODUCTION_STARTUP_GUIDE.md](./PRODUCTION_STARTUP_GUIDE.md) - 正式環境啟動詳細指南
- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - 環境變數設定說明
- [專案 README.md](../../README.md) - 專案說明
- [Convex 官方文檔](https://docs.convex.dev/)

---

## 🐛 回報問題

如果腳本運行有問題,請提供:
1. 錯誤訊息截圖
2. 3 個視窗的完整輸出
3. `.env.local` 內容 (遮蔽敏感資訊)
4. 執行 `netstat -ano | findstr ":3210 :5173 :11434"` 的結果

---

**最後更新**: 2025-11-07
**版本**: 3.0 (統一腳本架構)
**維護者**: AI Town 開發團隊

---

## 📝 版本更新日誌

### v3.0 (2025-11-07)
- ✨ 新增統一啟動腳本 `start-ai-town.bat`
- ✨ 支援命令列參數 (dev/prod)
- ✨ 無參數時預設為正式模式
- 🔧 簡化 `start-ai-town-local.bat` 和 `start-ai-town-production.bat` 為包裝器
- 🐛 修復 batch 腳本中 `...` 導致的語法錯誤
- ⚡ 智能等待 Convex 後端啟動 (循環檢查最多 30 秒)
- 📚 更新文檔反映新架構

### v2.0 (2025-01-07)
- ✨ 新增自動化啟動腳本
- ✨ 自動檢查與修正環境設定
- 📝 完整文檔系統
