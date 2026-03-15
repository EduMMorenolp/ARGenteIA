import type { Config } from '../config/index.ts';
import { upsertUser } from '../memory/user-db.ts';
import { registerTool } from './index.ts';

export function registerUserTools(_config: Config): void {
  // 1. Crear o actualizar perfil
  registerTool({
    isEnabled: () => true,
    spec: {
      type: 'function',
      function: {
        name: 'update_profile',
        description:
          'Crea o actualiza el perfil del usuario con su nombre y zona horaria. Úsalo durante el onboarding o cuando el usuario quiera cambiar sus datos.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nombre del usuario.',
            },
            timezone: {
              type: 'string',
              description: "Zona horaria del usuario (ej: 'America/Argentina/Buenos_Aires').",
            },
            telegram_user: {
              type: 'string',
              description: 'Nombre de usuario de Telegram del usuario.',
            },
            telegram_token: {
              type: 'string',
              description: 'Token de Telegram para notificaciones.',
            },
          },
          required: [],
        },
      },
    },
    handler: async (args, context) => {
      const name = args['name'] ? String(args['name']) : undefined;
      const timezone = args['timezone'] ? String(args['timezone']) : undefined;
      const telegram_user = args['telegram_user'] ? String(args['telegram_user']) : undefined;
      const telegram_token = args['telegram_token'] ? String(args['telegram_token']) : undefined;

      try {
        const data: any = {};
        if (name) data.name = name;
        if (timezone) data.timezone = timezone;
        if (telegram_user) data.telegram_user = telegram_user;
        if (telegram_token) data.telegram_token = telegram_token;
        
        // Si estamos en Telegram, guardar el ID automáticamente para vinculación futura
        if (context.origin === 'telegram' && context.telegramChatId) {
          data.telegram_id = context.telegramChatId;
        }

        upsertUser(context.sessionId, data);
        
        let msg = `✅ Perfil actualizado.`;
        if (name) msg += ` Nombre: ${name}.`;
        if (timezone) msg += ` Zona horaria: ${timezone}.`;
        if (telegram_user) msg += ` Usuario de Telegram: ${telegram_user}.`;
        
        return msg;
      } catch (err: unknown) {
        return `❌ Error al actualizar el perfil: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}
