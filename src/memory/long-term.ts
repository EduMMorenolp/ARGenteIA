import { getDb } from './db.ts';

export interface Fact {
  id: number;
  userId: string;
  fact: string;
  created_at: string;
}

/**
 * Guarda un dato relevante sobre el usuario.
 */
export function saveFact(userId: string, fact: string): void {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO user_facts (userId, fact) VALUES (?, ?)');
  stmt.run(userId, fact);
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
