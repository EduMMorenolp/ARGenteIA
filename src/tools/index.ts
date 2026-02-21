import { getConfig } from "../config/index.ts";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

// Registro de herramientas
type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

interface ToolDefinition {
  spec: ChatCompletionTool;
  handler: ToolHandler;
  isEnabled: () => boolean;
}

const registry = new Map<string, ToolDefinition>();

export function registerTool(def: ToolDefinition): void {
  registry.set(def.spec.function.name, def);
}

export function getTools(): ChatCompletionTool[] {
  return [...registry.values()]
    .filter((t) => t.isEnabled())
    .map((t) => t.spec);
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = registry.get(name);
  if (!tool) return `Error: herramienta "${name}" no encontrada.`;
  if (!tool.isEnabled()) return `Error: herramienta "${name}" está deshabilitada.`;

  try {
    return await tool.handler(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al ejecutar ${name}: ${msg}`;
  }
}

// ─── Importar y registrar todas las herramientas ──────────────────────────────
import { registerWebSearch } from "./web-search.ts";
import { registerBash } from "./bash.ts";
import { registerReadFile } from "./read-file.ts";
import { registerWriteFile } from "./write-file.ts";
import { registerReadUrl } from "./read-url.ts";

export function initTools(): void {
  const config = getConfig();
  registerWebSearch(config);
  registerBash(config);
  registerReadFile(config);
  registerWriteFile(config);
  registerReadUrl(config);
}
