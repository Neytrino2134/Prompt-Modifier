@echo off
echo ==========================================
echo Installing Dependencies...
echo ==========================================
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo ==========================================
echo Building Electron Application (EXE/Installer)...
echo ==========================================
call npm run electron:build
if %errorlevel% neq 0 (
    echo Electron build failed!
    pause
    exit /b %errorlevel%
)
echo.
echo Electron build complete! Installers are in the 'dist-electron' folder.
pause