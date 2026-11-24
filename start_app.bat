@echo off
echo ===================================================
echo Techno CRM - Mobile App Starter
echo ===================================================
echo.
echo Choose mode:
echo [1] Start with Tunnel (Recommended - connects on any Wi-Fi/Mobile Data)
echo [2] Start with LAN (Fast - same Wi-Fi only)
echo [3] Clear Cache and Start
echo.
set /p choice="Enter choice (1, 2, or 3) [Default: 1]: "

if "%choice%"=="2" (
    echo Starting Expo in LAN mode...
    npx expo start --lan
) else if "%choice%"=="3" (
    echo Clearing cache and starting Expo...
    npx expo start -c
) else (
    echo Starting Expo in Tunnel mode...
    npx expo start --tunnel
)
pause
