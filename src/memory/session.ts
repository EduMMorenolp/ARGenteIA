import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Historial de sesiones en memoria (por chatId)
const sessions = new Map<string, ChatCompletionMessageParam[]>();

export function getHistory(chatId: string): ChatCompletionMessageParam[] {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, []);
  }
  return sessions.get(chatId)!;
}

export function addMessage(
  chatId: string,
  msg: ChatCompletionMessageParam,
  maxMessages: number = 40,
): void {
  const history = getHistory(chatId);
  history.push(msg);

  if (history.length > maxMessages) {
    const toRemove = history.length - maxMessages;
    history.splice(0, toRemove);
  }
}

export function resetSession(chatId: string): void {
  sessions.set(chatId, []);
}

export function getSessionCount(): number {
  return sessions.size;
}
