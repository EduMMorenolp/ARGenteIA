import { getConfig } from '../config/index.ts';
import { createClient, modelName, detectProvider } from './models.ts';
import type OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import type { CompletionUsage } from 'openai/resources/completions';
import { getTools, executeTool, type ToolSpec } from '../tools/index.ts';
import { addMessage, getHistory } from '../memory/session.ts';
import { saveMessage } from '../memory/message-db.ts';
import { loadPrompt } from '../promptsSystem/index.ts';
import chalk from 'chalk';

export const activeChats = new Set<string>();

// ─── Helpers para contenido multipart ──────────────────────────────────────────
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

/**
 * Construye el contenido del mensaje del usuario.
 * Si hay archivos adjuntos, genera un array multipart compatible con OpenAI Vision.
 * Si no hay adjuntos, retorna el texto plano.
 */
function buildUserContent(
  text: string,
  attachments?: Array<{ name: string; type: string; data: string }>,
): string | ContentPart[] {
  if (!attachments || attachments.length === 0) return text;

  const parts: ContentPart[] = [];
  let extraText = '';

  for (const att of attachments) {
    if (att.type.startsWith('image/')) {
      // Imágenes → image_url part
      parts.push({
        type: 'image_url',
        image_url: { url: att.data, detail: 'auto' },
      });
      console.log(chalk.magenta(`   📎 Imagen adjunta: ${att.name}`));
    } else if (att.type.startsWith('text/') || att.type === 'application/json') {
      // Archivos de texto → extraer contenido del base64 e inyectar
      try {
        const base64Content = att.data.split(',')[1] || '';
        const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
        extraText += `\n\n--- Archivo: ${att.name} ---\n${decoded}\n--- Fin archivo ---`;
        console.log(chalk.magenta(`   📎 Archivo texto adjunto: ${att.name} (${decoded.length} chars)`));
      } catch {
        extraText += `\n\n[Error al leer archivo: ${att.name}]`;
      }
    } else {
      // Otros tipos (PDF, etc.) → notificar que se recibió pero no se puede procesar inline
      console.log(chalk.yellow(`   📎 Archivo no soportado inline: ${att.name} (${att.type})`));
      extraText += `\n\n[Archivo adjunto: ${att.name} (${att.type}) - no se puede procesar inline]`;
    }
  }

  const fullText = text + extraText;

  if (parts.length === 0) {
    // Solo archivos de texto, no imágenes → retornar texto simple
    return fullText;
  }

  // Hay imágenes → retornar content array multipart
  parts.unshift({ type: 'text', text: fullText });
  return parts;
}
export interface AgentOptions {
  userId: string;
  chatId: string;
  userText: string;
  onTyping?: (isTyping: boolean) => void;
  onAction?: (text: string) => void;
  onChunk?: (text: string) => void;
  origin?: 'web' | 'telegram'; // Origen del mensaje
  telegramChatId?: number; // ID de chat si viene de Telegram
  attachments?: Array<{ name: string; type: string; data: string }>; // Archivos adjuntos (base64 data URLs)
}

export interface AgentResponse {
  text: string;
  model: string;
  usage?: CompletionUsage;
  latencyMs?: number;
}

