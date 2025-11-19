@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town 部署包打包腳本
:: =====================================================

:: 切換到專案根目錄（父目錄）
cd /d "%~dp0.."

echo.
echo =====================================================
echo   AI Town 部署包打包工具
echo =====================================================
echo.
echo 📂 工作目錄: %CD%
echo.
echo 此腳本將創建一個完整的部署包
echo 可直接複製到其他機器使用
echo.

set OUTPUT_DIR=ai-town-deployment-package
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%

echo 📦 創建部署包目錄...
if exist "%OUTPUT_DIR%" (
    echo ⚠️  目錄已存在，將被覆蓋
    rmdir /s /q "%OUTPUT_DIR%"
)

mkdir "%OUTPUT_DIR%"
echo.

:: 複製必要檔案
echo 📋 複製必要檔案...
echo.

:: Docker 映像
if exist "ai-town-image-latest.tar.gz" (
    echo   ✅ Docker 映像 (壓縮)
    copy "ai-town-image-latest.tar.gz" "%OUTPUT_DIR%\" >nul
    if exist "ai-town-image-latest.tar.gz.sha256" (
        copy "ai-town-image-latest.tar.gz.sha256" "%OUTPUT_DIR%\" >nul
    )
) else if exist "ai-town-image-latest.tar" (
    echo   ✅ Docker 映像 (未壓縮)
    copy "ai-town-image-latest.tar" "%OUTPUT_DIR%\" >nul
) else (
    echo   ❌ 找不到 Docker 映像檔案
    set MISSING=1
)

:: 配置檔案
if exist "docker-compose.yml" (
    echo   ✅ docker-compose.yml
    copy "docker-compose.yml" "%OUTPUT_DIR%\" >nul
) else (
    echo   ❌ docker-compose.yml
    set MISSING=1
)

if exist "docker-entrypoint.sh" (
    echo   ✅ docker-entrypoint.sh
    copy "docker-entrypoint.sh" "%OUTPUT_DIR%\" >nul
) else (
    echo   ❌ docker-entrypoint.sh
    set MISSING=1
)

:: 資料目錄
if exist "data\" (
    echo   ✅ data\ 目錄
    xcopy "data" "%OUTPUT_DIR%\data\" /E /I /Q >nul
) else (
    echo   ❌ data\ 目錄
    set MISSING=1
)

if exist "convex\" (
    echo   ✅ convex\ 目錄
    :: 複製 convex 目錄，但排除 _generated 子目錄
    xcopy "convex" "%OUTPUT_DIR%\convex\" /E /I /Q /EXCLUDE:deploy-scripts\xcopy-exclude.txt >nul 2>&1
    if errorlevel 1 (
        :: 如果排除檔案不存在，使用手動方式排除
        xcopy "convex\*.ts" "%OUTPUT_DIR%\convex\" /I /Q >nul 2>&1
        xcopy "convex\*.js" "%OUTPUT_DIR%\convex\" /I /Q >nul 2>&1
        xcopy "convex\*.json" "%OUTPUT_DIR%\convex\" /I /Q >nul 2>&1
        for /d %%D in (convex\*) do (
            if /i not "%%~nxD"=="_generated" (
                xcopy "%%D" "%OUTPUT_DIR%\convex\%%~nxD\" /E /I /Q >nul 2>&1
            )
        )
    )
) else (
    echo   ❌ convex\ 目錄
    set MISSING=1
)

:: 部署腳本 (排除打包腳本本身和排除清單檔案)
echo   ✅ 部署腳本
xcopy "deploy-scripts\*.bat" "%OUTPUT_DIR%\deploy-scripts\" /I /Q >nul
xcopy "deploy-scripts\*.md" "%OUTPUT_DIR%\deploy-scripts\" /I /Q >nul 2>nul
:: 排除 package-for-deployment.bat 和 xcopy-exclude.txt
del "%OUTPUT_DIR%\deploy-scripts\package-for-deployment.bat" >nul 2>&1
del "%OUTPUT_DIR%\deploy-scripts\xcopy-exclude.txt" >nul 2>&1

