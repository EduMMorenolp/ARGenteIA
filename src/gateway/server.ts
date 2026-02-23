import http from "node:http";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import chalk from "chalk";
import { getConfig } from "../config/index.ts";
import { handleWebChatMessage } from "../channels/webchat.ts";
import type { WsMessage } from "./protocol.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GatewayServer {
  httpServer: http.Server;
  wss: WebSocketServer;
  start: () => Promise<void>;
}

export function createGateway(): GatewayServer {
  const config = getConfig();
  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // ─── Servir WebChat UI estática ────────────────────────────────────────────
  const uiPath = join(__dirname, "../../ui/dist");
  app.use(express.static(uiPath));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", model: config.agent.model });
  });

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  wss.on("connection", (ws: WebSocket) => {
    let sessionId = `webchat-${Date.now()}`;
    console.log(chalk.cyan(`🌐 WebChat conectado [${sessionId}]`));

    // Obtener configuración del asistente general (base + override)
    const getGeneralConfig = async () => {
      const { getExpert, listExperts } = await import("../memory/expert-db.ts");
      const { getTools } = await import("../tools/index.ts");
      const { loadSkills } = await import("../skills/loader.ts");

      const override = getExpert("__general__");
      const allTools = getTools().map((t) => t.function.name);
      const allExpertsList = listExperts().map((e) => e.name);

      if (override) {
        // Si el override no tiene herramientas, le mandamos todas para que aparezcan seleccionadas
        if (!override.tools || override.tools.length === 0) {
          override.tools = allTools;
        }
        // Si el override no tiene expertos elegidos, le mandamos todos
        if (!override.experts || override.experts.length === 0) {
          override.experts = allExpertsList;
        }
        return override;
      }

      // Si no hay override, mandamos la config base merged con skills y todas las herramientas/expertos
      const skills = await loadSkills();

      let initialPrompt = config.agent.systemPrompt || "";
      if (skills.length > 0) {
        initialPrompt += `\n\n${skills.join("\n\n")}`;
      }

      return {
        name: "__general__",
        model: config.agent.model,
        system_prompt: initialPrompt,
        temperature: 0.7,
        tools: allTools,
        experts: allExpertsList,
      };
    };

    // Enviar estado inicial
    getGeneralConfig().then((genCfg) => {
      send(ws, {
        type: "status",
        model: config.agent.model,
        sessionId,
        messageCount: 0,
        generalConfig: genCfg,
      });
    });

    // Enviar lista de expertos inicial
    import("../memory/expert-db.ts").then(({ listExperts }) => {
      send(ws, { type: "list_experts", experts: listExperts() });
    });

    // Enviar lista de herramientas disponibles
    import("../tools/index.ts").then(({ getTools }) => {
      const toolNames = getTools().map((t) => t.function.name);
      send(ws, { type: "list_tools" as any, tools: toolNames } as any);
    });

    // Enviar lista de usuarios existentes
    import("../memory/user-db.ts").then(({ listAllUsers }) => {
      send(ws, { type: "list_users", users: listAllUsers() });
    });

    ws.on("message", async (data) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(data.toString()) as WsMessage;
      } catch {
        send(ws, {
          type: "error",
          message: "Mensaje inválido (JSON malformado)",
        });
        return;
      }

      if (msg.type === "user_message") {
        await handleWebChatMessage({
          ws,
          sessionId,
          text: msg.text,
          expertName: msg.expertName,
          send,
        } as any);
      } else if (msg.type === "identify") {
        // Cambiar sessionId por el userId elegido
        const oldId = sessionId;
        sessionId = msg.userId;
        console.log(
          chalk.cyan(`👤 WebChat identificado: ${oldId} -> ${sessionId}`),
        );

        // Enviar confirmación de estado con el nuevo ID
        send(ws, {
          type: "status",
          model: config.agent.model,
          sessionId,
          messageCount: 0,
        });

        // Enviar historial de la base de datos
        import("../memory/message-db.ts").then(({ getMessages }) => {
          const history = getMessages(sessionId);
          send(ws, {
            type: "assistant_message", // Usar un tipo que el cliente entienda como histórico o extender
            text: "Cargando historial...",
            model: "sistema",
            sessionId,
            history: history.map((m) => ({
              role: m.role,
              text: m.content,
              origin: m.origin,
            })),
          } as any);
        });

        // Enviar tareas programadas
        import("../memory/scheduler-db.ts").then(({ getUserTasks }) => {
          send(ws, {
            type: "list_tasks" as any,
            tasks: getUserTasks(sessionId),
          } as any);
        });
      } else if (msg.type === "expert_update") {
        const { listExperts, upsertExpert, deleteExpert } =
          await import("../memory/expert-db.ts");
        if (msg.action === "list") {
          send(ws, { type: "list_experts", experts: listExperts() });
        } else if (msg.action === "upsert" && msg.expert) {
          upsertExpert(msg.expert);
          send(ws, { type: "list_experts", experts: listExperts() });

          // Si es el asistente general, refrescar el estado global para el cliente
          if (msg.expert.name === "__general__") {
            const genCfg = await getGeneralConfig();
            send(ws, {
              type: "status",
              model: genCfg.model,
              sessionId,
              messageCount: 0,
              generalConfig: genCfg,
            });
          }
        } else if (msg.action === "delete" && msg.name) {
          deleteExpert(msg.name);
          send(ws, { type: "list_experts", experts: listExperts() });

          if (msg.name === "__general__") {
            const genCfg = await getGeneralConfig();
            send(ws, {
              type: "status",
              model: genCfg.model,
              sessionId,
              messageCount: 0,
              generalConfig: genCfg,
            });
          }
        }
      } else if (msg.type === "delete_task") {
        const { deleteTask, getUserTasks } =
          await import("../memory/scheduler-db.ts");
        const { stopLocalTask } = await import("../agent/scheduler-manager.ts");
        if (deleteTask(msg.id, sessionId)) {
          stopLocalTask(msg.id);
          send(ws, {
            type: "list_tasks" as any,
            tasks: getUserTasks(sessionId),
          } as any);
        }
      } else if (msg.type === "update_task") {
        const { updateTask, getUserTasks } =
          await import("../memory/scheduler-db.ts");
        const { stopLocalTask, scheduleLocalTask } =
          await import("../agent/scheduler-manager.ts");
        if (updateTask(msg.id, sessionId, msg.task, msg.cron)) {
          stopLocalTask(msg.id);
          scheduleLocalTask({
            id: msg.id,
            userId: sessionId,
            task: msg.task,
            cron: msg.cron,
            active: 1,
            created_at: new Date().toISOString(),
          });
          send(ws, {
            type: "list_tasks" as any,
            tasks: getUserTasks(sessionId),
          } as any);
        }
      } else if (msg.type === "user_register") {
        const { upsertUser, listAllUsers } =
          await import("../memory/user-db.ts");
        upsertUser(msg.userId, {
          name: msg.name,
          timezone: msg.timezone,
          telegram_user: msg.telegram_user,
          telegram_token: msg.telegram_token,
          login_pin: msg.login_pin || "0000",
        });
        if (msg.telegram_token && config.channels.telegram) {
          config.channels.telegram.botToken = msg.telegram_token;
          const { startTelegram } = await import("../channels/telegram.ts");
          startTelegram();
        }
        console.log(
          chalk.green(`✅ Usuario registrado: ${msg.userId} (${msg.name})`),
        );
        // Enviar lista actualizada de usuarios a todos (o solo al que registró)
        send(ws, { type: "list_users", users: listAllUsers() });
        // También identificarlo automáticamente
        sessionId = msg.userId;
        send(ws, {
          type: "status",
          model: config.agent.model,
          sessionId,
          messageCount: 0,
        });
      } else if (msg.type === "user_update") {
        const { upsertUser, listAllUsers } =
          await import("../memory/user-db.ts");
        upsertUser(msg.userId, {
          name: msg.name,
          timezone: msg.timezone,
          telegram_user: msg.telegram_user,
          telegram_token: msg.telegram_token,
          login_pin: msg.login_pin,
        });
        if (msg.telegram_token && config.channels.telegram) {
          config.channels.telegram.botToken = msg.telegram_token;
          const { startTelegram } = await import("../channels/telegram.ts");
          startTelegram();
        }
        console.log(chalk.green(`✅ Usuario actualizado: ${msg.userId}`));
        // Enviar lista actualizada de usuarios
        send(ws, { type: "list_users", users: listAllUsers() });
      } else if (msg.type === "user_delete") {
        const { deleteUser, listAllUsers } =
          await import("../memory/user-db.ts");
        deleteUser(msg.userId);
        console.log(chalk.red(`🗑️ Usuario eliminado: ${msg.userId}`));
        // Enviar lista actualizada
        send(ws, { type: "list_users", users: listAllUsers() });
      } else if (msg.type === ("list_tasks" as any)) {
        const { getUserTasks } = await import("../memory/scheduler-db.ts");
        send(ws, {
          type: "list_tasks" as any,
          tasks: getUserTasks(sessionId),
        } as any);
      }
    });

    ws.on("close", () => {
      console.log(chalk.gray(`🌐 WebChat desconectado [${sessionId}]`));
    });

    ws.on("error", (err) => {
      console.error(chalk.red("❌ WS error:"), err.message);
    });
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  const start = (): Promise<void> =>
    new Promise(async (resolve) => {
      httpServer.listen(config.gateway.port, async () => {
        const { getExpert } = await import("../memory/expert-db.ts");
        const generalOverride = getExpert("__general__");
        const activeModel = generalOverride?.model || config.agent.model;

        console.log(chalk.green(`\n🤖 ARGenteIA`));
        console.log(
          chalk.dim(`   Gateway: `) +
            chalk.white(`http://localhost:${config.gateway.port}`),
        );
        console.log(
          chalk.dim(`   WebChat: `) +
            chalk.white(`http://localhost:${config.gateway.port}`),
        );
        console.log(
          chalk.dim(`   Modelo:  `) +
            chalk.white(activeModel) +
            (generalOverride ? chalk.yellow(" (DB override)") : ""),
        );
        console.log();
        resolve();
      });
    });

  return { httpServer, wss, start };
}

// Helper para enviar mensajes WS de forma segura
export function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
