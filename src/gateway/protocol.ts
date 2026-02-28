// Tipos del protocolo WebSocket entre el servidor y el cliente WebChat

// Lightweight type aliases para evitar imports circulares con los módulos de DB
export interface SubAgentInfo {
  name: string;
  model: string;
  system_prompt: string;
  tools: string[];
  experts: string[];
  temperature: number;
  created_at?: string;
}
export interface UserInfo {
  userId: string;
  name: string | null;
  timezone: string;
  telegram_user: string | null;
  telegram_token: string | null;
  login_pin: string;
  created_at: string;
}
export interface TaskInfo {
  id: number;
  userId: string;
  task: string;
  cron: string;
  active: number;
  created_at: string;
}
export type ModelInfo = { name: string; apiKey?: string; baseUrl?: string; created_at?: string };
export type ChatInfo = {
  id: string;
  title: string;
  origin: string;
  expertName: string | null;
  pinned: number;
  updated_at: string;
  lastMessage?: string;
};

export type WsMessageType =
  | 'user_message' // cliente → servidor: mensaje del usuario
  | 'assistant_message' // servidor → cliente: respuesta del agente
  | 'typing' // servidor → cliente: indicador de escritura
  | 'error' // servidor → cliente: error
  | 'status' // servidor → cliente: info de la sesión
  | 'command_result' // servidor → cliente: resultado de un comando
  | 'list_experts' // servidor → cliente: lista de expertos disponibles
  | 'expert_update' // cliente → servidor: crear/actualizar experto
  | 'list_users' // servidor → cliente: lista de usuarios existentes
  | 'list_tasks' // servidor → cliente: lista de tareas programadas
  | 'delete_task' // cliente → servidor: eliminar tarea
  | 'update_task' // cliente → servidor: editar tarea
  | 'user_register' // cliente → servidor: crear nuevo usuario
  | 'user_update' // cliente → servidor: actualizar datos de usuario
  | 'user_delete' // cliente → servidor: eliminar usuario
  | 'identify' // cliente → servidor: asociar sesión con userId
  | 'list_models' // servidor → cliente: lista de modelos disponibles
  | 'model_update' // cliente → servidor: crear/actualizar/eliminar modelo
  | 'list_chats' // servidor → cliente: lista de chats del usuario
  | 'chat_update' // cliente → servidor: crear/renombrar/eliminar/pin chat
  | 'action_log' // servidor → cliente: log de acción intermedia (herramientas, pensamientos)
  | 'assistant_chunk' // servidor → cliente: fragmento de stream de respuesta
  | 'switch_chat'; // cliente → servidor: cambiar al chat seleccionado

export interface WsActionLogMessage {
  type: 'action_log';
  text: string;
  chatId?: string;
}

export interface WsUserRegisterMessage {
  type: 'user_register';
  userId: string;
  name: string;
  timezone: string;
  telegram_user?: string;
  telegram_token?: string;
  login_pin?: string;
}

export interface WsUserUpdateMessage {
  type: 'user_update';
  userId: string;
  name?: string;
  timezone?: string;
  telegram_user?: string;
  telegram_token?: string;
  login_pin?: string;
}

export interface WsUserDeleteMessage {
  type: 'user_delete';
  userId: string;
}

export interface WsUserMessage {
  type: 'user_message';
  text: string;
  sessionId?: string;
  expertName?: string; // Si se define, el mensaje va directo a este experto
  chatId?: string;
}

export interface WsAssistantMessage {
  type: 'assistant_message';
  text: string;
  model: string;
  sessionId: string;
  origin?: 'web' | 'telegram';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs?: number;
  chatId?: string;
  history?: Array<{
    role: string;
    text: string;
    origin: 'web' | 'telegram';
    timestamp?: string;
  }>;
  timestamp?: string;
  expertName?: string | null;
}

export interface WsAssistantChunkMessage {
  type: 'assistant_chunk';
  text: string;
  chatId?: string;
}

export interface WsTypingMessage {
  type: 'typing';
  isTyping: boolean;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export interface WsStatusMessage {
  type: 'status';
  model: string;
  sessionId: string;
  messageCount: number;
  generalConfig?: SubAgentInfo;
}

export interface WsCommandResultMessage {
  type: 'command_result';
  command: string;
  result: string;
}

export interface WsListExpertsMessage {
  type: 'list_experts';
  experts: SubAgentInfo[];
}

export interface WsExpertUpdateMessage {
  type: 'expert_update';
  action: 'upsert' | 'delete' | 'list';
  expert?: SubAgentInfo;
  name?: string;
}

export interface WsListUsersMessage {
  type: 'list_users';
  users: UserInfo[];
}

export interface WsIdentifyMessage {
  type: 'identify';
  userId: string;
}

export interface WsListTasksMessage {
  type: 'list_tasks';
  tasks: TaskInfo[];
}

export interface WsDeleteTaskMessage {
  type: 'delete_task';
  id: number;
}

export interface WsUpdateTaskMessage {
  type: 'update_task';
  id: number;
  task: string;
  cron: string;
}

export interface WsListModelsMessage {
  type: 'list_models';
  models: ModelInfo[];
}

export interface WsModelUpdateMessage {
  type: 'model_update';
  action: 'upsert' | 'delete';
  modelConfig?: { name: string; apiKey?: string; baseUrl?: string };
  name?: string;
  oldName?: string;
}

export type WsMessage =
  | WsUserMessage
  | WsAssistantMessage
  | WsAssistantChunkMessage
  | WsTypingMessage
  | WsErrorMessage
  | WsStatusMessage
  | WsCommandResultMessage
  | WsListExpertsMessage
  | WsExpertUpdateMessage
  | WsListUsersMessage
  | WsListTasksMessage
  | WsDeleteTaskMessage
  | WsUpdateTaskMessage
  | WsUserRegisterMessage
  | WsUserUpdateMessage
  | WsUserDeleteMessage
  | WsIdentifyMessage
  | WsListModelsMessage
  | WsModelUpdateMessage
  | WsListChatsMessage
  | WsChatUpdateMessage
  | WsSwitchChatMessage
  | WsActionLogMessage;

export interface WsListChatsMessage {
  type: 'list_chats';
  chats: ChatInfo[];
  channelChats: ChatInfo[];
}

export interface WsChatUpdateMessage {
  type: 'chat_update';
  action: 'create' | 'rename' | 'delete' | 'pin';
  chatId?: string;
  title?: string;
  expertName?: string | null;
}

export interface WsSwitchChatMessage {
  type: 'switch_chat';
  chatId: string;
}
