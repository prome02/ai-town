# Docker Image 優化指南

## 問題診斷

### 當前 Image 大小分析
```
Image: ai-town-ai-town:latest
大小: 7.53GB
```

### 容量分配

| 項目 | 大小 | 佔比 | 說明 |
|------|------|------|------|
| `COPY . .` (含不必要檔案) | 4.86GB | 64% | **主要問題** - 缺少 `.dockerignore` |
| Node.js 環境 (重複安裝) | 670MB | 9% | Builder + Runtime 各一次 |
| Convex Backend (重複) | 332MB | 4% | 下載 + 複製 |
| node_modules | 352MB | 5% | Builder + Runtime |
| 系統套件 | 133MB | 2% | apt-get install |
| Ubuntu base | 88MB | 1% | ubuntu:22.04 |
| 其他 | 1.1GB | 15% | 快取、日誌等 |

### 發現的問題

#### 🔴 嚴重問題

1. **缺少 `.dockerignore` 檔案**
   - 導致以下不必要的檔案被複製:
     - `ai-town-image.tar` (1.2GB)
     - `.git/` 目錄
     - 開發依賴和測試檔案
     - 日誌檔案

2. **使用完整的 Ubuntu 映像**
   - `ubuntu:22.04` 包含許多不必要的工具
   - 建議使用 `node:18-slim` (160MB vs 88MB base + 337MB Node.js 安裝)

#### 🟡 次要問題

3. **重複安裝 Node.js**
   - Builder stage: 337MB
   - Runtime stage: 337MB
   - 應該使用預先包含 Node.js 的官方映像

4. **未清理建置工具**
   - Rust、Cargo、build-essential 等
   - 應該在 multi-stage build 中分離

5. **包含開發依賴**
   - `node_modules` 包含 devDependencies
   - 應該使用 `npm prune --production`

6. **複製整個 Convex Backend**
   - 應該只複製執行檔,不包含下載的 zip

## 優化方案

### 方案 A: 快速修復 (已實施)

#### 1. 建立 `.dockerignore`
```gitignore
# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*.yml
*.tar
ai-town-image.tar

# Node.js
node_modules
npm-debug.log*

# 開發環境
.env
.env.local

# IDE
.vscode
.idea

# 測試與建置
coverage
dist
build

# 文件與腳本
docs/
*.md
*.bat
*.sh
```

**預期效果**: 減少 ~4.5GB

#### 2. 使用 `Dockerfile.production`
- 基於 `node:18-slim` 而非 `ubuntu:22.04`
- Multi-stage build 分離建置與執行環境
- 清理開發依賴

**預期效果**: 額外減少 ~1GB

### 方案 B: 進階優化

#### 1. 使用 Alpine Linux
```dockerfile
FROM node:18-alpine AS builder
# 更小的基礎映像 (~50MB vs 160MB)
```

#### 2. 只複製必要的執行檔案
```dockerfile
# 不複製 src/,只複製建置後的 dist/
COPY --from=builder /usr/src/app/dist ./dist
```

#### 3. 使用 pnpm 替代 npm
```dockerfile
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile
```

## 實施步驟

### 立即執行 (推薦)

1. **清理舊的 image 和 container**
   ```bash
   # 停止並移除舊容器
   docker-compose down
   docker rm -f ai-town-production

   # 移除舊 image
   docker rmi ai-town-ai-town:latest

   # 清理不使用的資源
   docker system prune -a
   ```

2. **使用新的 Dockerfile 重建**
   ```bash
   # 使用 Dockerfile.production
   docker build -f Dockerfile.production -t ai-town:optimized .
   ```

3. **更新 docker-compose.yml**
   ```yaml
   services:
     ai-town:
       build:
         context: .
         dockerfile: Dockerfile.production  # 改用新的 Dockerfile
   ```

4. **重新啟動服務**
   ```bash
   docker-compose up -d --build
   ```

### 驗證優化效果

```bash
# 檢查新 image 大小
docker images ai-town:optimized

# 預期結果: < 1.5GB (從 7.53GB 減少 80%)
```

### 大小預估

| 階段 | Image 大小 | 說明 |
|------|-----------|------|
| **原始** | 7.53GB | 當前狀態 |
| **+ .dockerignore** | ~3GB | 移除不必要檔案 |
| **+ Dockerfile.production** | ~1.2GB | 使用 node:slim + multi-stage |
| **+ Alpine (可選)** | ~800MB | 使用更小的基礎映像 |

## 最佳實踐

### Docker Image 優化清單

- [x] 建立 `.dockerignore` 檔案
- [x] 使用 multi-stage builds
- [x] 使用官方 slim 映像
- [x] 清理 apt cache: `rm -rf /var/lib/apt/lists/*`
- [x] 只安裝生產依賴: `npm prune --production`
- [ ] 考慮使用 Alpine Linux
- [ ] 最小化複製的檔案數量
- [ ] 合併 RUN 指令減少層數
- [ ] 使用 BuildKit cache mounts

### 定期維護

```bash
# 每週清理未使用的 images
docker image prune -a --filter "until=168h"

# 清理 build cache
docker builder prune -a

# 完整清理 (謹慎使用)
docker system prune -a --volumes
```

## 故障排除

### 問題: Build 失敗缺少檔案

**原因**: `.dockerignore` 過於嚴格

**解決**: 檢查並調整 `.dockerignore`,確保必要檔案未被排除

### 問題: 執行時錯誤

**原因**: 生產環境缺少必要的依賴

**解決**:
```dockerfile
# 確保複製所有運行時需要的檔案
COPY convex ./convex
COPY data ./data
COPY public ./public
```

### 問題: Image 仍然很大

**檢查步驟**:
```bash
# 查看各層大小
docker history ai-town:optimized --no-trunc

# 進入容器檢查檔案
docker run -it ai-town:optimized sh
du -sh /*
```

## 參考資源

- [Docker 官方最佳實踐](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker 映像選擇指南](https://github.com/nodejs/docker-node/blob/main/README.md#image-variants)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)

---

**最後更新**: 2025-11-12
**維護者**: AI Town 開發團隊
