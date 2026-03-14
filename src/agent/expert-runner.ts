import { getConfig } from '../config/index.ts';
import { createClient, modelName } from './models.ts';
import type OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { CompletionUsage } from 'openai/resources/completions';
import { getExpert } from '../memory/expert-db.ts';
import { saveMessage } from '../memory/message-db.ts';
import chalk from 'chalk';

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
): Promise<{ text: string; usage?: CompletionUsage; latencyMs: number }> {
  const startTime = Date.now();
  const expert = getExpert(req.expertName);
  if (!expert) {
    throw new Error(`Experto "${req.expertName}" no encontrado en la base de datos.`);
  }

  // Persistir la tarea si temenos un userId
  if (req.userId) {
    saveMessage({
      userId: req.userId,
      chatId: req.chatId,
      role: 'user',
      content: `[Experto: ${req.expertName}] ${req.task}`,
      origin: 'web',
      expertName: req.expertName,
    });
  }

  console.log(chalk.magenta(`   🤖 Invocando experto: ${expert.name} (${expert.model})`));

  const config = getConfig();
  const client = createClient(expert.model, config) as OpenAI;
  const name = modelName(expert.model);

  // 1. Configurar herramientas disponibles para este experto
  const { getTools, executeTool } = await import('../tools/index.ts');
  const allTools = await getTools();

  // Tratamos de buscar herramientas válidas, manejando undefined silenciosamente
  const tools =
    expert.tools && Array.isArray(expert.tools) && expert.tools.length > 0
      ? allTools.filter((t) => 
          expert.tools
            .filter((e) => typeof e === 'string')
            .map((e) => e.toLowerCase())
            .includes(t.function.name.toLowerCase())
        )
      : [];

  // Construir contenido del usuario (con posibles archivos adjuntos)
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

  // HISTORY PRUNING
  const maxHistory = 15;
  const prunedUserContent = Array.isArray(userContent) ? userContent : userContent;

  let finalSystemPrompt = expert.system_prompt;
  
  // 2. RAG Context Retrieval (Global + Expert Specific)
  try {
      const { searchSimilarChunks } = await import('../memory/rag-db.ts');
      const chunks = await searchSimilarChunks(req.task, ['global', expert.name], 3);
      if (chunks.length > 0) {
          const ragText = chunks.map((c, i) => `[Documento ${i+1}]:\n${c.text_content}`).join('\n\n');
          finalSystemPrompt += `\n\n# CONTEXTO RECUPERADO (MEMORIA):\n${ragText}`;
      }
  } catch(err) {
      console.log(chalk.yellow(`   ⚠️ [Expert ${expert.name}] Error en RAG:`), err);
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: finalSystemPrompt },
    { role: 'user', content: prunedUserContent as string },
  ];

  try {
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    let response = await client.chat.completions.create({
      model: name,
      messages,
      max_tokens: Math.min(config.agent.maxTokens || 1500, 1500),
      temperature: expert.temperature ?? 0.7,
      tools: tools.length > 0 ? (tools as unknown as OpenAI.Chat.ChatCompletionTool[]) : undefined,
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
        if (assistantMsg.content) {
          return {
            text: assistantMsg.content,
            usage: response.usage,
            latencyMs: Date.now() - startTime,
          };
        }
        break;
      }

      const toolResults: ChatCompletionMessageParam[] = [];
      for (const toolCall of assistantMsg.tool_calls) {
        const fn = (
          toolCall as unknown as { id: string; function: { name: string; arguments: string } }
        ).function;
        if (!fn) continue;
        let args: Record<string, unknown> = {};
        try {
          args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments;
        } catch {
          /* parse error, use defaults */
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
        tools: tools as unknown as OpenAI.Chat.ChatCompletionTool[],
      });
    }

    const finalResponse =
      response.choices[0]?.message?.content || 'El experto no devolvió ninguna respuesta.';

    // Persistir respuesta si tenemos un userId
    if (req.userId) {
      saveMessage({
        userId: req.userId,
        chatId: req.chatId,
        role: 'assistant',
        content: finalResponse,
        origin: 'web',
        expertName: expert.name,
      });
    }

    return {
      text: finalResponse,
      usage: response.usage,
      latencyMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`   ❌ Error en experto ${expert.name}:`), message);
    throw new Error(`Error del experto ${expert.name}: ${message}`);
  }
}
