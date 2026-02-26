import TelegramBot from "node-telegram-bot-api";
import chalk from "chalk";
import { getConfig } from "../config/index.ts";
import { runAgent } from "../agent/loop.ts";
import { resetSession, getHistory } from "../memory/session.ts";
import { getTools } from "../tools/index.ts";
import { loadSkills } from "../skills/loader.ts";

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
  return bot;
}

export function startTelegram(): void {
  const config = getConfig();
  const tgConfig = config.channels.telegram;

  if (!tgConfig?.botToken || tgConfig.botToken === "123456:ABCDEF") {
    console.log(
      chalk.yellow(
        "ℹ️  Telegram no configurado (botToken no definido). Canal deshabilitado.",
      ),
    );
    return;
  }

  if (bot) {
    console.log(chalk.gray("📱 Reiniciando bot de Telegram..."));
    bot.stopPolling();
  }

  bot = new TelegramBot(tgConfig.botToken, { polling: true });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";
    const username = msg.from?.username ?? "";
    const firstName = msg.from?.first_name ?? "";

    // Buscar si el usuario existe en la DB (por username de telegram)
    const { listAllUsers } = await import("../memory/user-db.ts");
    const allUsers = listAllUsers();

    // Normalizar: quitar @ para comparar
    const cleanUsername = username.replace(/^@/, "").toLowerCase();

    const dbUser = allUsers.find((u) => {
      const dbTgUser = (u.telegram_user || "").replace(/^@/, "").toLowerCase();
      return dbTgUser === cleanUsername && cleanUsername !== "";
    });

    const effectiveUserId = dbUser ? dbUser.userId : `telegram-${chatId}`;

    const isAuthorized =
      tgConfig.allowFrom.includes(username) ||
      tgConfig.allowFrom.includes(cleanUsername) ||
      !!dbUser;

    if (!isAuthorized) {
      console.log(
        chalk.yellow(
          `⚠️  Telegram: mensaje rechazado de @${username || firstName} (ID: ${chatId})`,
        ),
      );
      await bot!.sendMessage(
        chatId,
        "Lo siento, no estás autorizado para usar este asistente. Por favor, regístrate en la WebChat primero e incluye tu usuario de Telegram.",
      );
      return;
    }

    if (dbUser) {
      console.log(
        chalk.blue(
          `👤 Telegram identificado: @${username} -> ${effectiveUserId}`,
        ),
      );
    }

    console.log(
      chalk.magenta(`📱 Telegram [@${username}]: ${text.slice(0, 60)}`),
    );

    // Comandos
    if (text.startsWith("/")) {
      await handleTelegramCommand(chatId, text, effectiveUserId);
      return;
    }

    // Typing indicator
    await bot!.sendChatAction(chatId, "typing");

    try {
      const result = await runAgent({
        sessionId: effectiveUserId,
        userText: text,
        origin: "telegram",
        telegramChatId: chatId,
        onTyping: async (isTyping) => {
          if (isTyping)
            await bot!.sendChatAction(chatId, "typing").catch(() => {});
        },
      });

      if (!result.text || result.text.trim() === "") {
        console.log(
          chalk.yellow(
            "⚠️  Telegram: el agente devolvió un mensaje vacío. No se envió nada.",
          ),
        );
        return;
      }

      // Telegram soporta Markdown básico
      await bot!
        .sendMessage(chatId, result.text, {
          parse_mode: "Markdown",
        })
        .catch(async () => {
          // Si falla el markdown, enviar como texto plano
          await bot!.sendMessage(chatId, result.text);
        });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await bot!.sendMessage(chatId, `❌ Error: ${errMsg}`);
    }
  });

  bot.on("polling_error", (err) => {
    console.error(chalk.red("❌ Telegram polling error:"), err.message);
  });

  console.log(chalk.magenta(`📱 Telegram bot activo`));
}

