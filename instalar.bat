@echo off
chcp 65001 >nul 2>&1
title ARGenteIA — Instalador
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║      █████╗ ██████╗  ██████╗ ███████╗███╗   ██╗      ║
echo  ║     ██╔══██╗██╔══██╗██╔════╝ ██╔════╝████╗  ██║      ║
echo  ║     ███████║██████╔╝██║  ███╗█████╗  ██╔██╗ ██║      ║
echo  ║     ██╔══██║██╔══██╗██║   ██║██╔══╝  ██║╚██╗██║      ║
echo  ║     ██║  ██║██║  ██║╚██████╔╝███████╗██║ ╚████║      ║
echo  ║     ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ║
echo  ║              ████████╗███████╗██╗ █████╗              ║
echo  ║              ╚══██╔══╝██╔════╝██║██╔══██╗             ║
echo  ║                 ██║   █████╗  ██║███████║             ║
echo  ║                 ██║   ██╔══╝  ██║██╔══██║             ║
echo  ║                 ██║   ███████╗██║██║  ██║             ║
echo  ║                 ╚═╝   ╚══════╝╚═╝╚═╝  ╚═╝            ║
echo  ║                                                      ║
echo  ║          Instalador Automatico v1.0                  ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ─── Detectar si estamos dentro del proyecto o standalone ────────────
set "INSTALL_DIR=%~dp0"

if exist "%INSTALL_DIR%package.json" (
    echo  Proyecto detectado en: %INSTALL_DIR%
    echo.
    set /p CONFIRM="  Instalar aqui? (S/N): "
    if /i "!CONFIRM!"=="N" goto :choose_folder
    goto :check_node
)

:choose_folder
:: ─── Elegir carpeta de instalacion ──────────────────────────────────
echo  Selecciona la carpeta donde instalar ARGenteIA...
echo.

:: Usar PowerShell para mostrar el dialogo de carpeta
set "PS_CMD=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_CMD%" (
    where pwsh >nul 2>&1
    if %ERRORLEVEL% equ 0 ( set "PS_CMD=pwsh" ) else ( goto :manual_path )
)

for /f "usebackq delims=" %%i in (`"%PS_CMD%" -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Selecciona la carpeta donde instalar ARGenteIA'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath } else { Write-Output 'CANCELLED' }"`) do set "SELECTED_DIR=%%i"

if "%SELECTED_DIR%"=="CANCELLED" (
    echo.
    echo  Instalacion cancelada.
    pause
    exit /b 0
)

if "%SELECTED_DIR%"=="" goto :manual_path

set "INSTALL_DIR=%SELECTED_DIR%\ARGenteIA"
goto :clone_repo

:manual_path
echo  No se pudo abrir el selector de carpetas.
echo.
set /p INSTALL_DIR="  Ingresa la ruta donde instalar (ej: C:\Users\tu_usuario\ARGenteIA): "
if "%INSTALL_DIR%"=="" (
    echo  Ruta invalida.
    pause
    exit /b 1
)

:clone_repo
:: ─── Descargar el proyecto ──────────────────────────────────────────
echo.
echo  [0/5] Descargando ARGenteIA en: %INSTALL_DIR%
echo.

:: Verificar si git esta disponible
where git >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo        Clonando repositorio con git...
    git clone https://github.com/EduMMorenolp/ARGenteIA.git "%INSTALL_DIR%"
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  ✗ Error al clonar el repositorio.
        pause
        exit /b 1
    )
) else (
    echo        Git no encontrado. Descargando ZIP...
    echo.

    :: Descargar ZIP con PowerShell
    "%PS_CMD%" -ExecutionPolicy Bypass -Command "try { $url='https://github.com/EduMMorenolp/ARGenteIA/archive/refs/heads/main.zip'; $zip='%TEMP%\argenteia.zip'; Write-Host '        Descargando...'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing; Write-Host '        Extrayendo...'; Expand-Archive -Path $zip -DestinationPath '%TEMP%\argenteia_tmp' -Force; $src = Get-ChildItem '%TEMP%\argenteia_tmp' | Select-Object -First 1; if (!(Test-Path '%INSTALL_DIR%')) { New-Item -ItemType Directory -Path '%INSTALL_DIR%' -Force | Out-Null }; Copy-Item -Path ($src.FullName + '\*') -Destination '%INSTALL_DIR%' -Recurse -Force; Remove-Item $zip -Force; Remove-Item '%TEMP%\argenteia_tmp' -Recurse -Force; Write-Host '        OK' } catch { Write-Host ('ERROR: ' + $_.Exception.Message); exit 1 }"

    if %ERRORLEVEL% neq 0 (
        echo.
        echo  ✗ Error al descargar el proyecto.
        pause
        exit /b 1
    )
)

echo         ✓ Proyecto descargado
echo.

:: Cambiar al directorio del proyecto
cd /d "%INSTALL_DIR%"

:check_node
:: ─── Paso 1: Verificar Node.js ─────────────────────────────────────────
echo  [1/5] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ╔══════════════════════════════════════════════╗
    echo  ║  Node.js no esta instalado.                  ║
    echo  ║                                              ║
    echo  ║  Se abrira la pagina de descarga.            ║
    echo  ║  Instala Node.js y luego vuelve a ejecutar   ║
    echo  ║  este instalador.                            ║
    echo  ╚══════════════════════════════════════════════╝
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo         ✓ Node.js encontrado: %NODE_VER%
echo.

:: ─── Paso 2: Instalar pnpm ─────────────────────────────────────────────
echo  [2/5] Verificando pnpm...
where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo         Instalando pnpm globalmente...
    npm install -g pnpm
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  ✗ Error al instalar pnpm.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm -v') do set PNPM_VER=%%v
echo         ✓ pnpm encontrado: v%PNPM_VER%
echo.

:: ─── Paso 3: Instalar dependencias ─────────────────────────────────────
echo  [3/5] Instalando dependencias...
echo         Esto puede tardar unos minutos...
echo.
call pnpm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ✗ Error al instalar dependencias.
    pause
    exit /b 1
)
echo.
echo         ✓ Dependencias instaladas correctamente
echo.

:: ─── Paso 4: Compilar el proyecto ──────────────────────────────────────
echo  [4/5] Compilando el proyecto...
call pnpm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ✗ Error al compilar.
    pause
    exit /b 1
)
echo.
echo         ✓ Proyecto compilado correctamente
echo.

:: ─── Paso 5: Configuracion ─────────────────────────────────────────────
echo  [5/5] Verificando configuracion...
if not exist "config.json" (
    copy "config.example.json" "config.json" >nul
    echo         ✓ Archivo config.json creado
    echo.
    echo  ╔══════════════════════════════════════════════════════╗
    echo  ║  IMPORTANTE: Edita config.json con tu API key        ║
    echo  ║                                                      ║
    echo  ║  Podes obtener una gratis en:                        ║
    echo  ║  → https://openrouter.ai/keys                       ║
    echo  ╚══════════════════════════════════════════════════════╝
) else (
    echo         ✓ config.json ya existe
)

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║   ✓ Instalacion completada exitosamente!             ║
echo  ║                                                      ║
echo  ║   Carpeta: %INSTALL_DIR%
echo  ║                                                      ║
echo  ║   Para iniciar, hace doble click en:                 ║
echo  ║   → ARGenteIA.bat                                    ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Presiona cualquier tecla para salir...
pause >nul
