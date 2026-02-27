import { runExpert } from '../agent/expert-runner.ts';
import { z } from 'zod';

export const callExperttool = {
  name: 'call_expert',
  description:
    'Llama a un sub-agente (experto) especializado para realizar una tarea específica con un modelo y prompt optimizados.',
  parameters: z.object({
    expertName: z
      .string()
      .describe('El nombre del experto a invocar (ej: coder, escritor, researcher).'),
    task: z.string().describe('La tarea o pregunta específica para el experto.'),
  }),
  execute: async (args: { expertName: string; task: string }) => {
    try {
      const result = await runExpert(args);
      return result;
    } catch (err: unknown) {
      return `Error al llamar al experto: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

import { registerTool } from './index.ts';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function registerDelegateTool(): void {
  registerTool({
    spec: {
      type: 'function',
      function: {
        name: callExperttool.name,
        description: callExperttool.description,
        parameters: zodToJsonSchema(callExperttool.parameters as any) as Record<string, unknown>,
      },
    },
    handler: async (args: Record<string, unknown>) =>
      JSON.stringify(await callExperttool.execute(args as { expertName: string; task: string })),
    isEnabled: () => true, // Siempre habilitado si hay orquestación
  });
}
