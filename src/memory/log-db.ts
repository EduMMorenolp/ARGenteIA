import { getDb } from './db.ts';

export interface LogEntry {
  id?: number;
  timestamp?: string;
  level: 'info' | 'warning' | 'error' | 'action';
  category: 'tool' | 'agent' | 'system' | 'security';
  userId?: string;
  chatId?: string;
  message: string;
  data?: any;
  latencyMs?: number;
}

/**
 * Inserta un nuevo registro de log en la base de datos.
 */
export function insertLog(entry: LogEntry): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO activity_log (level, category, userId, chatId, message, data, latencyMs)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    entry.level.toUpperCase(),
    entry.category.toLowerCase(),
    entry.userId || null,
    entry.chatId || null,
    entry.message,
    entry.data ? JSON.stringify(entry.data) : null,
    entry.latencyMs || null
  );
  
  return result.lastInsertRowid as number;
}

/**
 * Obtiene los logs más recientes con filtros opcionales.
 */
export function getRecentLogs(limit = 100, filters?: { userId?: string, category?: string, level?: string }): LogEntry[] {
  const db = getDb();
  let query = 'SELECT * FROM activity_log';
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters?.userId) {
    conditions.push('userId = ?');
    params.push(filters.userId);
  }
  if (filters?.category) {
    conditions.push('category = ?');
    params.push(filters.category.toLowerCase());
  }
  if (filters?.level) {
    conditions.push('level = ?');
    params.push(filters.level.toUpperCase());
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    ...row,
    data: row.data ? JSON.parse(row.data) : null
  }));
}

/**
 * Obtiene estadísticas agregadas de logs para reportes.
 */
export function getLogStats() {
  const db = getDb();
  
  const totalByLevel = db.prepare(`
    SELECT level, COUNT(*) as count FROM activity_log GROUP BY level
  `).all();
  
  const totalByCategory = db.prepare(`
    SELECT category, COUNT(*) as count FROM activity_log GROUP BY category
  `).all();
  
  const toolUsage = db.prepare(`
    SELECT message as tool, COUNT(*) as count 
    FROM activity_log 
    WHERE category = 'tool' AND level = 'ACTION'
    GROUP BY message 
    ORDER BY count DESC 
    LIMIT 10
  `).all();

  return {
    totalByLevel,
    totalByCategory,
    toolUsage
  };
}
