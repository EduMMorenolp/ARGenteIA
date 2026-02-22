import cron from "node-cron";
import chalk from "chalk";
import { getActiveTasks, type ScheduledTask } from "../memory/scheduler-db.ts";
import { runAgent } from "./loop.ts";
import { getBot } from "../channels/telegram.ts";

const activeJobs = new Map<number, cron.ScheduledTask>();

/**
 * Inicializa el planificador cargando las tareas activas de la base de datos.
 */
export async function initScheduler(): Promise<void> {
  try {
    const tasks = getActiveTasks();
    console.log(chalk.blue(`   ⏰ Inicializando planificador: ${tasks.length} tareas activas.`));
    
    for (const task of tasks) {
      scheduleLocalTask(task);
    }
  } catch (err: any) {
    console.error(chalk.red("   ❌ Error al inicializar el planificador:"), err.message);
  }
}

/**
 * Crea o actualiza un trabajo cron en memoria.
 */
export function scheduleLocalTask(task: ScheduledTask): void {
  // Si ya existe un job con ese ID (por ejemplo al re-programar), detenerlo primero
  if (activeJobs.has(task.id)) {
    activeJobs.get(task.id)?.stop();
  }

  // node-cron usa: segundo (opcional), minuto, hora, día del mes, mes, día de la semana
  // Si el usuario provee 5 campos, se asume que empiezan desde minuto.
  const cronExpression = task.cron.split(" ").length === 5 ? `0 ${task.cron}` : task.cron;

  try {
    const job = cron.schedule(cronExpression, async () => {
      console.log(chalk.blue(`   ⏰ Ejecutando tarea programada [ID ${task.id}]: ${task.task}`));
      
      try {
        const result = await runAgent({
          sessionId: task.userId,
          userText: `SISTEMA: Es momento de ejecutar la tarea programada: "${task.task}". Por favor, realiza la acción solicitada (como buscar info o dar un recordatorio) y responde directamente al usuario.`,
          onTyping: (isTyping) => {
            if (task.userId.startsWith("telegram-")) {
              const chatId = task.userId.replace("telegram-", "");
              const bot = getBot();
              if (bot && isTyping) bot.sendChatAction(chatId, "typing").catch(() => {});
            }
          }
        });

        // Enviar el resultado al canal correspondiente
        if (task.userId.startsWith("telegram-")) {
          const chatId = task.userId.replace("telegram-", "");
          const bot = getBot();
          if (bot) {
            await bot.sendMessage(chatId, result.text, { parse_mode: "Markdown" }).catch(async () => {
                await bot.sendMessage(chatId, result.text);
            });
          }
        } else {
            console.log(chalk.dim(`   [scheduler] No se puede enviar respuesta a canal desconocido: ${task.userId}`));
        }
      } catch (err: any) {
        console.error(chalk.red(`   ❌ Error al ejecutar runAgent para tarea [ID ${task.id}]:`), err.message);
      }
    }, {
        timezone: "America/Argentina/Buenos_Aires" // Por defecto, pero idealmente configurable
    });

    activeJobs.set(task.id, job);
  } catch (err: any) {
    console.error(chalk.red(`   ❌ Error al programar cron "${task.cron}":`), err.message);
  }
}

/**
 * Detiene y elimina un trabajo cron de la memoria.
 */
export function stopLocalTask(id: number): void {
  if (activeJobs.has(id)) {
    activeJobs.get(id)?.stop();
    activeJobs.delete(id);
  }
}
