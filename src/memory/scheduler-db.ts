import { getDb } from './db.ts';

export interface ScheduledTask {
  id: number;
  userId: string;
  task: string;
  cron: string;
  active: number;
  created_at: string;
}

export function saveTask(userId: string, task: string, cron: string): number {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO scheduled_tasks (userId, task, cron) VALUES (?, ?, ?)');
  const result = stmt.run(userId, task, cron);
  return result.lastInsertRowid as number;
}

export function getActiveTasks(): ScheduledTask[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM scheduled_tasks WHERE active = 1');
  return stmt.all() as ScheduledTask[];
}

export function deleteTask(id: number, userId: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM scheduled_tasks WHERE id = ? AND userId = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

export function getUserTasks(userId: string): ScheduledTask[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM scheduled_tasks WHERE userId = ? ORDER BY created_at DESC',
  );
  return stmt.all(userId) as ScheduledTask[];
}
export function updateTask(id: number, userId: string, task: string, cron: string): boolean {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE scheduled_tasks SET task = ?, cron = ? WHERE id = ? AND userId = ?',
  );
  const result = stmt.run(task, cron, id, userId);
  return result.changes > 0;
}
