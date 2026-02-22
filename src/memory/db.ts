import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { getConfig } from "../config/index.ts";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const config = getConfig();
  const dbPath = resolve(process.cwd(), config.memory.dbPath);
  const dbDir = dirname(dbPath);

  // Asegurar que el directorio existe
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");

  // Crear tablas si no existen
  _db.exec(`
    CREATE TABLE IF NOT EXISTS user_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      fact TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      task TEXT NOT NULL,
      cron TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      name TEXT,
      timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
      preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sub_agents (
      name TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      tools TEXT DEFAULT '[]',
      temperature REAL DEFAULT 0.7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_facts_userId ON user_facts(userId);
    CREATE INDEX IF NOT EXISTS idx_tasks_userId ON scheduled_tasks(userId);
    CREATE INDEX IF NOT EXISTS idx_sub_agents_name ON sub_agents(name);
  `);

  return _db;
}
