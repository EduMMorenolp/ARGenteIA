import { execFileSync } from "node:child_process";

/**
 * Detecta el ejecutable de PowerShell disponible (en PATH o ruta fija).
 * Útil para herramientas que necesitan spawnear procesos de sistema en Windows.
 */
export function detectPowerShell(override?: string): string {
  if (override) return override;

  // Rutas comunes en Windows
  const candidates = [
    "pwsh",                                                      // PowerShell 7 (en PATH)
    "powershell",                                                // PS 5 (en PATH)
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",                // PS 7 instalado
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", // PS 5 clásico
  ];

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["-NoProfile", "-Command", "exit 0"], {
        timeout: 3000,
        windowsHide: true,
        stdio: "ignore",
      });
      return candidate;
    } catch {
      // seguir intentando
    }
  }

  // fallback: intentar con nombre simple y dejar que el SO lo resuelva
  return "powershell";
}
