@echo off
title Prompt Modifier - Electron Dev

:: Change directory to the script's directory (portable)
cd /d "%~dp0"

echo ==========================================
echo Starting Prompt Modifier (Electron Dev Mode)...
echo Path: %CD%
echo ==========================================

:: Run electron dev
call npm run electron:dev

echo.
echo ==========================================
echo Electron stopped.
echo ==========================================
pause
