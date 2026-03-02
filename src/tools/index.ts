import { getConfig } from '../config/index.ts';
import chalk from 'chalk';

export interface ToolContext {
  sessionId: string;
  origin?: 'web' | 'telegram';
  telegramChatId?: number;
}

// Tipo compatible con OpenAI function calling
export interface ToolSpec {
  type: 'function';
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
const toolEmbeddings = new Map<string, number[]>();

export function registerTool(def: ToolDefinition): void {
  registry.set(def.spec.function.name, def);
}

export async function getTools(allowedTools?: string[], userQuery?: string): Promise<ToolSpec[]> {
  const all = [...registry.values()].filter((t) => t.isEnabled());

  let availableTools = all.map((t) => t.spec);

  if (allowedTools && allowedTools.length > 0) {
    availableTools = availableTools.filter((t) => allowedTools.includes(t.function.name));
  }

  // RAG Nivel 1: Tool Retrieval if query is provided
  if (userQuery && availableTools.length > 5) {
      const { generateEmbedding, cosineSimilarity } = await import('../embeddings/provider.ts');
      const queryEmbedding = await generateEmbedding(userQuery);
      
      if (queryEmbedding.length > 0) {
          // Essential tools that should always be present if they are allowed
          const essentialTools = ['bash', 'web_search', 'delegate_task', 'read_file'];

          const scoredTools = availableTools.map(t => {
              const emb = toolEmbeddings.get(t.function.name);
              const score = emb ? cosineSimilarity(queryEmbedding, emb) : 0;
              return { spec: t, score };
          });

          // Sort by score descending
          scoredTools.sort((a, b) => b.score - a.score);

          // Top 5 tools + essentials
          const topTools = scoredTools.slice(0, 5).map(t => t.spec);
          
          for (const ess of essentialTools) {
              const essSpec = availableTools.find(t => t.function.name === ess);
              if (essSpec && !topTools.some(t => t.function.name === ess)) {
                  topTools.push(essSpec);
              }
          }

          availableTools = topTools;
      }
  }

  return availableTools;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<string> {
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
import { registerWebSearch } from './web-search.ts';
import { registerBash } from './bash.ts';
import { registerReadFile } from './read-file.ts';
import { registerWriteFile } from './write-file.ts';
import { registerReadUrl } from './read-url.ts';
import { registerMemoryTools } from './memory.ts';
import { registerSendFile } from './send-file.ts';
import { registerSchedulerTools } from './scheduler.ts';
import { registerUserTools } from './user-tools.ts';
import { registerDelegateTool } from './delegate.ts';
import { registerWeatherTool } from './weather.ts';
import { registerScreenshotTool } from './screenshot.ts';

export async function initTools(): Promise<void> {
  const config = getConfig();
  registerWebSearch(config);
  registerBash(config);
  registerReadFile(config);
  registerWriteFile(config);
  registerReadUrl(config);
  registerMemoryTools();
  registerSendFile(config);
  registerSchedulerTools(config);
  registerUserTools(config);
  registerDelegateTool();
  registerWeatherTool();
  registerScreenshotTool(config);

  // Pre-compute embeddings for all registered tool descriptions
  const { generateEmbedding } = await import('../embeddings/provider.ts');
  for (const [name, def] of registry.entries()) {
      if (!toolEmbeddings.has(name)) {
          const emb = await generateEmbedding(def.spec.function.name + " " + def.spec.function.description);
          if (emb.length > 0) {
              toolEmbeddings.set(name, emb);
          }
      }
  }
}
