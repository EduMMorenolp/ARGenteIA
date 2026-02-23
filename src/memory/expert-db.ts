import { getDb } from "./db.ts";

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
  const stmt = db.prepare("SELECT * FROM sub_agents WHERE name = ?");
  const row = stmt.get(name) as any;
  if (!row) return null;

  return {
    ...row,
    tools: JSON.parse(row.tools || "[]"),
    experts: JSON.parse(row.experts || "[]")
  };
}

/**
 * Crea o actualiza un experto.
 */
export function upsertExpert(agent: SubAgent): void {
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
    agent.temperature ?? 0.7
  );
}

/**
 * Lista todos los expertos disponibles.
 */
export function listExperts(): SubAgent[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM sub_agents WHERE name != '__general__' ORDER BY name ASC").all() as any[];
  return rows.map(row => ({
    ...row,
    tools: JSON.parse(row.tools || "[]"),
    experts: JSON.parse(row.experts || "[]")
  }));
}

/**
 * Elimina un experto.
 */
export function deleteExpert(name: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM sub_agents WHERE name = ?");
  stmt.run(name);
}
