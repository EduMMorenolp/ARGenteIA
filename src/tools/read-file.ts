import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Config } from "../config/index.ts";
import { registerTool } from "./index.ts";

export function registerReadFile(config: Config): void {
  registerTool({
    isEnabled: () => config.tools.readFile.enabled,
    spec: {
      type: "function",
      function: {
        name: "read_file",
        description: "Lee el contenido de un archivo del sistema local. Úsalo para leer código, documentos de texto, logs, etc.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Ruta al archivo a leer (absoluta o relativa al directorio actual)",
            },
          },
          required: ["path"],
        },
      },
    },
    handler: async (args, _context) => {
      const filePath = resolve(String(args["path"] ?? ""));
      try {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n").length;
        // Limitar a 200 líneas para no saturar el contexto
        const truncated = content.split("\n").slice(0, 200).join("\n");
        const suffix = lines > 200 ? `\n\n[... ${lines - 200} líneas más omitidas]` : "";
        return `**${filePath}** (${lines} líneas):\n\`\`\`\n${truncated}${suffix}\n\`\`\``;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Error al leer "${filePath}": ${msg}`;
      }
    },
  });
}
