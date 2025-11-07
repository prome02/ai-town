@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         🚀 AI Town 本地開發環境啟動器 v2.0              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM ============================================================
REM 設定變數
REM ============================================================
set "PROJECT_DIR=%~dp0"
set "ENV_FILE=%PROJECT_DIR%.env.local"
set "CONVEX_BACKEND_DIR=C:\Users\prome\Downloads\convex-local-backend-x86_64-pc-windows-msvc"
set "CONVEX_BACKEND_EXE=%CONVEX_BACKEND_DIR%\convex-local-backend.exe"
set "LOCAL_CONVEX_URL=http://127.0.0.1:3210"
set "ADMIN_KEY=0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd"
set "ERROR_COUNT=0"

cd /d "%PROJECT_DIR%"

echo [1/6] 📋 檢查環境設定...
echo.

REM ============================================================
REM 檢查 .env.local 檔案
REM ============================================================
if not exist "%ENV_FILE%" (
    echo ❌ 錯誤: 找不到 .env.local 檔案
    echo    位置: %ENV_FILE%
    echo.
    echo 💡 建議: 複製 .env.example 並重新命名為 .env.local
    set /a ERROR_COUNT+=1
    goto :error_summary
)

echo ✅ .env.local 檔案存在

REM ============================================================
REM 檢查並修正 VITE_CONVEX_URL
REM ============================================================
echo.
echo [2/6] 🔍 檢查 Convex URL 設定...
echo.

findstr /C:"VITE_CONVEX_URL=http://127.0.0.1:3210" "%ENV_FILE%" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  偵測到雲端 Convex URL，自動切換為本地模式...

    REM 備份原檔案
    copy "%ENV_FILE%" "%ENV_FILE%.backup" >nul 2>&1
    echo    已備份原設定為: .env.local.backup

    REM 使用 PowerShell 替換內容
    powershell -Command "(Get-Content '%ENV_FILE%') -replace 'VITE_CONVEX_URL=https://.*', 'VITE_CONVEX_URL=http://127.0.0.1:3210' | Set-Content '%ENV_FILE%'"

    echo ✅ 已自動修正為本地 Convex URL
) else (
    echo ✅ Convex URL 已正確設定為本地模式
)

REM ============================================================
REM 檢查 Ollama 服務
REM ============================================================
echo.
echo [3/6] 🤖 檢查 Ollama 服務...
echo.

netstat -ano | findstr ":11434" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Ollama 服務未運行 (port 11434)
    echo    LLM 功能將無法使用
    echo.
    echo 💡 建議: 請手動啟動 Ollama
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Ollama 服務正在運行 (port 11434)
)

REM ============================================================
REM 檢查並啟動本地 Convex 後端
REM ============================================================
echo.
echo [4/6] 📡 檢查本地 Convex 後端...
echo.

netstat -ano | findstr ":3210" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  本地 Convex 後端未運行

    if not exist "%CONVEX_BACKEND_EXE%" (
        echo ❌ 錯誤: 找不到 Convex 後端執行檔
        echo    預期位置: %CONVEX_BACKEND_EXE%
        echo.
        echo 💡 建議: 請先下載並解壓 convex-local-backend
        set /a ERROR_COUNT+=1
        goto :error_summary
    )

    echo ▶️  正在啟動本地 Convex 後端...
    start "Convex Local Backend" cmd /k "cd /d "%CONVEX_BACKEND_DIR%" && "%CONVEX_BACKEND_EXE%""

    echo    等待後端啟動 (5 秒)...
    timeout /t 5 /nobreak >nul

    REM 再次檢查
    netstat -ano | findstr ":3210" >nul 2>&1
    if errorlevel 1 (
        echo ❌ Convex 後端啟動失敗
        echo    請檢查上方開啟的視窗是否有錯誤訊息
        set /a ERROR_COUNT+=1
        goto :error_summary
    ) else (
        echo ✅ Convex 後端已成功啟動 (port 3210)
    )
) else (
    echo ✅ 本地 Convex 後端已運行 (port 3210)
)

REM ============================================================
REM 啟動 Convex Dev (函數同步)
REM ============================================================
echo.
echo [5/6] 🔄 啟動 Convex 函數同步...
echo.

echo ▶️  編譯並同步 Convex 函數...
start "Convex Dev" cmd /k "cd /d "%PROJECT_DIR%" && npx convex dev --admin-key %ADMIN_KEY% --url "%LOCAL_CONVEX_URL%" --tail-logs"

echo    等待函數編譯 (10 秒)...
timeout /t 10 /nobreak >nul

REM 驗證 .env.local 沒有被改回雲端
findstr /C:"VITE_CONVEX_URL=http://127.0.0.1:3210" "%ENV_FILE%" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  偵測到 .env.local 被修改,重新修正...
    powershell -Command "(Get-Content '%ENV_FILE%') -replace 'VITE_CONVEX_URL=.*', 'VITE_CONVEX_URL=http://127.0.0.1:3210' | Set-Content '%ENV_FILE%'"
    echo ✅ 已重新設定為本地模式
)

echo ✅ Convex Dev 已啟動 (請檢查新開啟的視窗)

REM ============================================================
REM 啟動前端開發伺服器
REM ============================================================
echo.
echo [6/6] 🎮 啟動前端開發伺服器...
echo.

start "AI Town Frontend" cmd /k "cd /d "%PROJECT_DIR%" && npm run dev:frontend"

echo ✅ 前端開發伺服器已啟動

REM ============================================================
REM 啟動成功總結
REM ============================================================
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                  ✅ 啟動完成！                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📍 服務狀態:
echo    • Convex 後端:      http://127.0.0.1:3210
echo    • Convex Dev:       正在同步函數 (檢查新視窗)
echo    • 前端應用:         http://localhost:5173 (或 Vite 分配的其他端口)
echo    • Ollama LLM:       http://127.0.0.1:11434
echo.
echo 🧪 測試頁面:
echo    • LLM 測試工具:     http://localhost:5173/ai-town/test.html
echo    • 主應用:           http://localhost:5173/ai-town/
echo.
echo 💡 提示:
echo    1. 請檢查新開啟的 3 個視窗確認服務正常運行
echo    2. Convex Dev 視窗應顯示 "Convex functions ready!"
echo    3. 如需停止,請關閉所有新開啟的視窗
echo.
echo 📝 已開啟的視窗:
echo    1. Convex Local Backend (port 3210)
echo    2. Convex Dev (函數同步)
echo    3. AI Town Frontend (Vite)
echo.

goto :end

REM ============================================================
REM 錯誤總結
REM ============================================================
:error_summary
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              ❌ 啟動失敗 (發現 %ERROR_COUNT% 個錯誤)              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 💡 常見問題解決方案:
echo.
echo 1. 找不到 Convex 後端執行檔:
echo    • 下載位置: https://github.com/get-convex/convex-backend
echo    • 解壓到: C:\Users\prome\Downloads\convex-local-backend-x86_64-pc-windows-msvc\
echo.
echo 2. Ollama 未運行:
echo    • 確認 Ollama 已安裝並啟動
echo    • 測試: curl http://127.0.0.1:11434/api/tags
echo.
echo 3. Port 衝突:
echo    • 檢查 3210 端口: netstat -ano ^| findstr ":3210"
echo    • 檢查 11434 端口: netstat -ano ^| findstr ":11434"
echo.
echo 📖 詳細文檔: 查看 TESTING.md
echo.

:end
echo 按任意鍵關閉此窗口...
pause >nul
