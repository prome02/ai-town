#!/bin/bash
# ============================================================
# AI Town Docker 啟動腳本 (Convex Cloud 版本)
# ============================================================

set -e

echo "============================================================"
echo "  🚀 AI Town Docker 正式環境啟動中 (Cloud Mode)..."
echo "============================================================"
echo ""

# 設定變數
PROJECT_DIR="/usr/src/app"
ENV_FILE="$PROJECT_DIR/.env.local"

# 從環境變數讀取 Convex URL,如果沒有則使用預設的雲端 URL
CONVEX_URL="${VITE_CONVEX_URL:-https://elegant-lobster-3.convex.cloud}"

cd "$PROJECT_DIR"

# ============================================================
# [1/4] 檢查環境檔案
# ============================================================
echo "[1/4] 📋 檢查環境設定"
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  找不到 .env.local，創建新檔案"
    echo "VITE_CONVEX_URL=$CONVEX_URL" > "$ENV_FILE"
    echo "✅ 已創建 .env.local"
else
    echo "✅ .env.local 存在"
fi

# 確保使用正確的 Convex URL
sed -i "s|VITE_CONVEX_URL=.*|VITE_CONVEX_URL=$CONVEX_URL|g" "$ENV_FILE"
echo "✅ Convex URL: $CONVEX_URL"
echo ""

# ============================================================
# [2/4] 檢查依賴
# ============================================================
echo "[2/4] 📦 檢查專案依賴"
echo ""

if [ ! -d "node_modules" ]; then
    echo "⚠️  偵測到未安裝依賴，開始安裝..."
    npm install
    echo "✅ 依賴安裝完成"
else
    echo "✅ 依賴已就緒"
fi
echo ""

# ============================================================
# [3/4] 啟動 Convex Dev (函數同步)
# ============================================================
echo "[3/4] 🔄 啟動 Convex 函數同步 (Cloud Mode)"
echo ""

echo "▶️  編譯並同步 Convex 函數到雲端..."

# 檢查是否有 CONVEX_DEPLOY_KEY (用於 CI/CD)
if [ -n "$CONVEX_DEPLOY_KEY" ]; then
    echo "💡 使用 CONVEX_DEPLOY_KEY 進行部署"
    nohup npx convex deploy > /var/log/convex-deploy.log 2>&1 &
    CONVEX_PID=$!
    sleep 20
else
    echo "💡 使用開發模式同步 (需要 convex dev)"
    # 注意: 生產環境建議使用 convex deploy 而非 convex dev
    echo "⚠️  警告: convex dev 需要認證,建議使用 CONVEX_DEPLOY_KEY"
    echo "   詳見: https://docs.convex.dev/production/hosting/deploy-keys"
fi

echo "✅ Convex 設定完成"
echo ""

# ============================================================
# [4/4] 啟動前端應用
# ============================================================
echo "[4/4] 🎮 啟動前端應用"
echo ""

echo "▶️  啟動 Vite 前端服務..."

# 使用 exec 讓 npm 成為 PID 1,這樣 SIGTERM 才能正確傳遞
exec npm run dev:frontend

# 注意: exec 會替換當前進程,所以這之後的程式碼不會執行
