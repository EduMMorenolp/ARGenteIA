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
      let rawPath = String(args["path"] ?? "").trim();
      const content = String(args["content"] ?? "");

      // Eliminar comillas accidentales
      if ((rawPath.startsWith('"') && rawPath.endsWith('"')) || (rawPath.startsWith("'") && rawPath.endsWith("'"))) {
        rawPath = rawPath.slice(1, -1);
      }

      // Resolver ~ o $HOME
      const homeDir = process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"] || "";
      if (rawPath.startsWith("~")) {
        rawPath = rawPath.replace("~", homeDir);
      } else if (rawPath.includes("$HOME")) {
        rawPath = rawPath.replace(/\$HOME/g, homeDir);
      }

      const filePath = resolve(rawPath);

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
