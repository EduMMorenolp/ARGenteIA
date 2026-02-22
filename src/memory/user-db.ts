import { getDb } from "./db.ts";

export interface UserProfile {
  userId: string;
  name: string | null;
  timezone: string;
  preferences: string | null;
  created_at: string;
}

/**
 * Obtiene el perfil de un usuario por su ID.
 */
export function getUser(userId: string): UserProfile | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE userId = ?");
  return stmt.get(userId) as UserProfile | null;
}

/**
 * Crea o actualiza los datos básicos de un usuario.
 */
export function upsertUser(userId: string, data: Partial<Omit<UserProfile, 'userId' | 'created_at'>>): void {
  const db = getDb();
  const existing = getUser(userId);

  if (existing) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);
    const stmt = db.prepare(`UPDATE users SET ${fields} WHERE userId = ?`);
    stmt.run(...values, userId);
  } else {
    const stmt = db.prepare("INSERT INTO users (userId, name, timezone, preferences) VALUES (?, ?, ?, ?)");
    stmt.run(
      userId, 
      data.name || null, 
      data.timezone || 'America/Argentina/Buenos_Aires', 
      data.preferences || null
    );
  }
}

/**
 * Actualiza específicamente la zona horaria de un usuario.
 */
export function updateTimeZone(userId: string, timezone: string): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE users SET timezone = ? WHERE userId = ?");
  stmt.run(timezone, userId);
}
