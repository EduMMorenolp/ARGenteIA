export interface Expert {
  name: string;
  model: string;
  system_prompt: string;
  temperature: number;
  tools?: string[];
}

export interface UserProfile {
  userId: string;
  name: string | null;
  timezone: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  type?: 'message' | 'command' | 'error';
  origin?: 'web' | 'telegram';
}

export interface WsMessage {
  type: string;
  text?: string;
  model?: string;
  messageCount?: number;
  isTyping?: boolean;
  command?: string;
  result?: string;
  message?: string;
  sessionId?: string;
  experts?: Expert[];
  tools?: string[];
  users?: UserProfile[];
  tasks?: any[];
  origin?: 'web' | 'telegram';
  history?: Array<{
    role: string;
    text: string;
    origin: 'web' | 'telegram';
  }>;
}
