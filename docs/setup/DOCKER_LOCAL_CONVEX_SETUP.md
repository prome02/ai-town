# Docker 本地 Convex 後端部署摘要

**日期**: 2025-11-10
**目標**: 在 Docker 容器中運行 AI Town,使用本地 Linux 版 Convex Local Backend

---

## 完成狀態

### ✅ 已完成的工作

1. **下載並安裝 Convex Local Backend (Linux 版本)**
   - 版本: `precompiled-2025-10-29-a78fd1e`
   - 平台: `x86_64-unknown-linux-gnu`
   - 安裝位置: `/usr/local/bin/convex-local-backend`

2. **修改 Dockerfile**
   - 新增下載並安裝 Convex Local Backend 的步驟
   - 檔案: [Dockerfile](../../Dockerfile#L38-43)

3. **創建啟動腳本**
   - 本地模式: [docker-entrypoint.sh](../../docker-entrypoint.sh)
   - 雲端模式: [docker-entrypoint-cloud.sh](../../docker-entrypoint-cloud.sh)

4. **配置 docker-compose.yml**
   - 設定環境變數使用本地 URL
   - 端口映射: 3210 (Convex), 5173 (Vite)
   - 檔案: [docker-compose.yml](../../docker-compose.yml)

5. **複製本地資料庫**
   - 從 Windows 本地複製 2.6GB 的 SQLite 資料庫到容器
   - 命令: `docker cp convex_local_backend.sqlite3 ai-town-production:/usr/src/app/`

6. **修正 WebSocket 連接問題**
   - 設定 `--interface 0.0.0.0` (綁定所有網路介面)
   - 設定 `--convex-origin http://localhost:3210` (客戶端連接地址)
   - 設定 `--convex-site http://localhost:3211` (HTTP Actions 地址)

---

## 當前配置

### 服務架構

```
┌─────────────────────────────────────────────────┐
│          Docker 容器 (ai-town-production)        │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  Convex Local Backend                    │  │
│  │  - Port: 3210 (綁定到 0.0.0.0)          │  │
│  │  - Origin: http://localhost:3210        │  │
│  │  - Database: convex_local_backend.sqlite3│  │
│  │  - Size: 2.6 GB                         │  │
│  └─────────────────────────────────────────┘  │
│                     ↕                           │
│  ┌─────────────────────────────────────────┐  │
│  │  Convex Dev (函數同步)                  │  │
│  │  - URL: http://127.0.0.1:3210          │  │
│  └─────────────────────────────────────────┘  │
│                     ↕                           │
│  ┌─────────────────────────────────────────┐  │
│  │  Vite 前端                               │  │
│  │  - Port: 5173                           │  │
│  │  - Path: /ai-town                       │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↕
         端口映射到主機 (0.0.0.0:3210, 0.0.0.0:5173)
                      ↕
┌─────────────────────────────────────────────────┐
│            瀏覽器 (localhost)                    │
│                                                 │
│  http://localhost:5173/ai-town  → Vite         │
│  ws://localhost:3210/...         → Convex      │
└─────────────────────────────────────────────────┘
```

### 關鍵檔案

| 檔案 | 用途 | 狀態 |
|------|------|------|
| `Dockerfile` | 定義 Docker image 建置流程 | ✅ 已修改 |
| `docker-compose.yml` | 定義服務配置與端口映射 | ✅ 已修改 |
| `docker-entrypoint.sh` | 容器啟動腳本 (本地模式) | ✅ 已創建 |
| `.env.local` | 環境變數配置 | ✅ 使用本地 URL |
| `convex_local_backend.sqlite3` | Convex 資料庫 (2.6GB) | ✅ 已複製 |

### 環境變數

```bash
# 容器環境變數 (docker-compose.yml)
NODE_ENV=production
VITE_CONVEX_URL=http://127.0.0.1:3210

# 本地 .env.local
VITE_CONVEX_URL=http://127.0.0.1:3210
```

---

## 使用指南

### 啟動服務

```bash
# 方式 1: 使用現有 image
docker-compose up -d

# 方式 2: 重新 build
docker-compose up -d --build

# 方式 3: 完全重建 (清除快取)
docker-compose build --no-cache
docker-compose up -d
```

### 查看狀態

```bash
# 容器狀態
docker-compose ps

# 即時日誌
docker-compose logs -f ai-town

# 特定服務日誌
docker exec ai-town-production tail -f /var/log/convex-backend.log
docker exec ai-town-production tail -f /var/log/convex-dev.log
docker exec ai-town-production tail -f /var/log/vite.log
```

### 訪問應用

- **前端應用**: http://localhost:5173/ai-town/
- **Convex API**: http://localhost:3210/

### 停止服務

```bash
# 停止容器 (保留數據)
docker-compose stop

# 停止並移除容器 (保留 image)
docker-compose down

# 完全清理
docker-compose down --rmi all --volumes
```

---

## 問題排查

### 問題 1: WebSocket 連接失敗

**症狀**:
```
WebSocket connection to 'ws://127.0.0.1:3210/api/1.15.0/sync' failed
```

**原因**: Convex Local Backend 需要正確的 `--convex-origin` 設定

**解決方案**: 已在啟動腳本中加入參數
```bash
convex-local-backend \
  --interface 0.0.0.0 \
  --convex-origin http://localhost:3210 \
  --convex-site http://localhost:3211
```

### 問題 2: 前端顯示空白/無地圖

**可能原因**:
1. 資料庫未初始化
2. Convex 函數未同步

**解決方案**:
```bash
# 複製本地資料庫
docker cp /path/to/convex_local_backend.sqlite3 ai-town-production:/usr/src/app/

# 重啟容器
docker-compose restart ai-town
```

### 問題 3: 容器不斷重啟

**查看原因**:
```bash
docker-compose logs --tail=50 ai-town
```

**常見原因**:
- 啟動腳本語法錯誤 (檢查行尾符號是否為 LF)
- Convex 後端啟動失敗 (檢查參數是否正確)
- 端口衝突 (檢查 3210/5173 是否被佔用)

### 問題 4: Agent 不會移動

**症狀**:
- AI Town 成功啟動，但畫面中的 agent 角色不會移動
- 遊戲迴圈似乎沒有正常運行

**可能原因**:
- LLM 服務無法訪問，導致 agent 無法做出決策
- Ollama 服務未運行或容器無法訪問宿主機上的 Ollama 服務

**解決方案**:
1. 確保宿主機上的 Ollama 服務正在運行：
   ```bash
   # 檢查 Ollama 服務狀態
   ollama list
   
   # 如果服務未運行，啟動 Ollama 服務
   # 在 Windows 上，Ollama 通常會作為服務自動啟動
   ```

2. 確保所需的模型已拉取：
   ```bash
   ollama pull qwen2.5:14b
   ollama pull nomic-embed-text
   ```

3. 檢查 `docker-compose.yml` 配置是否包含以下環境變量：
   ```yaml
   environment:
     - LLM_API_URL=http://host.docker.internal:11434
   extra_hosts:
     - "host.docker.internal:host-gateway"
   ```

4. 重新啟動容器：
   ```bash
   docker-compose down
   docker-compose up -d
   ```

5. 詳細配置說明請參考 [Docker 與本地 Ollama 服務整合指南](DOCKER_OLLAMA_INTEGRATION.md)

---

## 技術細節

### Convex Local Backend 參數說明

```bash
convex-local-backend --help
```

**關鍵參數**:
- `-i, --interface <INTERFACE>`: 綁定網路介面 (預設: 0.0.0.0)
- `-p, --port <PORT>`: WebSocket 端口 (預設: 3210)
- `--site-proxy-port <PORT>`: HTTP Actions 端口 (預設: 3211)
- `--convex-origin <URL>`: 客戶端連接的 WebSocket/API 地址
- `--convex-site <URL>`: 客戶端連接的 HTTP Actions 地址
- `[DB_SPEC]`: 資料庫檔案路徑 (預設: convex_local_backend.sqlite3)

### Docker Volume 掛載

```yaml
volumes:
  - .:/usr/src/app                    # 專案檔案 (即時同步)
  - /usr/src/app/node_modules         # node_modules (避免覆蓋)
  - ./data:/usr/src/app/data          # 資料目錄
```

**注意**: 由於專案根目錄掛載到容器,本地的 `.env.local` 會覆蓋容器內的版本。

---

## 與本地開發的差異

| 項目 | 本地開發 (Windows) | Docker 部署 |
|------|-------------------|-------------|
| **Convex 後端** | convex-local-backend.exe | convex-local-backend (Linux) |
| **後端位置** | `C:\Users\...\convex-local-backend-x86_64-pc-windows-msvc\` | `/usr/local/bin/` |
| **資料庫** | `convex_local_backend.sqlite3` (同目錄) | `/usr/src/app/convex_local_backend.sqlite3` |
| **啟動方式** | `start-ai-town-production.bat` | `docker-compose up -d` |
| **環境隔離** | ❌ 依賴本地環境 | ✅ 完全隔離 |
| **跨平台** | ❌ 僅 Windows | ✅ 支援 Linux/Mac/Windows |

---

## 下一步建議

### 短期改進

1. **自動化資料庫同步**
   - 在 `docker-entrypoint.sh` 中加入檢查邏輯
   - 如果資料庫不存在或過舊,自動從掛載的 volume 複製

2. **健康檢查優化**
   - 改為檢查 WebSocket 端點而不僅是 HTTP
   - 調整 `start_period` 根據實際啟動時間

3. **日誌管理**
   - 設定日誌輪轉,避免日誌檔案過大
   - 使用 Docker 原生日誌驅動

### 長期規劃

1. **生產環境部署**
   - 使用 Convex Cloud 而非本地後端
   - 設定反向代理 (nginx)
   - 啟用 HTTPS

2. **CI/CD 整合**
   - 自動化 Docker image 建置
   - 版本標籤管理
   - 自動部署到測試/生產環境

3. **監控與告警**
   - 整合 Prometheus + Grafana
   - 設定資源使用告警
   - 追蹤 Convex 後端效能指標

---

## 參考資源

### 官方文檔
- [Convex Local Backend Releases](https://github.com/get-convex/convex-backend/releases)
- [Docker Compose 文檔](https://docs.docker.com/compose/)
- [Convex 文檔](https://docs.convex.dev/)

### 專案相關文檔
- [完整部署指南](DOCKER_DEPLOYMENT_GUIDE.md)
- [環境變數設定](ENV_SETUP_GUIDE.md)
- [啟動腳本指南](STARTUP_SCRIPTS_GUIDE.md)
- [測試流程](../testing/TESTING.md)
- [Docker 與本地 Ollama 服務整合指南](DOCKER_OLLAMA_INTEGRATION.md)

---

**建立日期**: 2025-11-10
**最後更新**: 2025-11-10
**維護者**: AI Town 開發團隊
