import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";
import { getConfig } from "../config/index.ts";
import { createClient, detectProvider, modelName } from "./models.ts";
import { buildSystemPrompt, pruneHistory } from "./prompt.ts";
import { getHistory, addMessage } from "../memory/session.ts";
import { getTools, executeTool } from "../tools/index.ts";
import { loadSkills } from "../skills/loader.ts";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

export interface RunOptions {
  sessionId: string;
  userText: string;
  /** Modelo a usar. Si no se especifica, usa el de config. */
  model?: string;
  /** Callback para enviar typing indicators */
  onTyping?: (isTyping: boolean) => void;
}

export interface RunResult {
  text: string;
  model: string;
}

export async function runAgent(opts: RunOptions): Promise<RunResult> {
  const config = getConfig();
  const model = opts.model ?? config.agent.model;
  const provider = detectProvider(model);

  opts.onTyping?.(true);

  try {
    // Cargar skills y construir system prompt
    const skills = await loadSkills();
    const systemPrompt = await buildSystemPrompt(skills);

    // Añadir mensaje del usuario al historial
    addMessage(opts.sessionId, { role: "user", content: opts.userText });

    // Obtener historial podado
    const history = pruneHistory(getHistory(opts.sessionId), config.agent.maxContextMessages);

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1), // historial sin el último (ya lo añadimos abajo)
      { role: "user", content: opts.userText },
    ];

    let responseText: string;

    if (provider === "anthropic") {
      responseText = await runAnthropic(model, messages, config.agent.maxTokens);
    } else {
      responseText = await runOpenAI(model, messages, config.agent.maxTokens);
    }

    // Guardar respuesta en historial
    addMessage(opts.sessionId, { role: "assistant", content: responseText });

    console.log(chalk.dim(`   [${model}] ${opts.sessionId}: ${responseText.slice(0, 80)}...`));

    return { text: responseText, model };
  } finally {
    opts.onTyping?.(false);
  }
}

// ─── OpenAI / OpenRouter ──────────────────────────────────────────────────────

async function runOpenAI(
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
): Promise<string> {
  const config = getConfig();
  const client = createClient(model, config) as OpenAI;
  const name = modelName(model);
  const tools = getTools() as ChatCompletionTool[];

  // Primera llamada
  let response = await client.chat.completions.create({
    model: name,
    messages,
    max_tokens: maxTokens,
    tools: tools.length > 0 ? tools : undefined,
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
      const args = JSON.parse(toolCall.function.arguments);
      console.log(chalk.yellow(`   🔧 Tool: ${toolCall.function.name}`), args);
      const result = await executeTool(toolCall.function.name, args);
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    loopMessages.push(...toolResults);

    // Nueva llamada con los resultados de las tools
    response = await client.chat.completions.create({
      model: name,
      messages: loopMessages,
      max_tokens: maxTokens,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });
  }

  return response.choices[0]?.message?.content ?? "Sin respuesta del modelo.";
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function runAnthropic(
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
): Promise<string> {
  const config = getConfig();
  const client = createClient(model, config) as Anthropic;
  const name = modelName(model);

  // Extraer system prompt y convertir mensajes al formato Anthropic
  const systemMsg = messages.find((m) => m.role === "system");
  const systemContent = typeof systemMsg?.content === "string" ? systemMsg.content : "";
  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : "",
    }));

  const response = await client.messages.create({
    model: name,
    max_tokens: maxTokens,
    system: systemContent,
    messages: anthropicMessages,
  });

  const block = response.content[0];
  return block?.type === "text" ? block.text : "Sin respuesta del modelo.";
}
