# ─── ARGenteIA Server Manager ──────────────────────────────────────────
# GUI nativa con Windows Forms para instalar/iniciar/detener el servidor

try {

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverProcess = $null

# ─── Colores ───────────────────────────────────────────────────────────

$colBg        = [System.Drawing.Color]::FromArgb(13, 13, 20)
$colSurface   = [System.Drawing.Color]::FromArgb(22, 22, 32)
$colSurface2  = [System.Drawing.Color]::FromArgb(30, 30, 44)
$colAccent    = [System.Drawing.Color]::FromArgb(79, 140, 255)
$colGreen     = [System.Drawing.Color]::FromArgb(16, 185, 129)
$colRed       = [System.Drawing.Color]::FromArgb(239, 68, 68)
$colYellow    = [System.Drawing.Color]::FromArgb(250, 204, 21)
$colPurple    = [System.Drawing.Color]::FromArgb(168, 85, 247)
$colTextMain  = [System.Drawing.Color]::FromArgb(230, 230, 240)
$colTextMuted = [System.Drawing.Color]::FromArgb(120, 120, 150)
$colTextDim   = [System.Drawing.Color]::FromArgb(80, 80, 110)
$colLogBg     = [System.Drawing.Color]::FromArgb(8, 8, 14)
$colLogText   = [System.Drawing.Color]::FromArgb(160, 210, 160)

# ─── Ventana principal ─────────────────────────────────────────────────

$form = New-Object System.Windows.Forms.Form
$form.Text = "ARGenteIA - Server Manager"
$form.Size = New-Object System.Drawing.Size(660, 600)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = $colBg
$form.ForeColor = $colTextMain
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.TopMost = $true

# ─── Header ────────────────────────────────────────────────────────────

$pnlHeader = New-Object System.Windows.Forms.Panel
$pnlHeader.Dock = "Top"
$pnlHeader.Height = 70
$pnlHeader.BackColor = $colSurface
$form.Controls.Add($pnlHeader)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "ARGenteIA"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = $colAccent
$lblTitle.AutoSize = $true
$lblTitle.Location = New-Object System.Drawing.Point(24, 8)
$pnlHeader.Controls.Add($lblTitle)

$lblSubtitle = New-Object System.Windows.Forms.Label
$lblSubtitle.Text = "Server Manager v1.8.0"
$lblSubtitle.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblSubtitle.ForeColor = $colTextMuted
$lblSubtitle.AutoSize = $true
$lblSubtitle.Location = New-Object System.Drawing.Point(26, 45)
$pnlHeader.Controls.Add($lblSubtitle)

# ─── Status bar ────────────────────────────────────────────────────────

$pnlStatus = New-Object System.Windows.Forms.Panel
$pnlStatus.Size = New-Object System.Drawing.Size(612, 48)
$pnlStatus.Location = New-Object System.Drawing.Point(20, 82)
$pnlStatus.BackColor = $colSurface
$form.Controls.Add($pnlStatus)

$lblDot = New-Object System.Windows.Forms.Label
$lblDot.Text = [char]0x25CF
$lblDot.Font = New-Object System.Drawing.Font("Segoe UI", 16)
$lblDot.ForeColor = $colRed
$lblDot.Size = New-Object System.Drawing.Size(30, 30)
$lblDot.Location = New-Object System.Drawing.Point(14, 9)
$pnlStatus.Controls.Add($lblDot)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Servidor Detenido"
$lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$lblStatus.ForeColor = $colRed
$lblStatus.AutoSize = $true
$lblStatus.Location = New-Object System.Drawing.Point(42, 13)
$pnlStatus.Controls.Add($lblStatus)

$lblPort = New-Object System.Windows.Forms.Label
$lblPort.Text = ""
$lblPort.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblPort.ForeColor = $colTextMuted
$lblPort.AutoSize = $true
$lblPort.Location = New-Object System.Drawing.Point(430, 16)
$pnlStatus.Controls.Add($lblPort)

# ─── Botones principales ──────────────────────────────────────────────

$y = 145

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Iniciar Servidor"
$btnStart.Size = New-Object System.Drawing.Size(196, 48)
$btnStart.Location = New-Object System.Drawing.Point(20, $y)
$btnStart.FlatStyle = "Flat"
$btnStart.BackColor = $colGreen
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStart.FlatAppearance.BorderSize = 0
$btnStart.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "Detener"
$btnStop.Size = New-Object System.Drawing.Size(196, 48)
$btnStop.Location = New-Object System.Drawing.Point(228, $y)
$btnStop.FlatStyle = "Flat"
$btnStop.BackColor = $colRed
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStop.FlatAppearance.BorderSize = 0
$btnStop.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnStop.Enabled = $false
$form.Controls.Add($btnStop)

$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "Instalar / Actualizar"
$btnInstall.Size = New-Object System.Drawing.Size(196, 48)
$btnInstall.Location = New-Object System.Drawing.Point(436, $y)
$btnInstall.FlatStyle = "Flat"
$btnInstall.BackColor = $colPurple
$btnInstall.ForeColor = [System.Drawing.Color]::White
$btnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnInstall.FlatAppearance.BorderSize = 0
$btnInstall.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnInstall)

