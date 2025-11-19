@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town Docker 映像匯入腳本
:: =====================================================

:: 切換到部署包根目錄（父目錄）
cd /d "%~dp0.."

echo.
echo =====================================================
echo   AI Town Docker 映像匯入工具
echo =====================================================
echo.
echo 📂 工作目錄: %CD%
echo.

:: 檢查 Docker 是否安裝
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 未安裝 Docker
    echo.
    echo 請先安裝 Docker Desktop:
    echo https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker 已安裝
echo.

:: 檢查映像檔案是否存在
set IMAGE_FILE=ai-town-image-latest.tar.gz
if not exist "%IMAGE_FILE%" (
    set IMAGE_FILE=ai-town-image-latest.tar
)

if not exist "%IMAGE_FILE%" (
    echo ❌ 錯誤: 找不到映像檔案
    echo.
    echo 請確認以下檔案存在於當前目錄:
    echo   - ai-town-image-latest.tar.gz
    echo   或
    echo   - ai-town-image-latest.tar
    echo.
    pause
    exit /b 1
)

echo ✅ 找到映像檔案: %IMAGE_FILE%
echo.

:: 驗證校驗碼（如果存在）
if exist "%IMAGE_FILE%.sha256" (
    echo 🔍 驗證檔案完整性...
    certutil -hashfile "%IMAGE_FILE%" SHA256 | findstr /v "SHA256" | findstr /v "CertUtil" > temp_hash.txt
    set /p ACTUAL_HASH=<temp_hash.txt

    :: 從 .sha256 檔案中只提取校驗碼部分（忽略檔名）
    for /f "tokens=1" %%a in (%IMAGE_FILE%.sha256) do set EXPECTED_HASH=%%a

    if "!ACTUAL_HASH!" == "!EXPECTED_HASH!" (
        echo ✅ 校驗碼驗證成功
    ) else (
        echo ⚠️  警告: 校驗碼不匹配
        echo 預期: !EXPECTED_HASH!
        echo 實際: !ACTUAL_HASH!
        echo.
        set /p CONTINUE="是否繼續匯入? (Y/N): "
        if /i not "!CONTINUE!"=="Y" exit /b 1
    )
    del temp_hash.txt
    echo.
)

:: 檢查是否已存在同名映像
docker images | findstr "ai-town-ai-town" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  警告: 已存在 ai-town-ai-town 映像
    echo.
    set /p OVERWRITE="是否覆蓋現有映像? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo 取消匯入
        pause
        exit /b 0
    )
    echo.
    echo 🗑️  移除舊映像...
    docker rmi ai-town-ai-town:latest
    echo.
)

:: 匯入映像
echo 📦 開始匯入映像 (大小: 1.73GB, 可能需要幾分鐘)...
echo.

docker load < "%IMAGE_FILE%"

if errorlevel 1 (
    echo.
    echo ❌ 映像匯入失敗
    pause
    exit /b 1
)

echo.
echo ✅ 映像匯入成功！
echo.

:: 驗證映像
echo 🔍 驗證映像...
docker images | findstr "ai-town-ai-town"
echo.

echo =====================================================
echo   匯入完成！
echo =====================================================
echo.
echo 下一步:
echo   1. 執行 2-setup-environment.bat 設置環境
echo   2. 執行 3-start-container.bat 啟動容器
echo.
pause
exit /b 0