export async function runAgent(opts: AgentOptions): Promise<AgentResponse> {
  const config = getConfig();

  // 0. Verificar si existe un override para el asistente general en la DB
  const { getExpert } = await import('../memory/expert-db.ts');
  const generalOverride = getExpert('__general__');

  const model = generalOverride?.model || config.agent.model;
  const provider = detectProvider(model);

  // Construir contenido del mensaje (texto simple o multipart con archivos)
  const userContent = buildUserContent(opts.userText, opts.attachments);

  // Añadir mensaje del usuario al historial en memoria (aislado por chatId)
  addMessage(
    opts.chatId,
    { role: 'user', content: userContent },
    config.agent.maxContextMessages,
  );

  // Persistir en base de datos
  saveMessage({
    userId: opts.userId,
    chatId: opts.chatId,
    role: 'user',
    content: opts.userText,
    origin: opts.origin || 'web',
  });

  const messages = getHistory(opts.chatId);

  opts.onTyping?.(true);
  opts.onAction?.('Procesando tu solicitud...');

  if (opts.chatId) activeChats.add(opts.chatId);

  try {
    let responseText = '';

    const startTime = Date.now();
    let result: { text: string; usage?: CompletionUsage };

    if (provider === 'anthropic') {
      const text = await runAnthropic(model, messages, config.agent.maxTokens);
      result = { text };
    } else {
      result = await runOpenAI(model, messages, config.agent.maxTokens, opts);
    }
    const latencyMs = Date.now() - startTime;
    responseText = result.text;

    // Si por alguna razón sigue vacío, forzar algo
    if (!responseText || responseText.trim() === '') {
      responseText =
        'He procesado tu solicitud, pero no tengo una respuesta textual en este momento. ¿En qué más puedo ayudarte?';
    }

    // Guardar respuesta final en historial en memoria
    addMessage(
      opts.chatId,
      { role: 'assistant', content: responseText },
      config.agent.maxContextMessages,
    );

    // Persistir respuesta en base de datos
    saveMessage({
      userId: opts.userId,
      chatId: opts.chatId,
      role: 'assistant',
      content: responseText,
      origin: opts.origin || 'web',
    });

    return {
      text: responseText,
      model,
      usage: result.usage,
      latencyMs,
    };
  } catch (err: unknown) {
    console.error(chalk.red('   ❌ Error en runAgent:'), err instanceof Error ? err.message : err);
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return {
      text: `Lo siento, ocurrió un error al procesar tu mensaje: ${msg}. Por favor, intenta de nuevo o reinicia la sesión con /reset.`,
      model,
    };
  } finally {
    opts.onTyping?.(false);
  }
}

// ─── OpenAI / OpenRouter Logic ────────────────────────────────────────────────

