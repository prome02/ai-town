# Convex Init 初始化指南

## 問題描述

啟動 Docker 容器後,前端頁面無法顯示地圖,這通常是因為 Convex 資料庫未正確初始化。

## 根本原因

1. **Ollama 服務未運行**: `init.ts` 需要呼叫 LLM API 來初始化角色
2. **Convex Dev 卡住**: 容器內的 `convex dev` 可能因為 volume 掛載導致準備緩慢
3. **Init 超時**: LLM 呼叫可能超過預設的超時時間

## 解決方案

### 步驟 1: 確認 Ollama 服務運行

```bash
# 檢查 Ollama 是否運行
curl http://localhost:11434/api/tags

# 如果沒有運行,啟動 Ollama
ollama serve
```

### 步驟 2: 確認所需模型已下載

```bash
# 檢查已安裝的模型
ollama list

# 如果缺少,下載所需模型
ollama pull llama3
ollama pull mxbai-embed-large
```

### 步驟 3: 從本地執行 Convex Dev (推薦)

因為容器內的 `convex dev` 可能準備緩慢,建議從本地連接:

```bash
cd c:/Users/prome/Documents/GitHub/ai-town

# 確認環境變數
# .env.local 應包含:
# VITE_CONVEX_URL=http://127.0.0.1:3210

# 執行 Convex Dev (連接到容器內的後端)
npx convex dev --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
```

**ADMIN_KEY** 可以在 `docker-entrypoint.sh` 中找到。

### 步驟 4: 執行初始化

**✅ 推薦方法**: 使用 `convex dev --run init --until-success` (會自動重試):

```bash
# 方法 1: 使用 just (如果已安裝) - 推薦!
just convex dev --run init --until-success

# 方法 2: 直接使用 npx - 推薦!
npx convex dev --url http://127.0.0.1:3210 \
  --admin-key YOUR_ADMIN_KEY \
  --run init --until-success
```

**替代方法**: 單次執行 (可能超時,需手動重試):

```bash
npx convex run init --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
```

**重要說明**:
- ⚡ Init 過程**通常只需要 2-5 秒**,主要執行資料庫結構初始化
- ✅ `--until-success` 會在超時時**自動重試**,直到初始化成功
- 🔄 如果看到 "SystemTimeoutError",可能是網路問題,使用 `--until-success` 會自動重試
- ❌ **Init 本身不呼叫 LLM API**,所以不需要等待 Ollama 載入模型

### 步驟 5: 等待初始化完成

初始化過程很快（通常 2-5 秒）,會:
1. 創建預設世界 (world)
2. 載入地圖資料（從 `data/gentle.js`）
3. 啟動遊戲引擎 (engine)
4. 創建 AI 角色 (agents) 的基本資料結構

**注意**: LLM API 只在**遊戲引擎運行後**才會被呼叫,用於:
- Agent 決策 (`agentDoSomething`)
- 生成對話 (`agentGenerateMessage`)
- 處理記憶 (`agentRememberConversation`)

完成後應該會看到:
```
✔ Function "init" completed successfully
```

## 常見錯誤

### 錯誤 1: SystemTimeoutError

```
Error: {"code":"SystemTimeoutError","message":"Your request timed out."}
```

**原因**:
- LLM API 呼叫太慢
- Ollama 服務未運行
- 網路連接問題

**解決**:
1. 確認 Ollama 正在運行: `curl http://localhost:11434/api/tags`
2. 檢查 Docker 網路配置是否允許訪問 `host.docker.internal`
3. 增加 Convex 函式超時時間 (在 `convex/constants.ts` 中)

### 錯誤 2: Failed to run function "init": TypeError: fetch failed

**原因**: 無法連接到 LLM API

**解決**:
1. 確認 Ollama 服務運行中
2. 檢查 `docker-compose.yml` 中的 `LLM_API_URL` 設定:
   ```yaml
   environment:
     - LLM_API_URL=http://host.docker.internal:11434
   ```
3. 確認 `extra_hosts` 配置正確:
   ```yaml
   extra_hosts:
     - "host.docker.internal:host-gateway"
   ```

### 錯誤 3: Convex Dev 卡在 "Preparing Convex functions..."

**原因**: Volume 掛載導致檔案監聽緩慢

**解決**:
- 使用本地的 `convex dev` 而非容器內的
- 或者等待更長時間 (可能需要 30-60 秒)

## 驗證初始化成功

### 方法 1: 查看前端

訪問 http://localhost:5173/ ,應該能看到:
- 地圖顯示
- AI 角色在移動
- 對話氣泡

### 方法 2: 查詢資料庫

```bash
# 查詢 worlds 表
npx convex run testing:listWorlds --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY

# 查詢 agents 表
npx convex run testing:listAgents --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
```

### 方法 3: 檢查日誌

```bash
# 查看 Convex 後端日誌
docker exec ai-town-production tail -f /var/log/convex-backend.log

# 查看遊戲引擎狀態
docker logs ai-town-production | grep -i engine
```

## 最佳實踐

### 開發流程

1. **啟動 Ollama** (必須優先)
   ```bash
   ollama serve
   ```

2. **啟動 Docker 容器**
   ```bash
   docker-compose up -d
   ```

3. **從本地連接 Convex Dev**
   ```bash
   npx convex dev --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
   ```

4. **執行初始化** (首次或重置時)
   ```bash
   npx convex run init --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
   ```

5. **訪問應用**
   ```
   http://localhost:5173/
   ```

### 重置資料庫

如果需要重新初始化:

```bash
# 停止容器
docker-compose down

# 刪除資料庫 volume
docker volume rm ai-town_ai-town-database

# 重新啟動
docker-compose up -d

# 重新執行 init
npx convex run init --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
```

## 故障排除檢查清單

- [ ] Ollama 服務正在運行 (`curl http://localhost:11434/api/tags`)
- [ ] 模型已下載 (`ollama list` 應顯示 llama3 和 mxbai-embed-large)
- [ ] Docker 容器健康 (`docker ps` 顯示 healthy)
- [ ] Convex 後端響應 (`curl http://localhost:3210/`)
- [ ] `.env.local` 配置正確 (`VITE_CONVEX_URL=http://127.0.0.1:3210`)
- [ ] Convex Dev 成功連接 (看到 "Convex functions ready!")
- [ ] Init 執行成功 (看到 "Function 'init' completed successfully")

## 參考資料

- [Convex 文檔](https://docs.convex.dev/)
- [Ollama 文檔](https://ollama.com/)
- [Docker Ollama 整合指南](./DOCKER_OLLAMA_INTEGRATION.md)
- [測試流程指南](../testing/TESTING.md)

---

**最後更新**: 2025-11-12
**維護者**: AI Town 開發團隊