:: 文件
if exist "DOCKER_IMAGE_IMPORT_GUIDE.md" (
    echo   ✅ 匯入指南
    copy "DOCKER_IMAGE_IMPORT_GUIDE.md" "%OUTPUT_DIR%\" >nul
)

if exist "DOCKER_IMPORT_QUICKSTART.txt" (
    echo   ✅ 快速參考
    copy "DOCKER_IMPORT_QUICKSTART.txt" "%OUTPUT_DIR%\" >nul
)

:: 創建 .env.local 範本
echo   ✅ .env.local 範本
(
    echo # AI Town 環境變數配置
    echo.
    echo # Convex 本地後端 URL
    echo VITE_CONVEX_URL=http://127.0.0.1:3210
    echo.
    echo # Ollama LLM API URL ^(可選^)
    echo # LLM_API_URL=http://host.docker.internal:11434
) > "%OUTPUT_DIR%\.env.local"

echo.

if defined MISSING (
    echo ⚠️  部分檔案缺失，部署包可能不完整
    echo.
)

:: 創建 README
echo 📝 創建部署說明...
(
    echo # AI Town 部署包
    echo.
    echo 創建時間: %date% %time%
    echo.
    echo ## 快速開始
    echo.
    echo 1. 確保已安裝 Docker Desktop 和 Node.js 18+
    echo 2. 進入 deploy-scripts 目錄
    echo 3. 執行 0-deploy-all.bat
    echo.
    echo ## 檔案清單
    echo.
    echo - ai-town-image-latest.tar.gz - Docker 映像 (354MB)
    echo - docker-compose.yml - 容器編排配置
    echo - docker-entrypoint.sh - 啟動腳本
    echo - data/ - 角色和地圖資料
    echo - convex/ - Convex 函式
    echo - deploy-scripts/ - 部署腳本
    echo   - 0-deploy-all.bat - 一鍵部署
    echo   - 1-import-image.bat - 匯入映像
    echo   - 2-setup-environment.bat - 環境設置
    echo   - 3-start-container.bat - 啟動容器
    echo   - 4-init-database.bat - 初始化資料庫
    echo   - stop-container.bat - 停止容器
    echo.
    echo ## 詳細說明
    echo.
    echo 請參考:
    echo - deploy-scripts/README.md - 腳本使用說明
    echo - DOCKER_IMAGE_IMPORT_GUIDE.md - 詳細匯入指南
    echo - DOCKER_IMPORT_QUICKSTART.txt - 快速參考
) > "%OUTPUT_DIR%\README.txt"

:: 計算大小
echo 📊 計算部署包大小...
for /f "tokens=3" %%a in ('dir "%OUTPUT_DIR%" /s ^| find "個檔案"') do set SIZE=%%a
echo.
echo ✅ 部署包已創建: %OUTPUT_DIR%
echo.

:: 列出內容
echo 📁 部署包內容:
dir "%OUTPUT_DIR%" /B
echo.

:: 詢問是否壓縮
set /p COMPRESS="是否壓縮為 ZIP 檔案? (Y/N): "
if /i "%COMPRESS%"=="Y" (
    echo.
    echo 📦 壓縮部署包...

    :: 使用 PowerShell 壓縮
    powershell -command "Compress-Archive -Path '%OUTPUT_DIR%' -DestinationPath 'ai-town-deployment-%TIMESTAMP%.zip' -Force"

    if exist "ai-town-deployment-%TIMESTAMP%.zip" (
        echo ✅ 壓縮完成: ai-town-deployment-%TIMESTAMP%.zip
        for %%F in ("ai-town-deployment-%TIMESTAMP%.zip") do echo 檔案大小: %%~zF bytes
    ) else (
        echo ❌ 壓縮失敗
    )
)

echo.
echo =====================================================
echo   打包完成！
echo =====================================================
echo.
echo 部署包位置:
echo   目錄: %OUTPUT_DIR%
if /i "%COMPRESS%"=="Y" (
    echo   ZIP:  ai-town-deployment-%TIMESTAMP%.zip
)
echo.
echo 使用方法:
echo   1. 將整個部署包複製到目標機器
echo   2. 進入 deploy-scripts 目錄
echo   3. 執行 0-deploy-all.bat
echo.
pause
