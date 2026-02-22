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
    console.log(chalk.yellow("ℹ️  Telegram no configurado (botToken no definido). Canal deshabilitado."));
    return;
  }

  bot = new TelegramBot(tgConfig.botToken, { polling: true });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";
    const username = msg.from?.username ?? msg.from?.first_name ?? "";
    const sessionId = `telegram-${chatId}`;

    // Verificar allowlist
    if (tgConfig.allowFrom.length > 0 && !tgConfig.allowFrom.includes(username)) {
      console.log(chalk.yellow(`⚠️  Telegram: mensaje rechazado de @${username}`));
      await bot!.sendMessage(chatId, "Lo siento, no estás autorizado para usar este asistente.");
      return;
    }

    console.log(chalk.magenta(`📱 Telegram [@${username}]: ${text.slice(0, 60)}`));

    // Comandos
    if (text.startsWith("/")) {
      await handleTelegramCommand(chatId, text, sessionId);
      return;
    }

    // Typing indicator
    await bot!.sendChatAction(chatId, "typing");

    try {
      const result = await runAgent({
        sessionId,
        userText: text,
        onTyping: async (isTyping) => {
          if (isTyping) await bot!.sendChatAction(chatId, "typing").catch(() => {});
        },
      });

      if (!result.text || result.text.trim() === "") {
        console.log(chalk.yellow("⚠️  Telegram: el agente devolvió un mensaje vacío. No se envió nada."));
        return;
      }

      // Telegram soporta Markdown básico
      await bot!.sendMessage(chatId, result.text, {
        parse_mode: "Markdown",
      }).catch(async () => {
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

async function handleTelegramCommand(chatId: number, cmd: string, sessionId: string): Promise<void> {
  const config = getConfig();
  const parts = cmd.split(" ");
  const command = parts[0]?.toLowerCase() ?? "";
  const arg = parts.slice(1).join(" ");

  switch (command) {
    case "/start":
    case "/help":
      await bot!.sendMessage(
        chatId,
        `🤖 *ARGenteIA*\n\nComandos:\n• /reset — Limpiar historial\n• /model — Ver/cambiar modelo\n• /status — Estado actual\n• /tools — Herramientas disponibles\n• /skills — Skills cargadas`,
        { parse_mode: "Markdown" },
      );
      break;

    case "/reset":
      resetSession(sessionId);
      await bot!.sendMessage(chatId, "✅ Sesión reiniciada.");
      break;

    case "/model":
      if (!arg) {
        const models = Object.keys(config.models).join("\n• ");
        await bot!.sendMessage(chatId, `Modelos disponibles:\n• ${models}\n\nUso: /model <nombre>`);
      } else if (!config.models[arg]) {
        await bot!.sendMessage(chatId, `❌ Modelo "${arg}" no encontrado.`);
      } else {
        config.agent.model = arg;
        await bot!.sendMessage(chatId, `✅ Modelo cambiado a: ${arg}`);
      }
      break;

    case "/status": {
      const history = getHistory(sessionId);
      await bot!.sendMessage(chatId, `📊 *Estado:*\nModelo: \`${config.agent.model}\`\nMensajes: ${history.length}`, { parse_mode: "Markdown" });
      break;
    }

    case "/tools": {
      const tools = getTools();
      if (tools.length === 0) {
        await bot!.sendMessage(chatId, "No hay herramientas habilitadas.");
      } else {
        const list = tools.map((t) => `• *${t.function.name}*`).join("\n");
        await bot!.sendMessage(chatId, `🔧 *Herramientas:*\n${list}`, { parse_mode: "Markdown" });
      }
      break;
    }

    case "/skills": {
      const skills = await loadSkills();
      await bot!.sendMessage(chatId, `📚 Skills cargadas: ${skills.length}`);
      break;
    }

    case "/profile": {
      const { getUser } = await import("../memory/user-db.ts");
      const user = getUser(sessionId);
      if (!user) {
        await bot!.sendMessage(chatId, "❌ No tienes un perfil configurado aún. ¡Dime 'Hola' para empezar!");
      } else {
        await bot!.sendMessage(chatId, `👤 *Tu Perfil:*\n• Nombre: ${user.name || 'Sin nombre'}\n• Zona Horaria: \`${user.timezone}\`\n• Creado: ${user.created_at}`, { parse_mode: "Markdown" });
      }
      break;
    }

    default:
      await bot!.sendMessage(chatId, `Comando desconocido. Usá /help para ver los disponibles.`);
  }
}
