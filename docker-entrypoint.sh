#!/bin/bash
# ============================================================
# AI Town Docker 啟動腳本 (正式環境)
# ============================================================

set -e

echo "============================================================"
echo "  🚀 AI Town Docker 正式環境啟動中..."
echo "============================================================"
echo ""

# 載入 NVM 環境變數
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 18 > /dev/null 2>&1 || true

# 設定變數
PROJECT_DIR="/usr/src/app"
ENV_FILE="$PROJECT_DIR/.env.local"
LOCAL_CONVEX_URL="http://127.0.0.1:3210"
ADMIN_KEY="0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd"

cd "$PROJECT_DIR"

# ============================================================
# [1/6] 檢查環境檔案
# ============================================================
echo "[1/6] 📋 檢查環境設定"
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  找不到 .env.local，從 .env.example 複製"
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ 已創建 .env.local"
    else
        echo "❌ 錯誤: 找不到 .env.example"
        exit 1
    fi
else
    echo "✅ .env.local 存在"
fi

# 確保使用本地 Convex URL
sed -i "s|VITE_CONVEX_URL=.*|VITE_CONVEX_URL=$LOCAL_CONVEX_URL|g" "$ENV_FILE"
echo "✅ 已設定為本地 Convex URL"
echo ""

# ============================================================
# [2/6] 檢查依賴
# ============================================================
echo "[2/6] 📦 檢查專案依賴"
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
# [3/6] 啟動 Convex Local Backend
# ============================================================
echo "[3/6] 📡 啟動 Convex Local Backend"
echo ""

# 檢查是否已有 convex-local-backend
if ! command -v convex-local-backend &> /dev/null; then
    echo "⚠️  系統中未找到 convex-local-backend"
    echo "💡 注意: 確保 Dockerfile 已安裝 convex-local-backend"
    echo "   或使用 volume 掛載外部 backend"
else
    echo "✅ 找到 convex-local-backend"
fi

# 在背景啟動 Convex Backend
# --interface 0.0.0.0: 綁定到所有網路介面
# --convex-origin: WebSocket/API 連接地址
# --convex-site: HTTP Actions 連接地址
echo "▶️  啟動 Convex 後端 (port 3210, origin: http://localhost:3210)..."
nohup convex-local-backend \
  --interface 0.0.0.0 \
  --convex-origin http://localhost:3210 \
  --convex-site http://localhost:3211 \
  > /var/log/convex-backend.log 2>&1 &
BACKEND_PID=$!

# 等待後端啟動
echo "⏳ 等待後端啟動 (檢查進程)..."
sleep 2

# 檢查進程是否還在運行
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Convex 後端已啟動 (PID: $BACKEND_PID)"
    # 再等待幾秒讓後端完全初始化
    echo "   等待後端初始化..."
    sleep 5
else
    echo "❌ Convex 後端啟動失敗"
    echo "📋 查看日誌: cat /var/log/convex-backend.log"
    cat /var/log/convex-backend.log
    exit 1
fi
echo ""

# ============================================================
# [4/6] 啟動 Convex Dev (函數同步)
# ============================================================
echo "[4/6] 🔄 啟動 Convex 函數同步"
echo ""

echo "▶️  在背景部署 Convex 函數到本地後端..."
nohup npx convex deploy --admin-key "$ADMIN_KEY" --url "$LOCAL_CONVEX_URL" > /var/log/convex-deploy.log 2>&1 &
DEPLOY_PID=$!
echo "   Convex 函數部署已在背景啟動 (PID: $DEPLOY_PID)"
echo "   🔍 部署日誌: /var/log/convex-deploy.log"
echo ""

echo "▶️  啟動 Convex Dev (監聽函數變更)..."
nohup npx convex dev --admin-key "$ADMIN_KEY" --url "$LOCAL_CONVEX_URL" > /var/log/convex-dev.log 2>&1 &
CONVEX_DEV_PID=$!

echo "✅ Convex Dev 已啟動 (PID: $CONVEX_DEV_PID)"
echo ""

