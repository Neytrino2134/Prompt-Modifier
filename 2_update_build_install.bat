@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create([IO.File]::ReadAllText('%~dp0update_build_install.ps1')))"
set "result=%errorlevel%"
if not "%result%"=="0" (
    echo.
    echo Update failed. See the error above.
    pause
)
exit /b %result%
