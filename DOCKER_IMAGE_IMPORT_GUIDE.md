# AI Town Docker 映像匯入指南

## 映像檔案資訊

### 可用的映像檔案

專案目錄中有以下映像檔案：

- **ai-town-image-latest.tar.gz** (354MB) - **推薦使用**
  - 最新優化版本
  - 映像大小：1.73GB
  - 已壓縮，傳輸更快

- **ai-town-image-latest.tar** (355MB)
  - 未壓縮版本（與 .gz 功能相同）

- **ai-town-image.tar** (1.2GB)
  - 舊版未優化映像（不推薦）

**推薦使用**: `ai-town-image-latest.tar.gz`

---

## 在其他機器上匯入映像

### 步驟 1: 複製映像檔案

將 `ai-town-image-latest.tar.gz` 複製到目標機器。

**傳輸方式**:
- USB 隨身碟
- 網路傳輸（scp, rsync）
- 雲端儲存

### 步驟 2: 解壓縮（如果使用 .tar.gz）

```bash
# 如果使用 .tar.gz 檔案，先解壓縮
gunzip ai-town-image-latest.tar.gz

# 解壓後會得到 ai-town-image-latest.tar
```

**可選**: 也可以直接載入 .tar.gz（Docker 支援）:
```bash
# Docker 可以直接載入壓縮檔
docker load < ai-town-image-latest.tar.gz
```

### 步驟 3: 匯入映像到 Docker

```bash
# 方法 1: 使用重定向（推薦）
docker load < ai-town-image-latest.tar

# 方法 2: 使用 -i 參數
docker load -i ai-town-image-latest.tar
```

**預期輸出**:
```
Loaded image: ai-town-ai-town:latest
```

### 步驟 4: 驗證映像已匯入

```bash
docker images | grep ai-town
```

**預期輸出**:
```
ai-town-ai-town   latest   c05a5c9a3990   X hours ago   1.73GB
```

---

## 運行容器

### 前置需求

1. **Docker 和 Docker Compose**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **必要檔案**（需從專案目錄複製）:
   - `docker-compose.yml`
   - `docker-entrypoint.sh`
   - `.env.local`（可選，但推薦）
   - `data/` 目錄
   - `convex/` 目錄

### 啟動容器

#### 方法 1: 使用 Docker Compose（推薦）

```bash
# 確保在包含 docker-compose.yml 的目錄中
docker-compose up -d
```

#### 方法 2: 直接使用 Docker

```bash
docker run -d \
  --name ai-town-production \
  -p 5173:5173 \
  -p 3210:3210 \
  -v $(pwd):/usr/src/app \
  -v /usr/src/app/node_modules \
  -v ai-town-database:/usr/src/app/database \
  -e NODE_ENV=production \
  -e VITE_CONVEX_URL=http://127.0.0.1:3210 \
  -e LLM_API_URL=http://host.docker.internal:11434 \
  --add-host host.docker.internal:host-gateway \
  ai-town-ai-town:latest
```

### 檢查容器狀態

```bash
# 查看運行中的容器
docker ps

# 查看容器日誌
docker logs ai-town-production

# 查看容器健康狀態
docker inspect ai-town-production | grep -A 10 Health
```

---

## 初始化資料庫

容器啟動後，需要初始化 Convex 資料庫。

### 步驟 1: 確認服務運行

```bash
# 確認前端
curl http://localhost:5173/

# 確認 Convex 後端
curl http://localhost:3210/
```

### 步驟 2: 獲取 ADMIN_KEY

```bash
# 從 docker-entrypoint.sh 獲取
grep "ADMIN_KEY=" docker-entrypoint.sh
```

### 步驟 3: 執行初始化

```bash
# 同步 Convex 函式
npx convex dev --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY --once

# 執行 init（通常只需 2-5 秒）
npx convex run init --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
```

**預期輸出**:
```
✔ Function "init" completed successfully
```

---

## 配置 Ollama（可選）

如果需要使用本地 LLM（用於 Agent 行為）:

### 安裝 Ollama

```bash
# Windows / macOS / Linux
# 訪問 https://ollama.com/ 下載安裝

# 或使用命令行（Linux）
curl -fsSL https://ollama.com/install.sh | sh
```

### 下載模型

```bash
# 下載對話模型
ollama pull qwen2.5:14b

# 下載嵌入模型
ollama pull nomic-embed-text
```

### 啟動 Ollama 服務

```bash
ollama serve
```

**驗證**:
```bash
curl http://localhost:11434/api/tags
```

---

## 訪問應用

初始化完成後:

- **主應用**: http://localhost:5173/
- **測試頁面**: http://localhost:5173/test
- **Convex 後端**: http://localhost:3210/

---

## 故障排除

### 問題 1: 容器無法啟動

**檢查端口占用**:
```bash
# Windows
netstat -ano | findstr ":5173"
netstat -ano | findstr ":3210"

# Linux/macOS
lsof -i :5173
lsof -i :3210
```

### 問題 2: 前端無法連接

**檢查 .env.local**:
```bash
cat .env.local
# 應包含:
# VITE_CONVEX_URL=http://127.0.0.1:3210
```

### 問題 3: Convex 初始化失敗

**確認網路連接**:
```bash
curl http://localhost:3210/
```

**查看詳細日誌**:
```bash
docker logs ai-town-production --tail 100
```

---

## 映像大小對比

| 版本 | 檔案大小 | 映像大小 | 說明 |
|------|---------|---------|------|
| 舊版 | 1.2GB | 7.53GB | 未優化 |
| 最新 | 355MB | 1.73GB | 優化後（減少 77%） |

---

## 清理舊映像（可選）

如果匯入後需要清理舊的映像檔案:

```bash
# 刪除舊版映像（如果存在）
docker rmi ai-town-image.tar

# 清理未使用的映像
docker image prune -a
```

---

## 相關文件

- [Convex 初始化指南](docs/setup/CONVEX_INIT_GUIDE.md)
- [Docker 優化說明](docs/setup/DOCKER_IMAGE_OPTIMIZATION.md)
- [主要 README](README.md)

---

**最後更新**: 2025-11-12
**映像版本**: ai-town-ai-town:latest (1.73GB)
**維護者**: AI Town 開發團隊
