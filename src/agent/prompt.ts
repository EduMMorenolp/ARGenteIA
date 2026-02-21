import { getConfig } from "../config/index.ts";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Construye el system prompt final combinando:
 * 1. El systemPrompt de config.json
 * 2. Las skills cargadas desde /skills/
 */
export async function buildSystemPrompt(skills: string[]): Promise<string> {
  const config = getConfig();
  const base = config.agent.systemPrompt;

  if (skills.length === 0) return base;

  const skillsBlock = skills.join("\n\n---\n\n");
  return `${base}\n\n# Skills adicionales\n\n${skillsBlock}`;
}

/**
 * Poda el historial dejando solo los últimos N mensajes
 * para no superar el límite de contexto del modelo.
 */
export function pruneHistory(
  messages: ChatCompletionMessageParam[],
  maxMessages: number,
): ChatCompletionMessageParam[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(messages.length - maxMessages);
}
