import { loadConfig } from "./config/index.ts";
import { createGateway } from "./gateway/server.ts";
import { startTelegram } from "./channels/telegram.ts";
import { initTools } from "./tools/index.ts";
import chalk from "chalk";

// 1. Cargar y validar configuración
const config = loadConfig();

// 2. Inicializar herramientas
initTools();

// 3. Crear e iniciar gateway (Express + WebSocket)
const gateway = createGateway();
await gateway.start();

// 4. Iniciar canal Telegram (si está configurado)
startTelegram();

// Manejo limpio de cierre
process.on("SIGINT", () => {
  console.log(chalk.dim("\n\n👋 Cerrando asistente..."));
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
