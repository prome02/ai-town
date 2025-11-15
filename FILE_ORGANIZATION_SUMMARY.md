# 專案文件整理總結

**整理日期**: 2025-11-15

## 📋 整理目標

為了保持專案根目錄的整潔和組織性，將部署相關文件統一移至 `deploy-scripts/` 目錄。

## ✅ 已完成的整理

### 1. 啟動腳本整理

從根目錄移至 `deploy-scripts/`：
- ✅ `start-ai-town-local.bat`
- ✅ `stop-ai-town.bat`
- ✅ `switch-convex-mode.bat`
- ✅ `start-ai-town-production.bat` → `legacy-start-ai-town-production.bat`

**新增腳本**：
- ✅ `deploy-scripts/start-docker-production.bat` - Docker 生產環境啟動
- ✅ `deploy-scripts/stop-docker-production.bat` - Docker 生產環境停止
- ✅ `deploy-scripts/check-docker-status.bat` - Docker 狀態檢查

### 2. 部署文檔整理

從根目錄移至 `deploy-scripts/docs/`：
- ✅ `DEPLOYMENT_FINAL_SUMMARY.md`
- ✅ `DEPLOYMENT_SUMMARY.md`
- ✅ `DEPLOYMENT_TEST_PLAN.md`
- ✅ `DOCKER_IMAGE_IMPORT_GUIDE.md`
- ✅ `DOCKER_IMPORT_QUICKSTART.txt`

**新增文檔**：
- ✅ `deploy-scripts/DOCKER_DEPLOYMENT_README.md` - Docker 部署詳細指南
- ✅ `deploy-scripts/DIRECTORY_STRUCTURE.md` - 目錄結構說明

### 3. Dockerfile 變體整理

從根目錄移至 `deploy-scripts/dockerfiles/`：
- ✅ `Dockerfile.optimized`
- ✅ `Dockerfile.optimized-dev`
- ✅ `Dockerfile.production`

### 4. Docker 映像檔整理

從根目錄移至 `deploy-scripts/images/`：
- ✅ `ai-town-image-latest.tar`
- ✅ `ai-town-image-latest.tar.gz`
- ✅ `ai-town-image-latest.tar.gz.sha256`

### 5. 配置文件新增

- ✅ `.env.docker` - Docker 環境變數模板（位於根目錄）
- ✅ `docker-compose.deployment.yml` - 生產環境 Docker Compose 配置

### 6. 文檔更新

已更新路徑引用的文件：
- ✅ `CLAUDE.md` - 更新所有啟動腳本路徑
- ✅ `README.md` - 新增 Docker 快速部署說明

## 📁 整理後的目錄結構

```
專案根目錄/
├── CLAUDE.md                           # 開發指引（已更新路徑）
├── README.md                           # 專案說明（已更新）
├── .env.docker                         # Docker 環境模板
├── docker-compose.yml                  # 開發環境配置
├── docker-compose.deployment.yml       # 生產環境配置 ⭐
├── docker-compose.override.yml         # 本地覆寫配置
├── Dockerfile                          # 主 Dockerfile
├── docker-entrypoint.sh                # 容器入口腳本
│
├── deploy-scripts/                     # 🎯 所有部署相關文件
│   ├── README.md                       # 腳本使用說明
│   ├── DIRECTORY_STRUCTURE.md          # 目錄結構說明 ⭐
│   ├── DOCKER_DEPLOYMENT_README.md     # Docker 部署指南 ⭐
│   │
│   ├── 生產環境腳本 ⭐
│   ├── start-docker-production.bat
│   ├── stop-docker-production.bat
│   ├── check-docker-status.bat
│   │
│   ├── 本地開發腳本
│   ├── start-ai-town-local.bat
│   ├── stop-ai-town.bat
│   ├── switch-convex-mode.bat
│   │
│   ├── 構建腳本
│   ├── 0-deploy-all.bat
│   ├── 1-build-docker-image.bat
│   ├── 2-export-docker-image.bat
│   │
│   ├── docs/                           # 部署文檔 ⭐
│   ├── dockerfiles/                    # Dockerfile 變體 ⭐
│   └── images/                         # Docker 映像檔 ⭐
│
├── docs/                               # 專案文檔
├── src/                                # 原始碼
├── convex/                             # Convex 後端
└── ... (其他專案文件)
```

⭐ = 本次整理新增或重新組織的內容

## 🗑️ 建議清理的臨時文件

以下文件/目錄建議刪除（已在 `.gitignore` 中排除）：

```bash
# 臨時目錄
ai-town/
ai-town-deployment-package/

# 臨時文件
nul
```

**清理命令**（可選）：
```bash
# 在專案根目錄執行
rm -rf ai-town/ ai-town-deployment-package/ nul
```

## 📝 路徑變更對照表

### 啟動腳本路徑變更

| 舊路徑 | 新路徑 |
|--------|--------|
| `.\start-ai-town-local.bat` | `.\deploy-scripts\start-ai-town-local.bat` |
| `.\stop-ai-town.bat` | `.\deploy-scripts\stop-ai-town.bat` |
| `.\switch-convex-mode.bat` | `.\deploy-scripts\switch-convex-mode.bat` |
| N/A | `.\deploy-scripts\start-docker-production.bat` ⭐ |
| N/A | `.\deploy-scripts\stop-docker-production.bat` ⭐ |

### 文檔路徑變更

| 舊路徑 | 新路徑 |
|--------|--------|
| `.\DEPLOYMENT_*.md` | `.\deploy-scripts\docs\DEPLOYMENT_*.md` |
| `.\DOCKER_IMAGE_IMPORT_GUIDE.md` | `.\deploy-scripts\docs\` |
| N/A | `.\deploy-scripts\DOCKER_DEPLOYMENT_README.md` ⭐ |

## 🎯 使用方式更新

### Docker 部署（新增）⭐

```bash
# 啟動
.\deploy-scripts\start-docker-production.bat

# 檢查狀態
.\deploy-scripts\check-docker-status.bat

# 停止
.\deploy-scripts\stop-docker-production.bat
```

訪問：http://localhost:18000/ai-town/

### 本地開發（路徑已更新）

```bash
# 啟動
.\deploy-scripts\start-ai-town-local.bat

# 停止
.\deploy-scripts\stop-ai-town.bat
```

訪問：http://localhost:5173/

## 📊 整理統計

- **移動文件**: 15+ 個
- **新增文件**: 7 個
- **更新文件**: 2 個（CLAUDE.md, README.md）
- **新建目錄**: 3 個（docs/, dockerfiles/, images/）
- **整理時間**: 約 30 分鐘

## 🔍 後續建議

1. ✅ **清理臨時文件**：刪除 `ai-town/`, `ai-town-deployment-package/`, `nul`
2. ✅ **測試腳本**：確認所有腳本在新路徑下正常運行
3. ⏳ **更新 CI/CD**：如有自動化流程，更新腳本路徑
4. ⏳ **團隊通知**：告知團隊成員路徑變更

## 📚 相關文檔

- [deploy-scripts/DIRECTORY_STRUCTURE.md](deploy-scripts/DIRECTORY_STRUCTURE.md) - 詳細目錄結構
- [deploy-scripts/DOCKER_DEPLOYMENT_README.md](deploy-scripts/DOCKER_DEPLOYMENT_README.md) - Docker 部署指南
- [CLAUDE.md](CLAUDE.md) - 開發指引
- [README.md](README.md) - 專案說明

---

**整理負責人**: Claude Code
**整理日期**: 2025-11-15
**專案**: AI Town
**版本**: v1.0-mvp

