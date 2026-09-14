@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1
echo ==========================================
echo Installing Dependencies...
echo ==========================================
call npm.cmd install --no-audit --fund=false --foreground-scripts --loglevel=info --fetch-timeout=30000 --fetch-retries=1
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    if /i not "%~1"=="--no-pause" pause
    exit /b %errorlevel%
)

echo ==========================================
echo Building Electron Application (EXE/Installer)...
echo ==========================================
call npm.cmd run electron:build
if %errorlevel% neq 0 (
    echo Electron build failed!
    if /i not "%~1"=="--no-pause" pause
    exit /b %errorlevel%
)
echo.
echo Electron build complete! Installers are in the 'dist-electron' folder.
if /i not "%~1"=="--no-pause" pause
exit /b 0
