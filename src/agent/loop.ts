import { getConfig } from "../config/index.ts";
import { createClient, modelName, detectProvider } from "./models.ts";
import type OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { getTools, executeTool, type ToolSpec } from "../tools/index.ts";
import { addMessage, getHistory } from "../memory/session.ts";
import { saveMessage } from "../memory/message-db.ts";
import chalk from "chalk";

export interface AgentOptions {
  sessionId: string;
  userText: string;
  onTyping?: (isTyping: boolean) => void;
  origin?: "web" | "telegram"; // Origen del mensaje
  telegramChatId?: number; // ID de chat si viene de Telegram
}

export interface AgentResponse {
  text: string;
  model: string;
}

export async function runAgent(opts: AgentOptions): Promise<AgentResponse> {
  const config = getConfig();

  // 0. Verificar si existe un override para el asistente general en la DB
  const { getExpert } = await import("../memory/expert-db.ts");
  const generalOverride = getExpert("__general__");

  const model = generalOverride?.model || config.agent.model;
  const provider = detectProvider(model);

  // Añadir mensaje del usuario al historial en memoria
  addMessage(
    opts.sessionId,
    { role: "user", content: opts.userText },
    config.agent.maxContextMessages,
  );

  // Persistir en base de datos
  saveMessage({
    userId: opts.sessionId,
    role: "user",
    content: opts.userText,
    origin: opts.origin || "web",
  });

  const messages = getHistory(opts.sessionId);

  opts.onTyping?.(true);

  try {
    let responseText = "";

    if (provider === "anthropic") {
      responseText = await runAnthropic(
        model,
        messages,
        config.agent.maxTokens,
      );
    } else {
      responseText = await runOpenAI(
        model,
        messages,
        config.agent.maxTokens,
        opts,
      );
    }

    // Si por alguna razón sigue vacío, forzar algo
    if (!responseText || responseText.trim() === "") {
      responseText =
        "He procesado tu solicitud, pero no tengo una respuesta textual en este momento. ¿En qué más puedo ayudarte?";
    }

    // Guardar respuesta final en historial en memoria
    addMessage(
      opts.sessionId,
      { role: "assistant", content: responseText },
      config.agent.maxContextMessages,
    );

    // Persistir respuesta en base de datos
    saveMessage({
      userId: opts.sessionId,
      role: "assistant",
      content: responseText,
      origin: opts.origin || "web",
    });

    return { text: responseText, model };
  } catch (err: any) {
    console.error(chalk.red("   ❌ Error en runAgent:"), err.message);
    const msg = err.message || "Error desconocido";
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
): Promise<string> {
  const config = getConfig();
  const sessionId = opts.sessionId;

  // 0. Preparar lista de modelos (el principal primero, luego el resto como fallback)
  const allAvailableModels = Object.keys(config.models);
  const modelsToTry = [model, ...allAvailableModels.filter((m) => m !== model)];

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    const client = createClient(currentModel, config) as OpenAI;
    const name = modelName(currentModel);

    // 1. Obtener override/perfil/herramientas (necesario en cada intento por si cambian)
    const { getExpert } = await import("../memory/expert-db.ts");
    const generalOverride = getExpert("__general__");
    const toolSpecs: ToolSpec[] = getTools(generalOverride?.tools);
    const tools =
      toolSpecs.length > 0
        ? (toolSpecs as unknown as ChatCompletionTool[])
        : undefined;

    const { getUser } = await import("../memory/user-db.ts");
    const { loadSkills } = await import("../skills/loader.ts");
    const userProfile = getUser(sessionId);
    const skills = await loadSkills();

    let systemPrompt =
      generalOverride?.system_prompt ||
      config.agent.systemPrompt ||
      "Eres un asistente personal útil.";

    if (
      skills.length > 0 &&
      !systemPrompt.includes("COMPETENCIAS Y HABILIDADES ADICIONALES")
    ) {
      systemPrompt += `\n\nCOMPETENCIAS Y HABILIDADES ADICIONALES:\n${skills.join("\n\n")}`;
    }

    if (userProfile && userProfile.name) {
      systemPrompt += `\nESTÁS HABLANDO CON: ${userProfile.name}. Su zona horaria es: ${userProfile.timezone}.`;
    } else {
      systemPrompt += `\nESTE ES UN USUARIO NUEVO. NO TIENES SU PERFIL.
      INSTRUCCIÓN CRÍTICA: Antes de cualquier otra cosa, preséntate brevemente como ARGenteIA y dile al usuario que necesitas configurar su perfil. 
      Pídele amablemente su NOMBRE y confirma su zona horaria (por defecto Argentina/BsAs). 
      Cuando te dé los datos, usa la herramienta 'update_profile'.`;
    }

    const { listExperts } = await import("../memory/expert-db.ts");
    let experts = listExperts();
    if (generalOverride?.experts && generalOverride.experts.length > 0) {
      experts = experts.filter((e) => generalOverride.experts.includes(e.name));
    }
    if (experts.length > 0) {
      systemPrompt += `\n\nTIENES ACCESO A UN EQUIPO DE EXPERTOS ESPECIALIZADOS. 
      Si el usuario requiere una tarea que encaje con alguno de estos expertos, USA la herramienta 'call_expert'.
      Expertos disponibles:
      ${experts.map((e) => `- ${e.name}: ${e.system_prompt.slice(0, 100)}... (Modelo: ${e.model})`).join("\n    ")}
      
      REGLA: Prefiere delegar tareas técnicas, de redacción creativa o de investigación a estos expertos para mejores resultados.`;
    }

    systemPrompt += `\n\nORIGEN DEL MENSAJE: Estas hablando por el canal ${opts.origin || "web"}.`;
    if (opts.origin === "telegram") {
      systemPrompt += `\nINSTRUCCIÓN: Como estás en Telegram, usa la herramienta 'send_file_telegram' si el usuario te pide que le envíes un archivo.`;
    } else {
      systemPrompt += `\nINSTRUCCIÓN: Como estás en el navegador (WebChat), si el usuario te pide un archivo, dile que puedes dárselo por Telegram si vincula su cuenta o simplemente dale la ruta local si está en su propia PC.`;
    }

    let loopMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    let iterations = 0;
    const MAX_ITERATIONS = 6;

    try {
      const callWithRetry = async (
        messages: ChatCompletionMessageParam[],
        useTools: boolean,
      ) => {
        let retries = 3;
        let delay = 2000;

        while (retries > 0) {
          try {
            return await client.chat.completions.create({
              model: name,
              messages,
              max_tokens: maxTokens,
              temperature: generalOverride?.temperature ?? 0.7,
              tools: useTools ? tools : undefined,
              tool_choice: useTools && tools ? "auto" : undefined,
            });
          } catch (err: any) {
            if (err.status === 429 && retries > 1) {
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
        throw new Error("429"); // Simplificado para capturar arriba
      };

      let response = await callWithRetry(loopMessages, true);

      while (iterations < MAX_ITERATIONS) {
        iterations++;
        const assistantMsg = response.choices[0]?.message;
        if (!assistantMsg) break;

        const msgToPush = {
          role: "assistant",
          content: assistantMsg.content || "",
          tool_calls: assistantMsg.tool_calls,
        } as ChatCompletionMessageParam;

        loopMessages.push(msgToPush);

        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
          if (assistantMsg.content) return assistantMsg.content;
          break;
        }

        const toolResults: ChatCompletionMessageParam[] = [];
        for (const toolCall of assistantMsg.tool_calls) {
          const fn = (toolCall as any).function;
          if (!fn) continue;
          let args: Record<string, unknown> = {};
          try {
            args =
              typeof fn.arguments === "string"
                ? JSON.parse(fn.arguments)
                : fn.arguments;
          } catch {
            args = {};
          }

          console.log(chalk.yellow(`   🔧 Tool: ${fn.name}`), args);
          const result = await executeTool(fn.name, args, {
            sessionId: opts.sessionId,
            origin: opts.origin,
            telegramChatId: opts.telegramChatId,
          });
          console.log(
            chalk.cyan(`   💡 Result: ${String(result).slice(0, 70)}...`),
          );

          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: String(result),
          });
        }

        loopMessages.push(...toolResults);
        response = await callWithRetry(loopMessages, true);
      }

      if (!response.choices[0]?.message?.content) {
        loopMessages.push({
          role: "system",
          content:
            "Por favor, responde al usuario basándote en la información obtenida anteriormente.",
        });
        const finalRes = await callWithRetry(loopMessages, false);
        return finalRes.choices[0]?.message?.content || "";
      }

      return response.choices[0].message.content;
    } catch (err: any) {
      const isRateLimit = err.status === 429 || err.message === "429";
      const isProviderError =
        err.status === 401 ||
        err.status === 402 ||
        err.status === 404 ||
        err.status === 503;

      // Si es un error de cuota (429), auth (401), pago (402), política (404) o servicio (503) y tenemos más modelos...
      if ((isRateLimit || isProviderError) && mIdx < modelsToTry.length - 1) {
        const errorType = err.status || err.message;
        const msg =
          err.status === 401
            ? "Auth Error"
            : err.status === 404
              ? "Not Found/Policy"
              : err.status === 429
                ? "Rate Limit"
                : `Status ${errorType}`;

        console.error(
          chalk.red(
            `   🚨 Modelo [${currentModel}] falló (${msg}). Probando fallback con [${modelsToTry[mIdx + 1]}]...`,
          ),
        );
        continue; // Siguiente modelo en el loop for
      }

      // Errores finales si ya no quedan modelos o es un error grave
      if (err.status === 404) {
        throw new Error(
          "Error 404: OpenRouter no encuentra el endpoint. Revisa tu configuración de privacidad en OpenRouter (permite 'Free model publication').",
        );
      }
      if (err.status === 401) {
        throw new Error(
          "Error 401: API Key inválida o usuario no encontrado en OpenRouter. Revisa tu sk-or-key en config.json.",
        );
      }
      if (err.status === 402) {
        throw new Error(
          "Error 402: El modelo requiere créditos o ha cambiado de política.",
        );
      }
      if (isRateLimit) {
        throw new Error(
          "Todos los modelos gratuitos están saturados (429). Por favor, intenta de nuevo en unos minutos o usa un modelo de pago.",
        );
      }

      throw err;
    }
  }

  throw new Error("No se pudo obtener respuesta de ningún modelo configurado.");
}

async function runAnthropic(
  _model: string,
  _messages: any[],
  _tokens: number,
): Promise<string> {
  return "Soporte Anthropic en desarrollo.";
}
