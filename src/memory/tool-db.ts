import { getDb } from './db.ts';

export interface ToolRecord {
  name: string;
  description: string;
  parameters: string; // JSON string
  is_dynamic: number; // 0 or 1
  script: string | null;
  enabled: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export function listDbTools(): ToolRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tools ORDER BY name ASC').all() as ToolRecord[];
}

export function getDbTool(name: string): ToolRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tools WHERE name = ?').get(name) as ToolRecord | undefined;
  return row || null;
}

export function upsertDbTool(tool: Omit<ToolRecord, 'created_at' | 'updated_at'>): void {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getDbTool(tool.name);

  if (existing) {
    db.prepare(`
      UPDATE tools 
      SET description = ?, parameters = ?, is_dynamic = ?, script = ?, enabled = ?, updated_at = ?
      WHERE name = ?
    `).run(
      tool.description,
      tool.parameters,
      tool.is_dynamic,
      tool.script || null,
      tool.enabled,
      now,
      tool.name
    );
  } else {
    db.prepare(`
      INSERT INTO tools (name, description, parameters, is_dynamic, script, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tool.name,
      tool.description,
      tool.parameters,
      tool.is_dynamic,
      tool.script || null,
      tool.enabled,
      now,
      now
    );
  }
}

export function toggleDbTool(name: string, enabled: boolean): void {
  const db = getDb();
  db.prepare('UPDATE tools SET enabled = ?, updated_at = ? WHERE name = ?').run(
    enabled ? 1 : 0,
    new Date().toISOString(),
    name
  );
}

export function deleteDbTool(name: string): void {
  getDb().prepare('DELETE FROM tools WHERE name = ?').run(name);
}
