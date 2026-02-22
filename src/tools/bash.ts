import { spawn, execFileSync } from "node:child_process";
import chalk from "chalk";
import type { Config } from "../config/index.ts";
import { registerTool } from "./index.ts";

/** Detecta el ejecutable de PowerShell disponible (en PATH o ruta fija) */
function detectPowerShell(override?: string): string {
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

let _psExe: string | null = null;

export function registerBash(config: Config): void {
  const isWindows = config.tools.bash.os === "windows";

  // Detectar PS una sola vez al registrar
  if (isWindows && !_psExe) {
    _psExe = detectPowerShell(config.tools.bash.psExe);
    console.log(chalk.dim(`   [bash] PowerShell detectado: ${_psExe}`));
  }

  registerTool({
    isEnabled: () => config.tools.bash.enabled,
    spec: {
      type: "function",
      function: {
        name: "bash",
        description: isWindows
          ? `Ejecuta comandos en PowerShell (Windows). Soporta pipes y comandos completos.\nComandos permitidos: ${config.tools.bash.allowlist.join(", ")}.\nIMPORTANTE: En Windows, usa comillas dobles para rutas con espacios o caracteres especiales (ej: "ruta\\archivo (1).txt"). NO uses escapes de barra invertida (\\) para paréntesis.\nEjemplos:\n- Listar descargas: \`Get-ChildItem "$HOME\\Downloads" | Sort-Object LastWriteTime -Descending | Select-Object -First 5\`\n- Explorar home: \`Get-ChildItem "$HOME"\`\n- Leer archivo: \`Get-Content "$HOME\\Documents\\plan.txt"\``
          : `Ejecuta comandos en bash (Linux/macOS). Soporta pipes.\nComandos permitidos: ${config.tools.bash.allowlist.join(", ")}.\nEjemplos:\n- Listar descargas: \`ls -lt ~/Downloads | head -5\`\n- Fecha: \`date\``,
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: isWindows
                ? "Comando completo de PowerShell. Usa comillas para rutas: \"$HOME\\Downloads\\file (1).txt\""
                : "Comando completo de bash.",
            },
          },
          required: ["command"],
        },
      },
    },
    handler: async (rawArgs, _context) => {
      const command = String(rawArgs["command"] ?? "").trim();

      // Verificar allowlist (primer token antes de espacio o pipe)
      const baseCmd = command.split(/[\s|]+/)[0];
      const allowed = config.tools.bash.allowlist.map((c) => c.toLowerCase());

      // Aliases PowerShell → nombres cortos para la allowlist
      const psAliases: Record<string, string> = {
        "get-childitem": "ls", "dir": "ls", "get-content": "cat",
        "get-location": "pwd", "get-date": "date", "select-string": "grep",
        "write-output": "echo", "get-process": "ps",
      };

      const normalizedBase = (psAliases[baseCmd.toLowerCase()] ?? baseCmd).toLowerCase();
      if (!allowed.includes(normalizedBase) && !allowed.includes(baseCmd.toLowerCase())) {
        return `Error: el comando "${baseCmd}" no está permitido. Comandos permitidos: ${config.tools.bash.allowlist.join(", ")}`;
      }

      return new Promise((resolve) => {
        let proc: ReturnType<typeof spawn>;

        if (isWindows) {
          const exe = _psExe ?? "powershell";
          // Forzar UTF-8 en la entrada/salida de la sesión de PS
          const utf8Cmd = `$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;
          proc = spawn(exe, ["-NoProfile", "-NonInteractive", "-Command", utf8Cmd], {
            windowsHide: true,
            env: { ...process.env, LANG: "es_ES.UTF-8" },
          });
        } else {
          proc = spawn("/bin/bash", ["-c", command], {
            env: { ...process.env },
          });
        }

        let stdout = "";
        let stderr = "";

        proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString("utf8"); });
        proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString("utf8"); });

        const timer = setTimeout(() => {
          proc.kill();
          resolve("Error: timeout — el comando tardó demasiado.");
        }, 15000);

        proc.on("close", (code) => {
          clearTimeout(timer);
          const output = (stdout + stderr).trim();
          console.log(chalk.dim(`   [bash] exit=${code}, output="${output.slice(0, 120)}"`));
          if (!output) resolve(`(comando ejecutado sin salida, código ${code})`);
          else if (output.length > 3000) resolve(output.slice(0, 3000) + "\n[... salida truncada]");
          else resolve(output);
        });

        proc.on("error", (err) => {
          clearTimeout(timer);
          console.log(chalk.red(`   [bash] spawn error: ${err.message}`));
          resolve(`Error al ejecutar: ${err.message}`);
        });
      });
    },
  });
}
