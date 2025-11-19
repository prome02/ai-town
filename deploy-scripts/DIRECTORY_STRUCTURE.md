# Deploy Scripts 目錄結構說明

本文檔說明 `deploy-scripts/` 目錄的組織結構和文件整理結果。

## 📁 目錄結構

```
deploy-scripts/
├── README.md                           # 部署腳本總說明
├── DIRECTORY_STRUCTURE.md              # 本文件 - 目錄結構說明
├── DOCKER_DEPLOYMENT_README.md         # Docker 部署詳細指南
│
├── 🚀 生產環境腳本
├── start-docker-production.bat         # Docker 生產環境啟動
├── stop-docker-production.bat          # Docker 生產環境停止
├── check-docker-status.bat             # Docker 狀態檢查
│
├── 💻 本地開發腳本
├── start-ai-town-local.bat             # 本地開發環境啟動
├── stop-ai-town.bat                    # 停止所有服務
├── switch-convex-mode.bat              # 切換 Convex 本地/雲端模式
│
├── 🏗️ 構建與匯出腳本
├── 0-deploy-all.bat                    # 一鍵完整部署
├── 1-build-docker-image.bat            # 構建 Docker 映像
├── 2-export-docker-image.bat           # 匯出 Docker 映像
├── 3-start-container.bat               # 啟動容器（舊版）
├── 3-start-container-fixed.bat         # 啟動容器（修復版）
│
├── 📚 docs/                            # 部署文檔
│   ├── DEPLOYMENT_FINAL_SUMMARY.md     # 最終部署總結
│   ├── DEPLOYMENT_SUMMARY.md           # 部署摘要
│   ├── DEPLOYMENT_TEST_PLAN.md         # 部署測試計劃
│   ├── DOCKER_IMAGE_IMPORT_GUIDE.md    # Docker 映像導入指南
│   └── DOCKER_IMPORT_QUICKSTART.txt    # 快速導入說明
│
├── 🐳 dockerfiles/                     # Dockerfile 變體
│   ├── Dockerfile.optimized            # 優化版 Dockerfile
│   ├── Dockerfile.optimized-dev        # 開發優化版
│   └── Dockerfile.production           # 生產環境版
│
└── 💾 images/                          # Docker 映像檔案（已排除 git）
    ├── ai-town-image-latest.tar        # Docker 映像 (tar 格式)
    ├── ai-town-image-latest.tar.gz     # Docker 映像 (壓縮版)
    └── ai-town-image-latest.tar.gz.sha256  # SHA256 校驗檔
```

## 📋 文件整理說明

### 從根目錄移動的文件

為了保持專案根目錄的整潔，以下文件已從根目錄移至 `deploy-scripts/`：

#### 啟動腳本
- `start-ai-town.bat` → `deploy-scripts/start-ai-town-local.bat`
- `start-ai-town-local.bat` → `deploy-scripts/`
- `stop-ai-town.bat` → `deploy-scripts/`
- `switch-convex-mode.bat` → `deploy-scripts/`

#### 部署文檔
- `DEPLOYMENT_*.md` → `deploy-scripts/docs/`
- `DOCKER_IMAGE_IMPORT_GUIDE.md` → `deploy-scripts/docs/`
- `DOCKER_IMPORT_QUICKSTART.txt` → `deploy-scripts/docs/`

#### Dockerfile 變體
- `Dockerfile.optimized*` → `deploy-scripts/dockerfiles/`
- `Dockerfile.production` → `deploy-scripts/dockerfiles/`

#### Docker 映像檔
- `ai-town-image-latest.*` → `deploy-scripts/images/`

### 保留在根目錄的文件

以下 Docker 相關文件保留在根目錄（Docker 標準做法）：
- `Dockerfile` - 主要的 Dockerfile
- `docker-compose.yml` - 開發環境配置
- `docker-compose.deployment.yml` - 生產環境配置
- `docker-compose.override.yml` - 本地覆寫配置
- `docker-entrypoint.sh` - 容器入口腳本
- `.env.docker` - Docker 環境變數模板

## 🎯 快速使用指南

### Docker 生產部署

```bash
# 從專案根目錄執行
.\deploy-scripts\start-docker-production.bat
```

訪問：http://localhost:18000/ai-town/

### 本地開發

```bash
# 從專案根目錄執行
.\deploy-scripts\start-ai-town-local.bat
```

訪問：http://localhost:5173/

## 📖 相關文檔

- [README.md](README.md) - 部署腳本使用說明
- [DOCKER_DEPLOYMENT_README.md](DOCKER_DEPLOYMENT_README.md) - Docker 部署詳細指南
- [docs/](docs/) - 部署相關文檔集合

## 🔧 注意事項

1. **路徑更新**: 所有啟動腳本已從根目錄移至 `deploy-scripts/`
   - 舊路徑: `.\start-ai-town-local.bat`
   - 新路徑: `.\deploy-scripts\start-ai-town-local.bat`

2. **文檔引用**: 已更新以下文件中的路徑引用
   - `CLAUDE.md`
   - `README.md`

3. **Git 排除**: `images/` 目錄中的大型二進位檔案已在 `.gitignore` 中排除

4. **臨時文件**: 以下目錄/文件建議清理（已在 `.gitignore` 中）
   - `ai-town/`
   - `ai-town-deployment-package/`
   - `nul`

---

**整理日期**: 2025-11-15
**維護者**: AI Town 開發團隊
