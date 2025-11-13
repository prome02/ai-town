@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town 資料庫初始化腳本
:: =====================================================

:: 切換到部署包根目錄（父目錄）
cd /d "%~dp0.."

echo.
echo =====================================================
echo   AI Town 資料庫初始化工具
echo =====================================================
echo.
echo 📂 工作目錄: %CD%
echo.

:: 檢查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 未安裝 Node.js
    echo.
    echo 請安裝 Node.js 18 或更高版本
    echo 下載: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安裝
node --version
echo.

:: 檢查容器是否運行
docker ps | findstr "ai-town-production" >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 容器未運行
    echo.
    echo 請先執行 3-start-container.bat 啟動容器
    pause
    exit /b 1
)

echo ✅ 容器正在運行
echo.

:: 檢查 Convex 後端
echo 🔍 檢查 Convex 後端連接...
curl -s -o nul http://localhost:3210/
if errorlevel 1 (
    echo ❌ 錯誤: 無法連接到 Convex 後端
    echo.
    echo 請確認:
    echo   1. 容器已完全啟動 (等待 30 秒後重試)
    echo   2. 端口 3210 未被防火牆阻擋
    pause
    exit /b 1
)

echo ✅ Convex 後端可訪問
echo.

:: 獲取 ADMIN_KEY
echo 🔑 獲取 ADMIN_KEY...
for /f "tokens=2 delims==" %%i in ('findstr "ADMIN_KEY=" docker-entrypoint.sh') do (
    set ADMIN_KEY=%%i
    set ADMIN_KEY=!ADMIN_KEY:"=!
)

if "!ADMIN_KEY!"=="" (
    echo ❌ 錯誤: 無法從 docker-entrypoint.sh 獲取 ADMIN_KEY
    echo.
    echo 請手動執行:
    echo   npx convex run init --url http://127.0.0.1:3210 --admin-key YOUR_ADMIN_KEY
    pause
    exit /b 1
)

echo ✅ ADMIN_KEY 已獲取
echo.

:: 檢查 npx
where npx >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 找不到 npx 命令
    echo.
    echo 請確保 Node.js 已正確安裝
    pause
    exit /b 1
)

:: 同步 Convex 函式
echo 📦 同步 Convex 函式...
echo.

npx convex dev --url http://127.0.0.1:3210 --admin-key !ADMIN_KEY! --once

if errorlevel 1 (
    echo.
    echo ❌ Convex 函式同步失敗
    pause
    exit /b 1
)

echo.
echo ✅ Convex 函式同步成功
echo.

:: 執行初始化
echo 🚀 執行資料庫初始化 (預計 2-5 秒)...
echo.

npx convex run init --url http://127.0.0.1:3210 --admin-key !ADMIN_KEY!

if errorlevel 1 (
    echo.
    echo ❌ 資料庫初始化失敗
    echo.
    echo 如果看到 SystemTimeoutError，請重新執行此腳本
    echo 或使用以下命令手動執行:
    echo   npx convex run init --url http://127.0.0.1:3210 --admin-key !ADMIN_KEY!
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   資料庫初始化完成！
echo =====================================================
echo.
echo 🎉 所有設置完成！
echo.
echo 訪問應用:
echo   主應用:   http://localhost:5173/
echo   測試頁面: http://localhost:5173/test
echo.
echo 注意:
echo   - Init 本身不會啟動 LLM
echo   - LLM 只在 Agent 開始活動時才會被使用
echo   - 如需 LLM 功能，請確保 Ollama 服務運行中
echo.
pause