# ============================================================
# [5/6] 啟動前端應用
# ============================================================
echo "[5/6] 🎮 啟動前端應用"
echo ""

echo "▶️  啟動 Vite 前端服務..."
# 使用 npx 直接啟動 vite,避免 npm run 的環境問題
# npx 已在 PATH 中,直接使用
nohup npx vite --host 0.0.0.0 > /var/log/vite.log 2>&1 &
VITE_PID=$!

echo "⏳ 等待 Vite 啟動 (10 秒)..."
sleep 10

echo "✅ 前端應用已啟動 (PID: $VITE_PID)"
echo ""

# ============================================================
# [6/6] 啟動完成
# ============================================================
echo "============================================================"
echo "  ✅ AI Town Docker 正式環境啟動完成！"
echo "============================================================"
echo ""
echo "📍 服務狀態:"
echo "   • Convex 後端:    http://127.0.0.1:3210 (PID: $BACKEND_PID)"
echo "   • Convex Dev:     同步中 (PID: $CONVEX_DEV_PID)"
echo "   • 前端應用:       http://localhost:5173 (PID: $VITE_PID)"
echo ""
echo "🌐 訪問應用:"
echo "   • 主應用:         http://localhost:5173/ai-town/"
echo ""
echo "📋 日誌檔案:"
echo "   • Convex 後端:    /var/log/convex-backend.log"
echo "   • Convex Dev:     /var/log/convex-dev.log"
echo "   • Vite:           /var/log/vite.log"
echo ""
echo "💡 查看日誌:"
echo "   docker-compose logs -f ai-town"
echo "   docker-compose exec ai-town tail -f /var/log/convex-backend.log"
echo ""

# 保存 PID 供後續使用
echo "$BACKEND_PID" > /var/run/convex-backend.pid
echo "$CONVEX_DEV_PID" > /var/run/convex-dev.pid
echo "$VITE_PID" > /var/run/vite.pid
echo "$DEPLOY_PID" > /var/run/convex-deploy.pid

# ============================================================
# 保持容器運行並監控進程
# ============================================================
echo "🔄 容器持續運行中，監控服務狀態..."
echo ""

# 清理函數
cleanup() {
    echo ""
    echo "🛑 收到停止信號，正在清理..."

    if [ -f /var/run/vite.pid ]; then
        kill $(cat /var/run/vite.pid) 2>/dev/null || true
    fi
    if [ -f /var/run/convex-dev.pid ]; then
        kill $(cat /var/run/convex-dev.pid) 2>/dev/null || true
    fi
    if [ -f /var/run/convex-deploy.pid ]; then
        kill $(cat /var/run/convex-deploy.pid) 2>/dev/null || true
    fi
    if [ -f /var/run/convex-backend.pid ]; then
        kill $(cat /var/run/convex-backend.pid) 2>/dev/null || true
    fi

    echo "✅ 清理完成"
    exit 0
}

trap cleanup SIGTERM SIGINT

# 監控進程並保持運行
while true; do
    # 檢查關鍵進程是否還在運行
    if [ -f /var/run/convex-backend.pid ]; then
        if ! kill -0 $(cat /var/run/convex-backend.pid) 2>/dev/null; then
            echo "❌ Convex 後端進程已停止"
            exit 1
        fi
    fi
    
    # 檢查部署進程是否還在運行（如果仍在運行）
    if [ -f /var/run/convex-deploy.pid ]; then
        if ! kill -0 $(cat /var/run/convex-deploy.pid) 2>/dev/null; then
            # 部署進程已完成，移除 PID 文件
            rm -f /var/run/convex-deploy.pid
            # 檢查部署結果
            if [ -f /var/log/convex-deploy.log ]; then
                if grep -q "error\|Error\|ERROR" /var/log/convex-deploy.log; then
                    echo "⚠️  Convex 函數部署完成但有錯誤，請檢查日誌: /var/log/convex-deploy.log"
                else
                    echo "✅ Convex 函數部署成功完成"
                fi
            fi
        fi
    fi

    sleep 5
done
