import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache en memoria para evitar I/O repetido
const cache = new Map<string, string>();

/**
 * Carga un prompt desde un archivo .md en la carpeta promptsSystem/.
 * Reemplaza placeholders {{variable}} con los valores proporcionados.
 *
 * @param name - Nombre del archivo sin extensión (ej: 'base', 'onboarding')
 * @param vars - Mapa de variables para reemplazar en el template
 * @returns El contenido del prompt con las variables reemplazadas
 */
export function loadPrompt(name: string, vars?: Record<string, string>): string {
  let content = cache.get(name);

  if (!content) {
    const filePath = resolve(__dirname, `${name}.md`);
    try {
      content = readFileSync(filePath, 'utf-8').trim();
      cache.set(name, content);
    } catch {
      console.error(`⚠️ Prompt no encontrado: ${filePath}`);
      return '';
    }
  }

  if (vars) {
    let result = content;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
  }

  return content;
}

/**
 * Limpia la cache de prompts (útil si se editan en runtime).
 */
export function clearPromptCache(): void {
  cache.clear();
}
