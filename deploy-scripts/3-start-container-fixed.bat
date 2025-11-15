@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town 容器啟動腳本 (修正版)
:: =====================================================

:: 切換到部署包根目錄（父目錄）
cd /d "%~dp0.."

echo.
echo =====================================================
echo   AI Town 容器啟動工具 (修正版)
echo =====================================================
echo.
echo 📂 工作目錄: %CD%
echo.

:: 檢查 Docker 服務
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: Docker 服務未運行
    echo.
    echo 請啟動 Docker Desktop 後再試
    pause
    exit /b 1
)

echo ✅ Docker 服務運行中
echo.

:: 檢查映像是否存在
docker images | findstr "ai-town-ai-town" >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 找不到 ai-town-ai-town 映像
    echo.
    echo 請先執行 1-import-image.bat 匯入映像
    pause
    exit /b 1
)

echo ✅ Docker 映像已就緒
echo.

:: 檢查是否已有運行中的容器
docker ps | findstr "ai-town-production" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  發現運行中的容器
    echo.
    set /p RESTART="是否重啟容器? (Y/N): "
    if /i "!RESTART!"=="Y" (
        echo.
        echo 🔄 停止現有容器...
        docker-compose down
        timeout /t 3 >nul
    ) else (
        echo.
        echo ℹ️  容器已在運行中
        goto :show_status
    )
)

:: 創建缺少的 .env.example 文件
if not exist ".env.example" (
    echo 📝 創建 .env.example 文件...
    (
        echo # AI Town Docker 環境配置
        echo VITE_CONVEX_URL=http://127.0.0.1:3210
        echo CONVEX_DEPLOYMENT=local
        echo NODE_ENV=production
    ) > .env.example
    echo ✅ .env.example 已創建
    echo.
)

:: 使用替代端口配置啟動
echo 🚀 使用替代端口啟動容器...
echo.

docker-compose -f docker-compose.yml -f docker-compose.deployment.yml up -d

if errorlevel 1 (
    echo.
    echo ❌ 容器啟動失敗
    echo.
    echo 請檢查:
    echo   1. docker-compose.yml 是否正確
    echo   2. 端口 9000 和 4000 是否被占用
    echo   3. Docker 日誌: docker logs ai-town-production
    echo.
    pause
    exit /b 1
)

echo.
echo ⏳ 等待容器啟動 (30秒)...
timeout /t 30 >nul

:show_status
echo.
echo 🔍 檢查容器狀態...
echo.
docker ps --filter "name=ai-town-production" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

:: 檢查服務可訪問性
echo 🔍 檢查服務可訪問性...
echo.

curl -s -o nul -w "前端 (9000): %%{http_code}\n" http://localhost:9000/
curl -s -o nul -w "Convex 後端 (4000): %%{http_code}\n" http://localhost:4000/

echo.

echo =====================================================
echo   容器啟動完成！
echo =====================================================
echo.
echo 服務地址:
echo   前端:        http://localhost:9000/
echo   Convex 後端: http://localhost:4000/
echo.
echo 下一步:
echo   執行 4-init-database.bat 初始化資料庫
echo.
echo 其他命令:
echo   查看日誌: docker logs ai-town-production
echo   停止容器: docker-compose down
echo.
pause
exit /b 0