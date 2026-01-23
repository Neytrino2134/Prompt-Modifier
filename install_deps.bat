@echo off
title Prompt Modifier - Install Dependencies

:: Переключаемся на диск и папку проекта
cd /d "D:\Projects\Prompt-Modifier"

echo ==========================================
echo Installing dependencies for Prompt Modifier...
echo Path: %CD%
echo ==========================================

:: Запускаем установку
npm install

echo.
echo ==========================================
echo Installation complete.
echo ==========================================
pause