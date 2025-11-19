# Docker 與本地 Ollama 服務整合指南

**日期**: 2025-11-10
**目標**: 解決 AI Town 在 Docker 容器中運行時 agent 不會移動的問題

---

## 問題描述

AI Town 在 Docker 容器中啟動正常，但 agent 不會移動。經過分析，問題在於 LLM 服務無法從容器內部訪問。

---

## 解決方案

使用 Docker 網絡配置讓容器訪問宿主機上的 Ollama 服務，而不是在容器內運行 Ollama。

---

## 配置步驟

### 1. 確保本地 Ollama 服務運行

在宿主機上啟動 Ollama 服務並拉取所需模型：

```bash
# 啟動 Ollama 服務（如果尚未運行）
# 在 Windows 上，Ollama 通常會作為服務自動啟動

# 拉取所需的模型
ollama pull qwen2.5:14b
ollama pull nomic-embed-text
```

### 2. LLM 模型配置

LLM 模型名稱在 `convex/util/llm.ts` 中配置：

```javascript
export const LLM_CONFIG = {
  /* Ollama (local) config:
   */
  ollama: true,
  url: 'http://127.0.0.1:11434',
  chatModel: 'qwen2.5:14b' as const, // 通用對話模型,適合角色扮演
  embeddingModel: 'nomic-embed-text',
  embeddingDimension: 1024,
  stopWords: ['<|eot_id|>'],
  apiKey: () => undefined,
};
```

模型名稱也可以通過環境變量覆蓋：
- `LLM_MODEL` 或 `OLLAMA_MODEL` 環境變量可以覆蓋 `chatModel`
- 通過 `docker-compose.yml` 的 `environment` 部分可以設置這些變量

### 3. 修改 docker-compose.yml

已通過 `apply_diff` 修改了 `docker-compose.yml` 文件，添加了以下配置：

```yaml
environment:
  - NODE_ENV=production
  - VITE_CONVEX_URL=http://127.0.0.1:3210
  # 添加 Ollama URL 環境變量
  - LLM_API_URL=http://host.docker.internal:11434
extra_hosts:
  - "host.docker.internal:host-gateway"  # 確保網絡訪問
```

已通過 `apply_diff` 修改了 `docker-compose.yml` 文件，添加了以下配置：

```yaml
environment:
  - NODE_ENV=production
  - VITE_CONVEX_URL=http://127.0.0.1:3210
  # 添加 Ollama URL 環境變量
  - LLM_API_URL=http://host.docker.internal:11434
extra_hosts:
  - "host.docker.internal:host-gateway"  # 確保網絡訪問
```

### 4. 資料庫初始化

AI Town 的資料庫初始化是自動進行的：

1. **首次運行時自動初始化**：
   - 當 Convex 後端啟動時，`init.ts` 中的 `getOrCreateDefaultWorld` 函數會檢查是否存在默認世界
   - 如果不存在，會自動創建一個新的世界，包括：
     - 創建遊戲引擎
     - 初始化世界狀態（空的 agents、conversations、players 列表）
     - 創建地圖數據
     - 啟動遊戲循環

2. **數據持久化**：
   - 數據存儲在 `convex_local_backend.sqlite3` 文件中
   - 通過 Docker volume 掛載實現數據持久化：
     ```yaml
     volumes:
       - .:/usr/src/app                    # 專案檔案 (即時同步)
       - /usr/src/app/node_modules         # node_modules (避免覆蓋)
       - ./data:/usr/src/app/data          # 資料目錄
     ```

3. **手動初始化**（如果需要）：
   - 可以通過運行以下命令重新初始化：
     ```bash
     # 重置本地後端（清除數據庫）
     just reset-local-backend
     
     # 重新啟動服務
     docker-compose down
     docker-compose up -d
     ```

### 5. 重新啟動服務

```bash
# 停止當前服務
docker-compose down

# 重新啟動服務
docker-compose up -d
```

---

## 驗證步驟

1. 檢查容器是否正常運行：
   ```bash
   docker-compose ps
   ```

2. 檢查容器日誌：
   ```bash
   docker-compose logs -f ai-town
   ```

3. 訪問應用程序：
   - 前端：http://localhost:5173/ai-town/
   - Convex API：http://localhost:3210/

---

## 故障排除

### 問題 1: 容器無法訪問宿主機上的 Ollama 服務

**解決方案**:
1. 確保宿主機上的 Ollama 服務正在運行
2. 檢查防火牆設置，確保端口 11434 沒有被阻止
3. 驗證 `docker-compose.yml` 中的 `extra_hosts` 配置

### 問題 2: LLM 模型未找到

**解決方案**:
1. 在宿主機上運行 `ollama pull qwen2.5:14b` 拉取模型
2. 檢查 `convex/util/llm.ts` 中的模型配置是否正確

### 問題 3: 網絡連接問題

**解決方案**:
1. 在容器內測試網絡連接：
   ```bash
   docker-compose exec ai-town curl -v http://host.docker.internal:11434/api/tags
   ```

---

## 技術細節

### LLM 配置優先級

LLM 配置會按以下順序查找 URL：
1. `LLM_API_URL` 環境變量
2. `OLLAMA_HOST` 環境變量
3. `OPENAI_API_BASE` 環境變量
4. `LLM_CONFIG.url` 默認值

### 錯誤處理機制

`agentOperations.ts` 中已實現完善的錯誤處理：
- LLM 調用失敗時會回退到隨機活動選擇
- 網絡錯誤、超時等異常情況都有相應處理
- 不會因為單個操作失敗而影響整個遊戲迴圈

---

## 後續改進建議

1. **添加健康檢查**：
   - 在 `docker-compose.yml` 中添加 Ollama 服務的健康檢查

2. **配置文檔化**：
   - 在 `.env.local` 中添加 Ollama 相關配置的說明

3. **日誌改進**：
   - 添加更詳細的 LLM 調用日誌以便調試

---

## 參考資源

- [Docker 網絡配置文檔](https://docs.docker.com/compose/compose-file/compose-file-v3/#extra_hosts)
- [Ollama API 文檔](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Convex 文檔](https://docs.convex.dev/)