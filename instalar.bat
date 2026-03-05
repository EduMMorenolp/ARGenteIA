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

:: ─── Paso 1: Verificar Node.js ─────────────────────────────────────────
echo  [1/5] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ╔══════════════════════════════════════════════╗
    echo  ║  ⚠  Node.js no esta instalado.              ║
    echo  ║                                              ║
    echo  ║  Se abrira la pagina de descarga.            ║
    echo  ║  Instala Node.js y luego vuelve a ejecutar   ║
    echo  ║  este instalador.                            ║
    echo  ╚══════════════════════════════════════════════╝
    echo.
    start https://nodejs.org/
    echo  Presiona cualquier tecla para salir...
    pause >nul
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
        echo  ✗ Error al instalar pnpm. Revisa tu conexion a internet.
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
    echo  ✗ Error al compilar. Revisa los errores arriba.
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
    echo         ✓ Archivo config.json creado desde el ejemplo
    echo.
    echo  ╔══════════════════════════════════════════════════════╗
    echo  ║  ⚠  IMPORTANTE: Edita config.json con tu API key    ║
    echo  ║                                                      ║
    echo  ║  Abre config.json con un editor de texto y           ║
    echo  ║  reemplaza "sk-..." con tu clave de API real.        ║
    echo  ║                                                      ║
    echo  ║  Podes obtener una en:                               ║
    echo  ║  → https://openrouter.ai/keys                       ║
    echo  ║  → https://platform.openai.com/api-keys             ║
    echo  ╚══════════════════════════════════════════════════════╝
) else (
    echo         ✓ config.json ya existe, no se modifico
)

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║   ✓ Instalacion completada exitosamente!             ║
echo  ║                                                      ║
echo  ║   Para iniciar el servidor, hace doble click en:     ║
echo  ║   → ARGenteIA.bat                                    ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Presiona cualquier tecla para salir...
pause >nul
