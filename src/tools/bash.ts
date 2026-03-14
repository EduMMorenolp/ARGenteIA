import { spawn, execFileSync } from 'node:child_process';
import chalk from 'chalk';
import type { Config } from '../config/index.ts';
import { registerTool } from './index.ts';

/** Detecta el ejecutable de PowerShell disponible (en PATH o ruta fija) */
function detectPowerShell(override?: string): string {
  if (override) return override;

  // Rutas comunes en Windows
  const candidates = [
    'pwsh', // PowerShell 7 (en PATH)
    'powershell', // PS 5 (en PATH)
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe', // PS 7 instalado
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', // PS 5 clásico
  ];

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['-NoProfile', '-Command', 'exit 0'], {
        timeout: 3000,
        windowsHide: true,
        stdio: 'ignore',
      });
      return candidate;
    } catch {
      // seguir intentando
    }
  }

  // fallback: intentar con nombre simple y dejar que el SO lo resuelva
  return 'powershell';
}

let _psExe: string | null = null;

export function registerBash(config: Config): void {
  // Solo la detectamos en load, pero la comprobación final se hace en la llamada real
  if ((config.tools.bash.os === 'windows' || process.platform === 'win32') && !_psExe) {
    _psExe = detectPowerShell(config.tools.bash.psExe);
    console.log(chalk.dim(`   [bash] PowerShell detectado: ${_psExe}`));
  }

  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'bash',
        description: (config.tools.bash.os === 'windows' || process.platform === 'win32')
          ? `Ejecuta comandos en PowerShell (Windows). Comandos: ${config.tools.bash.allowlist.join(', ')}. Usa comillas dobles para rutas con espacios ("ruta\\archivo.txt").`
          : `Ejecuta comandos en bash (Linux/macOS). Comandos: ${config.tools.bash.allowlist.join(', ')}.`,
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Comando a ejecutar.',
            },
          },
          required: ['command'],
        },
      },
    },
    handler: async (rawArgs, _context) => {
      const command = String(rawArgs['command'] ?? '').trim();

      // Verificar allowlist (primer token antes de espacio o pipe)
      const baseCmd = command.split(/[\s|]+/)[0];
      const allowed = config.tools.bash.allowlist.map((c) => c.toLowerCase());

      // Aliases PowerShell → nombres cortos para la allowlist
      const psAliases: Record<string, string> = {
        'get-childitem': 'ls',
        dir: 'ls',
        'get-content': 'cat',
        'get-location': 'pwd',
        'get-date': 'date',
        'select-string': 'grep',
        'write-output': 'echo',
        'get-process': 'ps',
        ni: 'new-item',
        'new-item': 'new-item',
      };

      const normalizedBase = (psAliases[baseCmd.toLowerCase()] ?? baseCmd).toLowerCase();
      if (allowed.length > 0 && !allowed.includes(normalizedBase) && !allowed.includes(baseCmd.toLowerCase())) {
        console.warn(chalk.yellow(`   [bash] Warning: Comando "${baseCmd}" no está en el allowlist, ejecutando con full permisos ("sino full permisos").`));
        // Bypass return de error para cumplir la petición del usuario de dar full permisos
      }

      return new Promise((resolve) => {
        let proc: ReturnType<typeof spawn>;
        const isWindowsNow = config.tools.bash.os === 'windows' || process.platform === 'win32' || process.env.OS === 'Windows_NT';

        if (isWindowsNow) {
          const exe = _psExe ?? detectPowerShell(config.tools.bash.psExe) ?? 'powershell';
          // Forzar UTF-8 en la entrada/salida de la sesión de PS
          const utf8Cmd = `$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;
          proc = spawn(exe, ['-NoProfile', '-NonInteractive', '-Command', utf8Cmd], {
            windowsHide: true,
            env: { ...process.env, LANG: 'es_ES.UTF-8' },
          });
        } else {
          proc = spawn('/bin/bash', ['-c', command], {
            env: { ...process.env },
          });
        }

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (d: Buffer) => {
          stdout += d.toString('utf8');
        });
        proc.stderr?.on('data', (d: Buffer) => {
          stderr += d.toString('utf8');
        });

        const timer = setTimeout(() => {
          proc.kill();
          resolve('Error: timeout — el comando tardó demasiado.');
        }, 15000);

        proc.on('close', (code) => {
          clearTimeout(timer);
          const output = (stdout + stderr).trim();
          console.log(chalk.dim(`   [bash] exit=${code}, output="${output.slice(0, 120)}"`));
          if (!output) resolve(`(comando ejecutado sin salida, código ${code})`);
          else if (output.length > 3000) resolve(output.slice(0, 3000) + '\n[... salida truncada]');
          else resolve(output);
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          console.log(chalk.red(`   [bash] spawn error: ${err.message}`));
          resolve(`Error al ejecutar: ${err.message}`);
        });
      });
    },
  });
}
