@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town 環境設置腳本
:: =====================================================

:: 切換到部署包根目錄（父目錄）
cd /d "%~dp0.."

echo.
echo =====================================================
echo   AI Town 環境設置工具
echo =====================================================
echo.
echo 📂 工作目錄: %CD%
echo.

:: 檢查必要檔案
set MISSING=0

echo 🔍 檢查必要檔案...
echo.

if not exist "docker-compose.yml" (
    echo ❌ 缺少: docker-compose.yml
    set MISSING=1
) else (
    echo ✅ docker-compose.yml
)

if not exist "docker-entrypoint.sh" (
    echo ❌ 缺少: docker-entrypoint.sh
    set MISSING=1
) else (
    echo ✅ docker-entrypoint.sh
)

if not exist "data\" (
    echo ❌ 缺少: data\ 目錄
    set MISSING=1
) else (
    echo ✅ data\ 目錄
)

if not exist "convex\" (
    echo ❌ 缺少: convex\ 目錄
    set MISSING=1
) else (
    echo ✅ convex\ 目錄
)

echo.

if %MISSING%==1 (
    echo ❌ 缺少必要檔案
    echo.
    echo 請確保從原專案複製以下檔案:
    echo   - docker-compose.yml
    echo   - docker-entrypoint.sh
    echo   - data\ 目錄
    echo   - convex\ 目錄
    echo.
    pause
    exit /b 1
)

echo ✅ 所有必要檔案已就緒
echo.

:: 檢查並創建 .env.local
if not exist ".env.local" (
    echo 📝 創建 .env.local 檔案...
    (
        echo # AI Town 環境變數配置
        echo # 生成時間: %date% %time%
        echo.
        echo # Convex 本地後端 URL
        echo VITE_CONVEX_URL=http://127.0.0.1:3210
        echo.
        echo # Ollama LLM API URL ^(可選^)
        echo # 如果您想使用本地 LLM，請確保 Ollama 服務正在運行
        echo # LLM_API_URL=http://host.docker.internal:11434
    ) > .env.local
    echo ✅ .env.local 已創建
    echo.
) else (
    echo ℹ️  .env.local 已存在，跳過創建
    echo.
)

:: 檢查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  警告: 未安裝 Node.js
    echo.
    echo Node.js 用於執行 Convex 初始化
    echo 建議安裝 Node.js 18 或更高版本
    echo 下載: https://nodejs.org/
    echo.
    echo 您仍然可以繼續，但需要手動初始化資料庫
    echo.
) else (
    echo ✅ Node.js 已安裝
    node --version
    echo.
)

:: 檢查 Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 未安裝 Docker Compose
    echo.
    echo 請確保 Docker Desktop 已正確安裝
    pause
    exit /b 1
)

echo ✅ Docker Compose 已安裝
docker-compose --version
echo.

:: 檢查端口占用
echo 🔍 檢查端口占用...
echo.

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  警告: 端口 5173 已被占用
    echo 這可能會導致前端無法啟動
    echo.
)

netstat -ano | findstr ":3210" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  警告: 端口 3210 已被占用
    echo 這可能會導致 Convex 後端無法啟動
    echo.
)

echo ✅ 端口檢查完成
echo.

echo =====================================================
echo   環境設置完成！
echo =====================================================
echo.
echo 下一步:
echo   執行 3-start-container.bat 啟動容器
echo.
pause
