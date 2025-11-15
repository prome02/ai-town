# AI Town Docker 部署指南

## 概述

本指南說明如何使用 Docker 部署 AI Town 應用程式到生產環境。

## 快速開始

### 1. 構建 Docker 映像

如果尚未構建映像，請執行：

```bash
docker build -t ai-town-ai-town:latest .
```

或載入已有的映像：

```bash
docker load -i ai-town-docker-image.tar
```

### 2. 啟動服務

執行啟動腳本：

```bash
.\deploy-scripts\start-docker-production.bat
```

服務將在以下端口啟動：
- **前端應用**: http://localhost:18000/ai-town/
- **Convex 後端**: http://localhost:18400/

### 3. 檢查狀態

```bash
.\deploy-scripts\check-docker-status.bat
```

### 4. 停止服務

```bash
.\deploy-scripts\stop-docker-production.bat
```

## 配置說明

### 端口配置

為避免與本地開發環境衝突，生產部署使用以下端口映射：

| 服務 | 容器內部端口 | 外部訪問端口 |
|------|------------|------------|
| Vite 前端 | 5173 | 18000 |
| Convex 後端 | 3210 | 18400 |

### 環境變數

配置文件位於 `.env.docker`，主要配置：

```bash
# Convex 本地後端配置
VITE_CONVEX_URL=http://127.0.0.1:3210
CONVEX_DEPLOYMENT=local

# LLM API 配置
LLM_API_URL=http://host.docker.internal:11434
```

**重要**：容器內部使用 `http://host.docker.internal:11434` 訪問宿主機的 Ollama 服務。

### 數據持久化

資料庫數據通過 Docker volume 持久化：
- Volume 名稱: `ai-town_ai-town-database`
- 容器內路徑: `/usr/src/app/database`

## 常見操作

### 查看日誌

查看所有日誌：
```bash
docker logs -f ai-town-production
```

查看特定服務日誌：
```bash
# Convex 後端
docker exec ai-town-production tail -f /var/log/convex-backend.log

# Vite 前端
docker exec ai-town-production tail -f /var/log/vite.log

# Convex Dev
docker exec ai-town-production tail -f /var/log/convex-dev.log
```

### 重啟容器

```bash
docker restart ai-town-production
```

### 進入容器

```bash
docker exec -it ai-town-production bash
```

### 清理資源

停止並刪除容器（保留 volume）：
```bash
docker-compose -f docker-compose.deployment.yml down
```

完全清理（包括 volume）：
```bash
docker-compose -f docker-compose.deployment.yml down -v
```

## 故障排除

### 1. 容器無法啟動

檢查日誌：
```bash
docker logs ai-town-production
```

常見問題：
- 端口被佔用：修改 `docker-compose.deployment.yml` 中的端口映射
- 映像不存在：重新構建或載入映像
- 權限問題：確保 Docker Desktop 正在運行

### 2. 服務無法訪問

檢查容器狀態：
```bash
docker ps -a | grep ai-town-production
```

容器應該顯示為 "healthy" 狀態。

測試端口連接：
```bash
curl http://localhost:18000/
curl http://localhost:18400/
```

### 3. Ollama 連接失敗

確保：
1. 宿主機 Ollama 服務正在運行：`ollama serve`
2. Ollama 監聽在 `http://127.0.0.1:11434`
3. 容器可以訪問 `host.docker.internal`

測試連接：
```bash
docker exec ai-town-production curl http://host.docker.internal:11434/api/tags
```

### 4. 數據丟失

檢查 volume 是否存在：
```bash
docker volume ls | grep ai-town-database
```

如果誤刪除 volume，數據將無法恢復。建議定期備份：
```bash
docker run --rm -v ai-town_ai-town-database:/data -v "%cd%":/backup busybox tar czf /backup/ai-town-db-backup.tar.gz /data
```

## 性能優化

### 資源限制

如需限制容器資源使用，在 `docker-compose.deployment.yml` 中添加：

```yaml
services:
  ai-town:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### 日誌輪轉

避免日誌文件過大，配置日誌輪轉：

```yaml
services:
  ai-town:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 安全建議

1. **不要公開暴露端口到公網**：當前配置綁定到 `0.0.0.0`，如需安全部署，修改為 `127.0.0.1`

2. **定期更新映像**：重新構建映像以獲取安全更新

3. **環境變數保護**：不要將 `.env.docker` 提交到版本控制

4. **網絡隔離**：容器運行在獨立網絡 `ai-town_ai-town-network` 中

## 更新部署

### 更新代碼

1. 停止容器：
   ```bash
   .\deploy-scripts\stop-docker-production.bat
   ```

2. 重新構建映像：
   ```bash
   docker build -t ai-town-ai-town:latest .
   ```

3. 重新啟動：
   ```bash
   .\deploy-scripts\start-docker-production.bat
   ```

### 更新配置

修改 `docker-compose.deployment.yml` 或 `.env.docker` 後：

```bash
docker-compose -f docker-compose.deployment.yml up -d --force-recreate
```

## 附錄

### Docker Compose 文件結構

主要配置文件：
- `docker-compose.deployment.yml` - 生產環境配置
- `docker-compose.yml` - 原始配置（端口不同）

### 腳本說明

| 腳本 | 功能 |
|------|------|
| `start-docker-production.bat` | 啟動生產環境 |
| `stop-docker-production.bat` | 停止生產環境 |
| `check-docker-status.bat` | 檢查服務狀態 |

### 相關文檔

- [Docker 官方文檔](https://docs.docker.com/)
- [Convex 文檔](https://docs.convex.dev/)
- [AI Town 主 README](../README.md)

---

**最後更新**: 2025-11-15
**維護者**: AI Town 開發團隊
