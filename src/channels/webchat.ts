import { WebSocket } from 'ws';
import { runAgent } from '../agent/loop.ts';
import { getConfig } from '../config/index.ts';
import { resetSession, getHistory } from '../memory/session.ts';
import { getTools } from '../tools/index.ts';
import { loadSkills } from '../skills/loader.ts';
import { send } from '../gateway/server.ts';
import type { WsMessage } from '../gateway/protocol.ts';

interface WebChatHandlerOpts {
  ws: WebSocket;
  sessionId: string;
  text: string;
  send: (ws: WebSocket, msg: WsMessage) => void;
  expertName?: string;
}

export async function handleWebChatMessage(opts: WebChatHandlerOpts): Promise<void> {
  const { ws, sessionId, text } = opts;
  const trimmed = text.trim();

  // ─── Comandos ───────────────────────────────────────────────────────────────
  if (trimmed.startsWith('/')) {
    await handleCommand(ws, sessionId, trimmed, send);
    return;
  }

  // ─── Mensaje normal → agente ────────────────────────────────────────────────
  send(ws, { type: 'typing', isTyping: true });

  try {
    let result;

    // Si el usuario seleccionó un experto específico, vamos directo a él
    if (opts.expertName) {
      const { runExpert } = await import('../agent/expert-runner.ts');
      const { saveMessage } = await import('../memory/message-db.ts');

      const resultExpert = await runExpert({
        expertName: opts.expertName,
        task: opts.text,
        userId: sessionId,
      });

      // Persistir respuesta del experto
      saveMessage({
        userId: sessionId,
        role: 'assistant',
        content: resultExpert.text,
        origin: 'web',
        expertName: opts.expertName,
      });

      result = {
        text: resultExpert.text,
        model: `Expert: ${opts.expertName}`,
        usage: resultExpert.usage,
        latencyMs: resultExpert.latencyMs,
      };
    } else {
      result = await runAgent({
        sessionId,
        userText: text,
        origin: 'web',
        onTyping: (isTyping) => send(ws, { type: 'typing', isTyping }),
      });
    }

    send(ws, {
      type: 'assistant_message',
      text: result.text,
      model: result.model,
      usage: result.usage,
      latencyMs: result.latencyMs,
      sessionId,
      origin: 'web',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    send(ws, { type: 'error', message: `Error del agente: ${msg}` });
  } finally {
    send(ws, { type: 'typing', isTyping: false });
  }
}

async function handleCommand(
  ws: WebSocket,
  sessionId: string,
  cmd: string,
  sendFn: (ws: WebSocket, msg: WsMessage) => void,
): Promise<void> {
  const config = getConfig();
  const parts = cmd.slice(1).split(' ');
  const command = parts[0]?.toLowerCase() ?? '';
  const arg = parts.slice(1).join(' ');

  switch (command) {
    case 'reset': {
      resetSession(sessionId);
      sendFn(ws, {
        type: 'command_result',
        command,
        result: '✅ Sesión reiniciada.',
      });
      break;
    }

    case 'model': {
      if (!arg) {
        const models = Object.keys(config.models)
          .map((m) => `  - ${m}`)
          .join('\n');
        sendFn(ws, {
          type: 'command_result',
          command,
          result: `Modelos disponibles:\n${models}\n\nUso: /model <nombre>`,
        });
      } else if (!config.models[arg]) {
        sendFn(ws, {
          type: 'command_result',
          command,
          result: `❌ Modelo "${arg}" no encontrado en config.json`,
        });
      } else {
        config.agent.model = arg;
        sendFn(ws, {
          type: 'command_result',
          command,
          result: `✅ Modelo cambiado a: ${arg}`,
        });
      }
      break;
    }

    case 'status': {
      const history = getHistory(sessionId);
      sendFn(ws, {
        type: 'status',
        model: config.agent.model,
        sessionId,
        messageCount: history.length,
      });
      break;
    }

    case 'tools': {
      const tools = getTools();
      if (tools.length === 0) {
        sendFn(ws, {
          type: 'command_result',
          command,
          result: 'No hay herramientas habilitadas.',
        });
      } else {
        const list = tools
          .map((t) => `  - **${t.function.name}**: ${t.function.description}`)
          .join('\n');
        sendFn(ws, {
          type: 'command_result',
          command,
          result: `Herramientas habilitadas:\n${list}`,
        });
      }
      break;
    }

    case 'skills': {
      const skills = await loadSkills();
      if (skills.length === 0) {
        sendFn(ws, {
          type: 'command_result',
          command,
          result: 'No hay skills cargadas. Creá archivos .md en la carpeta /skills/.',
        });
      } else {
        sendFn(ws, {
          type: 'command_result',
          command,
          result: `${skills.length} skill(s) cargada(s).`,
        });
      }
      break;
    }

    case 'ollama': {
      const { getOllamaModels } = await import('../agent/models.ts');
      const ollamaModels = await getOllamaModels(config);
      if (ollamaModels.length === 0) {
        sendFn(ws, {
          type: 'command_result',
          command,
          result:
            '⚠️ No se pudieron obtener modelos de Ollama. Asegúrate de que Ollama esté corriendo localmente.',
        });
      } else {
        const list = ollamaModels.map((m) => `  - ${m}`).join('\n');
        sendFn(ws, {
          type: 'command_result',
          command,
          result: `Modelos de Ollama disponibles:\n${list}\n\nUso: Para usar uno, agrégalo a tu config.json o cámbialo con /model si ya existe.`,
        });
      }
      break;
    }

    default:
      sendFn(ws, {
        type: 'command_result',
        command,
        result: `Comando desconocido: /${command}\n\nComandos disponibles: /reset, /model, /status, /tools, /skills`,
      });
  }
}
