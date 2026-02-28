import { getDb } from './db.ts';

type DbRow = Record<string, unknown>;

export interface SubAgent {
  name: string;
  model: string;
  system_prompt: string;
  tools: string[]; // Se guarda como JSON en DB
  experts: string[]; // Se guarda como JSON en DB
  temperature: number;
  created_at?: string;
}

/**
 * Obtiene un experto por su nombre.
 */
export function getExpert(name: string): SubAgent | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM sub_agents WHERE name = ?');
  const row = stmt.get(name) as
    | {
        name: string;
        model: string;
        system_prompt: string;
        tools: string;
        experts: string;
        temperature: number;
        created_at?: string;
      }
    | undefined;
  if (!row) return null;

  return {
    ...row,
    tools: JSON.parse(row.tools || '[]') as string[],
    experts: JSON.parse(row.experts || '[]') as string[],
  };
}

/**
 * Crea o actualiza un experto.
 */
export function upsertExpert(agent: SubAgent): void {
  if (!agent.name || agent.name.trim() === '') {
    throw new Error('El nombre del experto no puede estar vacío.');
  }
  if (agent.name === '__general__') {
    // El asistente general se puede actualizar pero no debería crearse de forma genérica aquí
    // si el propósito de upsertExpert es solo para expertos.
    // Sin embargo, server.ts lo usa para __general__ también.
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sub_agents (name, model, system_prompt, tools, experts, temperature)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      model = excluded.model,
      system_prompt = excluded.system_prompt,
      tools = excluded.tools,
      experts = excluded.experts,
      temperature = excluded.temperature
  `);
  stmt.run(
    agent.name,
    agent.model,
    agent.system_prompt,
    JSON.stringify(agent.tools || []),
    JSON.stringify(agent.experts || []),
    agent.temperature ?? 0.7,
  );
}

/**
 * Lista todos los expertos disponibles.
 */
export function listExperts(): SubAgent[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM sub_agents WHERE name != '__general__' ORDER BY name ASC")
    .all() as Array<{
    name: string;
    model: string;
    system_prompt: string;
    tools: string;
    experts: string;
    temperature: number;
    created_at?: string;
  }>;
  return rows.map((row) => ({
    ...row,
    tools: JSON.parse(row.tools || '[]') as string[],
    experts: JSON.parse(row.experts || '[]') as string[],
  }));
}

/**
 * Elimina un experto.
 */
export function deleteExpert(name: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM sub_agents WHERE name = ?');
  stmt.run(name);
}
