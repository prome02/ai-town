@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: =====================================================
:: AI Town 一鍵部署腳本
:: =====================================================

:: 記錄腳本目錄
set SCRIPT_DIR=%~dp0

echo.
echo =====================================================
echo   AI Town 一鍵部署工具
echo =====================================================
echo.
echo 📂 腳本目錄: %SCRIPT_DIR%
echo.
echo 此腳本將自動執行以下步驟:
echo   1. 匯入 Docker 映像
echo   2. 設置環境
echo   3. 啟動容器
echo   4. 初始化資料庫
echo.
echo 預計需要 5-10 分鐘
echo.

set /p CONTINUE="是否繼續? (Y/N): "
if /i not "%CONTINUE%"=="Y" (
    echo 取消部署
    exit /b 0
)

echo.
echo =====================================================
echo   步驟 1/4: 匯入 Docker 映像
echo =====================================================
echo.

call "%SCRIPT_DIR%1-import-image.bat"
if errorlevel 1 (
    echo.
    echo ❌ 步驟 1 失敗: 映像匯入失敗
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   步驟 2/4: 設置環境
echo =====================================================
echo.

call "%SCRIPT_DIR%2-setup-environment.bat"
if errorlevel 1 (
    echo.
    echo ❌ 步驟 2 失敗: 環境設置失敗
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   步驟 3/4: 啟動容器
echo =====================================================
echo.

call "%SCRIPT_DIR%3-start-container.bat"
if errorlevel 1 (
    echo.
    echo ❌ 步驟 3 失敗: 容器啟動失敗
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   步驟 4/4: 初始化資料庫
echo =====================================================
echo.

call "%SCRIPT_DIR%4-init-database.bat"
if errorlevel 1 (
    echo.
    echo ❌ 步驟 4 失敗: 資料庫初始化失敗
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   🎉 部署完成！
echo =====================================================
echo.
echo AI Town 已成功部署並運行！
echo.
echo 訪問應用:
echo   http://localhost:5173/
echo.
echo 管理命令:
echo   查看日誌: docker logs ai-town-production
echo   停止服務: docker-compose down
echo   重啟服務: docker-compose restart
echo.
pause
