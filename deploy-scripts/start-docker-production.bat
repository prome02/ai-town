@echo off
REM ============================================================
REM AI Town Docker Production Environment Startup Script
REM Using custom ports to avoid conflicts
REM ============================================================

echo.
echo ============================================================
echo   AI Town Docker Production Environment Startup
echo ============================================================
echo.

REM Switch to project root directory
cd /d "%~dp0\.."

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running, please start Docker Desktop first
    pause
    exit /b 1
)

REM Check if image exists
docker images | findstr /C:"ai-town-ai-town" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker image 'ai-town-ai-town:latest' does not exist
    echo Please build the image first:
    echo   docker build -t ai-town-ai-town:latest .
    pause
    exit /b 1
)

REM Stop and remove old containers (if exist)
echo [1/3] Cleaning up old containers...
docker-compose -f docker-compose.deployment.yml down 2>nul
echo.

REM Start containers
echo [2/3] Starting Docker containers...
docker-compose -f docker-compose.deployment.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Container startup failed
    pause
    exit /b 1
)
echo.

REM Wait for services to start
echo [3/3] Waiting for services to start (25 seconds)...
timeout /t 25 /nobreak >nul
echo.

REM Check container status
docker ps | findstr "ai-town-production" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Container is not running properly
    echo Check logs: docker logs ai-town-production
    pause
    exit /b 1
)

echo ============================================================
echo   ✅ AI Town started successfully!
echo ============================================================
echo.
echo Service access URLs:
echo   Frontend:  http://localhost:18000/ai-town/
echo   Convex:    http://localhost:18400/
echo.
echo Management commands:
echo   View logs:  docker logs -f ai-town-production
echo   Stop service:  docker-compose -f docker-compose.deployment.yml down
echo   Restart service:  docker restart ai-town-production
echo.
echo ============================================================
echo.

REM Open browser (optional)
echo Open application in browser? (Y/N)
set /p OPEN_BROWSER="> "
if /i "%OPEN_BROWSER%"=="Y" (
    start http://localhost:18000/ai-town/
)

echo.
echo Note: Container will continue running in background
pause
