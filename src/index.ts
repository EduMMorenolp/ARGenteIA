import chalk from 'chalk';
import { initScheduler } from './agent/scheduler-manager.ts';
import { startTelegram, stopTelegram } from './channels/telegram.ts';
import { loadConfig } from './config/index.ts';
import { createGateway } from './gateway/server.ts';
import { getDb } from './memory/db.ts';
import { initTools } from './tools/index.ts';

// ─── Captura global de errores no manejados ─────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error(chalk.red('❌ Error fatal no capturado:'));
  console.error(chalk.red(err.stack || err.message || String(err)));
  console.error(chalk.yellow('El servidor se detendrá.'));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('❌ Promesa rechazada no manejada:'));
  console.error(
    chalk.red(reason instanceof Error ? reason.stack || reason.message : String(reason)),
  );
  console.error(chalk.yellow('El servidor se detendrá.'));
  process.exit(1);
});

// 1. Cargar y validar configuración
const config = loadConfig();

// 2. Inicializar memoria y herramientas
try {
  getDb();
  console.log(chalk.blue(`🗄️  Base de datos inicializada: ${config.memory.dbPath}`));
} catch (err) {
  console.error(chalk.red('❌ Error al inicializar la base de datos:'), err);
}

await initTools();
await initScheduler();

// 3. Crear e iniciar gateway (Express + WebSocket)
const gateway = createGateway();
await gateway.start();

// 4. Iniciar canal Telegram (si está configurado)
await startTelegram();

// Manejo limpio de cierre
process.on('SIGINT', async () => {
  console.log(chalk.dim('\n\n👋 Cerrando asistente...'));
  try {
    await stopTelegram();
  } catch (err) {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await stopTelegram();
  } catch (err) {}
  process.exit(0);
});
