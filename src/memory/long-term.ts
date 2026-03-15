import { getDb } from './db.ts';

export interface Fact {
  id: number;
  userId: string;
  fact: string;
  embedding?: string; // stored as JSON
  created_at: string;
}

/**
 * Guarda un dato relevante sobre el usuario, incluyendo su representación vectorial.
 */
export async function saveFact(userId: string, fact: string): Promise<void> {
  const { generateEmbedding } = await import('../embeddings/provider.ts');
  const { logger } = await import('../utils/logger.ts');
  
  try {
    const embedding = await generateEmbedding(fact);
    const db = getDb();
    const stmt = db.prepare('INSERT INTO user_facts (userId, fact, embedding) VALUES (?, ?, ?)');
    stmt.run(userId, fact, JSON.stringify(embedding));
    
    logger.info(`✅ Hecho memorizado para ${userId}: "${fact}"`, { category: 'system' });
  } catch (err) {
    logger.error(`❌ Error al memorizar hecho para ${userId}:`, err);
    throw err;
  }
}

/**
 * Recupera todos los datos guardados sobre un usuario.
 */
export function getFacts(userId: string): Fact[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM user_facts WHERE userId = ? ORDER BY created_at DESC');
  return stmt.all(userId) as Fact[];
}

/**
 * Elimina un dato específico por ID.
 */
export function deleteFact(id: number, userId: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM user_facts WHERE id = ? AND userId = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}
