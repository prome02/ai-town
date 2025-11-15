# AI Town 部署包測試計劃

## 測試目的
驗證 AI Town 部署包在全新環境中能夠正確部署並運行，確保所有修正（包括腳本 exit codes、Docker 配置、LLM 整合）都正常工作。

## 測試環境要求

### 必要軟體
- **Docker Desktop**: 版本 20.10 或更高
- **Node.js**: 版本 18 或更高（用於本地開發，部署包內已包含）
- **Ollama**: 用於本地 LLM 服務
- **作業系統**: Windows 10/11（使用 Git Bash 或 PowerShell）

### 必要的 Ollama 模型
在開始測試前，請確認已下載以下模型：
```bash
ollama list
```

應該看到：
- `qwen2.5:14b` - 對話模型
- `nomic-embed-text` - 嵌入模型

如果沒有，請執行：
```bash
ollama pull qwen2.5:14b
ollama pull nomic-embed-text
```

### 網路端口要求
確保以下端口未被佔用：
- `5173` - Vite 前端
- `3210` - Convex 本地後端
- `11434` - Ollama LLM API

檢查方法：
```bash
netstat -ano | findstr ":5173 :3210 :11434"
```

---

## 測試前準備

### 1. 取得部署包
部署包位於：`D:\downloadProj\ai-town\ai-town-deployment-package\`

### 2. 驗證部署包完整性
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package
ls -lh
```

**預期內容**：
```
- ai-town-image-latest.tar.gz (約 1.1GB)
- ai-town-image-latest.tar.gz.sha256
- docker-compose.yml
- docker-entrypoint.sh
- .env.local
- data/ (目錄)
- convex/ (目錄，不應包含 _generated 子目錄)
- deploy-scripts/ (目錄)
- DOCKER_IMAGE_IMPORT_GUIDE.md
- DOCKER_IMPORT_QUICKSTART.txt
```

### 3. 驗證 SHA256 校驗和（可選但推薦）
```bash
sha256sum -c ai-town-image-latest.tar.gz.sha256
```

**預期輸出**：
```
ai-town-image-latest.tar.gz: OK
```

### 4. 清理現有環境
```bash
# 停止並移除現有容器
docker-compose down

# 移除舊映像（確保測試全新匯入）
docker rmi ai-town-ai-town:latest

# 清理 Docker volumes（可選，用於完全乾淨的測試）
docker volume prune
```

---

## 測試步驟

### 測試案例 1: Docker 映像匯入

**目的**: 驗證 Docker 映像可以正確匯入

**步驟**:
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package
docker load -i ai-town-image-latest.tar.gz
```

**預期結果**:
- 命令成功執行，無錯誤訊息
- 最後一行顯示：`Loaded image: ai-town-ai-town:latest`

**驗證**:
```bash
docker images | grep ai-town
```

應該看到：
```
ai-town-ai-town    latest    <IMAGE_ID>    <TIME>    3.76GB
```

**通過條件**: ✅ 映像成功載入，大小約 3.76GB

---

### 測試案例 2: 環境配置檢查

**目的**: 驗證環境變數配置正確

**步驟**:
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package
cat .env.local
```

**預期輸出**:
```
# AI Town 環境變數配置

# Convex 本地後端 URL
VITE_CONVEX_URL=http://127.0.0.1:3210

# Ollama LLM API URL (可選)
# LLM_API_URL=http://host.docker.internal:11434
```

**驗證 docker-compose.yml**:
```bash
cat docker-compose.yml | grep -A 3 "environment:"
```

**預期輸出**:
```yaml
environment:
  - NODE_ENV=production
  - VITE_CONVEX_URL=http://127.0.0.1:3210
  - LLM_API_URL=http://host.docker.internal:11434
```

**通過條件**:
- ✅ .env.local 存在且格式正確
- ✅ docker-compose.yml 包含正確的環境變數
- ✅ LLM_API_URL 設為 `http://host.docker.internal:11434`

---

### 測試案例 3: 啟動容器

**目的**: 驗證容器可以正確啟動

