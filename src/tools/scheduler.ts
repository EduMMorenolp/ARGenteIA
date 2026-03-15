import { scheduleLocalTask, stopLocalTask } from '../agent/scheduler-manager.ts';
import type { Config } from '../config/index.ts';
import { deleteTask, getUserTasks, saveTask } from '../memory/scheduler-db.ts';
import { registerTool } from './index.ts';

export function registerSchedulerTools(_config: Config): void {
  // 1. Programar tarea
  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'schedule_task',
        description: "Programa una acción recurrente en formato cron (ej local: '30 7 * * *').",
        parameters: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Descripción de la tarea.',
            },
            cron: {
              type: 'string',
              description: "Horario cron (ej: '0 8 * * *').",
            },
          },
          required: ['task', 'cron'],
        },
      },
    },
    handler: async (args, context) => {
      const taskStr = String(args['task'] ?? '').trim();
      const cronStr = String(args['cron'] ?? '').trim();

      if (!taskStr || !cronStr) {
        return `❌ Error: Debes proporcionar tanto la descripción ('task') como el horario cron ('cron').`;
      }

      try {
        const taskId = saveTask(context.sessionId, taskStr, cronStr);
        scheduleLocalTask({
          id: taskId,
          userId: context.sessionId,
          task: taskStr,
          cron: cronStr,
          is_once: 0,
          active: 1,
          created_at: new Date().toISOString(),
        });

        // Notificar al WebChat para actualizar el sidebar
        import('../gateway/server.ts').then(({ broadcastTasksForUser }) => {
          broadcastTasksForUser(context.sessionId);
        });

        return `✅ Tarea programada (ID: ${taskId}). Se ejecutará: "${taskStr}" con el horario: "${cronStr}".`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return `❌ Error al programar la tarea: ${msg}`;
      }
    },
  });

  // 1.5. Programar tarea de un solo uso (delay)
  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'schedule_delayed_task',
        description:
          'Programa una acción para que ocurra una sola vez después de N minutos.',
        parameters: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Descripción de la tarea a realizar.',
            },
            minutes: {
              type: 'number',
              description: 'Minutos a esperar desde ahora.',
            },
          },
          required: ['task', 'minutes'],
        },
      },
    },
    handler: async (args, context) => {
      const taskStr = String(args['task'] ?? '').trim();
      const minutes = Number(args['minutes']);

      if (!taskStr || isNaN(minutes) || minutes <= 0) {
        return '❌ Error: Datos inválidos. "minutes" debe ser un número positivo.';
      }

      try {
        const now = new Date();
        const targetDate = new Date(now.getTime() + minutes * 60000);

        // Generar cron para un solo uso: min hour day month *
        const cronStr = `${targetDate.getMinutes()} ${targetDate.getHours()} ${targetDate.getDate()} ${
          targetDate.getMonth() + 1
        } *`;

        const taskId = saveTask(context.sessionId, taskStr, cronStr, 1);
        scheduleLocalTask({
          id: taskId,
          userId: context.sessionId,
          task: taskStr,
          cron: cronStr,
          is_once: 1,
          active: 1,
          created_at: now.toISOString(),
        });

        // Notificar al WebChat
        import('../gateway/server.ts').then(({ broadcastTasksForUser }) => {
          broadcastTasksForUser(context.sessionId);
        });

        return `✅ Recordatorio programado para dentro de ${minutes} min (aprox ${targetDate.toLocaleTimeString()}). Tarea: "${taskStr}"`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return `❌ Error al programar: ${msg}`;
      }
    },
  });

  // 2. Listar tareas
  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'list_scheduled_tasks',
        description: 'Lista todas las tareas programadas activas del usuario.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
    handler: async (_, context) => {
      const tasks = getUserTasks(context.sessionId);
      if (tasks.length === 0) return 'No tienes tareas programadas actualmente.';

      const list = tasks.map((t) => `- [ID ${t.id}] "${t.task}" (Horario: ${t.cron})`).join('\n');
      return `📅 Tus tareas programadas:\n${list}`;
    },
  });

  // 3. Eliminar tarea
  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'delete_scheduled_task',
        description: 'Elimina una tarea programada permanentemente usando su ID numérico.',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'El ID numérico de la tarea a eliminar.',
            },
          },
          required: ['id'],
        },
      },
    },
    handler: async (args, context) => {
      const id = Number(args['id']);
      const success = deleteTask(id, context.sessionId);
      if (success) {
        stopLocalTask(id);

        // Notificar al WebChat para actualizar el sidebar
        import('../gateway/server.ts').then(({ broadcastTasksForUser }) => {
          broadcastTasksForUser(context.sessionId);
        });

        return `✅ Tarea con ID ${id} eliminada correctamente.`;
      }
      return `❌ No se encontró ninguna tarea con el ID ${id} para este usuario.`;
    },
  });
}
