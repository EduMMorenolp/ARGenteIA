import { resolve } from "node:path";
import { existsSync, statSync } from "node:fs";
import type { Config } from "../config/index.ts";
import { registerTool } from "./index.ts";
import { getBot } from "../channels/telegram.ts";

export function registerSendFile(config: Config): void {
  registerTool({
    isEnabled: () => true, // Habilitado si Telegram lo está
    spec: {
      type: "function",
      function: {
        name: "send_file_telegram",
        description:
          "Envía un archivo local al usuario a través de Telegram. Úsalo cuando el usuario pida un archivo (documento, imagen, excel, etc.).\nIMPORTANTE: Usa siempre rutas absolutas o usa '$HOME' para referirte a la carpeta del usuario. NO pongas comillas extra dentro del parámetro path.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                "Ruta al archivo. Ejemplo: '$HOME\\Downloads\\archivo.xlsx' o 'C:\\Users\\admin\\file.txt'",
            },
            caption: {
              type: "string",
              description:
                "Opcional: Un mensaje de texto para acompañar al archivo.",
            },
          },
          required: ["path"],
        },
      },
    },
    handler: async (args, context) => {
      let rawPath = String(args["path"] ?? "").trim();
      const caption = String(args["caption"] ?? "");

      // Eliminar comillas accidentales que el modelo a veces pone alrededor de la ruta
      if (
        (rawPath.startsWith('"') && rawPath.endsWith('"')) ||
        (rawPath.startsWith("'") && rawPath.endsWith("'"))
      ) {
        rawPath = rawPath.slice(1, -1);
      }

      // Resolver ~ o $HOME
      const homeDir =
        process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"] ||
        "";
      if (rawPath.startsWith("~")) {
        rawPath = rawPath.replace("~", homeDir);
      } else if (rawPath.includes("$HOME")) {
        rawPath = rawPath.replace(/\$HOME/g, homeDir);
      }

      const filePath = resolve(rawPath);

      if (!existsSync(filePath)) {
        return `Error: El archivo "${filePath}" no existe.`;
      }

      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        return `Error: "${filePath}" es un directorio. Solo puedo enviar archivos individuales.`;
      }

      // Límite de Telegram para bots: 50MB (aprox 52,428,800 bytes)
      const MAX_SIZE = 50 * 1024 * 1024;
      if (stats.size > MAX_SIZE) {
        return `Error: El archivo es demasiado grande (${(stats.size / 1024 / 1024).toFixed(2)} MB). El límite de Telegram es de 50 MB.`;
      }

      const bot = getBot();
      if (!bot) {
        return "Error: El bot de Telegram no está activo o configurado.";
      }

      // 1. Usar telegramChatId directamente si existe en el contexto
      let chatId: string | number | undefined = context.telegramChatId;

      // 2. Fallback: Extraer de sessionId si tiene el prefijo clásico
      if (!chatId && context.sessionId.startsWith("telegram-")) {
        chatId = context.sessionId.replace("telegram-", "");
      }

      if (!chatId) {
        return "Error: Esta herramienta solo funciona en conversaciones de Telegram.";
      }

      try {
        await bot.sendDocument(chatId, filePath, {
          caption,
        });
        return `Archivo "${filePath.split(/[\\/]/).pop()}" enviado correctamente a Telegram.`;
      } catch (err: any) {
        return `Error al enviar el archivo por Telegram: ${err.message}`;
      }
    },
  });
}