**步驟**:
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package
docker-compose up -d
```

**預期輸出**:
```
Creating network "ai-town-network" ...
Creating volume "ai-town-database" ...
Creating ai-town-production ... done
```

**驗證容器狀態**:
```bash
docker ps | grep ai-town
```

**預期輸出**: 容器狀態應為 `Up` 或 `Up (health: starting)`

等待約 30-60 秒後，再次檢查：
```bash
docker ps | grep ai-town
```

**預期輸出**: 容器狀態應為 `Up (healthy)`

**通過條件**:
- ✅ 容器成功啟動
- ✅ 容器健康檢查通過（狀態為 healthy）
- ✅ 無重啟循環（RESTART 欄位為 0）

---

### 測試案例 4: 服務可用性檢查

**目的**: 驗證前端和後端服務都正常運行

**步驟 4.1 - 檢查 Convex 後端**:
```bash
curl -I http://127.0.0.1:3210
```

**預期輸出**:
```
HTTP/1.1 200 OK
```

**步驟 4.2 - 檢查 Vite 前端**:
```bash
curl -I http://localhost:5173
```

**預期輸出**:
```
HTTP/1.1 200 OK
```

**步驟 4.3 - 檢查容器日誌**:
```bash
docker logs ai-town-production | tail -50
```

**預期輸出應包含**:
- ✅ `✅ Convex 本地後端正在運行 (PID: XXXX)`
- ✅ `✅ Vite 前端正在運行 (PID: XXXX)`
- ✅ `Local:   http://localhost:5173/`
- ✅ 無紅色錯誤訊息（ERROR 或 FATAL）

**通過條件**:
- ✅ Convex 後端返回 HTTP 200
- ✅ Vite 前端返回 HTTP 200
- ✅ 日誌顯示兩個服務都已啟動

---

### 測試案例 5: LLM 連接測試

**目的**: 驗證容器可以連接到主機的 Ollama 服務

**前置條件**: 確認 Ollama 正在運行
```bash
curl http://127.0.0.1:11434/api/tags
```

應該返回模型列表（JSON 格式）

**步驟 5.1 - 從容器內測試連接**:
```bash
docker exec ai-town-production curl -s http://host.docker.internal:11434/api/tags | head -20
```

**預期輸出**: 應該看到 JSON 格式的模型列表，包含：
- `qwen2.5:14b`
- `nomic-embed-text`

**步驟 5.2 - 檢查環境變數**:
```bash
docker exec ai-town-production env | grep LLM
```

**預期輸出**:
```
LLM_API_URL=http://host.docker.internal:11434
```

**步驟 5.3 - 檢查 Convex 後端日誌中的 LLM 相關訊息**:
```bash
docker exec ai-town-production cat /var/log/convex-backend.log | grep -i "llm\|embedding\|ollama" | tail -20
```

**預期結果**:
- ✅ 應該看到 embedding 索引更新的日誌
- ❌ 不應該有 "Connection refused" 錯誤

**通過條件**:
- ✅ 容器可以訪問 host.docker.internal:11434
- ✅ LLM_API_URL 環境變數正確設定
- ✅ 無 LLM 連接錯誤

---

### 測試案例 6: 資料庫初始化

**目的**: 驗證資料庫可以正確初始化

**步驟 6.1 - 檢查 package.json**:
```bash
docker exec ai-town-production cat /usr/src/app/package.json | grep '"init"'
```

**預期輸出**:
```json
"init": "tsx convex/init.ts",
```

**步驟 6.2 - 執行初始化**:
```bash
docker exec ai-town-production bash -c "cd /usr/src/app && npm run init"
```

**預期輸出應包含**:
- `Writing data/...`
- `✓ Initialized`
- 無錯誤訊息

**步驟 6.3 - 驗證資料庫檔案**:
```bash
docker exec ai-town-production ls -lh /usr/src/app/database/
```

**預期結果**: 應該看到資料庫檔案（.sqlite 或類似格式）

**通過條件**:
- ✅ 初始化腳本成功執行
- ✅ 資料庫檔案已創建
- ✅ 無錯誤訊息

---

### 測試案例 7: 前端功能測試

**目的**: 驗證前端頁面可以正常載入

**步驟 7.1 - 訪問主頁**:
在瀏覽器中打開：`http://localhost:5173/`

**預期結果**:
- ✅ 頁面成功載入（無白屏或錯誤頁面）
- ✅ 可以看到遊戲介面或載入畫面
- ✅ 瀏覽器控制台無致命錯誤（允許一些警告）

**步驟 7.2 - 檢查瀏覽器控制台**:
按 F12 打開開發者工具，查看 Console 標籤

**預期結果**:
- ❌ 無紅色錯誤（特別是 WebSocket 連接錯誤）
- ✅ 應該看到成功連接到 Convex 的訊息

**步驟 7.3 - 檢查網路請求**:
在開發者工具的 Network 標籤中

