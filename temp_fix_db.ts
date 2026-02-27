import { loadConfig } from './src/config/index.ts';
import { getDb } from './src/memory/db.ts';

async function fix() {
  loadConfig();
  const db = getDb();
  const result = db.prepare("DELETE FROM sub_agents WHERE name = '' OR name IS NULL").run();
  console.log(`Expertos corruptos eliminados: ${result.changes}`);
}

fix().catch(console.error);
