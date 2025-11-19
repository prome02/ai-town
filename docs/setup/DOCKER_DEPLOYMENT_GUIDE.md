# AI Town Docker 部署指南

## 概述

本指南說明如何使用 Docker 部署 AI Town 正式環境。

## 前置需求

### 必要軟體
- **Docker Desktop** (Windows/Mac) 或 **Docker Engine** (Linux)
- **Docker Compose** v2.0+

### 檢查安裝
```bash
docker --version
docker-compose --version
```

## 快速開始

### 1. 建立並啟動容器

```bash
# 建立 image 並啟動容器
docker-compose up -d --build

# 或分步執行
docker-compose build      # 僅建立 image
docker-compose up -d      # 啟動容器
```

**參數說明:**
- `--build`: 強制重新建立 Docker image
- `-d`: 背景執行 (detached mode)

### 2. 查看啟動狀態

```bash
# 查看容器狀態
docker-compose ps

# 查看即時日誌
docker-compose logs -f ai-town

# 查看特定服務日誌
docker-compose exec ai-town tail -f /var/log/convex-backend.log
docker-compose exec ai-town tail -f /var/log/convex-dev.log
docker-compose exec ai-town tail -f /var/log/vite.log
```

### 3. 訪問應用

等待約 30-40 秒讓所有服務啟動完成後:

- **主應用**: http://localhost:5173/ai-town/
- **Convex Dashboard**: http://localhost:3210

### 4. 停止與清理

```bash
# 停止容器 (保留數據)
docker-compose stop

# 停止並移除容器 (保留 image)
docker-compose down

# 完全清理 (包含 image 和 volumes)
docker-compose down --rmi all --volumes
```

## Docker 配置說明

### docker-compose.yml 配置

| 配置項 | 說明 |
|--------|------|
| `container_name` | 容器名稱: `ai-town-production` |
| `ports` | 5173 (前端), 3210 (Convex) |
| `volumes` | 即時同步程式碼與數據 |
| `restart` | 自動重啟策略: `unless-stopped` |
| `healthcheck` | 健康檢查: 每 30 秒檢查前端服務 |

### 環境變數

在 [docker-compose.yml](../../docker-compose.yml#L16) 中預設設定:

```yaml
environment:
  - NODE_ENV=production
  - VITE_CONVEX_URL=http://127.0.0.1:3210
```

## 啟動流程詳解

Docker 容器啟動時會自動執行 [docker-entrypoint.sh](../../docker-entrypoint.sh):

1. **[1/6] 檢查環境設定**
   - 確認 `.env.local` 存在
   - 設定本地 Convex URL

2. **[2/6] 檢查專案依賴**
   - 自動執行 `npm install` (若需要)

3. **[3/6] 啟動 Convex Local Backend**
   - 啟動本地 Convex 後端 (port 3210)
   - 等待最多 30 秒確認啟動成功

4. **[4/6] 啟動 Convex Dev**
   - 同步 Convex 函數
   - 等待 15 秒完成編譯

5. **[5/6] 啟動前端應用**
   - 執行 `npm run dev:frontend`
   - 等待 10 秒啟動 Vite

6. **[6/6] 監控與保持運行**
   - 持續監控關鍵進程
   - 接收 SIGTERM/SIGINT 時優雅關閉

## 常見操作

### 重新建立 Image

當修改了 Dockerfile 或依賴時:

```bash
docker-compose build --no-cache
docker-compose up -d
```

### 進入容器調試

```bash
# 進入容器 bash
docker-compose exec ai-town bash

# 或直接執行命令
docker-compose exec ai-town ps aux
docker-compose exec ai-town npm list
```

### 查看資源使用

```bash
# 查看容器資源使用
docker stats ai-town-production

# 查看詳細資訊
docker inspect ai-town-production
```

### 清理 Docker 空間

```bash
# 清理未使用的 images
docker image prune -a

# 清理未使用的 volumes
docker volume prune

# 清理所有未使用資源
docker system prune -a --volumes
```

## 故障排除

### 問題 1: 容器啟動失敗

**症狀**: `docker-compose up` 後容器立即退出

**解決方案**:
```bash
# 查看詳細日誌
docker-compose logs ai-town

# 檢查啟動腳本
docker-compose exec ai-town cat /var/log/convex-backend.log
```

### 問題 2: 無法訪問前端

**症狀**: http://localhost:5173 無法連接

**解決方案**:
```bash
# 確認容器運行中
docker-compose ps

# 查看 Vite 日誌
docker-compose exec ai-town tail -f /var/log/vite.log

# 檢查端口映射
docker port ai-town-production
```

### 問題 3: Convex 後端連接失敗

**症狀**: 前端顯示 Convex 連接錯誤

**解決方案**:
```bash
# 檢查 Convex 後端狀態
docker-compose exec ai-town curl http://127.0.0.1:3210

# 查看 Convex 後端日誌
docker-compose exec ai-town cat /var/log/convex-backend.log

# 重啟容器
docker-compose restart ai-town
```

### 問題 4: 健康檢查失敗

**症狀**: `docker-compose ps` 顯示 `unhealthy`

**解決方案**:
```bash
# 查看健康檢查日誌
docker inspect ai-town-production | grep -A 10 Health

# 手動測試健康檢查
docker-compose exec ai-town curl -f http://localhost:5173

# 延長等待時間後再檢查
sleep 30 && docker-compose ps
```

## 生產環境建議

### 1. 使用獨立的 Convex 部署

在生產環境中,建議使用 Convex Cloud 而非本地後端:

```yaml
# docker-compose.yml
environment:
  - VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

### 2. 資源限制

```yaml
# docker-compose.yml
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

### 3. 日誌管理

```yaml
# docker-compose.yml
services:
  ai-town:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 安全性加固

- 使用 `.dockerignore` 排除敏感檔案
- 不要在 image 中包含 `.env` 檔案
- 使用 secrets 管理敏感資訊

## 與本地開發比較

| 特性 | Docker 部署 | 本地開發 (bat 腳本) |
|------|------------|-------------------|
| **環境隔離** | ✅ 完全隔離 | ❌ 依賴本地環境 |
| **一致性** | ✅ 跨平台一致 | ⚠️ 依賴 Windows |
| **部署便利** | ✅ 一鍵部署 | ❌ 需手動配置 |
| **資源佔用** | ⚠️ 較高 | ✅ 較低 |
| **啟動速度** | ⚠️ 較慢 (首次) | ✅ 較快 |
| **調試便利** | ⚠️ 需進入容器 | ✅ 直接訪問 |

## 參考資料

### 相關檔案
- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)
- [docker-entrypoint.sh](../../docker-entrypoint.sh)

### 相關文檔
- [環境變數設定指南](ENV_SETUP_GUIDE.md)
- [本地啟動腳本指南](STARTUP_SCRIPTS_GUIDE.md)
- [測試流程指南](../testing/TESTING.md)

### 外部資源
- [Docker 官方文檔](https://docs.docker.com/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)
- [Convex 部署指南](https://docs.convex.dev/production/hosting)

---

**最後更新**: 2025-11-10
**維護者**: AI Town 開發團隊