**預期結果**:
- ✅ 對 `http://127.0.0.1:3210` 的 WebSocket 連接成功
- ✅ 無 404 或 500 錯誤

**通過條件**:
- ✅ 頁面可以訪問
- ✅ 無致命錯誤
- ✅ WebSocket 連接成功

---

### 測試案例 8: 端到端對話測試（進階）

**目的**: 驗證完整的 AI 對話功能

**前置條件**:
- 所有前面的測試都已通過
- Ollama 模型已下載
- 資料庫已初始化

**步驟 8.1 - 觸發 AI 對話**:
在前端介面中，嘗試與 AI 角色互動

**預期結果**:
- ✅ AI 能夠回應
- ✅ 無 LLM 錯誤訊息
- ✅ 對話記錄正確顯示

**步驟 8.2 - 檢查 Convex 日誌**:
```bash
docker exec ai-town-production cat /var/log/convex-backend.log | grep -i "error\|fatal" | tail -20
```

**預期結果**:
- ❌ 無 LLM 相關錯誤
- ❌ 無 embedding 錯誤

**通過條件**:
- ✅ AI 對話功能正常
- ✅ 無 LLM 連接或推理錯誤

---

### 測試案例 9: 容器重啟測試

**目的**: 驗證容器可以正確重啟並恢復服務

**步驟 9.1 - 重啟容器**:
```bash
docker restart ai-town-production
```

**步驟 9.2 - 等待啟動**:
等待約 30-60 秒

**步驟 9.3 - 驗證服務**:
```bash
curl -I http://127.0.0.1:3210
curl -I http://localhost:5173
docker ps | grep ai-town
```

**預期結果**:
- ✅ 兩個服務都返回 HTTP 200
- ✅ 容器狀態為 `Up (healthy)`
- ✅ 資料未丟失

**通過條件**:
- ✅ 容器成功重啟
- ✅ 所有服務恢復正常
- ✅ 無需手動干預

---

### 測試案例 10: 停止和清理

**目的**: 驗證可以正確停止和清理環境

**步驟 10.1 - 停止容器**:
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package
docker-compose down
```

**預期輸出**:
```
Stopping ai-town-production ... done
Removing ai-town-production ... done
Removing network ai-town-network
```

**步驟 10.2 - 驗證清理**:
```bash
docker ps -a | grep ai-town
```

**預期結果**: 無輸出（容器已移除）

**通過條件**:
- ✅ 容器成功停止並移除
- ✅ 無殘留進程

---

## 部署腳本測試（可選但推薦）

如果要測試部署腳本的完整流程：

### 腳本測試 1: 一鍵部署腳本

**步驟**:
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package\deploy-scripts
./0-deploy-all.bat
```

**預期行為**:
1. 執行步驟 1: 匯入映像 → 返回 exit code 0
2. 執行步驟 2: 環境設置 → 返回 exit code 0
3. 執行步驟 3: 啟動容器 → 返回 exit code 0
4. 執行步驟 4: 初始化資料庫 → 返回 exit code 0

**關鍵驗證點**:
- ✅ 所有步驟都顯示成功訊息
- ✅ 無 "步驟 X 失敗" 訊息
- ✅ 腳本正常結束（不中斷）

**通過條件**:
- ✅ 所有 4 個步驟都成功執行
- ✅ 容器最終處於運行狀態

### 腳本測試 2: 個別腳本 Exit Code

**目的**: 驗證所有腳本都有正確的 exit code

**測試方法**:
```bash
cd D:\downloadProj\ai-town\ai-town-deployment-package\deploy-scripts

# 測試每個腳本
./1-import-image.bat
echo "Exit code: $?"  # 應該是 0

./2-setup-environment.bat
echo "Exit code: $?"  # 應該是 0

./3-start-container.bat
echo "Exit code: $?"  # 應該是 0

./stop-container.bat
echo "Exit code: $?"  # 應該是 0
```

**通過條件**:
- ✅ 所有腳本返回 exit code 0（成功）
- ✅ 無腳本返回非零 exit code

---

## 已知問題和預期行為

### 預期的警告訊息（可忽略）
1. Docker Compose 版本警告：
   ```
   the attribute `version` is obsolete, it will be ignored
   ```
   這是正常的，Docker Compose v2 不再需要 version 屬性。

2. Windows 路徑轉換訊息（Git Bash）：
   ```
   MSYS_NO_PATHCONV=1
   ```
   這是正常的環境變數設定。

