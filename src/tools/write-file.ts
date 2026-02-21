import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { Config } from "../config/index.ts";
import { registerTool } from "./index.ts";

export function registerWriteFile(config: Config): void {
  registerTool({
    isEnabled: () => config.tools.writeFile.enabled,
    spec: {
      type: "function",
      function: {
        name: "write_file",
        description: "Escribe o crea un archivo en el sistema local. Crea los directorios necesarios si no existen.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Ruta del archivo a escribir",
            },
            content: {
              type: "string",
              description: "Contenido a escribir en el archivo",
            },
          },
          required: ["path", "content"],
        },
      },
    },
    handler: async (args, _context) => {
      const filePath = resolve(String(args["path"] ?? ""));
      const content = String(args["content"] ?? "");

      try {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, content, "utf-8");
        return `✅ Archivo escrito: ${filePath} (${content.length} caracteres)`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Error al escribir "${filePath}": ${msg}`;
      }
    },
  });
}
