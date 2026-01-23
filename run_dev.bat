@echo off
title Prompt Modifier Dev Runner

:: Переключаемся на диск и папку проекта
cd /d "D:\Projects\Prompt-Modifier"

echo ==========================================
echo Starting Prompt Modifier (Dev Mode)...
echo Path: %CD%
echo ==========================================

:: Запускаем команду
npm run electron:dev

:: Если произошла ошибка или сервер остановился, не закрываем окно сразу
pause