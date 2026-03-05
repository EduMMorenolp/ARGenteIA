@echo off
title ARGenteIA - Server Manager
chcp 65001 >nul 2>&1

:: Buscar PowerShell: pwsh (7+), powershell (5.1), ruta completa (5.1)
set "PS_EXE="

where pwsh >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PS_EXE=pwsh"
    goto :launch
)

where powershell >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PS_EXE=powershell"
    goto :launch
)

if exist "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" (
    set "PS_EXE=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    goto :launch
)

:: No encontrado
echo.
echo  ==================================================
echo    ERROR: PowerShell no encontrado
echo.
echo    Instala PowerShell desde:
echo    https://aka.ms/powershell
echo  ==================================================
echo.
pause
exit /b 1

:launch
"%PS_EXE%" -ExecutionPolicy Bypass -File "%~dp0launcher.ps1" 2>"%~dp0.launcher-ps-error.log"
set PS_EXIT=%ERRORLEVEL%
if %PS_EXIT% neq 0 (
    echo.
    echo  ==================================================
    echo    El launcher finalizo con un error.
    echo    Codigo de salida: %PS_EXIT%
    echo.
    if exist "%~dp0.launcher-crash.log" (
        echo    --- Ultimo error del launcher: ---
        echo.
        type "%~dp0.launcher-crash.log" 2>nul
        echo.
    )
    if exist "%~dp0.launcher-ps-error.log" (
        echo    --- Salida de error PowerShell: ---
        echo.
        type "%~dp0.launcher-ps-error.log" 2>nul
        echo.
    )
    echo    Para diagnosticar, abre PowerShell aqui y ejecuta:
    echo      npx tsx src/index.ts
    echo  ==================================================
    echo.
    pause
)