# ─── Botones secundarios ──────────────────────────────────────────────

$y2 = 205

$btnBrowser = New-Object System.Windows.Forms.Button
$btnBrowser.Text = "Abrir en Navegador"
$btnBrowser.Size = New-Object System.Drawing.Size(196, 38)
$btnBrowser.Location = New-Object System.Drawing.Point(20, $y2)
$btnBrowser.FlatStyle = "Flat"
$btnBrowser.BackColor = $colSurface2
$btnBrowser.ForeColor = $colAccent
$btnBrowser.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnBrowser.FlatAppearance.BorderColor = $colAccent
$btnBrowser.FlatAppearance.BorderSize = 1
$btnBrowser.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnBrowser.Enabled = $false
$form.Controls.Add($btnBrowser)

$btnConfig = New-Object System.Windows.Forms.Button
$btnConfig.Text = "Editar config.json"
$btnConfig.Size = New-Object System.Drawing.Size(196, 38)
$btnConfig.Location = New-Object System.Drawing.Point(228, $y2)
$btnConfig.FlatStyle = "Flat"
$btnConfig.BackColor = $colSurface2
$btnConfig.ForeColor = $colTextMuted
$btnConfig.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnConfig.FlatAppearance.BorderColor = $colTextDim
$btnConfig.FlatAppearance.BorderSize = 1
$btnConfig.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnConfig)

$btnFolder = New-Object System.Windows.Forms.Button
$btnFolder.Text = "Abrir Carpeta"
$btnFolder.Size = New-Object System.Drawing.Size(196, 38)
$btnFolder.Location = New-Object System.Drawing.Point(436, $y2)
$btnFolder.FlatStyle = "Flat"
$btnFolder.BackColor = $colSurface2
$btnFolder.ForeColor = $colTextMuted
$btnFolder.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnFolder.FlatAppearance.BorderColor = $colTextDim
$btnFolder.FlatAppearance.BorderSize = 1
$btnFolder.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnFolder)

# ─── Separador ─────────────────────────────────────────────────────────

$sep = New-Object System.Windows.Forms.Label
$sep.Size = New-Object System.Drawing.Size(612, 1)
$sep.Location = New-Object System.Drawing.Point(20, 255)
$sep.BackColor = $colSurface2
$form.Controls.Add($sep)

# ─── Log area ──────────────────────────────────────────────────────────

$lblLog = New-Object System.Windows.Forms.Label
$lblLog.Text = "Log del Servidor"
$lblLog.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$lblLog.ForeColor = $colTextMuted
$lblLog.AutoSize = $true
$lblLog.Location = New-Object System.Drawing.Point(20, 265)
$form.Controls.Add($lblLog)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.Size = New-Object System.Drawing.Size(612, 270)
$txtLog.Location = New-Object System.Drawing.Point(20, 288)
$txtLog.BackColor = $colLogBg
$txtLog.ForeColor = $colLogText
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$txtLog.BorderStyle = "FixedSingle"
$form.Controls.Add($txtLog)

# ─── Timer ─────────────────────────────────────────────────────────────

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500

# ─── Funciones ─────────────────────────────────────────────────────────

function Write-Log($msg) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $txtLog.AppendText("[$timestamp] $msg`r`n")
}

function Set-ServerRunning {
    $lblDot.ForeColor = $colGreen
    $lblStatus.Text = "Servidor Activo"
    $lblStatus.ForeColor = $colGreen
    $lblPort.Text = "Puerto: 19666"
    $btnStart.Enabled = $false
    $btnStop.Enabled = $true
    $btnBrowser.Enabled = $true
    $btnInstall.Enabled = $false
}

