# AI Town 啟動腳本使用說明

## 📦 腳本清單

專案根目錄下有以下批次檔:

1. **start-ai-town-local.bat** - 本地開發環境一鍵啟動 ⭐ 推薦
2. **stop-ai-town.bat** - 停止所有服務
3. **switch-convex-mode.bat** - 切換本地/雲端模式
4. **start-ai-town.bat** - 舊版腳本 (保留)

---

## 🚀 快速開始

### 方式 1: 使用新的自動化腳本 (推薦)

直接雙擊執行:
```
start-ai-town-local.bat
```

腳本會自動:
- ✅ 檢查並修正 `.env.local` 設定
- ✅ 檢查 Ollama 是否運行
- ✅ 自動啟動本地 Convex 後端 (如未運行)
- ✅ 編譯並同步 Convex 函數
- ✅ 啟動前端開發伺服器

### 方式 2: 手動啟動 (完整控制)

參考 [TESTING.md](TESTING.md) 的詳細步驟。

---

## 📋 腳本詳細說明

### 1️⃣ start-ai-town-local.bat

**功能**: 一鍵啟動完整的本地開發環境

**執行流程**:
1. 檢查 `.env.local` 是否存在
2. 自動將 `VITE_CONVEX_URL` 切換為本地模式
3. 檢查 Ollama 服務 (port 11434)
4. 檢查並啟動本地 Convex 後端 (port 3210)
5. 啟動 Convex Dev 進行函數同步
6. 啟動前端 Vite 開發伺服器

**開啟的視窗**:
- 視窗 1: Convex Local Backend
- 視窗 2: Convex Dev (函數同步)
- 視窗 3: Vite Frontend (前端)

**成功標誌**:
- Convex Dev 視窗顯示: `✔ Convex functions ready!`
- Vite 視窗顯示: `Local: http://localhost:5173/`

**訪問測試頁面**:
- http://localhost:5173/ai-town/test.html

---

### 2️⃣ stop-ai-town.bat

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

### 3️⃣ switch-convex-mode.bat

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

### 日常開發流程

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

### 切換到雲端部署

1. **切換模式**
   ```
   雙擊: switch-convex-mode.bat
   選擇: Y (確認切換)
   ```

2. **停止本地服務**
   ```
   雙擊: stop-ai-town.bat
   ```

3. **啟動雲端開發**
   ```
   npm run dev
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

- [TESTING.md](TESTING.md) - 完整測試流程
- [README.md](README.md) - 專案說明
- [Convex 官方文檔](https://docs.convex.dev/)

---

## 🐛 回報問題

如果腳本運行有問題,請提供:
1. 錯誤訊息截圖
2. 3 個視窗的完整輸出
3. `.env.local` 內容 (遮蔽敏感資訊)
4. 執行 `netstat -ano | findstr ":3210 :5173 :11434"` 的結果

---

**最後更新**: 2025-01-07
**版本**: 2.0
**維護者**: AI Town 開發團隊
