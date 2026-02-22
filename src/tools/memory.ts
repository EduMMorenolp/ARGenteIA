import { registerTool } from "./index.ts";
import { saveFact, getFacts, deleteFact } from "../memory/long-term.ts";

export function registerMemoryTools(): void {
  // 1. Herramienta para memorizar un dato
  registerTool({
    isEnabled: () => true, // Siempre habilitada
    spec: {
      type: "function",
      function: {
        name: "memorize_fact",
        description: "Guarda un dato importante sobre el usuario para recordarlo en el futuro (a largo plazo).",
        parameters: {
          type: "object",
          properties: {
            fact: {
              type: "string",
              description: "El dato o hecho a recordar. Ej: 'A Eduardo le gusta el café sin azúcar'.",
            },
          },
          required: ["fact"],
        },
      },
    },
    handler: async (args, context) => {
      const fact = String(args["fact"] ?? "");
      if (!fact) return "Error: el dato está vacío.";
      
      saveFact(context.sessionId, fact);
      return `He memorizado: "${fact}"`;
    },
  });

  // 2. Herramienta para recuperar hechos
  registerTool({
    isEnabled: () => true,
    spec: {
      type: "function",
      function: {
        name: "recall_facts",
        description: "Recupera todos los hechos y datos memorizados sobre el usuario actual.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    handler: async (_, context) => {
      const facts = getFacts(context.sessionId);
      if (facts.length === 0) return "No tengo datos memorizados sobre este usuario todavía.";
      
      const list = facts.map(f => `- [ID ${f.id}] ${f.fact} (${f.created_at})`).join("\n");
      return `Datos memorizados sobre el usuario:\n${list}`;
    },
  });

  // 3. Herramienta para olvidar un dato
  registerTool({
    isEnabled: () => true,
    spec: {
      type: "function",
      function: {
        name: "forget_fact",
        description: "Elimina un dato memorizado previamente usando su ID.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "El ID numérico exacto del dato a eliminar. Debes obtenerlo primero llamando a recall_facts.",
            },
          },
          required: ["id"],
        },
      },
    },
    handler: async (args, context) => {
      const id = Number(args["id"]);
      const success = deleteFact(id, context.sessionId);
      return success ? `He olvidado el dato con ID ${id}.` : `No encontré ningún dato con ID ${id} para este usuario.`;
    },
  });
}