### 不應出現的錯誤
❌ `Connection refused` 到 Ollama
❌ `exec /usr/src/app/docker-entrypoint.sh: no such file or directory`
❌ `\r': command not found` （行結束符問題）
❌ `步驟 2 失敗: 環境設置失敗` （exit code 問題）
❌ LLM embedding 錯誤（如果模型已下載）

---

## 測試報告模板

請使用以下模板記錄測試結果：

```markdown
# AI Town 部署測試報告

**測試日期**: YYYY-MM-DD
**測試者**: [您的名字或 AI 識別碼]
**部署包版本**: [日期或版本號]

## 環境資訊
- 作業系統:
- Docker 版本:
- Node.js 版本:
- Ollama 版本:

## 測試結果摘要
- 總測試案例: 10
- 通過: X
- 失敗: X
- 跳過: X

## 詳細結果

### 測試案例 1: Docker 映像匯入
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 2: 環境配置檢查
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 3: 啟動容器
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 4: 服務可用性檢查
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 5: LLM 連接測試
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 6: 資料庫初始化
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 7: 前端功能測試
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 8: 端到端對話測試
- [ ] 通過
- [ ] 失敗
- [ ] 跳過
- 備註:

### 測試案例 9: 容器重啟測試
- [ ] 通過
- [ ] 失敗
- 備註:

### 測試案例 10: 停止和清理
- [ ] 通過
- [ ] 失敗
- 備註:

## 部署腳本測試（可選）

### 一鍵部署腳本
- [ ] 通過
- [ ] 失敗
- [ ] 未測試
- 備註:

### Exit Code 測試
- [ ] 通過
- [ ] 失敗
- [ ] 未測試
- 備註:

## 發現的問題

### 問題 1
- **嚴重程度**: 高/中/低
- **描述**:
- **重現步驟**:
- **錯誤訊息**:
- **截圖**: （如有）

## 建議改進

1.
2.
3.

## 總結

[整體測試結論，是否建議部署到生產環境]
```

---

## 測試成功標準

要被視為**完全通過測試**，必須滿足：

1. ✅ 所有 10 個核心測試案例都通過
2. ✅ 容器可以在 60 秒內啟動並變為 healthy
3. ✅ 前端和後端都可以訪問（HTTP 200）
4. ✅ LLM 連接無錯誤（如果 Ollama 正在運行）
5. ✅ 容器日誌無致命錯誤
6. ✅ 部署腳本的 exit code 都正確（可選但推薦）

---

## 故障排除指南

### 問題: 容器無法啟動

**檢查步驟**:
```bash
docker logs ai-town-production
```

**常見原因**:
1. 端口衝突 → 檢查 5173 和 3210 是否被佔用
2. 映像損壞 → 重新匯入映像
3. 權限問題 → 以管理員身份運行

### 問題: LLM 連接失敗

**檢查步驟**:
```bash
# 檢查 Ollama 是否運行
curl http://127.0.0.1:11434/api/tags

# 檢查容器網路
docker exec ai-town-production ping -c 3 host.docker.internal
```

**常見原因**:
1. Ollama 未啟動 → `ollama serve`
2. 模型未下載 → `ollama pull qwen2.5:14b` 和 `ollama pull nomic-embed-text`
3. 防火牆阻擋 → 允許 Docker 訪問主機端口

### 問題: 前端白屏

**檢查步驟**:
1. 開啟瀏覽器開發者工具（F12）
2. 查看 Console 錯誤訊息
3. 查看 Network 是否有失敗的請求

**常見原因**:
1. Convex 後端未啟動 → 檢查 3210 端口
2. WebSocket 連接失敗 → 檢查環境變數
3. JavaScript 錯誤 → 查看瀏覽器控制台

---

## 附錄：快速檢查指令集

複製貼上以下指令進行快速檢查：

```bash
echo "=== 環境檢查 ==="
docker --version
node --version
ollama list

echo "=== 端口檢查 ==="
netstat -ano | findstr ":5173 :3210 :11434"

echo "=== 容器狀態 ==="
docker ps | grep ai-town

echo "=== 服務檢查 ==="
curl -I http://127.0.0.1:3210
curl -I http://localhost:5173

echo "=== LLM 連接 ==="
docker exec ai-town-production curl -s http://host.docker.internal:11434/api/tags | head -5

echo "=== 日誌檢查 ==="
docker logs ai-town-production | tail -20

echo "=== 完成 ==="
```

---

**文件版本**: 1.0
**最後更新**: 2025-11-14
**維護者**: AI Town 開發團隊
**聯絡方式**: 如有問題請查看 GitHub Issues
