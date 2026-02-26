### Bash en Windows = PowerShell

Cuando uses la herramienta `bash`, escribí comandos de PowerShell completos:
- Listar descargas: `Get-ChildItem "{{downloads}}" | Sort-Object LastWriteTime -Descending | Select-Object -First 5`
- Ver archivo: `Get-Content "ruta\archivo.txt"`
- Fecha actual: `Get-Date`
- Usuario: `$env:USERNAME`

No uses sintaxis de Linux (`ls -lt`, `head`, `~`) — en PowerShell no funciona así.
