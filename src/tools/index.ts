import chalk from 'chalk';
import { getConfig } from '../config/index.ts';

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
  const { listDbTools } = await import('../memory/tool-db.ts');
  const dbTools = listDbTools();
  const dbToolMap = new Map(dbTools.map((t) => [t.name, t]));
  let availableTools: ToolSpec[] = [];

  // Hardcoded tools
  for (const [name, def] of registry.entries()) {
    const dbEntry = dbToolMap.get(name);
    // Usamos el estado habilitado del config por defecto si no está en la DB
    if (!dbEntry && def.isEnabled()) {
      availableTools.push(def.spec);
    } else if (dbEntry && dbEntry.enabled === 1) {
      availableTools.push(def.spec);
    }
  }

  // Dynamic tools
  for (const t of dbTools) {
    if (t.is_dynamic === 1 && t.enabled === 1) {
      try {
        availableTools.push({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: JSON.parse(t.parameters),
          },
        });
      } catch (err) {
        console.error(chalk.yellow(`⚠️ Invalid parameters JSON for dynamic tool ${t.name}`));
      }
    }
  }

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

      const scoredTools = availableTools.map((t) => {
        const emb = toolEmbeddings.get(t.function.name);
        const score = emb ? cosineSimilarity(queryEmbedding, emb) : 0;
        return { spec: t, score };
      });

      // Sort by score descending
      scoredTools.sort((a, b) => b.score - a.score);

      // Top 5 tools + essentials
      const topTools = scoredTools.slice(0, 5).map((t) => t.spec);

      for (const ess of essentialTools) {
        const essSpec = availableTools.find((t) => t.function.name === ess);
        if (essSpec && !topTools.some((t) => t.function.name === ess)) {
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
  const { listDbTools } = await import('../memory/tool-db.ts');
  const dbToolMap = new Map(listDbTools().map((t) => [t.name, t]));
  const dbEntry = dbToolMap.get(name);

  // Comprobar estado de activación global (DB tiene prioridad)
  if (dbEntry && dbEntry.enabled === 0) {
    return `Error: herramienta "${name}" está deshabilitada en la base de datos.`;
  }

  // Ejecución dinámica si es custom script
  if (dbEntry && dbEntry.is_dynamic === 1) {
    try {
      if (!dbEntry.script)
        return `Error: La herramienta dinámica "${name}" no tiene código (script).`;

      const asyncFn = new Function(
        'args',
        'context',
        `
        return (async () => {
          ${dbEntry.script}
        })();
      `,
      );

      const result = await asyncFn(args, context);
      return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    } catch (err: any) {
      console.error(chalk.red(`   ❌ Error ejecutando herramienta dinámica "${name}":`), err);
      return `Error en ejecución dinámica de ${name}: ${err.message}`;
    }
  }

  const tool = registry.get(name);
  if (!tool) return `Error: herramienta "${name}" no encontrada o no cargada.`;

  // Comprobar estado original por si la DB no la conoció aún
  if (!dbEntry && !tool.isEnabled())
    return `Error: herramienta "${name}" está deshabilitada en configuración.`;

  try {
    const result = await tool.handler(args, context);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`   ❌ Error ejecutando tool "${name}":`), err);
    return `Error al ejecutar ${name}: ${msg}`;
  }
}

import { registerBash } from './bash.ts';
import { registerDelegateTool } from './delegate.ts';
import { registerMemoryTools } from './memory.ts';
import { registerReadFile } from './read-file.ts';
import { registerReadUrl } from './read-url.ts';
import { registerSchedulerTools } from './scheduler.ts';
import { registerScreenshotTool } from './screenshot.ts';
import { registerSendFile } from './send-file.ts';
import { registerUserTools } from './user-tools.ts';
import { registerWeatherTool } from './weather.ts';
// ─── Importar y registrar todas las herramientas ──────────────────────────────
import { registerWebSearch } from './web-search.ts';
import { registerWriteFile } from './write-file.ts';

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
  const { listDbTools, upsertDbTool } = await import('../memory/tool-db.ts');

  // Guardamos un registro inicial en la DB de todas las hardcodeadas para poder gestionarlas UI
  const dbTools = listDbTools();
  const dbNames = new Set(dbTools.map((t) => t.name));
  for (const [name, def] of registry.entries()) {
    if (!dbNames.has(name)) {
      upsertDbTool({
        name,
        description: def.spec.function.description,
        parameters: JSON.stringify(def.spec.function.parameters, null, 2),
        is_dynamic: 0,
        script: null,
        enabled: def.isEnabled() ? 1 : 0,
      });
    }
  }

  // Generamos embeddings para las que están activas
  const updatedDbTools = listDbTools();
  for (const t of updatedDbTools) {
    if (!toolEmbeddings.has(t.name) && t.enabled === 1) {
      const emb = await generateEmbedding(t.name + ' ' + t.description);
      if (emb.length > 0) {
        toolEmbeddings.set(t.name, emb);
      }
    }
  }
}
