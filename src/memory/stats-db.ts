import { getDb } from './db.ts';

export interface StatEntry {
  id?: number;
  userId: string;
  chatId?: string;
  expertName?: string | null;
  model?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latencyMs: number;
  created_at?: string;
}

export interface DashboardStats {
  totalMessages: number;
  totalAssistantMessages: number;
  totalUserMessages: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  totalRequests: number;
  dailyActivity: Array<{ date: string; messages: number; tokens: number }>;
  expertRanking: Array<{ expert: string; count: number; tokens: number; avgLatency: number }>;
}

/**
 * Registra una estadística de una respuesta del asistente.
 */
export function logStat(entry: Omit<StatEntry, 'id' | 'created_at'>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO stats_log (userId, chatId, expertName, model, prompt_tokens, completion_tokens, total_tokens, latencyMs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    entry.userId,
    entry.chatId || null,
    entry.expertName || null,
    entry.model || null,
    entry.prompt_tokens || 0,
    entry.completion_tokens || 0,
    entry.total_tokens || 0,
    entry.latencyMs || 0,
  );
}

/**
 * Obtiene las estadísticas agregadas de un usuario.
 */
export function getStats(userId: string): DashboardStats {
  const db = getDb();

  // Totales de mensajes desde la tabla messages
  const msgCountRow = db
    .prepare(`SELECT COUNT(*) as total FROM messages WHERE userId = ?`)
    .get(userId) as any;
  const assistantCountRow = db
    .prepare(`SELECT COUNT(*) as total FROM messages WHERE userId = ? AND role = 'assistant'`)
    .get(userId) as any;
  const userCountRow = db
    .prepare(`SELECT COUNT(*) as total FROM messages WHERE userId = ? AND role = 'user'`)
    .get(userId) as any;

  // Totales de tokens y latencia desde stats_log
  const statsRow = db
    .prepare(
      `SELECT 
      COUNT(*) as totalRequests,
      COALESCE(SUM(total_tokens), 0) as totalTokens,
      COALESCE(SUM(prompt_tokens), 0) as totalPromptTokens,
      COALESCE(SUM(completion_tokens), 0) as totalCompletionTokens,
      COALESCE(AVG(latencyMs), 0) as avgLatencyMs,
      COALESCE(MIN(latencyMs), 0) as minLatencyMs,
      COALESCE(MAX(latencyMs), 0) as maxLatencyMs
    FROM stats_log WHERE userId = ?`,
    )
    .get(userId) as any;

  // Actividad diaria (últimos 14 días)
  const dailyRows = db
    .prepare(
      `SELECT 
      DATE(created_at) as date,
      COUNT(*) as messages,
      COALESCE(SUM(total_tokens), 0) as tokens
    FROM stats_log 
    WHERE userId = ? AND created_at >= DATE('now', '-14 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    )
    .all(userId) as any[];

  // Ranking de expertos
  const expertRows = db
    .prepare(
      `SELECT 
      COALESCE(expertName, 'Asistente General') as expert,
      COUNT(*) as count,
      COALESCE(SUM(total_tokens), 0) as tokens,
      COALESCE(AVG(latencyMs), 0) as avgLatency
    FROM stats_log 
    WHERE userId = ?
    GROUP BY expertName
    ORDER BY count DESC`,
    )
    .all(userId) as any[];

  return {
    totalMessages: msgCountRow?.total || 0,
    totalAssistantMessages: assistantCountRow?.total || 0,
    totalUserMessages: userCountRow?.total || 0,
    totalTokens: statsRow?.totalTokens || 0,
    totalPromptTokens: statsRow?.totalPromptTokens || 0,
    totalCompletionTokens: statsRow?.totalCompletionTokens || 0,
    avgLatencyMs: Math.round(statsRow?.avgLatencyMs || 0),
    minLatencyMs: statsRow?.minLatencyMs || 0,
    maxLatencyMs: statsRow?.maxLatencyMs || 0,
    totalRequests: statsRow?.totalRequests || 0,
    dailyActivity: dailyRows.map((r) => ({
      date: r.date,
      messages: r.messages,
      tokens: r.tokens,
    })),
    expertRanking: expertRows.map((r) => ({
      expert: r.expert,
      count: r.count,
      tokens: r.tokens,
      avgLatency: Math.round(r.avgLatency),
    })),
  };
}
