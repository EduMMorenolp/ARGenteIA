# ─── ARGenteIA Server Manager ──────────────────────────────────────────
# GUI nativa con Windows Forms para iniciar/detener el servidor

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverProcess = $null

# ─── Crear la ventana principal ────────────────────────────────────────

$form = New-Object System.Windows.Forms.Form
$form.Text = "ARGenteIA — Server Manager"
$form.Size = New-Object System.Drawing.Size(620, 520)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(18, 18, 24)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

# ─── Header ────────────────────────────────────────────────────────────

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "🤖 ARGenteIA Server"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::FromArgb(79, 140, 255)
$lblTitle.AutoSize = $true
$lblTitle.Location = New-Object System.Drawing.Point(20, 15)
$form.Controls.Add($lblTitle)

$lblVersion = New-Object System.Windows.Forms.Label
$lblVersion.Text = "v1.8.0"
$lblVersion.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblVersion.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 140)
$lblVersion.AutoSize = $true
$lblVersion.Location = New-Object System.Drawing.Point(20, 50)
$form.Controls.Add($lblVersion)

# ─── Status Panel ──────────────────────────────────────────────────────

$pnlStatus = New-Object System.Windows.Forms.Panel
$pnlStatus.Size = New-Object System.Drawing.Size(570, 50)
$pnlStatus.Location = New-Object System.Drawing.Point(20, 75)
$pnlStatus.BackColor = [System.Drawing.Color]::FromArgb(25, 25, 35)
$form.Controls.Add($pnlStatus)

$lblStatusIcon = New-Object System.Windows.Forms.Label
$lblStatusIcon.Text = "⬤"
$lblStatusIcon.Font = New-Object System.Drawing.Font("Segoe UI", 14)
$lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$lblStatusIcon.AutoSize = $true
$lblStatusIcon.Location = New-Object System.Drawing.Point(15, 12)
$pnlStatus.Controls.Add($lblStatusIcon)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Servidor Detenido"
$lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$lblStatus.AutoSize = $true
$lblStatus.Location = New-Object System.Drawing.Point(45, 14)
$pnlStatus.Controls.Add($lblStatus)

$lblPort = New-Object System.Windows.Forms.Label
$lblPort.Text = ""
$lblPort.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblPort.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 140)
$lblPort.AutoSize = $true
$lblPort.Location = New-Object System.Drawing.Point(350, 16)
$pnlStatus.Controls.Add($lblPort)

# ─── Botones ───────────────────────────────────────────────────────────

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "▶  Iniciar Servidor"
$btnStart.Size = New-Object System.Drawing.Size(275, 45)
$btnStart.Location = New-Object System.Drawing.Point(20, 140)
$btnStart.FlatStyle = "Flat"
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStart.FlatAppearance.BorderSize = 0
$btnStart.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "■  Detener Servidor"
$btnStop.Size = New-Object System.Drawing.Size(275, 45)
$btnStop.Location = New-Object System.Drawing.Point(315, 140)
$btnStop.FlatStyle = "Flat"
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStop.FlatAppearance.BorderSize = 0
$btnStop.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnStop.Enabled = $false
$form.Controls.Add($btnStop)

$btnBrowser = New-Object System.Windows.Forms.Button
$btnBrowser.Text = "🌐  Abrir en Navegador"
$btnBrowser.Size = New-Object System.Drawing.Size(275, 35)
$btnBrowser.Location = New-Object System.Drawing.Point(20, 195)
$btnBrowser.FlatStyle = "Flat"
$btnBrowser.BackColor = [System.Drawing.Color]::FromArgb(35, 35, 50)
$btnBrowser.ForeColor = [System.Drawing.Color]::FromArgb(79, 140, 255)
$btnBrowser.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$btnBrowser.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(79, 140, 255)
$btnBrowser.FlatAppearance.BorderSize = 1
$btnBrowser.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnBrowser.Enabled = $false
$form.Controls.Add($btnBrowser)

$btnConfig = New-Object System.Windows.Forms.Button
$btnConfig.Text = "⚙  Editar config.json"
$btnConfig.Size = New-Object System.Drawing.Size(275, 35)
$btnConfig.Location = New-Object System.Drawing.Point(315, 195)
$btnConfig.FlatStyle = "Flat"
$btnConfig.BackColor = [System.Drawing.Color]::FromArgb(35, 35, 50)
$btnConfig.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 180)
$btnConfig.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$btnConfig.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(60, 60, 80)
$btnConfig.FlatAppearance.BorderSize = 1
$btnConfig.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnConfig)

# ─── Log area ──────────────────────────────────────────────────────────

$lblLog = New-Object System.Windows.Forms.Label
$lblLog.Text = "📋 Log del Servidor"
$lblLog.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$lblLog.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 180)
$lblLog.AutoSize = $true
$lblLog.Location = New-Object System.Drawing.Point(20, 245)
$form.Controls.Add($lblLog)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.Size = New-Object System.Drawing.Size(570, 210)
$txtLog.Location = New-Object System.Drawing.Point(20, 270)
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(12, 12, 18)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(180, 220, 180)
$txtLog.Font = New-Object System.Drawing.Font("Cascadia Code, Consolas", 9)
$txtLog.BorderStyle = "FixedSingle"
$form.Controls.Add($txtLog)

# ─── Timer para leer output ────────────────────────────────────────────

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500

# ─── Funciones ─────────────────────────────────────────────────────────

function Write-Log($msg) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $txtLog.AppendText("[$timestamp] $msg`r`n")
}

function Set-ServerRunning {
    $lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
    $lblStatus.Text = "Servidor Activo"
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
    $lblPort.Text = "Puerto: 19666"
    $btnStart.Enabled = $false
    $btnStop.Enabled = $true
    $btnBrowser.Enabled = $true
}

function Set-ServerStopped {
    $lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
    $lblStatus.Text = "Servidor Detenido"
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
    $lblPort.Text = ""
    $btnStart.Enabled = $true
    $btnStop.Enabled = $false
    $btnBrowser.Enabled = $false
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
        Write-Log "Ejecuta instalar.bat primero."
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

$btnBrowser.Add_Click({
    Start-Process "http://localhost:19666"
})

$btnConfig.Add_Click({
    $configPath = Join-Path $scriptDir "config.json"
    if (Test-Path $configPath) {
        Start-Process "notepad.exe" -ArgumentList $configPath
    } else {
        Write-Log "config.json no encontrado. Ejecuta instalar.bat primero."
    }
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

Write-Log "ARGenteIA Server Manager listo."
Write-Log "Presiona 'Iniciar Servidor' para comenzar."

# ─── Mostrar ventana ──────────────────────────────────────────────────

[void]$form.ShowDialog()
