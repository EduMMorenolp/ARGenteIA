import type { Config } from "../config/index.ts";
import { registerTool } from "./index.ts";

export function registerWebSearch(config: Config): void {
  registerTool({
    isEnabled: () => config.tools.webSearch.enabled,
    spec: {
      type: "function",
      function: {
        name: "web_search",
        description: "Busca información en DuckDuckGo. Úsalo para obtener información actualizada o responder preguntas sobre hechos recientes.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "La consulta de búsqueda",
            },
          },
          required: ["query"],
        },
      },
    },
    handler: async (args) => {
      const query = String(args["query"] ?? "");
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;

      const resp = await fetch(url, {
        headers: { "User-Agent": "AsistentePersonal/1.0" },
      });
      const data = (await resp.json()) as Record<string, unknown>;

      const parts: string[] = [];

      if (data["AbstractText"]) {
        parts.push(`**Resumen:** ${data["AbstractText"]}`);
      }
      if (data["AbstractSource"]) {
        parts.push(`**Fuente:** ${data["AbstractSource"]}`);
      }
      if (data["AbstractURL"]) {
        parts.push(`**URL:** ${data["AbstractURL"]}`);
      }

      // Resultados relacionados
      const related = data["RelatedTopics"] as Array<Record<string, unknown>>;
      if (Array.isArray(related) && related.length > 0) {
        const items = related
          .slice(0, 5)
          .filter((r) => r["Text"])
          .map((r) => `- ${r["Text"]}`)
          .join("\n");
        if (items) parts.push(`**Resultados relacionados:**\n${items}`);
      }

      if (parts.length === 0) {
        return `No se encontraron resultados para: "${query}"`;
      }

      return parts.join("\n\n");
    },
  });
}
