// Tipos del protocolo WebSocket entre el servidor y el cliente WebChat

export type WsMessageType =
  | "user_message"      // cliente → servidor: mensaje del usuario
  | "assistant_message" // servidor → cliente: respuesta del agente
  | "typing"            // servidor → cliente: indicador de escritura
  | "error"             // servidor → cliente: error
  | "status"            // servidor → cliente: info de la sesión
  | "command_result"    // servidor → cliente: resultado de un comando
  | "list_experts"      // servidor → cliente: lista de expertos disponibles
  | "expert_update"      // cliente → servidor: crear/actualizar experto
  | "list_users"        // servidor → cliente: lista de usuarios existentes
  | "list_tasks"        // servidor → cliente: lista de tareas programadas
  | "delete_task"      // cliente → servidor: eliminar tarea
  | "update_task"      // cliente → servidor: editar tarea
  | "identify";          // cliente → servidor: asociar sesión con userId

export interface WsUserMessage {
  type: "user_message";
  text: string;
  sessionId?: string;
  expertName?: string; // Si se define, el mensaje va directo a este experto
}

export interface WsAssistantMessage {
  type: "assistant_message";
  text: string;
  model: string;
  sessionId: string;
  origin?: 'web' | 'telegram';
  history?: Array<{
    role: string;
    text: string;
    origin: 'web' | 'telegram';
  }>;
}

export interface WsTypingMessage {
  type: "typing";
  isTyping: boolean;
}

export interface WsErrorMessage {
  type: "error";
  message: string;
}

export interface WsStatusMessage {
  type: "status";
  model: string;
  sessionId: string;
  messageCount: number;
  generalConfig?: any;
}

export interface WsCommandResultMessage {
  type: "command_result";
  command: string;
  result: string;
}

export interface WsListExpertsMessage {
  type: "list_experts";
  experts: any[];
}

export interface WsExpertUpdateMessage {
  type: "expert_update";
  action: "upsert" | "delete" | "list";
  expert?: any;
  name?: string;
}

export interface WsListUsersMessage {
  type: "list_users";
  users: any[];
}

export interface WsIdentifyMessage {
  type: "identify";
  userId: string;
}

export interface WsListTasksMessage {
  type: "list_tasks";
  tasks: any[];
}

export interface WsDeleteTaskMessage {
  type: "delete_task";
  id: number;
}

export interface WsUpdateTaskMessage {
  type: "update_task";
  id: number;
  task: string;
  cron: string;
}

export type WsMessage =
  | WsUserMessage
  | WsAssistantMessage
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
  | WsIdentifyMessage;
