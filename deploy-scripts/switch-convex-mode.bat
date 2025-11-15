@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║          🔄 Convex 模式切換工具                          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set "ENV_FILE=%~dp0.env.local"

if not exist "%ENV_FILE%" (
    echo ❌ 錯誤: 找不到 .env.local 檔案
    echo.
    pause
    exit /b 1
)

REM 檢查當前模式
findstr /C:"VITE_CONVEX_URL=http://127.0.0.1:3210" "%ENV_FILE%" >nul 2>&1
if errorlevel 1 (
    set "CURRENT_MODE=雲端"
    set "TARGET_MODE=本地"
    set "NEW_URL=http://127.0.0.1:3210"
) else (
    set "CURRENT_MODE=本地"
    set "TARGET_MODE=雲端"
    set "NEW_URL=https://elegant-lobster-3.convex.cloud"
)

echo 📊 當前模式: %CURRENT_MODE%
echo 🎯 切換到:   %TARGET_MODE%
echo.
echo 確定要切換嗎? (Y/N)
choice /C YN /N /M "請選擇: "

if errorlevel 2 (
    echo.
    echo ❌ 已取消切換
    timeout /t 2 /nobreak >nul
    exit /b 0
)

echo.
echo 🔄 正在切換模式...

REM 備份
copy "%ENV_FILE%" "%ENV_FILE%.backup" >nul 2>&1
echo ✅ 已備份設定檔

REM 切換
powershell -Command "(Get-Content '%ENV_FILE%') -replace 'VITE_CONVEX_URL=.*', 'VITE_CONVEX_URL=%NEW_URL%' | Set-Content '%ENV_FILE%'"

echo ✅ 已切換至 %TARGET_MODE% 模式
echo.

if "%TARGET_MODE%"=="本地" (
    echo 💡 下一步:
    echo    1. 確認本地 Convex 後端在運行 (port 3210)
    echo    2. 執行 start-ai-town-local.bat
) else (
    echo 💡 下一步:
    echo    1. 確認有網路連接
    echo    2. 執行 npm run dev
)

echo.
echo 新設定:
type "%ENV_FILE%"
echo.
echo.
pause
