@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town 容器啟動腳本
:: =====================================================

echo.
echo =====================================================
echo   AI Town 容器啟動工具
echo =====================================================
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

:: 啟動容器
echo 🚀 啟動容器...
echo.

docker-compose up -d

if errorlevel 1 (
    echo.
    echo ❌ 容器啟動失敗
    echo.
    echo 請檢查:
    echo   1. docker-compose.yml 是否正確
    echo   2. 端口 5173 和 3210 是否被占用
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

curl -s -o nul -w "前端 (5173): %%{http_code}\n" http://localhost:5173/
curl -s -o nul -w "Convex 後端 (3210): %%{http_code}\n" http://localhost:3210/

echo.

:: 檢查健康狀態
docker inspect ai-town-production --format "{{.State.Health.Status}}" >nul 2>&1
if not errorlevel 1 (
    for /f %%i in ('docker inspect ai-town-production --format "{{.State.Health.Status}}"') do (
        if "%%i"=="healthy" (
            echo ✅ 容器健康狀態: healthy
        ) else (
            echo ⚠️  容器健康狀態: %%i
        )
    )
    echo.
)

echo =====================================================
echo   容器啟動完成！
echo =====================================================
echo.
echo 服務地址:
echo   前端:        http://localhost:5173/
echo   Convex 後端: http://localhost:3210/
echo.
echo 下一步:
echo   執行 4-init-database.bat 初始化資料庫
echo.
echo 其他命令:
echo   查看日誌: docker logs ai-town-production
echo   停止容器: docker-compose down
echo.
pause
