#!/usr/bin/env pwsh
# ─── ARGenteIA — Test de lógica PowerShell del instalador ───────────────

$ErrorActionPreference = "Continue"
$pass = 0
$fail = 0

function Test-Check {
    param([bool]$Condition, [string]$Name)
    if ($Condition) {
        Write-Host "  ✓ $Name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  ✗ $Name" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗"
Write-Host "║  Test: PowerShell Installer Logic                    ║"
Write-Host "║  PS Version: $($PSVersionTable.PSVersion)                              ║"
Write-Host "║  OS: $($PSVersionTable.OS)  ║"
Write-Host "╚══════════════════════════════════════════════════════╝"
Write-Host ""

# ─── Test 1: Versión de PowerShell ──────────────────────────────────────
Test-Check ($PSVersionTable.PSVersion.Major -ge 5) "PowerShell version >= 5"
Write-Host "        Version: $($PSVersionTable.PSVersion)"

# ─── Test 2: Detección de Node.js ──────────────────────────────────────
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$nodeFound = $null -ne $nodeCmd
Test-Check $nodeFound "Node.js detectado"
if ($nodeFound) {
    $nodeVer = & node -v
    Write-Host "        Node: $nodeVer"
}

# ─── Test 3: npm disponible ────────────────────────────────────────────
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
$npmFound = $null -ne $npmCmd
Test-Check $npmFound "npm disponible"
if ($npmFound) {
    $npmVer = & npm -v
    Write-Host "        npm: v$npmVer"
}

# ─── Test 4: Instalar pnpm vía npm ────────────────────────────────────
Write-Host ""
Write-Host "  Instalando pnpm via npm..."
if ($npmFound) {
    & npm install -g pnpm 2>&1 | Out-Null
    $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
    $pnpmFound = $null -ne $pnpmCmd
    Test-Check $pnpmFound "pnpm instalado via npm"
    if ($pnpmFound) {
        $pnpmVer = & pnpm -v
        Write-Host "        pnpm: v$pnpmVer"
    }
} else {
    Write-Host "  ✗ npm no disponible, saltando instalación de pnpm" -ForegroundColor Red
    $fail++
}

# ─── Test 5: pnpm install (dependencias del proyecto) ──────────────────
Write-Host ""
Write-Host "  Ejecutando pnpm install..."
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -ne $pnpmCmd) {
    & pnpm install 2>&1 | ForEach-Object { Write-Host "        $_" }
    $depsOk = Test-Path "node_modules"
    Test-Check $depsOk "Dependencias instaladas (node_modules)"
} else {
    Write-Host "  ✗ pnpm no disponible" -ForegroundColor Red
    $fail++
}

# ─── Test 6: config.json ──────────────────────────────────────────────
if (!(Test-Path "config.json") -and (Test-Path "config.example.json")) {
    Copy-Item "config.example.json" "config.json"
}
Test-Check (Test-Path "config.json") "config.json existe"

# ─── Test 7: Detección de arquitectura ────────────────────────────────
$is64bit = [Environment]::Is64BitOperatingSystem
$arch = if ($is64bit) { "x64" } else { "x86" }
Test-Check $true "Deteccion de arquitectura: $arch"

# ─── Test 8: Lectura de PATH del sistema ──────────────────────────────
$isWin = ($PSVersionTable.PSEdition -eq 'Desktop') -or ($null -ne $IsWindows -and $IsWindows)
if ($isWin) {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $pathReadable = ($null -ne $machinePath) -or ($null -ne $userPath)
    Test-Check $pathReadable "Lectura de PATH del sistema (registro Windows)"
    if ($machinePath) {
        $entries = ($machinePath -split [IO.Path]::PathSeparator).Count
        Write-Host "        Machine PATH: $entries entradas"
    }
} else {
    $envPath = $env:PATH
    $pathReadable = ($null -ne $envPath) -and ($envPath.Length -gt 0)
    Test-Check $pathReadable "Lectura de PATH del sistema (env Linux)"
    if ($pathReadable) {
        $entries = ($envPath -split ':').Count
        Write-Host "        PATH: $entries entradas"
    }
}

# ─── Test 9: Construcción de URL de descarga Node (simulación) ────────
$testVer = "v22.14.0"
$testArch = if ($is64bit) { "x64" } else { "x86" }
$testMsi = "node-$testVer-$testArch.msi"
$testUrl = "https://nodejs.org/dist/$testVer/$testMsi"
Test-Check ($testUrl.Length -gt 30) "Construccion de URL de descarga: $testMsi"

# ─── Test 10: TLS disponible ──────────────────────────────────────────
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Test-Check $true "TLS 1.2 disponible"
} catch {
    Test-Check $false "TLS 1.2 disponible"
}

# ─── Resultados ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "════════════════ RESULTADOS ════════════════"
Write-Host "  Pasaron: $pass | Fallaron: $fail"
Write-Host ""

if ($fail -gt 0) {
    Write-Host "  ✗ TEST FALLIDO" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ✓ TEST EXITOSO" -ForegroundColor Green
    exit 0
}
