import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { getTools } from '../tools/index.ts';

const SKILLS_DIR = resolve(process.cwd(), 'skills');

/**
 * Mapeo entre nombre de archivo de skill y los nombres de tools que cubre.
 * Si el archivo no está en este mapa, se carga siempre (ej: AGENTS.md).
 */
const SKILL_TOOL_MAP: Record<string, string[]> = {
  'memory.md': ['memorize_fact', 'recall_facts', 'forget_fact'],
  'bash.md': ['bash'],
  'files.md': ['read_file', 'write_file', 'send_file_telegram'],
  'scheduler.md': ['schedule_task', 'list_scheduled_tasks', 'delete_scheduled_task'],
  'web-search.md': ['web_search', 'read_url'],
  'screenshot.md': ['capture_pc_screenshot'],
};

export async function loadSkills(): Promise<string[]> {
  if (!existsSync(SKILLS_DIR)) return [];

  let files: string[];
  try {
    files = await readdir(SKILLS_DIR);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith('.md')).sort();

  // Obtener nombres de tools habilitadas
  const enabledTools = getTools().map((t) => t.function.name);

  const skills: string[] = [];
  for (const file of mdFiles) {
    const fileName = basename(file);
    const requiredTools = SKILL_TOOL_MAP[fileName];

    // Si el archivo tiene tools mapeadas, solo cargarlo si al menos una está habilitada
    if (requiredTools && !requiredTools.some((t) => enabledTools.includes(t))) {
      continue; // Saltar — ninguna de sus tools está habilitada
    }

    const content = await readFile(join(SKILLS_DIR, file), 'utf-8');
    if (content.trim()) skills.push(content.trim());
  }

  return skills;
}
