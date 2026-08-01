@echo off
title Prompt Modifier - Deploy to GitHub Pages

:: Change directory to the script's directory (portable)
cd /d "%~dp0"

echo ==========================================
echo Publishing Prompt Modifier to GitHub Pages
echo Repository: https://github.com/Neytrino2134/Prompt-Modifier
echo Site:       https://Neytrino2134.github.io/Prompt-Modifier
echo Path:       %CD%
echo ==========================================
echo.

if not exist package.json (
    echo Error: package.json was not found.
    echo Run this bat file from the project root folder.
    pause
    exit /b 1
)

if not exist node_modules (
    echo ==========================================
    echo Installing dependencies...
    echo ==========================================
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Error installing dependencies.
        pause
        exit /b %errorlevel%
    )
)

echo ==========================================
echo Building and deploying to the gh-pages branch...
echo ==========================================
call npm run deploy
if %errorlevel% neq 0 (
    echo.
    echo GitHub Pages deploy failed.
    echo Make sure you are logged in to Git and have push access to the repository.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo Deploy complete.
echo GitHub Pages may take a few minutes to update:
echo https://Neytrino2134.github.io/Prompt-Modifier
echo ==========================================
pause
