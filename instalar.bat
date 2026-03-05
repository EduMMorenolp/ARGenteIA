@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title ARGenteIA - Instalador
color 0B

echo.
echo  ========================================================
echo.
echo            A R G e n t e I A
echo.
echo            Instalador Automatico v1.0
echo.
echo  ========================================================
echo.

:: --- Detectar si estamos dentro del proyecto o standalone ---
set "INSTALL_DIR=%~dp0"

if exist "%INSTALL_DIR%package.json" (
    echo  Proyecto detectado en: %INSTALL_DIR%
    echo  Instalando...
    echo.
    cd /d "%INSTALL_DIR%"
    goto :check_node
)

:: --- Elegir carpeta de instalacion ---
echo  Selecciona la carpeta donde instalar ARGenteIA...
echo.

set "PS_CMD="
where pwsh >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set "PS_CMD=pwsh"
    goto :has_ps
)
if exist "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" (
    set "PS_CMD=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    goto :has_ps
)
goto :manual_path

:has_ps
for /f "usebackq delims=" %%i in (`"!PS_CMD!" -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Selecciona donde instalar ARGenteIA'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath } else { 'CANCELLED' }"`) do set "SELECTED_DIR=%%i"

if "!SELECTED_DIR!"=="CANCELLED" (
    echo  Instalacion cancelada.
    pause
    exit /b 0
)
if "!SELECTED_DIR!"=="" goto :manual_path

set "INSTALL_DIR=!SELECTED_DIR!\ARGenteIA"
goto :clone_repo

:manual_path
echo  No se pudo abrir el selector de carpetas.
echo.
set /p INSTALL_DIR="  Ruta de instalacion (ej: C:\Users\tu_usuario\ARGenteIA): "
if "!INSTALL_DIR!"=="" (
    echo  Ruta invalida.
    pause
    exit /b 1
)

:clone_repo
echo.
echo  [0/5] Descargando ARGenteIA en: !INSTALL_DIR!
echo.

where git >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo        Clonando con git...
    git clone https://github.com/EduMMorenolp/ARGenteIA.git "!INSTALL_DIR!"
    if !ERRORLEVEL! neq 0 (
        echo  ERROR: No se pudo clonar el repositorio.
        pause
        exit /b 1
    )
    goto :clone_done
)

echo        Git no encontrado. Descargando ZIP...
"!PS_CMD!" -ExecutionPolicy Bypass -Command "try { $u='https://github.com/EduMMorenolp/ARGenteIA/archive/refs/heads/main.zip'; $z=\"$env:TEMP\argenteia.zip\"; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest $u -OutFile $z -UseBasicParsing; Expand-Archive $z \"$env:TEMP\argenteia_tmp\" -Force; $s=Get-ChildItem \"$env:TEMP\argenteia_tmp\" | Select -First 1; if(!(Test-Path '!INSTALL_DIR!')){New-Item -ItemType Directory '!INSTALL_DIR!' -Force|Out-Null}; Copy-Item ($s.FullName+'\*') '!INSTALL_DIR!' -Recurse -Force; Remove-Item $z -Force; Remove-Item \"$env:TEMP\argenteia_tmp\" -Recurse -Force; Write-Host 'OK' } catch { Write-Host $_.Exception.Message; exit 1 }"
if !ERRORLEVEL! neq 0 (
    echo  ERROR: No se pudo descargar el proyecto.
    pause
    exit /b 1
)

:clone_done
echo        OK - Proyecto descargado
echo.
cd /d "!INSTALL_DIR!"

:check_node
:: --- Paso 1: Node.js ---
echo  [1/5] Verificando Node.js...
where node >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo.
    echo  --------------------------------------------------------
    echo   Node.js no esta instalado.
    echo   Se abrira la pagina de descarga.
    echo   Instala Node.js y vuelve a ejecutar este instalador.
    echo  --------------------------------------------------------
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo        OK - Node.js %NODE_VER%
echo.

:: --- Paso 2: pnpm ---
echo  [2/5] Verificando pnpm...
where pnpm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo        Instalando pnpm...
    call npm install -g pnpm
    if !ERRORLEVEL! neq 0 (
        echo  ERROR: No se pudo instalar pnpm.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm -v') do set PNPM_VER=%%v
echo        OK - pnpm v%PNPM_VER%
echo.

:: --- Paso 3: Dependencias ---
echo  [3/5] Instalando dependencias...
echo        Esto puede tardar unos minutos...
echo.
call pnpm install
if !ERRORLEVEL! neq 0 (
    echo  ERROR: Fallo la instalacion de dependencias.
    pause
    exit /b 1
)
echo.
echo        OK - Dependencias instaladas
echo.

:: --- Paso 4: UI ---
echo  [4/5] Preparando la interfaz web...
if not exist "ui\package.json" goto :skip_ui

call pnpm run ui:install
if !ERRORLEVEL! neq 0 (
    echo        AVISO: No se pudieron instalar deps de UI
    goto :skip_ui
)
call pnpm run ui:build
if !ERRORLEVEL! neq 0 (
    echo        AVISO: No se pudo compilar la UI
    goto :skip_ui
)
echo        OK - Interfaz web lista
goto :step5

:skip_ui
echo        Omitido
echo.

:step5
:: --- Paso 5: Config ---
echo  [5/5] Verificando configuracion...
if exist "config.json" (
    echo        OK - config.json ya existe
    goto :done
)
if not exist "config.example.json" (
    echo        AVISO: config.example.json no encontrado
    goto :done
)
copy "config.example.json" "config.json" >nul
echo        OK - config.json creado
echo.
echo  --------------------------------------------------------
echo   IMPORTANTE: Edita config.json con tu API key
echo.
echo   Podes obtener una gratis en:
echo     https://openrouter.ai/keys
echo  --------------------------------------------------------

:done
echo.
echo  ========================================================
echo.
echo   Instalacion completada!
echo.  Al cerrarse el instalador.
echo   Para iniciar el servidor, hace click en: Iniciar Servidor
echo.
echo  ========================================================
echo.
pause
