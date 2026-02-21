import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Config } from "../config/index.ts";
import { registerTool } from "./index.ts";

const execFileAsync = promisify(execFile);

export function registerBash(config: Config): void {
  registerTool({
    isEnabled: () => config.tools.bash.enabled,
    spec: {
      type: "function",
      function: {
        name: "bash",
        description: `Ejecuta un comando de terminal en el sistema local. Solo están permitidos los comandos de la allowlist: ${config.tools.bash.allowlist.join(", ")}. Úsalo para obtener información del sistema, listar archivos, etc.`,
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "El comando a ejecutar (sin argumentos peligrosos)",
            },
            args: {
              type: "array",
              items: { type: "string" },
              description: "Argumentos del comando",
            },
          },
          required: ["command"],
        },
      },
    },
    handler: async (rawArgs) => {
      const command = String(rawArgs["command"] ?? "").trim();
      const args = Array.isArray(rawArgs["args"])
        ? (rawArgs["args"] as string[]).map(String)
        : [];

      // Verificar allowlist
      const baseCmd = command.split(" ")[0];
      if (!config.tools.bash.allowlist.includes(baseCmd)) {
        return `Error: el comando "${baseCmd}" no está en la allowlist. Comandos permitidos: ${config.tools.bash.allowlist.join(", ")}`;
      }

      try {
        const allArgs = command.includes(" ")
          ? [...command.split(" ").slice(1), ...args]
          : args;

        const { stdout, stderr } = await execFileAsync(baseCmd, allArgs, {
          timeout: 10000,
          maxBuffer: 1024 * 512,
        });

        const output = (stdout + stderr).trim();
        return output || "(comando ejecutado sin salida)";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Error al ejecutar "${command}": ${msg}`;
      }
    },
  });
}
