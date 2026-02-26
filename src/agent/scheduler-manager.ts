import cron from 'node-cron';
import chalk from 'chalk';
import { getActiveTasks, type ScheduledTask } from '../memory/scheduler-db.ts';
import { runAgent } from './loop.ts';
import { getBot } from '../channels/telegram.ts';

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
  } catch (err: unknown) {
    console.error(
      chalk.red('   ❌ Error al inicializar el planificador:'),
      err instanceof Error ? err.message : err,
    );
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
  const cronExpression = task.cron.split(' ').length === 5 ? `0 ${task.cron}` : task.cron;

  try {
    const job = cron.schedule(
      cronExpression,
      async () => {
        console.log(chalk.blue(`   ⏰ Ejecutando tarea programada [ID ${task.id}]: ${task.task}`));

        try {
          const { getOrCreateChannelChat } = await import('../memory/chat-db.ts');
          const isTelegram = task.userId.startsWith('telegram-');
          const chatId = isTelegram 
            ? getOrCreateChannelChat(task.userId, 'telegram').id
            : task.userId; // Fallback para web

          const result = await runAgent({
            userId: task.userId,
            chatId: chatId,
            userText: `SISTEMA: Es momento de ejecutar la tarea programada: "${task.task}". Por favor, realiza la acción solicitada (como buscar info o dar un recordatorio) y responde directamente al usuario.`,
            onTyping: (isTyping) => {
              if (isTelegram) {
                const tgChatId = task.userId.replace('telegram-', '');
                const bot = getBot();
                if (bot && isTyping) bot.sendChatAction(tgChatId, 'typing').catch(() => {});
              }
            },
            origin: isTelegram ? 'telegram' : 'web',
          });

          // Enviar el resultado al canal correspondiente
          if (task.userId.startsWith('telegram-')) {
            const chatId = task.userId.replace('telegram-', '');
            const bot = getBot();
            if (bot) {
              await bot
                .sendMessage(chatId, result.text, { parse_mode: 'Markdown' })
                .catch(async () => {
                  await bot.sendMessage(chatId, result.text);
                });
            }
          } else {
            console.log(
              chalk.dim(
                `   [scheduler] No se puede enviar respuesta a canal desconocido: ${task.userId}`,
              ),
            );
          }
        } catch (err: unknown) {
          console.error(
            chalk.red(`   ❌ Error al ejecutar runAgent para tarea [ID ${task.id}]:`),
            err instanceof Error ? err.message : err,
          );
        }
      },
      {
        timezone: 'America/Argentina/Buenos_Aires', // Por defecto, pero idealmente configurable
      },
    );

    activeJobs.set(task.id, job);
  } catch (err: unknown) {
    console.error(
      chalk.red(`   ❌ Error al programar cron "${task.cron}":`),
      err instanceof Error ? err.message : err,
    );
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
