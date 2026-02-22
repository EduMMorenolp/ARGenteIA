import { runExpert } from "../agent/expert-runner.ts";
import { z } from "zod";

export const callExperttool = {
  name: "call_expert",
  description: "Llama a un sub-agente (experto) especializado para realizar una tarea específica con un modelo y prompt optimizados.",
  parameters: z.object({
    expertName: z.string().describe("El nombre del experto a invocar (ej: coder, escritor, researcher)."),
    task: z.string().describe("La tarea o pregunta específica para el experto.")
  }),
  execute: async (args: { expertName: string; task: string }) => {
    try {
      const result = await runExpert(args);
      return result;
    } catch (err: any) {
      return `Error al llamar al experto: ${err.message}`;
    }
  }
};

import { registerTool } from "./index.ts";
import { zodToJsonSchema } from "zod-to-json-schema";

export function registerDelegateTool(): void {
  registerTool({
    spec: {
      type: "function",
      function: {
        name: callExperttool.name,
        description: callExperttool.description,
        parameters: zodToJsonSchema(callExperttool.parameters as any) as any
      }
    },
    handler: async (args: any) => callExperttool.execute(args),
    isEnabled: () => true // Siempre habilitado si hay orquestación
  });
}
