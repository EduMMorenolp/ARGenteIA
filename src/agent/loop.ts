import { getConfig } from "../config/index.ts";
import { createClient, modelName, detectProvider } from "./models.ts";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { getTools, executeTool, type ToolSpec } from "../tools/index.ts";
import { addMessage, getHistory } from "../memory/session.ts";
import chalk from "chalk";

export interface AgentOptions {
  sessionId: string;
  userText: string;
  onTyping?: (isTyping: boolean) => void;
}

export interface AgentResponse {
  text: string;
  model: string;
}

/**
 * Loop principal del agente:
 * 1. Recibe el texto del usuario
 * 2. Llama al modelo (OpenAI/Anthropic)
 * 3. Si el modelo pide usar herramientas, las ejecuta y vuelve a llamar al modelo
 * 4. Devuelve la respuesta final
 */
export async function runAgent(opts: AgentOptions): Promise<AgentResponse> {
  const config = getConfig();
  const model = config.agent.model;
  const provider = detectProvider(model);

  // Obtener historial y añadir mensaje del usuario
  addMessage(opts.sessionId, { role: "user", content: opts.userText });
  const messages = getHistory(opts.sessionId);

  opts.onTyping?.(true);

  try {
    let responseText = "";

    if (provider === "anthropic") {
      responseText = await runAnthropic(model, messages, config.agent.maxTokens);
    } else {
      responseText = await runOpenAI(model, messages, config.agent.maxTokens, opts.sessionId);
    }

    // Guardar respuesta en historial
    addMessage(opts.sessionId, { role: "assistant", content: responseText });

    return {
      text: responseText,
      model,
    };
  } finally {
    opts.onTyping?.(false);
  }
}

// ─── OpenAI / OpenRouter ──────────────────────────────────────────────────────

async function runOpenAI(
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
  sessionId: string,
): Promise<string> {
  const config = getConfig();
  const client = createClient(model, config) as OpenAI;
  const name = modelName(model);
  const tools: ToolSpec[] = getTools();

  // Primera llamada
  let response = await client.chat.completions.create({
    model: name,
    messages,
    max_tokens: maxTokens,
    tools: tools.length > 0 ? (tools as unknown as ChatCompletionTool[]) : undefined,
    tool_choice: tools.length > 0 ? "auto" : undefined,
  });

  // Loop de tool calls
  let loopMessages = [...messages];
  let iterations = 0;
  const MAX_ITERATIONS = 8;

  while (
    response.choices[0]?.finish_reason === "tool_calls" &&
    iterations < MAX_ITERATIONS
  ) {
    iterations++;
    const assistantMsg = response.choices[0].message;
    loopMessages.push(assistantMsg);

    // Ejecutar cada tool call
    const toolResults: ChatCompletionMessageParam[] = [];
    for (const toolCall of assistantMsg.tool_calls ?? []) {
      if (!("function" in toolCall)) continue;
      
      const fn = toolCall.function;
      let args: Record<string, unknown> = {};
      
      try {
        if (fn.arguments) {
          args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;
        }
      } catch (err) {
        console.error(chalk.red(`   ❌ Error en argumentos de "${fn.name}":`), fn.arguments);
        args = {}; 
      }
      
      console.log(chalk.yellow(`   🔧 Tool: ${fn.name}`), args);
      const result = await executeTool(fn.name, args, { sessionId });
      console.log(chalk.cyan(`   💡 Result: ${String(result).slice(0, 60)}...`));

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: String(result), // Garantizar que sea string
      });
    }

    loopMessages.push(...toolResults);

    // Segunda llamada con resultados
    response = await client.chat.completions.create({
      model: name,
      messages: loopMessages,
      max_tokens: maxTokens,
      tools: tools.length > 0 ? (tools as unknown as ChatCompletionTool[]) : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });
  }

  return response.choices[0]?.message?.content ?? "Sin respuesta del modelo.";
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function runAnthropic(
  _model: string,
  _messages: ChatCompletionMessageParam[],
  _maxTokens: number,
): Promise<string> {
  // Implementación simplificada (Anthropic usa un SDK distinto)
  return "Soporte Anthropic en desarrollo para esta rama.";
}
