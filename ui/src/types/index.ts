export interface Expert {
  name: string;
  model: string;
  system_prompt: string;
  temperature: number;
  tools?: string[];
  experts?: string[];
}

export interface ModelConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  created_at?: string;
}

export interface ChatInfo {
  id: string;
  title: string;
  origin: "web" | "telegram";
  expertName: string | null;
  pinned: boolean;
  updated_at: string;
  lastMessage?: string;
}

export interface UserProfile {
  userId: string;
  name: string | null;
  timezone: string;
  telegram_user: string | null;
  telegram_token: string | null;
  login_pin: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  model?: string;
  type?: "message" | "command" | "error" | "action_log";
  origin?: "web" | "telegram";
  timestamp?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs?: number;
  content?: string;
}

export interface ScheduledTask {
  id: number;
  userId: string;
  task: string;
  cron: string;
  nextRun?: string;
  lastRun?: string;
}

export interface WsMessage {
  type: string;
  text?: string;
  model?: string;
  messageCount?: number;
  generalConfig?: Expert;
  isTyping?: boolean;
  command?: string;
  result?: string;
  message?: string;
  sessionId?: string;
  experts?: Expert[];
  tools?: string[];
  users?: UserProfile[];
  tasks?: ScheduledTask[];
  models?: ModelConfig[];
  origin?: "web" | "telegram";
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs?: number;
    history?: Array<{
    role: string;
    text: string;
    origin: "web" | "telegram";
  }>;
  chats?: ChatInfo[];
  channelChats?: ChatInfo[];
  chatId?: string;
  expertName?: string | null;
  oldName?: string;
  modelConfig?: ModelConfig;
  action?: string;
}
