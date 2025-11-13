@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ============================================================
REM 解析參數
REM ============================================================
set "MODE=%~1"

REM 如果沒有參數,預設使用正式模式
if "%MODE%"=="" (
    set "MODE=prod"
    echo.
    echo 💡 未指定模式,使用預設: 正式環境 (prod)
    echo    如需開發模式,請執行: start-ai-town.bat dev
    echo.
    timeout /t 2 /nobreak >nul
)

REM 轉換為小寫並驗證模式
set "MODE=%MODE:~0,4%"
if /i "%MODE%"=="dev" set "MODE=dev"
if /i "%MODE%"=="prod" set "MODE=prod"

if not "%MODE%"=="dev" if not "%MODE%"=="prod" (
    echo.
    echo ❌ 錯誤: 無效的模式 "%~1"
    echo.
    echo 請使用: dev 或 prod
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM 顯示啟動標題
REM ============================================================
echo.
if "%MODE%"=="dev" (
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║         🚀 AI Town 開發/測試環境啟動器 v3.0            ║
    echo ╚═══════════════════════════════════════════════════════════╝
) else (
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║         🚀 AI Town 正式環境啟動器 v3.0                  ║
    echo ╚═══════════════════════════════════════════════════════════╝
)
echo.

REM ============================================================
REM 設定變數
REM ============================================================
set "PROJECT_DIR=%~dp0"
set "ENV_FILE=%PROJECT_DIR%.env.local"

REM 動態取得下載資料夾位置
for /f "usebackq tokens=2,*" %%a in (
    `reg query "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v "{374DE290-123F-4565-9164-39C4925E467B}" 2^>nul`
) do (
    set "downloads_folder=%%b"
)

REM 檢查是否取得下載資料夾路徑
if defined downloads_folder (
    set "CONVEX_BACKEND_DIR=%downloads_folder%\convex-local-backend-x86_64-pc-windows-msvc"
) else (
    echo ❌ 錯誤: 無法取得下載資料夾位置
    echo    請檢查註冊機碼或手動設定 CONVEX_BACKEND_DIR
    set /a ERROR_COUNT+=1
    goto :error_summary
)

set "CONVEX_BACKEND_EXE=%CONVEX_BACKEND_DIR%\convex-local-backend.exe"
set "LOCAL_CONVEX_URL=http://127.0.0.1:3210"
set "ADMIN_KEY=0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd"
set "ERROR_COUNT=0"

cd /d "%PROJECT_DIR%"

echo [1/7] 📋 檢查環境設定
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
echo [2/7] 🔍 檢查 Convex URL 設定
echo.

findstr /C:"VITE_CONVEX_URL=http://127.0.0.1:3210" "%ENV_FILE%" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  偵測到非本地 Convex URL，切換為本地模式

    REM 備份原檔案
    copy "%ENV_FILE%" "%ENV_FILE%.backup" >nul 2>&1
    echo    已備份原設定為: .env.local.backup

    REM 使用 PowerShell 替換內容
    powershell -Command "(Get-Content '%ENV_FILE%') -replace 'VITE_CONVEX_URL=.*', 'VITE_CONVEX_URL=http://127.0.0.1:3210' | Set-Content '%ENV_FILE%'"

    echo ✅ 已自動修正為本地 Convex URL
) else (
    echo ✅ Convex URL 已正確設定為本地模式
)

REM ============================================================
REM 檢查並安裝依賴 (僅正式模式)
REM ============================================================
if "%MODE%"=="prod" (
    echo.
    echo [3/7] 📦 檢查專案依賴
    echo.

    if not exist "node_modules\" (
        echo ⚠️  偵測到未安裝依賴，開始安裝
        call npm install
        if errorlevel 1 (
            echo ❌ 依賴安裝失敗
            set /a ERROR_COUNT+=1
            goto :error_summary
        )
        echo ✅ 依賴安裝完成
    ) else (
        echo ✅ 依賴已就緒
    )
) else (
    echo.
    echo [3/7] 📦 跳過依賴檢查 (開發模式)
    echo.
)

REM ============================================================
REM 檢查 Ollama 服務
REM ============================================================
echo.
echo [4/7] 🤖 檢查 Ollama 服務
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
echo [5/7] 📡 檢查本地 Convex 後端
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

    echo ▶️  正在啟動本地 Convex 後端
    start "Convex Local Backend" cmd /k "cd /d "%CONVEX_BACKEND_DIR%" && "%CONVEX_BACKEND_EXE%""

    echo    等待後端啟動 (最多 30 秒)
    set "WAIT_COUNT=0"
    set "MAX_WAIT=30"

    :wait_backend
    netstat -ano | findstr ":3210" >nul 2>&1
    if not errorlevel 1 (
        echo ✅ Convex 後端已成功啟動 (port 3210, 耗時 %WAIT_COUNT% 秒)
        goto :backend_started
    )

    if %WAIT_COUNT% GEQ %MAX_WAIT% (
        echo ❌ Convex 後端啟動超時 (等待 %MAX_WAIT% 秒後仍未啟動)
        echo    請檢查 Convex Local Backend 視窗是否有錯誤訊息
        set /a ERROR_COUNT+=1
        goto :error_summary
    )

    set /a WAIT_COUNT+=1
    echo    等待中 (%WAIT_COUNT%/%MAX_WAIT% 秒)
    timeout /t 1 /nobreak >nul
    goto :wait_backend

    :backend_started
) else (
    echo ✅ 本地 Convex 後端已運行 (port 3210)
)

