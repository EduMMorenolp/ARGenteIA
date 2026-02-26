import { getDb } from './db.ts';
import { touchChat } from './chat-db.ts';

export interface StoredMessage {
  id?: number;
  userId: string;
  chatId?: string;
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
    INSERT INTO messages (userId, chatId, role, content, origin, expertName)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    msg.userId,
    msg.chatId || null,
    msg.role,
    msg.content,
    msg.origin,
    msg.expertName || null,
  );

  // Actualizar timestamp del chat
  if (msg.chatId) {
    touchChat(msg.chatId);
  }
}

/**
 * Recupera el historial de mensajes de un chat.
 */
export function getMessages(chatId: string, limit: number = 50): StoredMessage[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE chatId = ? 
    ORDER BY created_at ASC 
    LIMIT ?
  `);
  return stmt.all(chatId, limit) as StoredMessage[];
}

/**
 * Recupera mensajes por userId (fallback para migración).
 */
export function getMessagesByUser(userId: string, limit: number = 50): StoredMessage[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE userId = ? 
    ORDER BY created_at ASC 
    LIMIT ?
  `);
  return stmt.all(userId, limit) as StoredMessage[];
}
