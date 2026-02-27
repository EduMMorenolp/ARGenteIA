import { getDb } from './db.ts';
import { randomUUID } from 'node:crypto';

export interface ChatEntry {
  id: string;
  userId: string;
  title: string;
  origin: string; // 'web' | 'telegram'
  expertName: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
  lastMessage?: string;
}

/**
 * Crea un nuevo chat para un usuario.
 */
export function createChat(
  userId: string,
  expertName?: string | null,
  title?: string,
  origin: string = 'web',
): ChatEntry {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO chats (id, userId, title, origin, expertName, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, title || 'Nuevo chat', origin, expertName || null, now, now);

  return {
    id,
    userId,
    title: title || 'Nuevo chat',
    origin,
    expertName: expertName || null,
    pinned: 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Lista los chats de un usuario filtrados por expertName.
 * Orden: pinned DESC, updated_at DESC.
 * Incluye preview del último mensaje.
 */
export function listChats(userId: string, expertName?: string | null): ChatEntry[] {
  const db = getDb();

  let query: string;
  let params: unknown[];

  if (expertName === undefined) {
    // Todos los chats del usuario
    query = `
      SELECT c.*, 
        (SELECT content FROM messages WHERE chatId = c.id ORDER BY created_at DESC LIMIT 1) as lastMessage
      FROM chats c
      WHERE c.userId = ?
      ORDER BY c.pinned DESC, c.updated_at DESC
    `;
    params = [userId];
  } else {
    // Filtrado por expertName (NULL = General)
    query =
      expertName === null
        ? `
        SELECT c.*, 
          (SELECT content FROM messages WHERE chatId = c.id ORDER BY created_at DESC LIMIT 1) as lastMessage
        FROM chats c
        WHERE c.userId = ? AND c.expertName IS NULL AND c.origin = 'web'
        ORDER BY c.pinned DESC, c.updated_at DESC
      `
        : `
        SELECT c.*, 
          (SELECT content FROM messages WHERE chatId = c.id ORDER BY created_at DESC LIMIT 1) as lastMessage
        FROM chats c
        WHERE c.userId = ? AND c.expertName = ? AND c.origin = 'web'
        ORDER BY c.pinned DESC, c.updated_at DESC
      `;
    params = expertName === null ? [userId] : [userId, expertName];
  }

  return db.prepare(query).all(...params) as ChatEntry[];
}

/**
 * Lista los chats de canales (telegram, whatsapp, etc.) del usuario.
 */
export function listChannelChats(userId: string): ChatEntry[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.*,
        (SELECT content FROM messages WHERE chatId = c.id ORDER BY created_at DESC LIMIT 1) as lastMessage
      FROM chats c
      WHERE c.userId = ? AND c.origin != 'web'
      ORDER BY c.origin ASC`,
    )
    .all(userId) as ChatEntry[];
}

/**
 * Obtiene o crea el chat fijo de un canal (telegram, whatsapp).
 */
export function getOrCreateChannelChat(userId: string, origin: string): ChatEntry {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM chats WHERE userId = ? AND origin = ?')
    .get(userId, origin) as ChatEntry | undefined;

  if (existing) return existing;

  const label = origin.charAt(0).toUpperCase() + origin.slice(1);
  return createChat(userId, null, `💬 ${label}`, origin);
}

/**
 * Renombra un chat.
 */
export function renameChat(id: string, title: string): void {
  getDb().prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id);
}

/**
 * Elimina un chat y todos sus mensajes.
 */
export function deleteChat(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE chatId = ?').run(id);
  db.prepare('DELETE FROM chats WHERE id = ?').run(id);
}

/**
 * Toggle pin de un chat.
 */
export function togglePin(id: string): boolean {
  const db = getDb();
  const chat = db.prepare('SELECT pinned FROM chats WHERE id = ?').get(id) as
    | { pinned: number }
    | undefined;
  if (!chat) return false;

  const newPinned = chat.pinned ? 0 : 1;
  db.prepare('UPDATE chats SET pinned = ? WHERE id = ?').run(newPinned, id);
  return !!newPinned;
}

/**
 * Actualiza el timestamp de updated_at (para ordenar por actividad).
 */
export function touchChat(id: string): void {
  getDb().prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

/**
 * Obtiene un chat por ID.
 */
export function getChat(id: string): ChatEntry | null {
  return (getDb().prepare('SELECT * FROM chats WHERE id = ?').get(id) as ChatEntry) || null;
}
