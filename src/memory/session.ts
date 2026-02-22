import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Historial de sesiones en memoria (por sessionId)
const sessions = new Map<string, ChatCompletionMessageParam[]>();

export function getHistory(sessionId: string): ChatCompletionMessageParam[] {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId)!;
}

export function addMessage(sessionId: string, msg: ChatCompletionMessageParam, maxMessages: number = 40): void {
  const history = getHistory(sessionId);
  history.push(msg);
  
  if (history.length > maxMessages) {
    const toRemove = history.length - maxMessages;
    history.splice(0, toRemove);
  }
}

export function resetSession(sessionId: string): void {
  sessions.set(sessionId, []);
}

export function getSessionCount(): number {
  return sessions.size;
}
