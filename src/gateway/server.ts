import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import chalk from 'chalk';
import { getConfig } from '../config/index.ts';
import { handleWebChatMessage } from '../channels/webchat.ts';
import type { WsMessage } from './protocol.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GatewayServer {
  httpServer: http.Server;
  wss: WebSocketServer;
  start: () => Promise<void>;
}

export type CustomWebSocket = WebSocket & { sessionId?: string };

let globalWss: WebSocketServer | null = null;

export function createGateway(): GatewayServer {
  const config = getConfig();
  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });
  globalWss = wss;

  // ─── Servir WebChat UI estática ────────────────────────────────────────────
  const uiPath = join(__dirname, '../../ui/dist');
  app.use(express.static(uiPath));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', model: config.agent.model });
  });

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  wss.on('connection', (ws: WebSocket) => {
    let sessionId = `webchat-${Date.now()}`;
    (ws as CustomWebSocket).sessionId = sessionId;
    console.log(chalk.cyan(`🌐 WebChat conectado [${sessionId}]`));

    // Obtener configuración del asistente general (base + override)
    const getGeneralConfig = async () => {
      const { getExpert, listExperts } = await import('../memory/expert-db.ts');
      const { getTools } = await import('../tools/index.ts');
      const { loadSkills } = await import('../skills/loader.ts');

      const override = getExpert('__general__');
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

      let initialPrompt = config.agent.systemPrompt || '';
      if (skills.length > 0) {
        initialPrompt += `\n\n${skills.join('\n\n')}`;
      }

      return {
        name: '__general__',
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
        type: 'status',
        model: config.agent.model,
        sessionId,
        messageCount: 0,
        generalConfig: genCfg,
      });
    });

    // Enviar lista de expertos inicial
    import('../memory/expert-db.ts').then(({ listExperts }) => {
      send(ws, { type: 'list_experts', experts: listExperts() });
    });

    // Enviar lista de modelos disponibles
    import('../memory/model-db.ts').then(({ listModels, seedModelsFromConfig }) => {
      seedModelsFromConfig();
      send(ws, { type: 'list_models', models: listModels() } as unknown as WsMessage);
    });

    // Enviar lista de herramientas disponibles
    import('../tools/index.ts').then(({ getTools }) => {
      const toolNames = getTools().map((t) => t.function.name);
      send(ws, { type: 'list_tools', tools: toolNames } as unknown as WsMessage);
    });

    // Enviar lista de usuarios existentes
    import('../memory/user-db.ts').then(({ listAllUsers }) => {
      send(ws, { type: 'list_users', users: listAllUsers() });
    });

    ws.on('message', async (data) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(data.toString()) as WsMessage;
      } catch {
        send(ws, {
          type: 'error',
          message: 'Mensaje inválido (JSON malformado)',
        });
        return;
      }

      if (msg.type === 'user_message') {
        await handleWebChatMessage({
          ws,
          sessionId,
          chatId: msg.chatId,
          text: msg.text,
          expertName: msg.expertName,
          send,
        } as unknown as Parameters<typeof handleWebChatMessage>[0]);
      } else if (msg.type === 'identify') {
        // Cambiar sessionId por el userId elegido
        const oldId = sessionId;
        sessionId = msg.userId;
        (ws as CustomWebSocket).sessionId = sessionId;
        console.log(chalk.cyan(`👤 WebChat identificado: ${oldId} -> ${sessionId}`));

        // Enviar confirmación de estado con el nuevo ID
        send(ws, {
          type: 'status',
          model: config.agent.model,
          sessionId,
          messageCount: 0,
        });

        // Enviar lista de chats
        import('../memory/chat-db.ts').then(
          ({ listChats, listChannelChats, getOrCreateChannelChat }) => {
            // Asegurar que exista el canal de Telegram
            getOrCreateChannelChat(sessionId, 'telegram');

            send(ws, {
              type: 'list_chats',
              chats: listChats(sessionId),
              channelChats: listChannelChats(sessionId),
            } as unknown as WsMessage);
          },
        );

        // Enviar tareas programadas
        import('../memory/scheduler-db.ts').then(({ getUserTasks }) => {
          send(ws, {
            type: 'list_tasks',
            tasks: getUserTasks(sessionId),
          } as unknown as WsMessage);
        });
      } else if (msg.type === 'expert_update') {
        const { listExperts, upsertExpert, deleteExpert } = await import('../memory/expert-db.ts');
        if (msg.action === 'list') {
          send(ws, { type: 'list_experts', experts: listExperts() });
        } else if (msg.action === 'upsert' && msg.expert) {
          upsertExpert(msg.expert);
          send(ws, { type: 'list_experts', experts: listExperts() });

          // Si es el asistente general, refrescar el estado global para el cliente
          if (msg.expert.name === '__general__') {
            const genCfg = await getGeneralConfig();
            send(ws, {
              type: 'status',
              model: genCfg.model,
              sessionId,
              messageCount: 0,
              generalConfig: genCfg,
            });
          }
        } else if (msg.action === 'delete' && msg.name) {
          deleteExpert(msg.name);
          send(ws, { type: 'list_experts', experts: listExperts() });

          if (msg.name === '__general__') {
            const genCfg = await getGeneralConfig();
            send(ws, {
              type: 'status',
              model: genCfg.model,
              sessionId,
              messageCount: 0,
              generalConfig: genCfg,
            });
          }
        }
      } else if (msg.type === 'switch_chat') {
        const { getHistory } = await import('../memory/session.ts');
        const { activeChats } = await import('../agent/loop.ts');
        const history = getHistory(msg.chatId || '');
        send(ws, {
          type: 'assistant_message',
          history: history,
        } as unknown as WsMessage);
        
        // Si el agente está procesando este chat, avisar a la UI
        if (msg.chatId && activeChats.has(msg.chatId)) {
          send(ws, { type: 'typing', isTyping: true });
          send(ws, { 
            type: 'action_log', 
            text: 'Recuperando sesión activa...', 
            chatId: msg.chatId 
          } as WsMessage);
        }
      } else if (msg.type === 'delete_task') {
        const { deleteTask, getUserTasks } = await import('../memory/scheduler-db.ts');
        const { stopLocalTask } = await import('../agent/scheduler-manager.ts');
        if (deleteTask(msg.id, sessionId)) {
          stopLocalTask(msg.id);
          send(ws, {
            type: 'list_tasks',
            tasks: getUserTasks(sessionId),
          } as unknown as WsMessage);
        }
      } else if (msg.type === 'update_task') {
        const { updateTask, getUserTasks } = await import('../memory/scheduler-db.ts');
        const { stopLocalTask, scheduleLocalTask } = await import('../agent/scheduler-manager.ts');
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
            type: 'list_tasks',
            tasks: getUserTasks(sessionId),
          } as unknown as WsMessage);
        }
      } else if (msg.type === 'user_register') {
        const { upsertUser, listAllUsers } = await import('../memory/user-db.ts');
        upsertUser(msg.userId, {
          name: msg.name,
          timezone: msg.timezone,
          telegram_user: msg.telegram_user,
          telegram_token: msg.telegram_token,
          login_pin: msg.login_pin || '0000',
        });
        if (msg.telegram_token && config.channels.telegram) {
          config.channels.telegram.botToken = msg.telegram_token;
          const { startTelegram } = await import('../channels/telegram.ts');
          await startTelegram();
        }
        console.log(chalk.green(`✅ Usuario registrado: ${msg.userId} (${msg.name})`));
        // Enviar lista actualizada de usuarios a todos (o solo al que registró)
        send(ws, { type: 'list_users', users: listAllUsers() });
        // También identificarlo automáticamente
        sessionId = msg.userId;
        send(ws, {
          type: 'status',
          model: config.agent.model,
          sessionId,
          messageCount: 0,
        });
      } else if (msg.type === 'user_update') {
        const { upsertUser, listAllUsers } = await import('../memory/user-db.ts');
        upsertUser(msg.userId, {
          name: msg.name,
          timezone: msg.timezone,
          telegram_user: msg.telegram_user,
          telegram_token: msg.telegram_token,
          login_pin: msg.login_pin,
        });
        if (msg.telegram_token && config.channels.telegram) {
          config.channels.telegram.botToken = msg.telegram_token;
          const { startTelegram } = await import('../channels/telegram.ts');
          await startTelegram();
        }
        console.log(chalk.green(`✅ Usuario actualizado: ${msg.userId}`));
        // Enviar lista actualizada de usuarios
        send(ws, { type: 'list_users', users: listAllUsers() });
      } else if (msg.type === 'user_delete') {
        const { deleteUser, listAllUsers } = await import('../memory/user-db.ts');
        deleteUser(msg.userId);
        console.log(chalk.red(`🗑️ Usuario eliminado: ${msg.userId}`));
        // Enviar lista actualizada
        send(ws, { type: 'list_users', users: listAllUsers() });
      } else if (msg.type === 'list_tasks') {
        const { getUserTasks } = await import('../memory/scheduler-db.ts');
        send(ws, {
          type: 'list_tasks',
          tasks: getUserTasks(sessionId),
        } as unknown as WsMessage);
      } else if (msg.type === 'model_update') {
        const { listModels, upsertModel, deleteModel } = await import('../memory/model-db.ts');
        if (msg.action === 'upsert' && msg.model) {
          upsertModel(msg.model);
          console.log(chalk.green(`📦 Modelo guardado: ${msg.model.name}`));
        } else if (msg.action === 'delete' && msg.name) {
          deleteModel(msg.name);
          console.log(chalk.red(`🗑️ Modelo eliminado: ${msg.name}`));
        }
        // Broadcast lista actualizada a todos los clientes
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            send(client, { type: 'list_models', models: listModels() } as unknown as WsMessage);
          }
        });

      } else if (msg.type === 'chat_update') {
        const { createChat, renameChat, deleteChat, togglePin, listChats, listChannelChats } =
          await import('../memory/chat-db.ts');

        if (msg.action === 'create') {
          createChat(sessionId, msg.expertName, msg.title);
        } else if (msg.action === 'rename' && msg.chatId && msg.title) {
          renameChat(msg.chatId, msg.title);
        } else if (msg.action === 'delete' && msg.chatId) {
          deleteChat(msg.chatId);
        } else if (msg.action === 'pin' && msg.chatId) {
          togglePin(msg.chatId);
        }

        // Re-enviar lista de chats actualizada
        send(ws, {
          type: 'list_chats',
          chats: listChats(sessionId, msg.expertName),
          channelChats: listChannelChats(sessionId),
        } as unknown as WsMessage);
      }
    });

    ws.on('close', () => {
      console.log(chalk.gray(`🌐 WebChat desconectado [${sessionId}]`));
    });

    ws.on('error', (err) => {
      console.error(chalk.red('❌ WS error:'), err.message);
    });
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  const start = (): Promise<void> =>
    new Promise((resolve) => {
      httpServer.listen(config.gateway.port, () => {
        import('../memory/expert-db.ts').then(({ getExpert }) => {
          const generalOverride = getExpert('__general__');
          const activeModel = generalOverride?.model || config.agent.model;

          console.log(chalk.green(`\n🤖 ARGenteIA`));
          console.log(
            chalk.dim(`   Gateway: `) + chalk.white(`http://localhost:${config.gateway.port}`),
          );
          console.log(
            chalk.dim(`   WebChat: `) + chalk.white(`http://localhost:${config.gateway.port}`),
          );
          console.log(
            chalk.dim(`   Modelo:  `) +
              chalk.white(activeModel) +
              (generalOverride ? chalk.yellow(' (DB override)') : ''),
          );
          console.log();
          resolve();
        });
      });
    });

  return { httpServer, wss, start };
}

// Helper para enviar mensajes WS de forma segura
export function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else if (globalWss) {
    // Si la conexión original cerró, buscar otra activa del mismo usuario (por sessionId)
    const targetSessionId = (ws as CustomWebSocket).sessionId;
    if (targetSessionId) {
      globalWss.clients.forEach((client) => {
        if (
          (client as CustomWebSocket).sessionId === targetSessionId &&
          client.readyState === WebSocket.OPEN
        ) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  }
}
