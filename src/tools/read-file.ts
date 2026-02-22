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
      let rawPath = String(args["path"] ?? "").trim();
      
      // Eliminar comillas accidentales que el modelo a veces pone alrededor de la ruta
      if ((rawPath.startsWith('"') && rawPath.endsWith('"')) || (rawPath.startsWith("'") && rawPath.endsWith("'"))) {
        rawPath = rawPath.slice(1, -1);
      }
      
      // Resolver ~ o $HOME a la carpeta del usuario
      const homeDir = process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"] || "";
      if (rawPath.startsWith("~")) {
        rawPath = rawPath.replace("~", homeDir);
      } else if (rawPath.includes("$HOME")) {
        rawPath = rawPath.replace(/\$HOME/g, homeDir);
      }

      const filePath = resolve(rawPath);

      // Verificar si es un archivo binario conocido para no leerlo como UTF-8
      const binaryExtensions = [".exe", ".zip", ".xlsx", ".docx", ".pdf", ".bin", ".jpg", ".png"];
      const isBinary = binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));

      if (isBinary) {
        return `Error: El archivo "${filePath}" es un formato binario (${filePath.split('.').pop()}). Solo puedo leer archivos de texto plano, código o logs.`;
      }

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
