import os from 'node:os';
import { getConfig } from '../config/index.ts';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Genera un bloque de contexto del sistema operativo inyectado automáticamente.
 * No requiere configuración manual — usa os.homedir(), os.userInfo(), etc.
 */
function buildSystemContext(): string {
  const config = getConfig();
  const bashCfg = config.tools.bash;

  if (!bashCfg.enabled) return '';

  const homeDir = os.homedir();
  const username = os.userInfo().username;
  const isWindows = bashCfg.os === 'windows';
  const platform = isWindows ? 'Windows' : 'Linux/macOS';
  const shell = isWindows ? 'PowerShell' : 'bash';

  // Rutas clave del sistema real
  const sep = isWindows ? '\\' : '/';
  const downloads = isWindows ? `${homeDir}${sep}Downloads` : `${homeDir}/Downloads`;
  const documents = isWindows ? `${homeDir}${sep}Documents` : `${homeDir}/Documents`;
  const desktop = isWindows ? `${homeDir}${sep}Desktop` : `${homeDir}/Desktop`;

  return `## Entorno del sistema

- **OS:** ${platform}
- **Shell:** ${shell}
- **Usuario:** ${username}
- **Home:** \`${homeDir}\`
- **Descargas:** \`${downloads}\`
- **Documentos:** \`${documents}\`
- **Escritorio:** \`${desktop}\`

${
  isWindows
    ? `### Bash en Windows = PowerShell

Cuando uses la herramienta \`bash\`, escribí comandos de PowerShell completos:
- Listar descargas: \`Get-ChildItem "${downloads}" | Sort-Object LastWriteTime -Descending | Select-Object -First 5\`
- Ver archivo: \`Get-Content "ruta\\archivo.txt"\`
- Fecha actual: \`Get-Date\`
- Usuario: \`$env:USERNAME\`

No uses sintaxis de Linux (\`ls -lt\`, \`head\`, \`~\`) — en PowerShell no funciona así.`
    : `### Bash en Linux/macOS

- Listar descargas: \`ls -lt "${downloads}" | head -5\`
- Ver archivo: \`cat /ruta/archivo.txt\`
- Fecha actual: \`date\``
}`;
}

/**
 * Construye el system prompt final combinando:
 * 1. El systemPrompt de config.json
 * 2. Contexto del sistema (OS, rutas, shell) — auto-detectado
 * 3. Las skills cargadas desde /skills/
 */
export async function buildSystemPrompt(skills: string[]): Promise<string> {
  const config = getConfig();
  const base = config.agent.systemPrompt;
  const sysCtx = buildSystemContext();

  const parts: string[] = [base];
  if (sysCtx) parts.push(sysCtx);
  if (skills.length > 0) parts.push(`# Skills adicionales\n\n${skills.join('\n\n---\n\n')}`);

  return parts.join('\n\n');
}

/**
 * Poda el historial dejando solo los últimos N mensajes
 * para no superar el límite de contexto del modelo.
 */
export function pruneHistory(
  messages: ChatCompletionMessageParam[],
  maxMessages: number,
): ChatCompletionMessageParam[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(messages.length - maxMessages);
}
