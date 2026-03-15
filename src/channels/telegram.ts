import chalk from 'chalk';
import TelegramBot from 'node-telegram-bot-api';
import { runAgent } from '../agent/loop.ts';
import { getConfig } from '../config/index.ts';
import { resetSession } from '../memory/session.ts';
import { loadSkills } from '../skills/loader.ts';
import { getTools } from '../tools/index.ts';

let bot: TelegramBot | null = null;
let activeToken: string | null = null;
let lastErrorTime = 0;
let errorCount = 0;

export function getBot(): TelegramBot | null {
  return bot;
}

export async function stopTelegram(): Promise<void> {
  if (bot) {
    console.log(chalk.gray('📱 Deteniendo bot de Telegram...'));
    try {
      await bot.stopPolling();
    } catch (err) {
      console.error(chalk.red('❌ Error al detener polling:'), err);
    }
    bot = null;
    activeToken = null;
  }
}

export async function startTelegram(): Promise<void> {
  const config = getConfig();
  const tgConfig = config.channels.telegram;

  const newToken = tgConfig?.botToken;

  if (!newToken || newToken === '123456:ABCDEF') {
    if (bot) {
      console.log(chalk.yellow('ℹ️  Telegram deshabilitado (token removido o inválido).'));
      await stopTelegram();
    }
    return;
  }

  // Si el token es el mismo y el bot ya existe, no reiniciamos innecesariamente
  if (bot && activeToken === newToken) {
    console.log(chalk.blue('ℹ️  Telegram ya está activo con el token actual.'));
    return;
  }

  if (bot) {
    console.log(chalk.gray('📱 Reiniciando bot de Telegram por cambio de token...'));
    await stopTelegram();
    // Pequeño delay para permitir que Telegram libere el webhook/polling
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const tokenLog = newToken.slice(0, 6) + '...' + newToken.slice(-4);
  console.log(chalk.magenta(`📱 Conectando a Telegram con token: ${tokenLog}`));

  bot = new TelegramBot(newToken, { polling: true });
  activeToken = newToken;
  console.log(chalk.green('✅ Bot de Telegram iniciado y escuchando...'));

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? '';
    const username = msg.from?.username ?? '';
    const firstName = msg.from?.first_name ?? '';

    // Buscar si el usuario existe en la DB (por username de telegram)
    const { listAllUsers } = await import('../memory/user-db.ts');
    const allUsers = listAllUsers();

    // Normalizar: quitar @ para comparar
    const cleanUsername = username.replace(/^@/, '').toLowerCase();

    const dbUser = allUsers.find((u) => {
      // 1. Intentar por ID (más fiable)
      if (u.telegram_id === chatId) return true;
      
      // 2. Intentar por Username (fallback)
      const dbTgUser = (u.telegram_user || '').replace(/^@/, '').toLowerCase();
      return dbTgUser === cleanUsername && cleanUsername !== '';
    });

    const effectiveUserId = dbUser ? dbUser.userId : `telegram-${chatId}`;

    const isAuthorized =
      tgConfig.allowFrom.includes(username) ||
      tgConfig.allowFrom.includes(cleanUsername) ||
      !!dbUser;

    if (!isAuthorized) {
      console.log(
        chalk.yellow(`⚠️  Telegram: mensaje rechazado de @${username || firstName} (ID: ${chatId})`),
      );
      await bot!.sendMessage(
        chatId,
        'Lo siento, no estás autorizado para usar este asistente. Por favor, regístrate en la WebChat primero e incluye tu usuario de Telegram.',
      );
      return;
    }

    if (dbUser) {
      console.log(chalk.blue(`👤 Telegram identificado: @${username} -> ${effectiveUserId}`));
    }

    console.log(chalk.magenta(`📱 Telegram [@${username}]: ${text.slice(0, 60)}`));

    // Comandos
    if (text.startsWith('/')) {
      await handleTelegramCommand(chatId, text, effectiveUserId);
      return;
    }

    // Typing indicator
    await bot!.sendChatAction(chatId, 'typing');

    try {
      const { getOrCreateChannelChat } = await import('../memory/chat-db.ts');
      const channelChat = getOrCreateChannelChat(effectiveUserId, 'telegram');
 
      // Persistir el mensaje del usuario en la BD
      const { saveMessage } = await import('../memory/message-db.ts');
      saveMessage({
        userId: effectiveUserId,
        chatId: channelChat.id,
        role: 'user',
        content: text,
        origin: 'telegram',
      });
 
      // Interceptar Tags (@AgentName) para invocar expertos en grupos o chat directo
      let finalUserText = text;
      const { listExperts } = await import('../memory/expert-db.ts');
      const experts = listExperts(true);

      const tagMatch = text.match(/^@([a-zA-Z0-9_]+)\b/i);
      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        // Buscar si coincide con el "name" (simplificado) de un agente
        const expert = experts.find(
          (e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '') === tagName,
        );

        if (expert) {
          console.log(chalk.blue(`🎯 Tag detectado para experto: ${expert.name}`));
          // Removemos el tag del mensaje y forzamos el pedido
          const cleanMessage = text.replace(tagMatch[0], '').trim();
          finalUserText = `(OBLIGATORIO: ACTÚA COMO EL EXPERTO "${expert.name}". EL USUARIO TE HA INVOCADO DIRECTAMENTE. IGNORA TU ROL DE ORQUESTADOR POR AHORA Y RESPONDE ESTA CONSULTA CON ESE ROL) Consulta: ${cleanMessage}`;
        }
      } else {
        // It's a normal message, we enforce the Orchestrator logic to show buttons automatically!
        const orquestador = experts.find((e) => e.name.includes('Orquestador'));
        if (orquestador) {
          finalUserText = `(OBLIGATORIO: ACTUARÁS COMO EL ORQUESTADOR ESTRICTAMENTE. IGNORA EL PERFIL BASE Y APLICA ESTAR REGLAS: ${orquestador.system_prompt})\nConsulta del usuario: ${text}`;
        }
      }

      const result = await runAgent({
        userId: effectiveUserId,
        chatId: channelChat.id,
        userText: finalUserText,
        origin: 'telegram',
        telegramChatId: chatId,
        onAction: (text) => {
          if (bot)
            bot.sendMessage(chatId, `⏳ <i>${text}</i>`, { parse_mode: 'HTML' }).catch(() => {});
        },
        onTyping: (isTyping) => {
          if (bot && isTyping) {
            bot.sendChatAction(chatId, 'typing').catch(() => {});
          }
        },
      });

      if (!result.text || result.text.trim() === '') {
        console.log(
          chalk.yellow('⚠️  Telegram: el agente devolvió un mensaje vacío. No se envió nada.'),
        );
        return;
      }

      // Check if the output is a JSON string (Hybrid UI response from Orquestador)
      let parsedJson: any = null;
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const { default: JSON5 } = await import('json5');
          parsedJson = JSON5.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Not valid JSON, process as regular text
      }

      if (parsedJson && parsedJson.keyboard_type === 'inline' && parsedJson.botones) {
        // Hybrid UI detected
        console.log(
          chalk.cyan(`🔌 Renderizando Menú Híbrido Telegram: ${parsedJson.botones.length} botones`),
        );
        const textToSend = parsedJson.respuesta_texto || 'He aquí algunas opciones:';

        // Convert the bot buttons array into Telegram's format (2 per row max)
        const inlineKeyboard = [];
        let currentRow = [];
        for (const btn of parsedJson.botones) {
          currentRow.push({ text: btn.text, callback_data: btn.callback_data });
          if (currentRow.length === 2) {
            inlineKeyboard.push(currentRow);
            currentRow = [];
          }
        }
        if (currentRow.length > 0) inlineKeyboard.push(currentRow);

        await bot!.sendMessage(chatId, textToSend, {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        });

        // Override result text for WebChat so it sees the pure text, not the JSON string
        result.text =
          textToSend + '\n' + parsedJson.botones.map((b: any) => `[${b.text}]`).join(' ');
      } else {
        // Standard Text response
        // Telegram soporta Markdown básico
        await bot!
          .sendMessage(chatId, result.text, {
            parse_mode: 'Markdown',
          })
          .catch(async () => {
            // Si falla el markdown, intentar con HTML
            try {
              await bot!.sendMessage(chatId, result.text, { parse_mode: 'HTML' });
            } catch (err) {
              // Si falla el HTML (por tags mal cerrados), enviar como texto plano
              await bot!.sendMessage(chatId, result.text);
            }
          });
      }

      // Notificar a WebChat para actualizar preview en la barra lateral e historial de chat actual
      const { listChats, listChannelChats } = await import('../memory/chat-db.ts');
      const { broadcastToUser } = await import('../gateway/server.ts');

      broadcastToUser(effectiveUserId, {
        type: 'user_message',
        text: text,
        chatId: channelChat.id,
        sessionId: effectiveUserId,
      } as any);

      broadcastToUser(effectiveUserId, {
        type: 'assistant_message',
        text: result.text,
        model: result.model,
        usage: result.usage,
        latencyMs: result.latencyMs,
        sessionId: effectiveUserId,
        chatId: channelChat.id,
        origin: 'telegram',
        timestamp: new Date().toISOString(),
      } as any);

      broadcastToUser(effectiveUserId, {
        type: 'list_chats',
        chats: listChats(effectiveUserId, undefined), // Enviar TODOS los chats web para no pisar el filtro de la UI
        channelChats: listChannelChats(effectiveUserId),
      } as any);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await bot!.sendMessage(chatId, `❌ Error: ${errMsg}`);
    }
  });

  bot.on('polling_error', (err: any) => {
    const now = Date.now();
    errorCount++;

    const isNetworkError = err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT';

    if (now - lastErrorTime > 30000 || !isNetworkError) {
      const countMsg = errorCount > 1 ? ` (Ocurrido ${errorCount} veces)` : '';
      console.error(
        chalk.red(`❌ Telegram error [${err.code || 'CODE_UNKNOWN'}]:`),
        err.message + countMsg,
      );
      lastErrorTime = now;
      errorCount = 0;
    }
  });

  // Handle Inline Button clicks (Callback Queries)
  bot.on('callback_query', async (query) => {
    if (!query.message || !query.data) return;

    const chatId = query.message.chat.id;
    const telegramUsername = query.from?.username ?? query.from?.first_name ?? 'Desconocido';
    const callbackData = query.data;

    console.log(chalk.cyan(`👉 Telegram Callback (@${telegramUsername}): ${callbackData}`));

    // Acknowledge the callback directly to remove loading state on the button
    await bot!.answerCallbackQuery(query.id);

    // Identify user
    const { listAllUsers } = await import('../memory/user-db.ts');
    const allUsers = listAllUsers();
    const cleanUsername = telegramUsername.replace(/^@/, '').toLowerCase();
    const dbUser = allUsers.find((u) => {
      const dbTgUser = (u.telegram_user || '').replace(/^@/, '').toLowerCase();
      return dbTgUser === cleanUsername && cleanUsername !== '';
    });
    const effectiveUserId = dbUser ? dbUser.userId : `telegram-${chatId}`;

    // Simulate sending the callback_data as a user message
    const simulatedText = `(Botón presionado: ${callbackData})`;

    await bot!.sendChatAction(chatId, 'typing');

    try {
      const { getOrCreateChannelChat } = await import('../memory/chat-db.ts');
      const channelChat = getOrCreateChannelChat(effectiveUserId, 'telegram');

      const result = await runAgent({
        userId: effectiveUserId,
        chatId: channelChat.id,
        userText: simulatedText,
        origin: 'telegram',
        telegramChatId: chatId,
        onAction: (text) => {
          if (bot)
            bot.sendMessage(chatId, `⏳ <i>${text}</i>`, { parse_mode: 'HTML' }).catch(() => {});
        },
        onTyping: (isTyping) => {
          if (bot && isTyping) {
            bot.sendChatAction(chatId, 'typing').catch(() => {});
          }
        },
      });

      if (result.text && result.text.trim() !== '') {
        await bot!.sendMessage(chatId, result.text).catch(async () => {
          // fallback
          await bot!.sendMessage(chatId, result.text);
        });

        // Notify WebChat
        const { listChats, listChannelChats } = await import('../memory/chat-db.ts');
        const { broadcastToUser } = await import('../gateway/server.ts');

        broadcastToUser(effectiveUserId, {
          type: 'assistant_message',
          text: result.text,
          model: result.model,
          usage: result.usage,
          latencyMs: result.latencyMs,
          sessionId: effectiveUserId,
          chatId: channelChat.id,
          origin: 'telegram',
          timestamp: new Date().toISOString(),
        } as any);
      }
    } catch (err: any) {
      await bot!.sendMessage(chatId, `❌ Error en botón: ${err.message || String(err)}`);
    }
  });

  console.log(chalk.magenta(`📱 Telegram bot activo`));
}

