import { resolve } from 'node:path';
import { unlinkSync, existsSync, mkdirSync } from 'node:fs';
import type { Config } from '../config/index.ts';
import { registerTool } from './index.ts';
import { getBot } from '../channels/telegram.ts';
// @ts-expect-error screenshot-desktop has no type declarations
import screenshot from 'screenshot-desktop';

export function registerScreenshotTool(_config: Config): void {
  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'capture_pc_screenshot',
        description:
          'Captura una imagen (screenshot) de la pantalla actual del escritorio de la PC y la envía por Telegram.',
        parameters: {
          type: 'object',
          properties: {
            caption: {
              type: 'string',
              description: 'Mensaje opcional que acompañará a la imagen.',
            },
          },
        },
      },
    },
    handler: async (args, context) => {
      const caption = String(args['caption'] ?? 'Captura de pantalla del PC.');

      const bot = getBot();
      if (!bot) {
        return 'Error: El bot de Telegram no está activo o configurado.';
      }

      // Extraer chatId de la sessionId (formato: telegram-123456)
      if (!context.sessionId.startsWith('telegram-')) {
        return 'Error: Esta herramienta solo funciona en conversaciones de Telegram.';
      }
      const chatId = context.sessionId.replace('telegram-', '');

      // Asegurar carpeta temp
      const tempDir = resolve('temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir);
      }

      const tempFile = resolve(tempDir, `screenshot_${Date.now()}.png`);

      try {
        await screenshot({ filename: tempFile });

        await bot.sendPhoto(chatId, tempFile, {
          caption,
        });

        // Intentar borrar el archivo temporal después de un momento
        setTimeout(() => {
          try {
            if (existsSync(tempFile)) unlinkSync(tempFile);
          } catch {
            /* ignore cleanup errors */
          }
        }, 10000);

        return 'Screenshot capturado y enviado correctamente a Telegram.';
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error al capturar o enviar el screenshot: ${message}`;
      }
    },
  });
}
