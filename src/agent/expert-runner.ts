import { getConfig } from "../config/index.ts";
import { createClient, modelName } from "./models.ts";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getExpert } from "../memory/expert-db.ts";
import chalk from "chalk";

export interface ExpertRequest {
  expertName: string;
  task: string;
}

/**
 * Ejecuta una tarea específica usando un sub-agente (experto).
 * Los expertos tienen su propio modelo y prompt de sistema.
 */
export async function runExpert(req: ExpertRequest): Promise<string> {
  const expert = getExpert(req.expertName);
  if (!expert) {
    throw new Error(`Experto "${req.expertName}" no encontrado en la base de datos.`);
  }

  console.log(chalk.magenta(`   🤖 Invocando experto: ${expert.name} (${expert.model})`));

  const config = getConfig();
  const client = createClient(expert.model, config) as OpenAI;
  const name = modelName(expert.model);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: expert.system_prompt },
    { role: "user", content: Array.isArray(req.task) ? JSON.stringify(req.task) : req.task }
  ];

  try {
    const response = await client.chat.completions.create({
      model: name,
      messages,
      max_tokens: config.agent.maxTokens,
      temperature: expert.temperature ?? 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return "El experto no devolvió ninguna respuesta.";
    }

    return content;
  } catch (err: any) {
    console.error(chalk.red(`   ❌ Error en experto ${expert.name}:`), err.message);
    throw new Error(`Error del experto ${expert.name}: ${err.message}`);
  }
}
