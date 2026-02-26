import { getDb } from './db.ts';
import { getConfig } from '../config/index.ts';

export interface ModelEntry {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  created_at?: string;
}

/**
 * Lista todos los modelos de la DB.
 */
export function listModels(): ModelEntry[] {
  const db = getDb();
  return db.prepare('SELECT * FROM models ORDER BY name ASC').all() as ModelEntry[];
}

/**
 * Obtiene un modelo por nombre.
 */
export function getModel(name: string): ModelEntry | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM models WHERE name = ?').get(name) as ModelEntry | undefined;
  return row ?? null;
}

/**
 * Crea o actualiza un modelo.
 */
export function upsertModel(model: ModelEntry): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO models (name, apiKey, baseUrl)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      apiKey = excluded.apiKey,
      baseUrl = excluded.baseUrl
  `);
  stmt.run(model.name, model.apiKey ?? null, model.baseUrl ?? null);
}

/**
 * Elimina un modelo por nombre.
 */
export function deleteModel(name: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM models WHERE name = ?').run(name);
  return result.changes > 0;
}

/**
 * Seed: copia los modelos de config.json a la DB solo si la tabla está vacía.
 */
export function seedModelsFromConfig(): void {
  const existing = listModels();
  if (existing.length > 0) return; // Ya hay modelos en la DB

  const config = getConfig();
  const configModels = config.models as Record<string, { apiKey?: string; baseUrl?: string }>;

  if (!configModels || Object.keys(configModels).length === 0) return;

  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO models (name, apiKey, baseUrl) VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction(
    (models: Array<{ name: string; apiKey?: string; baseUrl?: string }>) => {
      for (const m of models) {
        stmt.run(m.name, m.apiKey ?? null, m.baseUrl ?? null);
      }
    },
  );

  const modelEntries = Object.entries(configModels).map(([name, cfg]) => ({
    name,
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl,
  }));

  insertMany(modelEntries);
}