function Set-ServerStopped {
    $lblDot.ForeColor = $colRed
    $lblStatus.Text = "Servidor Detenido"
    $lblStatus.ForeColor = $colRed
    $lblPort.Text = ""
    $btnStart.Enabled = $true
    $btnStop.Enabled = $false
    $btnBrowser.Enabled = $false
    $btnInstall.Enabled = $true
}

function Stop-Server {
    if ($script:serverProcess -and !$script:serverProcess.HasExited) {
        try {
            $script:serverProcess.Kill($true)
            $script:serverProcess.WaitForExit(3000)
        } catch {}
        Write-Log "Servidor detenido."
    }
    $script:serverProcess = $null
    $timer.Stop()
    Set-ServerStopped
}

# ─── Eventos ───────────────────────────────────────────────────────────

$btnStart.Add_Click({
    Write-Log "Iniciando servidor..."

    $distIndex = Join-Path $scriptDir "dist\index.js"
    if (-not (Test-Path $distIndex)) {
        Write-Log "ERROR: dist/index.js no encontrado."
        Write-Log "Usa el boton 'Instalar / Actualizar' primero."
        return
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.Arguments = "dist/index.js"
    $psi.WorkingDirectory = $scriptDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $psi.EnvironmentVariables["NODE_ENV"] = "production"

    try {
        $script:serverProcess = [System.Diagnostics.Process]::Start($psi)
        Set-ServerRunning
        Write-Log "Servidor iniciado (PID: $($script:serverProcess.Id))"
        $timer.Start()
    } catch {
        Write-Log "ERROR al iniciar: $_"
    }
})

$btnStop.Add_Click({
    Stop-Server
})

$btnInstall.Add_Click({
    $batPath = Join-Path $scriptDir "instalar.bat"
    if (-not (Test-Path $batPath)) {
        Write-Log "ERROR: instalar.bat no encontrado en la carpeta del proyecto."
        return
    }

    Write-Log "Ejecutando instalador..."
    Write-Log "Se abrira una ventana de instalacion."

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c `"$batPath`""
    $psi.WorkingDirectory = $scriptDir
    $psi.UseShellExecute = $true
    $psi.CreateNoWindow = $false

    try {
        $proc = [System.Diagnostics.Process]::Start($psi)
        Write-Log "Instalador iniciado. Espera a que termine."
    } catch {
        Write-Log "ERROR al ejecutar instalador: $_"
    }
})

$btnBrowser.Add_Click({
    Start-Process "http://localhost:19666"
})

$btnConfig.Add_Click({
    $configPath = Join-Path $scriptDir "config.json"
    if (Test-Path $configPath) {
        Start-Process "notepad.exe" -ArgumentList $configPath
    } else {
        Write-Log "config.json no encontrado. Usa 'Instalar / Actualizar' primero."
    }
})

$btnFolder.Add_Click({
    Start-Process "explorer.exe" -ArgumentList $scriptDir
})

$timer.Add_Tick({
    if ($script:serverProcess -eq $null -or $script:serverProcess.HasExited) {
        $timer.Stop()
        if ($script:serverProcess -ne $null) {
            Write-Log "El servidor se detuvo inesperadamente."
        }
        $script:serverProcess = $null
        Set-ServerStopped
        return
    }

    try {
        while ($script:serverProcess.StandardOutput.Peek() -ge 0) {
            $line = $script:serverProcess.StandardOutput.ReadLine()
            if ($line) { Write-Log $line }
        }
    } catch {}

    try {
        while ($script:serverProcess.StandardError.Peek() -ge 0) {
            $line = $script:serverProcess.StandardError.ReadLine()
            if ($line) { Write-Log "[ERR] $line" }
        }
    } catch {}
})

$form.Add_FormClosing({
    Stop-Server
})

# ─── Mensaje inicial ──────────────────────────────────────────────────

$distExists = Test-Path (Join-Path $scriptDir "dist\index.js")
Write-Log "ARGenteIA Server Manager listo."
if ($distExists) {
    Write-Log "Proyecto compilado. Podes iniciar el servidor."
} else {
    Write-Log "Proyecto no compilado. Usa 'Instalar / Actualizar' primero."
}

# ─── Mostrar ventana ──────────────────────────────────────────────────

$form.Add_Shown({ $form.TopMost = $false })
[void]$form.ShowDialog()

} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "Error al iniciar ARGenteIA Server Manager:`n`n$($_.Exception.Message)`n`nLinea: $($_.InvocationInfo.ScriptLineNumber)",
        "ARGenteIA - Error",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
}
