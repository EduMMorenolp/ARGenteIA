import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Historial de sesiones en memoria (por sessionId)
const sessions = new Map<string, ChatCompletionMessageParam[]>();

export function getHistory(sessionId: string): ChatCompletionMessageParam[] {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId)!;
}

export function addMessage(sessionId: string, msg: ChatCompletionMessageParam): void {
  const history = getHistory(sessionId);
  history.push(msg);
}

export function resetSession(sessionId: string): void {
  sessions.set(sessionId, []);
}

export function getSessionCount(): number {
  return sessions.size;
}
