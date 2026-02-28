import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { getConfig } from '../config/index.ts';

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
  _db.pragma('journal_mode = WAL');

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
      telegram_user TEXT,
      telegram_token TEXT,
      login_pin TEXT DEFAULT '0000',
      preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sub_agents (
      name TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      tools TEXT DEFAULT '[]',
      experts TEXT DEFAULT '[]',
      temperature REAL DEFAULT 0.7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      chatId TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      origin TEXT DEFAULT 'web',
      expertName TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS models (
      name TEXT PRIMARY KEY,
      displayName TEXT,
      apiKey TEXT,
      baseUrl TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT DEFAULT 'Nuevo chat',
      origin TEXT DEFAULT 'web',
      expertName TEXT,
      pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stats_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      chatId TEXT,
      expertName TEXT,
      model TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      latencyMs INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_facts_userId ON user_facts(userId);
    CREATE INDEX IF NOT EXISTS idx_tasks_userId ON scheduled_tasks(userId);
    CREATE INDEX IF NOT EXISTS idx_sub_agents_name ON sub_agents(name);
    CREATE INDEX IF NOT EXISTS idx_messages_userId ON messages(userId);
    CREATE INDEX IF NOT EXISTS idx_chats_userId ON chats(userId);
    CREATE INDEX IF NOT EXISTS idx_stats_log_userId ON stats_log(userId);
  `);

  // Migración: Asegurar columna 'experts' en 'sub_agents'
  try {
    _db.exec("ALTER TABLE sub_agents ADD COLUMN experts TEXT DEFAULT '[]'");
  } catch {
    // Ya existe o error ignorado
  }

  // Migración: Asegurar columna 'model' en 'sub_agents'
  try {
    _db.exec(
      "ALTER TABLE sub_agents ADD COLUMN model TEXT DEFAULT 'openrouter/meta-llama/llama-3.3-70b-instruct'",
    );
  } catch {
    // Ya existe o error ignorado
  }

  // Migración: Asegurar columna 'telegram_user' en 'users'
  try {
    _db.exec('ALTER TABLE users ADD COLUMN telegram_user TEXT');
  } catch {
    // Ya existe o error ignorado
  }
  try {
    _db.exec('ALTER TABLE users ADD COLUMN telegram_token TEXT');
  } catch {
    // Ya existe o error ignorado
  }
  try {
    _db.exec("ALTER TABLE users ADD COLUMN login_pin TEXT DEFAULT '0000'");
  } catch {
    // Ya existe o error ignorado
  }

  // Migración: Agregar chatId a messages
  try {
    _db.exec('ALTER TABLE messages ADD COLUMN chatId TEXT');
  } catch {
    // Ya existe
  }

  // Ahora sí, crear el índice para chatId
  try {
    _db.exec('CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)');
  } catch {
    // Ya existe o error
  }

  // Migración: Agregar displayName a models
  try {
    _db.exec('ALTER TABLE models ADD COLUMN displayName TEXT');
  } catch {
    // Ya existe
  }

  return _db;
}
