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

export async function runAgent(opts: AgentOptions): Promise<AgentResponse> {
  const config = getConfig();
  const model = config.agent.model;
  const provider = detectProvider(model);

  // Añadir mensaje del usuario al historial
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

    // Si por alguna razón sigue vacío, forzar algo
    if (!responseText || responseText.trim() === "") {
      responseText = "He procesado tu solicitud, pero no tengo una respuesta textual en este momento. ¿En qué más puedo ayudarte?";
    }

    // Guardar respuesta final en historial
    addMessage(opts.sessionId, { role: "assistant", content: responseText });

    return { text: responseText, model };
  } catch (err: any) {
    console.error(chalk.red("   ❌ Error en runAgent:"), err.message);
    const msg = err.message || "Error desconocido";
    return { 
      text: `Lo siento, ocurrió un error al procesar tu mensaje: ${msg}. Por favor, intenta de nuevo o reinicia la sesión con /reset.`, 
      model 
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
  sessionId: string,
): Promise<string> {
  const config = getConfig();
  const client = createClient(model, config) as OpenAI;
  const name = modelName(model);
  const toolSpecs: ToolSpec[] = getTools();
  const tools = toolSpecs.length > 0 ? (toolSpecs as unknown as ChatCompletionTool[]) : undefined;

  // Clonar historial para el loop
  let loopMessages = [...messages];
  let iterations = 0;
  const MAX_ITERATIONS = 6;

  try {
    // Primera llamada
    let response = await client.chat.completions.create({
      model: name,
      messages: loopMessages,
      max_tokens: maxTokens,
      tools,
      tool_choice: tools ? "auto" : undefined,
    });

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const assistantMsg = response.choices[0]?.message;
      if (!assistantMsg) break;

      // Importante: OpenRouter requiere content string (no null) si hay tool_calls
      const msgToPush = { 
        role: "assistant",
        content: assistantMsg.content || "", 
        tool_calls: assistantMsg.tool_calls 
      } as ChatCompletionMessageParam;
      
      loopMessages.push(msgToPush);

      // Si no hay tools calls, terminamos el loop
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        if (assistantMsg.content) return assistantMsg.content;
        // Si no hay contenido y no hay tools, pedimos una respuesta forzada
        break; 
      }

      // Ejecutar herramientas
      const toolResults: ChatCompletionMessageParam[] = [];
      for (const toolCall of assistantMsg.tool_calls) {
        const fn = toolCall.function;
        let args: Record<string, unknown> = {};
        try {
          args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;
        } catch { args = {}; }

        console.log(chalk.yellow(`   🔧 Tool: ${fn.name}`), args);
        const result = await executeTool(fn.name, args, { sessionId });
        console.log(chalk.cyan(`   💡 Result: ${String(result).slice(0, 70)}...`));

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: String(result),
        });
      }

      loopMessages.push(...toolResults);

      // Siguiente iteración
      response = await client.chat.completions.create({
        model: name,
        messages: loopMessages,
        max_tokens: maxTokens,
        tools,
      });
    }

    // Si salimos del loop sin respuesta textual, forzamos una última llamada pidiendo texto
    if (!response.choices[0]?.message?.content) {
      loopMessages.push({ role: "system", content: "Por favor, responde al usuario basándote en la información obtenida anteriormente." });
      const finalRes = await client.chat.completions.create({
        model: name,
        messages: loopMessages,
        max_tokens: maxTokens,
      });
      return finalRes.choices[0]?.message?.content || "";
    }

    return response.choices[0].message.content;

  } catch (err: any) {
    if (err.status === 400 || err.status === 422) {
      throw new Error(`Error de formato del modelo (${err.status}). Intenta /reset.`);
    }
    throw err;
  }
}

async function runAnthropic(_model: string, _messages: any[], _tokens: number): Promise<string> {
  return "Soporte Anthropic en desarrollo.";
}
