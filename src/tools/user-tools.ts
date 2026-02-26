import { registerTool } from './index.ts';
import { upsertUser } from '../memory/user-db.ts';
import type { Config } from '../config/index.ts';

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
          },
          required: ['name'],
        },
      },
    },
    handler: async (args, context) => {
      const name = String(args['name'] ?? '');
      const timezone = String(args['timezone'] ?? 'America/Argentina/Buenos_Aires');

      try {
        upsertUser(context.sessionId, { name, timezone });
        return `✅ Perfil actualizado para ${name}. Zona horaria configurada como ${timezone}.`;
      } catch (err: unknown) {
        return `❌ Error al actualizar el perfil: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}
