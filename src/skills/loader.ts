import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const SKILLS_DIR = resolve(process.cwd(), 'skills');

export async function loadSkills(): Promise<string[]> {
  if (!existsSync(SKILLS_DIR)) return [];

  let files: string[];
  try {
    files = await readdir(SKILLS_DIR);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith('.md')).sort();

  const skills: string[] = [];
  for (const file of mdFiles) {
    const content = await readFile(join(SKILLS_DIR, file), 'utf-8');
    if (content.trim()) skills.push(content.trim());
  }

  return skills;
}
