@echo off
REM ============================================================
REM AI Town Docker 生產環境狀態檢查腳本
REM ============================================================

echo.
echo ============================================================
echo   AI Town Docker 狀態檢查
echo ============================================================
echo.

REM 切換到專案根目錄
cd /d "%~dp0\.."

REM 檢查容器狀態
echo [1/4] 檢查容器狀態...
docker ps -a | findstr "ai-town-production"
echo.

REM 檢查容器日誌（最近 50 行）
echo [2/4] 最近日誌 (最後 50 行):
echo ------------------------------------------------------------
docker logs ai-town-production --tail 50 2>&1
echo.

REM 測試服務可訪問性
echo [3/4] 測試服務端口...
echo 測試前端端口 18000:
curl -s -o nul -w "HTTP 狀態碼: %%{http_code}\n" http://localhost:18000/ 2>nul || echo 無法連接

echo 測試 Convex 端口 18400:
curl -s -o nul -w "HTTP 狀態碼: %%{http_code}\n" http://localhost:18400/ 2>nul || echo 無法連接
echo.

REM 顯示資源使用情況
echo [4/4] 資源使用情況:
docker stats ai-town-production --no-stream 2>nul || echo 容器未運行
echo.

echo ============================================================
echo   狀態檢查完成
echo ============================================================
echo.
echo 查看完整日誌：
echo   Convex 後端:  docker exec ai-town-production tail -f /var/log/convex-backend.log
echo   Vite 前端:    docker exec ai-town-production tail -f /var/log/vite.log
echo   Convex Dev:   docker exec ai-town-production tail -f /var/log/convex-dev.log
echo.
pause
