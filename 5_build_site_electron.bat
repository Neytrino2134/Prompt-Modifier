@echo off
setlocal
title Prompt Modifier - Build Site Electron Wrapper

cd /d "%~dp0"

set "APP_VERSION=0.1.12-alpha.1"
set "WRAPPER_DIR=%CD%\electron-site"
set "OUTPUT_DIR=%CD%\dist-nativefier"
set "ICON_SOURCE=%CD%\resources\icon.ico"
set "ICON_TARGET=%WRAPPER_DIR%\icon.ico"

echo ==========================================
echo Building Prompt Modifier Site wrapper
echo ==========================================
echo Source URL: https://neytrino2134.github.io/Prompt-Modifier/
echo Output: %OUTPUT_DIR%
echo.

if not exist "%ICON_SOURCE%" (
    echo Missing icon: %ICON_SOURCE%
    pause
    exit /b 1
)

if not exist "%WRAPPER_DIR%\package.json" (
    echo Missing wrapper project: %WRAPPER_DIR%\package.json
    pause
    exit /b 1
)

for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version" 2^>nul`) do set "APP_VERSION=%%v"

copy /Y "%ICON_SOURCE%" "%ICON_TARGET%" >nul
if %errorlevel% neq 0 (
    echo Could not copy icon to wrapper project.
    pause
    exit /b %errorlevel%
)

pushd "%WRAPPER_DIR%"

node -e "const fs=require('fs'); const pkg=require('./package.json'); pkg.version=process.argv[1]; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');" "%APP_VERSION%"
if %errorlevel% neq 0 (
    echo Could not sync wrapper version.
    popd
    pause
    exit /b %errorlevel%
)

echo.
echo Installing wrapper dependencies...
call npm.cmd install --no-audit --fund=false
if %errorlevel% neq 0 (
    echo Dependency installation failed.
    popd
    pause
    exit /b %errorlevel%
)

echo.
echo Packaging portable Electron app...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo Site wrapper build failed.
    popd
    pause
    exit /b %errorlevel%
)

popd

echo.
echo ==========================================
echo Build complete.
echo Portable EXE is in: %OUTPUT_DIR%
echo ==========================================
pause
