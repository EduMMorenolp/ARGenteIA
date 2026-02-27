import Database from 'better-sqlite3';
import { resolve } from 'node:path';

const dbPath = resolve(process.cwd(), 'memoryUser/assistant.db');
const db = new Database(dbPath);

console.log("--- ALL CHATS ---");
const chats = db.prepare("SELECT * FROM chats").all();
console.table(chats);

console.log("\n--- CHANNELS CHATS FOR Edu ---");
const channels = db.prepare("SELECT * FROM chats WHERE userId = 'Edu' AND origin != 'web'").all();
console.table(channels);
