import { registerTool } from "./index.ts";
import { saveTask, getUserTasks, deleteTask } from "../memory/scheduler-db.ts";
import { scheduleLocalTask, stopLocalTask } from "../agent/scheduler-manager.ts";
import type { Config } from "../config/index.ts";

export function registerSchedulerTools(config: Config): void {
  // 1. Programar tarea
  registerTool({
    isEnabled: () => true,
    spec: {
      type: "function",
      function: {
        name: "schedule_task",
        description: "Programa una acción o recordatorio para realizar automáticamente en un momento específico usando formato cron (ej local: '30 7 * * *' para las 7:30 AM).",
        parameters: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "Descripción detallada de la tarea a realizar.",
            },
            cron: {
              type: "string",
              description: "Horario en formato cron (minuto, hora, día, mes, día-semana). Ej: '0 8 * * *' para las 8 AM diario.",
            },
          },
          required: ["task", "cron"],
        },
      },
    },
    handler: async (args, context) => {
      const taskStr = String(args["task"] ?? "");
      const cronStr = String(args["cron"] ?? "");

      try {
        const taskId = saveTask(context.sessionId, taskStr, cronStr);
        scheduleLocalTask({
          id: taskId,
          userId: context.sessionId,
          task: taskStr,
          cron: cronStr,
          active: 1,
          created_at: new Date().toISOString()
        });

        return `✅ Tarea programada (ID: ${taskId}). Se ejecutará: "${taskStr}" con el horario: "${cronStr}".`;
      } catch (err: any) {
        return `❌ Error al programar la tarea: ${err.message}`;
      }
    },
  });

  // 2. Listar tareas
  registerTool({
    isEnabled: () => true,
    spec: {
      type: "function",
      function: {
        name: "list_scheduled_tasks",
        description: "Lista todas las tareas programadas activas del usuario.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    handler: async (_, context) => {
      const tasks = getUserTasks(context.sessionId);
      if (tasks.length === 0) return "No tienes tareas programadas actualmente.";
      
      const list = tasks.map(t => `- [ID ${t.id}] "${t.task}" (Horario: ${t.cron})`).join("\n");
      return `📅 Tus tareas programadas:\n${list}`;
    },
  });

  // 3. Eliminar tarea
  registerTool({
    isEnabled: () => true,
    spec: {
      type: "function",
      function: {
        name: "delete_scheduled_task",
        description: "Elimina una tarea programada permanentemente usando su ID numérico.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "El ID numérico de la tarea a eliminar.",
            },
          },
          required: ["id"],
        },
      },
    },
    handler: async (args, context) => {
      const id = Number(args["id"]);
      const success = deleteTask(id, context.sessionId);
      if (success) {
        stopLocalTask(id);
        return `✅ Tarea con ID ${id} eliminada correctamente.`;
      }
      return `❌ No se encontró ninguna tarea con el ID ${id} para este usuario.`;
    },
  });
}