async function handleTelegramCommand(
  chatId: number,
  cmd: string,
  sessionId: string,
): Promise<void> {
  const config = getConfig();
  const parts = cmd.split(" ");
  const command = parts[0]?.toLowerCase() ?? "";
  const arg = parts.slice(1).join(" ");

  switch (command) {
    case "/start":
    case "/ayuda":
    case "/help":
      await bot!.sendMessage(
        chatId,
        `🤖 <b>ARGenteIA — Menú de Ayuda</b>\n\n🔹 <b>Comandos de Sistema:</b>\n• /reset — Limpiar historial\n• /model — Ver/cambiar modelo\n• /ollama — Listar modelos locales\n• /status — Estado actual\n• /tools — Herramientas disponibles\n• /skills — Skills cargadas\n• /ayuda — Mostrar este menú\n\n🔹 <b>Gestión de Expertos:</b>\n• /agentes — Listar expertos\n• /crear_agente &lt;nombre&gt;|&lt;modelo&gt;|&lt;prompt&gt; — Crea experto\n• /borrar_agente &lt;nombre&gt; — Elimina experto\n\n⏰ <b>Tareas Programadas:</b>\n• /tareas — Listar tus tareas\n• /borrar_tarea &lt;ID&gt; — Eliminar tarea por ID`,
        { parse_mode: "HTML" },
      );
      break;

    case "/agentes": {
      const { listExperts } = await import("../memory/expert-db.ts");
      const experts = listExperts();
      if (experts.length === 0) {
        await bot!.sendMessage(
          chatId,
          "No hay agentes expertos configurados aún.",
        );
      } else {
        const list = experts
          .map(
            (e) =>
              `• <b>${e.name}</b> (<code>${e.model}</code>)\n  <i>${e.system_prompt.slice(0, 50).replace(/</g, "&lt;").replace(/>/g, "&gt;")}...</i>`,
          )
          .join("\n\n");
        await bot!.sendMessage(
          chatId,
          `🤖 <b>Agentes Expertos Disponibles:</b>\n\n${list}`,
          { parse_mode: "HTML" },
        );
      }
      break;
    }

    case "/crear_agente": {
      const { upsertExpert } = await import("../memory/expert-db.ts");
      const subParts = arg.split("|");
      if (subParts.length < 3) {
        await bot!.sendMessage(
          chatId,
          "❌ Formato inválido. Usá:\n`/crear_agente nombre|modelo|prompt`",
          { parse_mode: "Markdown" },
        );
        return;
      }
      const [name, model, ...promptParts] = subParts;
      const systemPrompt = promptParts.join("|").trim();

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
          { parse_mode: "Markdown" },
        );
      } catch (err: any) {
        await bot!.sendMessage(
          chatId,
          `❌ Error al crear agente: ${err.message}`,
        );
      }
      break;
    }

    case "/borrar_agente": {
      const { deleteExpert, getExpert } =
        await import("../memory/expert-db.ts");
      if (!arg) {
        await bot!.sendMessage(
          chatId,
          "❌ Debes especificar el nombre del agente a borrar.",
        );
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

    case "/reset":
      resetSession(sessionId);
      await bot!.sendMessage(chatId, "✅ Sesión reiniciada.");
      break;

    case "/model":
      if (!arg) {
        const models = Object.keys(config.models).join("\n• ");
        await bot!.sendMessage(
          chatId,
          `Modelos disponibles:\n• ${models}\n\nUso: /model <nombre>`,
        );
      } else if (!config.models[arg]) {
        await bot!.sendMessage(chatId, `❌ Modelo "${arg}" no encontrado.`);
      } else {
        config.agent.model = arg;
        await bot!.sendMessage(chatId, `✅ Modelo cambiado a: ${arg}`);
      }
      break;

    case "/ollama": {
      const { getOllamaModels } = await import("../agent/models.ts");
      const ollamaModels = await getOllamaModels(config);
      if (ollamaModels.length === 0) {
        await bot!.sendMessage(
          chatId,
          "⚠️ No se pudieron obtener modelos de Ollama. Asegúrate de que Ollama esté corriendo localmente.",
        );
      } else {
        const list = ollamaModels.map((m) => `• <code>${m}</code>`).join("\n");
        await bot!.sendMessage(
          chatId,
          `🦙 <b>Modelos de Ollama Disponibles:</b>\n\n${list}\n\n<i>Para usar uno, agrégalo a tu config.json o cámbialo con /model si ya existe.</i>`,
          { parse_mode: "HTML" },
        );
      }
      break;
    }

    case "/status": {
      const history = getHistory(sessionId);
      await bot!.sendMessage(
        chatId,
        `📊 <b>Estado:</b>\nModelo: <code>${config.agent.model}</code>\nMensajes: ${history.length}`,
        { parse_mode: "HTML" },
      );
      break;
    }

    case "/tools": {
      const tools = getTools();
      if (tools.length === 0) {
        await bot!.sendMessage(chatId, "No hay herramientas habilitadas.");
      } else {
        const list = tools.map((t) => `• <b>${t.function.name}</b>`).join("\n");
        await bot!.sendMessage(chatId, `🔧 <b>Herramientas:</b>\n${list}`, {
          parse_mode: "HTML",
        });
      }
      break;
    }

    case "/skills": {
      const skills = await loadSkills();
      await bot!.sendMessage(chatId, `📚 Skills cargadas: ${skills.length}`);
      break;
    }

    case "/tareas": {
      const { getUserTasks } = await import("../memory/scheduler-db.ts");
      const tasks = getUserTasks(sessionId);
      if (tasks.length === 0) {
        await bot!.sendMessage(
          chatId,
          "No tienes tareas programadas actualmente.",
        );
      } else {
        const list = tasks
          .map((t) => `• <b>[ID ${t.id}]</b> "${t.task}"\n  ⏰ <code>${t.cron}</code>`)
          .join("\n\n");
        await bot!.sendMessage(
          chatId,
          `📅 <b>Tus Tareas Programadas:</b>\n\n${list}`,
          { parse_mode: "HTML" },
        );
      }
      break;
    }

    case "/borrar_tarea": {
      const id = parseInt(arg);
      if (isNaN(id)) {
        await bot!.sendMessage(
          chatId,
          "❌ Debes especificar un ID numérico válido. Ej: `/borrar_tarea 12`",
          { parse_mode: "Markdown" },
        );
        return;
      }
      const { deleteTask } = await import("../memory/scheduler-db.ts");
      const { stopLocalTask } = await import("../agent/scheduler-manager.ts");
      if (deleteTask(id, sessionId)) {
        stopLocalTask(id);
        await bot!.sendMessage(chatId, `✅ Tarea con ID ${id} eliminada.`);
      } else {
        await bot!.sendMessage(
          chatId,
          `❌ No se encontró la tarea ${id} o no te pertenece.`,
        );
      }
      break;
    }

    case "/profile": {
      const { getUser } = await import("../memory/user-db.ts");
      const user = getUser(sessionId);
      if (!user) {
        await bot!.sendMessage(
          chatId,
          "❌ No tienes un perfil configurado aún. ¡Dime 'Hola' para empezar!",
        );
      } else {
        await bot!.sendMessage(
          chatId,
          `👤 <b>Tu Perfil:</b>\n• Nombre: ${user.name || "Sin nombre"}\n• Zona Horaria: <code>${user.timezone}</code>\n• Creado: ${user.created_at}`,
          { parse_mode: "HTML" },
        );
      }
      break;
    }

    default:
      await bot!.sendMessage(
        chatId,
        `Comando desconocido. Usá /help para ver los disponibles.`,
      );
  }
}