REM ============================================================
REM 啟動 Convex Dev (函數同步)
REM ============================================================
echo.
echo [6/7] 🔄 啟動 Convex 函數同步
echo.

echo ▶️  編譯並同步 Convex 函數

REM 根據模式決定是否使用 --tail-logs
if "%MODE%"=="dev" (
    start "Convex Dev" cmd /k "cd /d "%PROJECT_DIR%" && npx convex dev --admin-key %ADMIN_KEY% --url "%LOCAL_CONVEX_URL%" --tail-logs"
) else (
    start "Convex Dev - Production" cmd /k "cd /d "%PROJECT_DIR%" && npx convex dev --admin-key %ADMIN_KEY% --url "%LOCAL_CONVEX_URL%""
)

echo    等待函數編譯 (10 秒)
timeout /t 10 /nobreak >nul

REM 驗證 .env.local 沒有被改回雲端
findstr /C:"VITE_CONVEX_URL=http://127.0.0.1:3210" "%ENV_FILE%" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  偵測到 .env.local 被修改,重新修正
    powershell -Command "(Get-Content '%ENV_FILE%') -replace 'VITE_CONVEX_URL=.*', 'VITE_CONVEX_URL=http://127.0.0.1:3210' | Set-Content '%ENV_FILE%'"
    echo ✅ 已重新設定為本地模式
)

echo ✅ Convex Dev 已啟動 (請檢查新開啟的視窗)

REM ============================================================
REM 啟動前端應用
REM ============================================================
echo.
echo [7/7] 🎮 啟動前端應用
echo.

REM 根據模式決定前端啟動方式
if "%MODE%"=="dev" (
    start "AI Town Dev" cmd /k "cd /d "%PROJECT_DIR%" && npm run dev"
    set "WINDOW_NAME=開發"
    set "HAS_TEST_PAGE=yes"
) else (
    start "AI Town Production" cmd /k "cd /d "%PROJECT_DIR%" && npm run dev:frontend"
    set "WINDOW_NAME=正式"
    set "HAS_TEST_PAGE=no"
)

echo ✅ 前端應用已啟動

REM ============================================================
REM 啟動成功總結
REM ============================================================
echo.
echo ╔═══════════════════════════════════════════════════════════╗
if "%MODE%"=="dev" (
    echo ║              ✅ 開發/測試環境啟動完成！                 ║
) else (
    echo ║                  ✅ 正式環境啟動完成！                   ║
)
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📍 服務狀態:
echo    • 啟動模式:         %MODE% (%WINDOW_NAME%環境)
echo    • Convex 後端:      http://127.0.0.1:3210
echo    • Convex Dev:       正在同步函數 (檢查新視窗)
echo    • 前端應用:         http://localhost:5173 (或 Vite 分配的端口)
echo    • Ollama LLM:       http://127.0.0.1:11434
echo.
echo 🌐 訪問應用:
echo    • 主應用:           http://localhost:5173/ai-town/
if "%HAS_TEST_PAGE%"=="yes" (
    echo    • 測試頁面:         http://localhost:5173/ai-town/test.html
)
echo.
if "%MODE%"=="dev" (
    echo 💡 開發模式說明:
    echo    1. 使用本地 Convex 後端（完整離線能力）
    echo    2. LLM 功能使用本地 Ollama 服務
    echo    3. 包含測試頁面,適合快速迭代開發
    echo    4. Convex Dev 啟用 --tail-logs (即時日誌)
) else (
    echo 💡 正式模式說明:
    echo    1. 使用本地 Convex 後端（完整離線能力）
    echo    2. LLM 功能使用本地 Ollama 服務
    echo    3. 適合正式部署與展示
    echo    4. 自動檢查並安裝依賴
)
echo.
echo 📝 已開啟的視窗:
echo    1. Convex Local Backend (port 3210)
if "%MODE%"=="dev" (
    echo    2. Convex Dev (函數同步 + 日誌追蹤)
    echo    3. AI Town Dev (Vite - 開發模式)
) else (
    echo    2. Convex Dev - Production (函數同步)
    echo    3. AI Town Production (Vite - 正式模式)
)
echo.
echo 💾 數據持久化:
echo    • 本地 Convex 數據存儲在後端目錄
echo    • 重啟不會丟失數據
echo    • 適合長期運行與展示
echo.
echo 🔄 切換模式:
echo    • 停止服務: stop-ai-town.bat
if "%MODE%"=="dev" (
    echo    • 切換正式: start-ai-town.bat prod
) else (
    echo    • 切換開發: start-ai-town.bat dev
)
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
echo 2. Ollama 服務未運行:
echo    • 確認 Ollama 已安裝並啟動
echo    • 測試: curl http://127.0.0.1:11434/api/tags
echo.
echo 3. 依賴安裝失敗 (正式模式):
echo    • 檢查網路連線
echo    • 執行: npm cache clean --force
echo    • 重新執行: npm install
echo.
echo 4. Port 衝突:
echo    • 檢查 3210 端口: netstat -ano ^| findstr ":3210"
echo    • 檢查 11434 端口: netstat -ano ^| findstr ":11434"
echo    • 使用 stop-ai-town.bat 停止所有服務
echo.
echo 📖 詳細文檔:
echo    • docs/setup/STARTUP_SCRIPTS_GUIDE.md
echo    • docs/testing/TESTING.md
echo.

:end
echo 按任意鍵關閉此窗口
pause >nul