async function handleTelegramCommand(
  chatId: number,
  cmd: string,
  sessionId: string,
): Promise<void> {
  const config = getConfig();
  const parts = cmd.split(' ');
  const command = parts[0]?.toLowerCase() ?? '';
  const arg = parts.slice(1).join(' ');

  switch (command) {
    case '/start':
    case '/ayuda':
    case '/help':
      await bot!.sendMessage(
        chatId,
        `🤖 <b>ARGenteIA — Menú de Ayuda</b>\n\n🔹 <b>Comandos de Sistema:</b>\n• /reset — Limpiar historial\n• /model — Ver/cambiar modelo\n• /ollama — Listar modelos locales\n• /status — Estado actual\n• /tools — Herramientas disponibles\n• /skills — Skills cargadas\n• /ayuda — Mostrar este menú\n\n🔹 <b>Gestión de Expertos:</b>\n• /agentes — Listar expertos\n• /crear_agente &lt;nombre&gt;|&lt;modelo&gt;|&lt;prompt&gt; — Crea experto\n• /borrar_agente &lt;nombre&gt; — Elimina experto\n\n⏰ <b>Tareas Programadas:</b>\n• /tareas — Listar tus tareas\n• /borrar_tarea &lt;ID&gt; — Eliminar tarea por ID`,
        { parse_mode: 'HTML' },
      );
      break;

    case '/agentes': {
      const { listExperts } = await import('../memory/expert-db.ts');
      const experts = listExperts();
      if (experts.length === 0) {
        await bot!.sendMessage(chatId, 'No hay agentes expertos configurados aún.');
      } else {
        const list = experts
          .map(
            (e) =>
              `• <b>${e.name}</b> (<code>${e.model}</code>)\n  <i>${e.system_prompt.slice(0, 50).replace(/</g, '&lt;').replace(/>/g, '&gt;')}...</i>`,
          )
          .join('\n\n');
        await bot!.sendMessage(chatId, `🤖 <b>Agentes Expertos Disponibles:</b>\n\n${list}`, {
          parse_mode: 'HTML',
        });
      }
      break;
    }

    case '/crear_agente': {
      const { upsertExpert } = await import('../memory/expert-db.ts');
      const subParts = arg.split('|');
      if (subParts.length < 3) {
        await bot!.sendMessage(
          chatId,
          '❌ Formato inválido. Usá:\n`/crear_agente nombre|modelo|prompt`',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      const [name, model, ...promptParts] = subParts;
      const systemPrompt = promptParts.join('|').trim();

      try {
        upsertExpert({
          name: name.trim(),
          model: model.trim(),
          system_prompt: systemPrompt,
          tools: [],
          experts: [],
          temperature: 0.7,
        });
        await bot!.sendMessage(
          chatId,
          `✅ Agente experto "*${name.trim()}*" creado/actualizado con éxito.`,
          { parse_mode: 'Markdown' },
        );
      } catch (err: unknown) {
        await bot!.sendMessage(
          chatId,
          `❌ Error al crear agente: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      break;
    }

    case '/borrar_agente': {
      const { deleteExpert, getExpert } = await import('../memory/expert-db.ts');
      if (!arg) {
        await bot!.sendMessage(chatId, '❌ Debes especificar el nombre del agente a borrar.');
        return;
      }
      const name = arg.trim();
      if (!getExpert(name)) {
        await bot!.sendMessage(chatId, `❌ El agente "${name}" no existe.`);
        return;
      }
      deleteExpert(name);
      await bot!.sendMessage(chatId, `✅ Agente experto "${name}" eliminado.`);
      break;
    }

    case '/reset': {
      const { getOrCreateChannelChat } = await import('../memory/chat-db.ts');
      const channelChat = getOrCreateChannelChat(sessionId, 'telegram');
      resetSession(channelChat.id);
      await bot!.sendMessage(chatId, '✅ Sesión reiniciada.');
      break;
    }

    case '/model':
      if (!arg) {
        const models = Object.keys(config.models).join('\n• ');
        await bot!.sendMessage(chatId, `Modelos disponibles:\n• ${models}\n\nUso: /model <nombre>`);
      } else if (!config.models[arg]) {
        await bot!.sendMessage(chatId, `❌ Modelo "${arg}" no encontrado.`);
      } else {
        config.agent.model = arg;
        await bot!.sendMessage(chatId, `✅ Modelo cambiado a: ${arg}`);
      }
      break;

    case '/ollama': {
      const { getOllamaModels } = await import('../agent/models.ts');
      const ollamaModels = await getOllamaModels(config);
      if (ollamaModels.length === 0) {
        await bot!.sendMessage(
          chatId,
          '⚠️ No se pudieron obtener modelos de Ollama. Asegúrate de que Ollama esté corriendo localmente.',
        );
      } else {
        const list = ollamaModels.map((m) => `• <code>${m}</code>`).join('\n');
        await bot!.sendMessage(
          chatId,
          `🦙 <b>Modelos de Ollama Disponibles:</b>\n\n${list}\n\n<i>Para usar uno, agrégalo a tu config.json o cámbialo con /model si ya existe.</i>`,
          { parse_mode: 'HTML' },
        );
      }
      break;
    }

    case '/status': {
      const { getOrCreateChannelChat } = await import('../memory/chat-db.ts');
      const channelChat = getOrCreateChannelChat(sessionId, 'telegram');
      const { getMessages } = await import('../memory/message-db.ts');
      const history = getMessages(channelChat.id);
      await bot!.sendMessage(
        chatId,
        `📊 <b>Estado:</b>\nModelo: <code>${config.agent.model}</code>\nMensajes: ${history.length}`,
        { parse_mode: 'HTML' },
      );
      break;
    }

    case '/tools': {
      const tools = await getTools();
      if (tools.length === 0) {
        await bot!.sendMessage(chatId, 'No hay herramientas habilitadas.');
      } else {
        const list = tools.map((t) => `• <b>${t.function.name}</b>`).join('\n');
        await bot!.sendMessage(chatId, `🔧 <b>Herramientas:</b>\n${list}`, {
          parse_mode: 'HTML',
        });
      }
      break;
    }

    case '/skills': {
      const skills = await loadSkills();
      await bot!.sendMessage(chatId, `📚 Skills cargadas: ${skills.length}`);
      break;
    }

    case '/tareas': {
      const { getUserTasks } = await import('../memory/scheduler-db.ts');
      const tasks = getUserTasks(sessionId);
      if (tasks.length === 0) {
        await bot!.sendMessage(chatId, 'No tienes tareas programadas actualmente.');
      } else {
        const list = tasks
          .map((t) => `• <b>[ID ${t.id}]</b> "${t.task}"\n  ⏰ <code>${t.cron}</code>`)
          .join('\n\n');
        await bot!.sendMessage(chatId, `📅 <b>Tus Tareas Programadas:</b>\n\n${list}`, {
          parse_mode: 'HTML',
        });
      }
      break;
    }

    case '/borrar_tarea': {
      const id = parseInt(arg);
      if (isNaN(id)) {
        await bot!.sendMessage(
          chatId,
          '❌ Debes especificar un ID numérico válido. Ej: `/borrar_tarea 12`',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      const { deleteTask } = await import('../memory/scheduler-db.ts');
      const { stopLocalTask } = await import('../agent/scheduler-manager.ts');
      if (deleteTask(id, sessionId)) {
        stopLocalTask(id);
        await bot!.sendMessage(chatId, `✅ Tarea con ID ${id} eliminada.`);
      } else {
        await bot!.sendMessage(chatId, `❌ No se encontró la tarea ${id} o no te pertenece.`);
      }
      break;
    }

    case '/profile': {
      const { getUser } = await import('../memory/user-db.ts');
      const user = getUser(sessionId);
      if (!user) {
        await bot!.sendMessage(
          chatId,
          "❌ No tienes un perfil configurado aún. ¡Dime 'Hola' para empezar!",
        );
      } else {
        await bot!.sendMessage(
          chatId,
          `👤 <b>Tu Perfil:</b>\n• Nombre: ${user.name || 'Sin nombre'}\n• Zona Horaria: <code>${user.timezone}</code>\n• Creado: ${user.created_at}`,
          { parse_mode: 'HTML' },
        );
      }
      break;
    }

    default:
      await bot!.sendMessage(chatId, `Comando desconocido. Usá /help para ver los disponibles.`);
  }
}