async function runOpenAI(
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
  opts: AgentOptions,
): Promise<{ text: string; usage?: CompletionUsage }> {
  const config = getConfig();
  const userId = opts.userId;

  // 0. Preparar lista de modelos (el principal primero, luego DB + config como fallback)
  const { listModels } = await import('../memory/model-db.ts');
  const dbModelNames = listModels().map((m) => m.name);
  const configModelNames = Object.keys(config.models);
  // Merge: DB primero (gestionados por el usuario), luego config como fallback, sin duplicados
  const allAvailableModels = [...new Set([...dbModelNames, ...configModelNames])];
  const modelsToTry = [model, ...allAvailableModels.filter((m) => m !== model)];

  try {
    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];
      const client = createClient(currentModel, config) as OpenAI;
      const name = modelName(currentModel);

      // 1. Obtener override/perfil/herramientas (necesario en cada intento por si cambian)
      const { getExpert } = await import('../memory/expert-db.ts');
      const generalOverride = getExpert('__general__');
      const toolSpecs: ToolSpec[] = getTools(generalOverride?.tools);
      const tools =
        toolSpecs.length > 0 ? (toolSpecs as unknown as ChatCompletionTool[]) : undefined;

      const { getUser } = await import('../memory/user-db.ts');
      const { loadSkills } = await import('../skills/loader.ts');
      const userProfile = getUser(userId);
      const skills = await loadSkills();

      let systemPrompt = `Eres un asistente personal útil y conciso. Respondes en español.`;

      // 1. Core Profile
      if (userProfile && userProfile.name) {
        systemPrompt += `\n\nESTÁS HABLANDO CON: ${userProfile.name}. Su zona horaria es: ${userProfile.timezone}.`;
      } else {
        systemPrompt += `\n\n` + loadPrompt('onboarding');
      }

      // 2. Base Rules & Skills (without duplication)
      const basePrompt = generalOverride?.system_prompt || config.agent.systemPrompt;
      if (basePrompt && basePrompt.length > 0) {
        systemPrompt += `\n\n# REGLAS DEL SISTEMA:\n${basePrompt}`;
      }
      
      if (skills.length > 0) {
        systemPrompt += `\n\n# COMPETENCIAS Y HABILIDADES ADICIONALES:\n${skills.join('\n\n')}`;
      }

      // 3. RAG Context Placeholder (Prepared for semantic search tools)
      // TODO: Inject context here if a RAG tool was called in this turn
      // systemPrompt += `\n\n# CONTEXTO RECUPERADO (RAG):\n...`;

      // 4. Expert Delegation
      const { listExperts } = await import('../memory/expert-db.ts');
      let experts = listExperts();
      if (generalOverride?.experts && generalOverride.experts.length > 0) {
        experts = experts.filter((e) => generalOverride.experts.includes(e.name));
      }
      if (experts.length > 0) {
        const expertsList = experts
          .map((e) => `- ${e.name}: ${e.system_prompt.slice(0, 100)}... (Modelo: ${e.model})`)
          .join('\n    ');
        systemPrompt += '\n\n' + loadPrompt('experts-delegation', { expertsList });
      }

      // 5. Channel Constraints
      if (opts.origin === 'telegram') {
        systemPrompt += '\n\n' + loadPrompt('channel-telegram');
      } else {
        systemPrompt += '\n\n' + loadPrompt('channel-web');
      }

      // HISTORY PRUNING: Only keep the last 15 messages to prevent context explosion on long chats
      const maxHistory = 15;
      const prunedMessages = messages.length > maxHistory ? messages.slice(-maxHistory) : messages;

      const loopMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...prunedMessages,
      ];
      let iterations = 0;
      const MAX_ITERATIONS = 6;

      try {
        const callWithRetry = async (messages: ChatCompletionMessageParam[], useTools: boolean) => {
          let retries = 3;
          let delay = 2000;

          while (retries > 0) {
            try {
              const callPayload = {
                model: name,
                messages,
                max_tokens: Math.min(maxTokens || 1500, 1500), // Default to 1500 to save OpenRouter credits
                temperature: generalOverride?.temperature ?? 0.7,
                tools: useTools ? tools : undefined,
                tool_choice: useTools && tools ? 'auto' : undefined,
                stream: true,
              };
              console.log(chalk.blue(`   [API Request] Payload:`), JSON.stringify(callPayload, null, 2));

              const stream = await client.chat.completions.create(callPayload as OpenAI.Chat.ChatCompletionCreateParamsStreaming);

              let fullContent = '';
              let toolCalls: any[] = [];
              let currentUsage: any = undefined;

              for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                  fullContent += delta.content;
                  opts.onChunk?.(delta.content);
                }

                if (delta.tool_calls) {
                  for (const tcDelta of delta.tool_calls) {
                    if (tcDelta.index === undefined) continue;
                    if (!toolCalls[tcDelta.index]) {
                      toolCalls[tcDelta.index] = {
                        id: tcDelta.id || '',
                        type: 'function',
                        function: { name: tcDelta.function?.name || '', arguments: '' },
                      };
                    }
                    if (tcDelta.function?.arguments) {
                      toolCalls[tcDelta.index].function.arguments += tcDelta.function.arguments;
                    }
                  }
                }

                if ((chunk as any).usage) {
                  currentUsage = (chunk as any).usage;
                }
              }

              // Remove empty tool calls elements just in case
              toolCalls = toolCalls.filter(Boolean);

              return {
                choices: [
                  {
                    message: {
                      role: 'assistant',
                      content: fullContent,
                      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                    },
                  },
                ],
                usage: currentUsage,
              };
            } catch (err: unknown) {
              if ((err as Record<string, unknown>).status === 429 && retries > 1) {
                console.warn(
                  chalk.yellow(
                    `   ⚠️ [${currentModel}] Límite alcanzado. Reintentando en ${delay / 1000}s...`,
                  ),
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                retries--;
                delay *= 2;
                continue;
              }
              throw err;
            }
          }
          throw new Error('429');
        };

        let response = await callWithRetry(loopMessages, true);

        while (iterations < MAX_ITERATIONS) {
          iterations++;
          const assistantMsg = response.choices[0]?.message;
          if (!assistantMsg) break;

          const msgToPush = {
            role: 'assistant',
            content: assistantMsg.content || '',
            tool_calls: assistantMsg.tool_calls,
          } as ChatCompletionMessageParam;

          loopMessages.push(msgToPush);

          if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
            if (assistantMsg.content) {
              return {
                text: assistantMsg.content,
                usage: (response as any).usage,
              };
            }
            break;
          }

          const toolPromises = assistantMsg.tool_calls.map(async (toolCall) => {
            const fn = (
              toolCall as unknown as { id: string; function: { name: string; arguments: string } }
            ).function;
            if (!fn) return null;
            let args: Record<string, unknown> = {};
            try {
              args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments;
            } catch {
              args = {};
            }

            const argsStr = JSON.stringify(args);
            console.log(
              chalk.yellow(`   🔧 Tool: ${fn.name}`),
              chalk.dim(argsStr.length > 100 ? argsStr.slice(0, 100) + '...' : argsStr),
            );
            opts.onAction?.(`Usando herramienta: ${fn.name}`);
            const result = await executeTool(fn.name, args, {
              sessionId: opts.userId,
              origin: opts.origin,
              telegramChatId: opts.telegramChatId,
            });

            const resStr = String(result);
            console.log(
              chalk.cyan(
                `   💡 Result: ${fn.name} -> ${resStr.length > 100 ? resStr.slice(0, 100) + '...' : resStr}`,
              ),
            );

            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: String(result),
            };
          });

          const toolResultsRaw = await Promise.all(toolPromises);
          const toolResults = toolResultsRaw.filter(
            (r) => r !== null,
          ) as ChatCompletionMessageParam[];

          loopMessages.push(...toolResults);
          response = await callWithRetry(loopMessages, true);
        }

        if (!response.choices[0]?.message?.content) {
          loopMessages.push({
            role: 'system',
            content: loadPrompt('fallback'),
          });
          const finalRes = await callWithRetry(loopMessages, false);
          return { text: finalRes.choices[0]?.message?.content || '', usage: undefined };
        }

        return {
          text: response.choices[0].message.content,
          usage: response.usage,
        };
      } catch (err: unknown) {
        const isRateLimit =
          (err instanceof Error &&
            'status' in err &&
            (err as Record<string, unknown>).status === 429) ||
          (err instanceof Error && err.message === '429');
        const errWithStatus = err as Record<string, unknown>;
        const isProviderError =
          errWithStatus.status === 401 ||
          errWithStatus.status === 402 ||
          errWithStatus.status === 404 ||
          errWithStatus.status === 503;

        // Si es un error de cuota (429), auth (401), pago (402), política (404) o servicio (503) y tenemos más modelos...
        if ((isRateLimit || isProviderError) && mIdx < modelsToTry.length - 1) {
          const errorType =
            errWithStatus.status || (err instanceof Error ? err.message : String(err));
          const msg =
            errWithStatus.status === 401
              ? 'Auth Error'
              : errWithStatus.status === 404
                ? 'Not Found/Policy'
                : errWithStatus.status === 429
                  ? 'Rate Limit'
                  : `Status ${errorType}`;

          console.error(
            chalk.red(
              `   🚨 Modelo [${currentModel}] falló (${msg}). Probando fallback con [${modelsToTry[mIdx + 1]}]...`,
            ),
          );
          continue; // Siguiente modelo en el loop for
        }

        // Errores finales si ya no quedan modelos o es un error grave
        if (errWithStatus.status === 404) {
          throw new Error(
            "Error 404: OpenRouter no encuentra el endpoint. Revisa tu configuración de privacidad en OpenRouter (permite 'Free model publication').",
          );
        }
        if (errWithStatus.status === 401) {
          throw new Error(
            'Error 401: API Key inválida o usuario no encontrado en OpenRouter. Revisa tu sk-or-key en config.json.',
          );
        }
        if (errWithStatus.status === 402) {
          throw new Error('Error 402: El modelo requiere créditos o ha cambiado de política.');
        }
        if (isRateLimit) {
          throw new Error(
            'Todos los modelos gratuitos están saturados (429). Por favor, intenta de nuevo en unos minutos o usa un modelo de pago.',
          );
        }

        throw err;
      } // fin del catch interno
    } // fin del for loop
  } finally {
    if (opts.chatId) activeChats.delete(opts.chatId);
  }

  throw new Error('No se pudo obtener respuesta de ningún modelo configurado.');
}

async function runAnthropic(
  _model: string,
  _messages: ChatCompletionMessageParam[],
  _tokens: number,
): Promise<string> {
  return 'Soporte Anthropic en desarrollo.';
}
