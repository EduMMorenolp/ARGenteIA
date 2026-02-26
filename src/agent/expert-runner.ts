import { getConfig } from "../config/index.ts";
import { createClient, modelName } from "./models.ts";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getExpert } from "../memory/expert-db.ts";
import { saveMessage } from "../memory/message-db.ts";
import chalk from "chalk";
export interface ExpertRequest {
  expertName: string;
  task: string;
  userId?: string; // ID del usuario que solicita la tarea
}

/**
 * Ejecuta una tarea específica usando un sub-agente (experto).
 * Los expertos tienen su propio modelo y prompt de sistema.
 */
export async function runExpert(req: ExpertRequest): Promise<{ text: string; usage?: any; latencyMs: number }> {
  const startTime = Date.now();
  const expert = getExpert(req.expertName);
  if (!expert) {
    throw new Error(`Experto "${req.expertName}" no encontrado en la base de datos.`);
  }

  // Persistir la tarea si temenos un userId
  if (req.userId) {
    saveMessage({
      userId: req.userId,
      role: "user",
      content: `[Experto: ${req.expertName}] ${req.task}`,
      origin: "web",
      expertName: req.expertName
    });
  }
  
  console.log(chalk.magenta(`   🤖 Invocando experto: ${expert.name} (${expert.model})`));

  const config = getConfig();
  const client = createClient(expert.model, config) as OpenAI;
  const name = modelName(expert.model);

  // 1. Configurar herramientas disponibles para este experto
  const { getTools, executeTool } = await import("../tools/index.ts");
  const allTools = getTools();
  
  // Filtrar herramientas si el experto tiene una lista definida
  const tools = expert.tools && expert.tools.length > 0
    ? allTools.filter(t => expert.tools.includes(t.function.name))
    : [];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: expert.system_prompt },
    { role: "user", content: Array.isArray(req.task) ? JSON.stringify(req.task) : req.task }
  ];

  try {
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    let response = await client.chat.completions.create({
      model: name,
      messages,
      max_tokens: config.agent.maxTokens,
      temperature: expert.temperature ?? 0.7,
      tools: tools.length > 0 ? (tools as any) : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const assistantMsg = response.choices[0]?.message;
      if (!assistantMsg) break;

      messages.push({
        role: "assistant",
        content: assistantMsg.content || "",
        tool_calls: assistantMsg.tool_calls
      } as ChatCompletionMessageParam);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        if (assistantMsg.content) {
          return { 
            text: assistantMsg.content, 
            usage: response.usage,
            latencyMs: Date.now() - startTime
          };
        }
        break;
      }

      const toolResults: ChatCompletionMessageParam[] = [];
      for (const toolCall of assistantMsg.tool_calls) {
        const fn = (toolCall as any).function;
        if (!fn) continue;
        let args = {};
        try { args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments; } catch {}

        console.log(chalk.yellow(`   🔧 [Expert ${expert.name}] Tool: ${fn.name}`), args);
        const result = await executeTool(fn.name, args, { sessionId: req.userId || "expert-call" });
        
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: String(result),
        });
      }

      messages.push(...toolResults);

      response = await client.chat.completions.create({
        model: name,
        messages,
        max_tokens: config.agent.maxTokens,
        tools: tools as any,
      });
    }

    return { 
      text: response.choices[0]?.message?.content || "El experto no devolvió ninguna respuesta.",
      usage: response.usage,
      latencyMs: Date.now() - startTime
    };
  } catch (err: any) {
    console.error(chalk.red(`   ❌ Error en experto ${expert.name}:`), err.message);
    throw new Error(`Error del experto ${expert.name}: ${err.message}`);
  }
}

