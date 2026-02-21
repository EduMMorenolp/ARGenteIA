import { getConfig } from "../config/index.ts";
import chalk from "chalk";

export interface ToolContext {
  sessionId: string;
}

// Tipo compatible con OpenAI function calling
export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Registro de herramientas
type ToolHandler = (args: Record<string, unknown>, context: ToolContext) => Promise<string>;

interface ToolDefinition {
  spec: ToolSpec;
  handler: ToolHandler;
  isEnabled: () => boolean;
}

const registry = new Map<string, ToolDefinition>();

export function registerTool(def: ToolDefinition): void {
  registry.set(def.spec.function.name, def);
}

export function getTools(): ToolSpec[] {
  return [...registry.values()]
    .filter((t) => t.isEnabled())
    .map((t) => t.spec);
}

export async function executeTool(name: string, args: Record<string, unknown>, context: ToolContext): Promise<string> {
  const tool = registry.get(name);
  if (!tool) return `Error: herramienta "${name}" no encontrada.`;
  if (!tool.isEnabled()) return `Error: herramienta "${name}" está deshabilitada.`;

  try {
    const result = await tool.handler(args, context);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`   ❌ Error ejecutando tool "${name}":`), err);
    return `Error al ejecutar ${name}: ${msg}`;
  }
}

// ─── Importar y registrar todas las herramientas ──────────────────────────────
import { registerWebSearch } from "./web-search.ts";
import { registerBash } from "./bash.ts";
import { registerReadFile } from "./read-file.ts";
import { registerWriteFile } from "./write-file.ts";
import { registerReadUrl } from "./read-url.ts";
import { registerMemoryTools } from "./memory.ts";

export function initTools(): void {
  const config = getConfig();
  registerWebSearch(config);
  registerBash(config);
  registerReadFile(config);
  registerWriteFile(config);
  registerReadUrl(config);
  registerMemoryTools();
}
