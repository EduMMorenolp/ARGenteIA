import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
// @ts-expect-error screenshot-desktop has no type declarations
import screenshot from 'screenshot-desktop';
import { getBot } from '../channels/telegram.ts';
import type { Config } from '../config/index.ts';
import { registerTool } from './index.ts';

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

      const chatId = context.sessionId.startsWith('telegram-')
        ? context.sessionId.replace('telegram-', '')
        : context.telegramChatId;

      if (!chatId) {
        return 'Error: No se pudo determinar el ID de chat de Telegram. Asegúrate de estar usando Telegram o tener una cuenta vinculada.';
      }

      console.log(chalk.yellow(`   📸 [screenshot] Intentando capturar...`));
      console.log(chalk.dim(`      - ChatId destino: ${chatId}`));
      console.log(chalk.dim(`      - SessionId: ${context.sessionId}`));

      // Asegurar carpeta temp
      const tempDir = resolve('temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir);
      }

      const tempFile = resolve(tempDir, `screenshot_${Date.now()}.png`);
      console.log(chalk.dim(`      - Archivo temporal: ${tempFile}`));

      try {
        await screenshot({ filename: tempFile });

        if (!existsSync(tempFile)) {
          throw new Error('El archivo de captura no se creó.');
        }

        const stats = statSync(tempFile);
        console.log(chalk.green(`      - Captura guardada (${stats.size} bytes).`));

        if (stats.size === 0) {
          throw new Error('La captura de pantalla está vacía (0 bytes).');
        }

        console.log(chalk.yellow(`      - Enviando a Telegram...`));
        const sentMsg = await bot.sendPhoto(chatId, tempFile, {
          caption,
        });

        console.log(chalk.green(`      - Foto enviada. MessageId: ${sentMsg.message_id}`));

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
