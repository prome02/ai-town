@echo off
REM ============================================================
REM AI Town Docker 生產環境停止腳本
REM ============================================================

echo.
echo ============================================================
echo   AI Town Docker 生產環境停止
echo ============================================================
echo.

REM 切換到專案根目錄
cd /d "%~dp0\.."

REM 停止容器
echo [1/2] 停止容器...
docker-compose -f docker-compose.deployment.yml down

if %ERRORLEVEL% neq 0 (
    echo.
    echo [警告] 停止過程中出現錯誤
) else (
    echo.
    echo [2/2] ✅ 容器已成功停止
)

echo.
echo ============================================================
echo   服務已停止
echo ============================================================
echo.
echo 如需重新啟動，執行:
echo   deploy-scripts\start-docker-production.bat
echo.
pause
