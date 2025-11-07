# AI-Town 專案開發指引

## 專案概述

AI-Town 是一個 AI 角色互動的虛擬城鎮模擬器,靈感來自論文《Generative Agents: Interactive Simulacra of Human Behavior》。本專案正在進行監視器風格的旅館遊戲改造,從 2D 像素地圖轉換為離散地點系統。

## 專案結構

### 文件組織
文件已整理至 `docs/` 資料夾,結構如下:

```
docs/
├── development/          # 開發文件
│   ├── ARCHITECTURE.md   # 系統架構說明
│   └── MVP_EXECUTION_PLAN.md  # MVP 開發計劃
├── testing/             # 測試文件
│   ├── TESTING.md       # 測試流程指南
│   └── LLM_TEST_GUIDE.md  # LLM 測試工具
├── setup/               # 環境設定
│   ├── ENV_SETUP_GUIDE.md  # 環境變數設定
│   └── STARTUP_SCRIPTS_GUIDE.md  # 啟動腳本說明
└── (改進計劃文件...)
```

### 核心目錄
- `convex/` - Convex 後端函式 (參考 `convex/CONVEX_FUNCTIONS_GUIDE.md`)
- `src/` - React 前端程式碼
- `data/` - 角色和世界資料
- `docs/` - 所有專案文件

## 開發規範

### 程式碼風格
- TypeScript 優於 JavaScript
- 遵循現有的程式碼風格與架構
- 適當添加註解說明複雜邏輯
- 使用有意義的變數與函式命名

### Git 提交規範
使用 Conventional Commits 格式,提交訊息使用繁體中文:
- `feat`: 新功能
- `fix`: 修復錯誤
- `docs`: 文件更新
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 建置或輔助工具變動

### 技術棧
- **後端**: Convex (資料庫、遊戲引擎、向量搜尋)
- **前端**: React + Vite + TypeScript
- **LLM**: Ollama (本地) / OpenAI API (雲端)
- **模型**: llama3 (對話) + mxbai-embed-large (嵌入)

## 常用開發流程

### 啟動開發環境

#### 方式 1: 使用自動化腳本 (推薦)
```bash
# Windows
./start-ai-town-local.bat  # 一鍵啟動本地環境

# 停止服務
./stop-ai-town.bat

# 切換本地/雲端模式
./switch-convex-mode.bat
```

#### 方式 2: 手動啟動
參考 `docs/testing/TESTING.md` 的詳細步驟

### 開發工作流程

1. **啟動環境**
   ```bash
   ./start-ai-town-local.bat
   # 等待所有服務啟動 (約 15 秒)
   ```

2. **訪問應用**
   - 主應用: http://localhost:5173/
   - 測試頁面: http://localhost:5173/test

3. **開發與測試**
   - 修改程式碼會自動熱重載
   - Convex 函式變更會自動同步

4. **停止環境**
   ```bash
   ./stop-ai-town.bat
   ```

## 重要檔案與配置

### 環境變數 (.env.local)
- `VITE_CONVEX_URL` - Convex 後端 URL
  - 本地: `http://127.0.0.1:3210`
  - 雲端: `https://elegant-lobster-3.convex.cloud`
- 詳細說明: `docs/setup/ENV_SETUP_GUIDE.md`

### 關鍵配置檔
- `convex/config.ts` - LLM 模型配置
- `convex/constants.ts` - 遊戲常數
- `package.json` - 專案依賴

## 當前開發重點

### 位置系統重設計 (feature/location-system)
正在進行從像素座標到離散地點系統的轉換:

1. **已完成**:
   - 地點資料結構 (`convex/aiTown/schema.ts`)
   - 簡化移動邏輯 (`convex/aiTown/simpleMovement.ts`)
   - 測試 UI 原型

2. **進行中**:
   - Agent AI 整合
   - LLM 驅動的智能活動選擇
   - 角色扮演評估系統

3. **待開發**:
   - 完整監視器 UI
   - 對話系統整合
   - 場景圖片準備

參考: `docs/development/MVP_EXECUTION_PLAN.md`

## LLM 開發注意事項

### API 使用
- 實作速率限制
- 提供降級機制
- 記錄使用量與成本
- 輸入需適當清理與驗證

### 測試工具
- LLM 測試元件: `src/components/LLMTestComponent.tsx`
- 測試指南: `docs/testing/LLM_TEST_GUIDE.md`
- 對話測試: `convex/testing.ts`

## 故障排除

### 常見問題

1. **Convex 編譯卡住**
   - 確認本地後端正在運行 (port 3210)
   - 檢查 `.env.local` 設定
   - 重啟 `convex dev`

2. **Ollama 服務未運行**
   - 執行 `ollama serve`
   - 確認 http://127.0.0.1:11434 可訪問

3. **端口衝突**
   ```bash
   # 查看佔用進程
   netstat -ano | findstr ":3210"
   # 或直接執行停止腳本
   ./stop-ai-town.bat
   ```

詳細故障排除: `docs/setup/STARTUP_SCRIPTS_GUIDE.md`

## 測試指南

### 執行測試
```bash
npm test  # 執行單元測試
```

### 手動測試流程
參考 `docs/testing/TESTING.md`

### LLM 功能測試
參考 `docs/testing/LLM_TEST_GUIDE.md`

## 安全性原則

- 敏感資訊使用環境變數
- 不提交 `.env` 檔案
- API Key 與認證資訊妥善保護
- 注意 CORS 與 CSP 設定

## 效能考量

### 優化重點
- Convex query 添加適當索引
- 避免不必要的 re-render
- 圖片懶加載
- 控制 LLM API 呼叫頻率

### 遊戲引擎限制
- 遊戲狀態保持小於數十 KB
- 考慮輸入延遲 (~1.5s)
- 避免過於密集的輸入

詳細說明: `docs/development/ARCHITECTURE.md`

## 部署

### 生產環境檢查清單
- [ ] 環境變數配置
- [ ] 生產環境圖片資源
- [ ] Convex 生產環境設置
- [ ] Bundle size 優化
- [ ] 效能測試

## 相關資源

### 官方文檔
- [Convex 文檔](https://docs.convex.dev/)
- [Ollama 文檔](https://ollama.com/)
- [React 文檔](https://react.dev/)

### 專案文檔索引
完整文件索引請見 [README.md](README.md#documentation)

### 社群支援
- [AI Stack Devs Discord](https://discord.gg/PQUmTBTGmT)
- [Live Demo](https://www.convex.dev/ai-town)

## 貢獻指南

1. 從 `main` 分支建立 feature 分支
2. 遵循專案的程式碼風格
3. 添加適當的測試
4. 更新相關文件
5. 提交 Pull Request

---

**最後更新**: 2025-11-07
**維護者**: AI Town 開發團隊
**當前版本**: v1.0-mvp (位置系統重設計中)
