@echo off
title Prompt Modifier - Build Web Version

:: Change directory to the script's directory (portable)
cd /d "%~dp0"

echo ==========================================
echo Building Web version of Prompt Modifier...
echo Path: %CD%
echo ==========================================

:: Run npm run build
call npm run build

echo.
echo ==========================================
echo Build complete. The built files are in /dist.
echo ==========================================
pause
