@echo off
REM ============================================================
REM AI Town Docker 生產環境啟動腳本
REM 使用自定義端口避免衝突
REM ============================================================

echo.
echo ============================================================
echo   AI Town Docker 生產環境啟動
echo ============================================================
echo.

REM 切換到專案根目錄
cd /d "%~dp0\.."

REM 檢查 Docker 是否運行
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [錯誤] Docker 未運行，請先啟動 Docker Desktop
    pause
    exit /b 1
)

REM 檢查映像是否存在
docker images | findstr /C:"ai-town-ai-town" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [錯誤] Docker 映像 'ai-town-ai-town:latest' 不存在
    echo 請先構建映像：
    echo   docker build -t ai-town-ai-town:latest .
    pause
    exit /b 1
)

REM 停止並刪除舊容器（如果存在）
echo [1/3] 清理舊容器...
docker-compose -f docker-compose.deployment.yml down 2>nul
echo.

REM 啟動容器
echo [2/3] 啟動 Docker 容器...
docker-compose -f docker-compose.deployment.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [錯誤] 容器啟動失敗
    pause
    exit /b 1
)
echo.

REM 等待服務啟動
echo [3/3] 等待服務啟動 (25秒)...
timeout /t 25 /nobreak >nul
echo.

REM 檢查容器狀態
docker ps | findstr "ai-town-production" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [錯誤] 容器未正常運行
    echo 查看日誌：docker logs ai-town-production
    pause
    exit /b 1
)

echo ============================================================
echo   ✅ AI Town 已成功啟動！
echo ============================================================
echo.
echo 服務訪問地址：
echo   前端應用:  http://localhost:18000/ai-town/
echo   Convex:    http://localhost:18400/
echo.
echo 管理命令：
echo   查看日誌:  docker logs -f ai-town-production
echo   停止服務:  docker-compose -f docker-compose.deployment.yml down
echo   重啟服務:  docker restart ai-town-production
echo.
echo ============================================================
echo.

REM 打開瀏覽器（可選）
echo 是否要在瀏覽器中打開應用？ (Y/N)
set /p OPEN_BROWSER="> "
if /i "%OPEN_BROWSER%"=="Y" (
    start http://localhost:18000/ai-town/
)

echo.
echo 提示：容器將在背景持續運行
pause
