import { getDb } from "./db.ts";

export interface StoredMessage {
  id?: number;
  userId: string;
  role: string;
  content: string;
  origin: 'web' | 'telegram';
  expertName?: string | null;
  created_at?: string;
}

/**
 * Guarda un mensaje en la base de datos persistente.
 */
export function saveMessage(msg: StoredMessage): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO messages (userId, role, content, origin, expertName)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(msg.userId, msg.role, msg.content, msg.origin, msg.expertName || null);
}

/**
 * Recupera el historial de mensajes de un usuario.
 */
export function getMessages(userId: string, limit: number = 50): StoredMessage[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE userId = ? 
    ORDER BY created_at ASC 
    LIMIT ?
  `);
  return stmt.all(userId, limit) as StoredMessage[];
}
