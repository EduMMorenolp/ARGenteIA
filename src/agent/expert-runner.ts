import chalk from 'chalk';
import type OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { CompletionUsage } from 'openai/resources/completions';
import { getConfig } from '../config/index.ts';
import { getExpert } from '../memory/expert-db.ts';
import { saveMessage } from '../memory/message-db.ts';
import { createClient, modelName } from './models.ts';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };
export interface ExpertRequest {
  expertName: string;
  task: string;
  userId?: string;
  chatId?: string;
  attachments?: Array<{ name: string; type: string; data: string }>;
}

/**
 * Ejecuta una tarea específica usando un sub-agente (experto).
 * Los expertos tienen su propio modelo y prompt de sistema.
 */
export async function runExpert(
  req: ExpertRequest,
): Promise<{ text: string; usage?: CompletionUsage; latencyMs: number; model: string }> {
  const startTime = Date.now();
  const expert = getExpert(req.expertName, true);
  if (!expert) {
    throw new Error(`Experto "${req.expertName}" no encontrado en la base de datos.`);
  }

  // 1. Guardar el mensaje del usuario (sin prefijos redundantes, ya tiene expertName)
  if (req.userId) {
    saveMessage({
      userId: req.userId,
      chatId: req.chatId,
      role: 'user',
      content: req.task,
      origin: 'web',
      expertName: expert.name,
    });
  }

  const config = getConfig();

  // 2. Preparar lista de modelos para fallback
  const { listModels } = await import('../memory/model-db.ts');
  const dbModelNames = listModels().map((m) => m.name);
  const configModelNames = Object.keys(config.models);
  const allAvailableModels = [...new Set([...dbModelNames, ...configModelNames])];
  const modelsToTry = [expert.model, ...allAvailableModels.filter((m) => m !== expert.model)];

  // 3. Configurar herramientas
  const { getTools, executeTool } = await import('../tools/index.ts');
  const allTools = await getTools();
  const tools =
    expert.tools && Array.isArray(expert.tools) && expert.tools.length > 0
      ? allTools.filter((t) =>
          expert.tools
            .filter((e) => typeof e === 'string')
            .map((e) => e.toLowerCase())
            .includes(t.function.name.toLowerCase()),
        )
      : [];

  // Construir contenido del usuario
  let userContent: string | ContentPart[] = req.task;
  if (req.attachments && req.attachments.length > 0) {
    const parts: ContentPart[] = [{ type: 'text', text: req.task }];
    for (const att of req.attachments) {
      if (att.type.startsWith('image/')) {
        parts.push({ type: 'image_url', image_url: { url: att.data, detail: 'auto' } });
      }
    }
    userContent = parts;
  }

  let finalSystemPrompt = expert.system_prompt;

  // RAG Retrieval
  try {
    const { searchSimilarChunks } = await import('../memory/rag-db.ts');
    const chunks = await searchSimilarChunks(req.task, ['global', expert.name], 3);
    if (chunks.length > 0) {
      const ragText = chunks.map((c, i) => `[Documento ${i + 1}]:\n${c.text_content}`).join('\n\n');
      finalSystemPrompt += `\n\n# CONTEXTO RECUPERADO (MEMORIA):\n${ragText}`;
    }
  } catch (err) {
    console.log(chalk.yellow(`   ⚠️ [Expert ${expert.name}] Error en RAG:`), err);
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: finalSystemPrompt },
    { role: 'user', content: userContent as any },
  ];

  // Loop de modelos (fallback)
  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    const client = createClient(currentModel, config) as OpenAI;
    const name = modelName(currentModel);

    try {
      console.log(chalk.magenta(`   🤖 Invocando experto: ${expert.name} (Modelo: ${currentModel})`));

      let iterations = 0;
      const MAX_ITERATIONS = 5;
      let finalResponse = '';
      let finalUsage: CompletionUsage | undefined;

      let response = await client.chat.completions.create({
        model: name,
        messages,
        max_tokens: Math.min(config.agent.maxTokens || 1500, 1500),
        temperature: expert.temperature ?? 0.7,
        tools: tools.length > 0 ? (tools as any) : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      while (iterations < MAX_ITERATIONS) {
        iterations++;
        const assistantMsg = response.choices[0]?.message;
        if (!assistantMsg) break;

        messages.push({
          role: 'assistant',
          content: assistantMsg.content || '',
          tool_calls: assistantMsg.tool_calls,
        } as ChatCompletionMessageParam);

        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
          finalResponse = assistantMsg.content || '';
          finalUsage = response.usage;
          break;
        }

        const toolResults: ChatCompletionMessageParam[] = [];
        for (const toolCall of assistantMsg.tool_calls) {
          const fn = (toolCall as any).function;
          if (!fn) continue;
          let args: Record<string, unknown> = {};
          try {
            args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments;
          } catch {
            /* ignore */
          }

          console.log(chalk.yellow(`   🔧 [Expert ${expert.name}] Tool: ${fn.name}`), args);
          const result = await executeTool(fn.name, args, {
            sessionId: req.chatId || req.userId || 'expert-call',
            origin: 'web',
          });

          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: String(result),
          });
        }

        messages.push(...toolResults);
        response = await client.chat.completions.create({
          model: name,
          messages,
          max_tokens: Math.min(config.agent.maxTokens || 1500, 1500),
          tools: tools as any,
        });
      }

      const textResult = finalResponse || response.choices[0]?.message?.content || 'El experto no devolvió ninguna respuesta.';

      // PERSISTIR RESPUESTA
      if (req.userId) {
        saveMessage({
          userId: req.userId,
          chatId: req.chatId,
          role: 'assistant',
          content: textResult,
          origin: 'web',
          expertName: expert.name,
        });
      }

      return {
        text: textResult,
        usage: finalUsage || response.usage,
        latencyMs: Date.now() - startTime,
        model: currentModel,
      };

    } catch (err: any) {
      const isProviderError = err.status === 401 || err.status === 402 || err.status === 404 || err.status === 429 || err.status === 503;
      
      if (isProviderError && mIdx < modelsToTry.length - 1) {
        console.error(chalk.red(`   🚨 Experto [${expert.name}] falló con ${currentModel}. Probando fallback...`));
        continue;
      }
      
      console.error(chalk.red(`   ❌ Error final en experto ${expert.name}:`), err.message);
      throw err;
    }
  }

  throw new Error(`El experto ${expert.name} no pudo responder con ningún modelo disponible.`);
}
