import { useState, useRef, useCallback, useEffect } from "react";
import { marked } from "marked";
import type {
  Message,
  Expert,
  ModelConfig,
  UserProfile,
  WsMessage,
  ScheduledTask,
  ChatInfo,
  DashboardStats,
  ModelCapabilities,
} from "../types";
import { useWebSocket } from "./useWebSocket";

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userModel, setUserModel] = useState("–");
  const [generalConfig, setGeneralConfig] = useState<Expert | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // Management state
  const [experts, setExperts] = useState<Expert[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [selectedExpert, setSelectedExpert] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [channelChats, setChannelChats] = useState<ChatInfo[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [modelCapabilities, setModelCapabilities] = useState<Record<string, ModelCapabilities>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addMessage = useCallback(
    (
      role: "user" | "assistant",
      text: string,
      model?: string,
      type: "message" | "command" | "error" | "action_log" = "message",
      origin?: "web" | "telegram",
      usage?: any,
      latencyMs?: number,
      id?: string,
      timestamp?: string
    ) => {
      setMessages((prev) => [
        ...prev,
        {
          id: id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          role,
          text,
          model,
          type,
          origin,
          usage,
          latencyMs,
          timestamp: timestamp || new Date().toISOString()
        },
      ]);
    },
    [],
  );

  const handleServerMessage = useCallback(
    (msg: WsMessage) => {
      switch (msg.type) {
        case "status":
          setUserModel(msg.model || "–");
          if (msg.generalConfig) setGeneralConfig(msg.generalConfig);
          break;
        case "typing":
          setIsTyping(!!msg.isTyping);
          break;
        case "action_log":
          // Añadimos el log como un mensaje especial del asistente
          addMessage("assistant", msg.text || "", undefined, "action_log");
          break;
        case "list_chats":
          if (msg.chats) setChats(msg.chats);
          if (msg.channelChats) setChannelChats(msg.channelChats);
          break;
        case "assistant_chunk":
          setIsTyping(false);
          setIsWaiting(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            const msgText = msg.text || '';
            if (last && last.role === "assistant" && last.type === "message") {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...last,
                text: last.text + msgText,
              };
              return newMessages;
            }
            // First chunk
            return [
              ...prev,
              {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                role: "assistant",
                text: msgText,
                type: "message",
                timestamp: new Date().toISOString(),
              },
            ];
          });
          break;
        case "assistant_message":
          setIsTyping(false);
          setIsWaiting(false);

          // Asegurar que el chatId activo coincida con el que usó el servidor
          if (msg.chatId && msg.chatId !== activeChatId) {
            setActiveChatId(msg.chatId);
          }

          if (msg.history) {
            const historicalMessages = msg.history.map((m) => ({
              id: "hist-" + Math.random().toString(36).substr(2, 9),
              role: (m.role === "user" ? "user" : "assistant") as
                | "user"
                | "assistant",
              text: m.text,
              origin: m.origin,
              timestamp: (m as any).timestamp
            }));
            setMessages(historicalMessages);
            setIsWaiting(false);
            if (msg.expertName !== undefined) {
              setSelectedExpert(msg.expertName);
            }
          } else if (msg.text === "Cargando historial..." && msg.chatId) {
            setActiveChatId(msg.chatId);
            setMessages([]);
            send({ type: "switch_chat", chatId: msg.chatId });
          } else if (msg.text && msg.text !== "Cargando historial...") {
              // Si ya se estaban recibiendo chunks, actualizar información final del mensaje
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                const msgText = msg.text || '';
                if (last && last.role === "assistant" && last.type === "message" && msgText === last.text) {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    model: msg.model,
                    origin: msg.origin,
                    usage: msg.usage,
                    latencyMs: msg.latencyMs,
                  };
                  return newMessages;
                } else if (last && last.role === "assistant" && last.type === "message" && msgText.startsWith(last.text)) {
                   // Update with the definitive text, since chunking might be slightly off.
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    text: msgText,
                    model: msg.model,
                    origin: msg.origin,
                    usage: msg.usage,
                    latencyMs: msg.latencyMs,
                  };
                  return newMessages;
                } else if (last && last.role === "assistant" && last.type === "message" && !msgText.startsWith(last.text)) {
                   // Full fallback just in case chunking didn't start properly or mismatch
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    text: msgText,
                    model: msg.model,
                    origin: msg.origin,
                    usage: msg.usage,
                    latencyMs: msg.latencyMs,
                  };
                  return newMessages;
                }
                
                // Si no hay mensaje previo (no hubo chunks), agregarlo entero
                return [
                  ...prev,
                  {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    role: "assistant",
                    text: msgText,
                    model: msg.model,
                    type: "message",
                    origin: msg.origin,
                    usage: msg.usage,
                    latencyMs: msg.latencyMs,
                    timestamp: (msg as any).timestamp || new Date().toISOString()
                  }
                ];
              });
          }
          break;
        case "command_result":
          setIsTyping(false);
          setIsWaiting(false);
          addMessage("assistant", msg.result || "", undefined, "command");
          break;
        case "error":
          setIsTyping(false);
          setIsWaiting(false);
          addMessage(
            "assistant",
            msg.message || "Error desconocido",
            undefined,
            "error",
          );
          break;
        case "list_experts":
          if (msg.experts) setExperts(msg.experts);
          break;
        case "list_tools":
          if (msg.tools) setAvailableTools(msg.tools);
          break;
        case "list_users":
          if (msg.users) setAvailableUsers(msg.users);
          break;
        case "list_tasks":
          if (msg.tasks) setScheduledTasks(msg.tasks);
          break;
        case "list_models":
          if (msg.models) setAvailableModels(msg.models);
          break;
        case "dashboard_stats":
          if ((msg as any).stats) setDashboardStats((msg as any).stats);
          break;
        case "model_info":
          if ((msg as any).modelName && (msg as any).capabilities) {
            setModelCapabilities((prev) => ({
              ...prev,
              [(msg as any).modelName]: (msg as any).capabilities,
            }));
          }
          break;
      }
    },
    [addMessage, activeChatId],
  );

  const { isConnected, send } = useWebSocket(handleServerMessage);

  const identifyUser = (user: UserProfile) => {
    setMessages([]);
    setChats([]);
    setChannelChats([]);
    setActiveChatId(null);
    send({ type: "identify", userId: user.userId });
    setCurrentUser(user);
  };

  const continueAsGuest = () => {
    setMessages([]);
    const guestId = `guest-${Math.random().toString(36).substr(2, 9)}`;
    send({ type: "identify", userId: guestId });
    setCurrentUser({
      userId: guestId,
      name: "Invitado",
      timezone: "America/Argentina/Buenos_Aires",
      telegram_user: null,
      telegram_token: null,
      login_pin: "0000",
      created_at: new Date().toISOString(),
    });
  };

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      addMessage("user", text);

      send({
        type: "user_message",
        text,
        expertName: selectedExpert || undefined,
        chatId: activeChatId || undefined,
      });

      setIsWaiting(true);
      setIsTyping(true);
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [addMessage, send, selectedExpert, activeChatId],
  );

  const upsertExpert = (expert: Expert) => {
    send({ type: "expert_update", action: "upsert", expert });
    setIsCreatorOpen(false);
    setEditingExpert(null);
  };

  const deleteExpert = (name: string) => {
    if (confirm(`¿Estás seguro de eliminar al experto "${name}"?`)) {
      send({ type: "expert_update", action: "delete", name });
      if (selectedExpert === name) setSelectedExpert(null);
    }
  };

  const deleteTask = (id: number) => {
    send({ type: "delete_task", id });
  };

  const updateTask = (id: number, task: string, cron: string) => {
    send({ type: "update_task", id, task, cron });
    setEditingTask(null);
  };

  const upsertModel = (model: ModelConfig, oldName?: string) => {
    send({ type: "model_update", action: "upsert", modelConfig: model, oldName });
  };

  const deleteModel = (name: string) => {
    send({ type: "model_update", action: "delete", name });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const renderContent = (text: string) => {
    const renderer = new marked.Renderer();
    renderer.code = (codeInfo) => {
      const codeTypeStr = typeof codeInfo === 'string' ? codeInfo : (codeInfo as any).text;
      const lang = typeof codeInfo === 'string' ? '' : (codeInfo as any).lang || '';
      return `
        <div class="code-block-wrapper">
          <button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.innerText); this.innerHTML='<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'20 6 9 17 4 12\\'/></svg> Copiado'; setTimeout(() => this.innerHTML='<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\' ry=\\'2\\'/><path d=\\'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\\'/></svg> Copiar', 2000)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar
          </button>
          <pre><code class="language-${lang}">${codeTypeStr}</code></pre>
        </div>
      `;
    };
    
    // We parse synchronously
    const html = marked.parse(text, { renderer }) as string;
    return { __html: html };
  };

  const logout = () => {
    setMessages([]);
    setChats([]);
    setChannelChats([]);
    setActiveChatId(null);
    setCurrentUser(null);
  };

  // ─── Funciones de Chat ───────────────────────────────────────────────────

  const createChat = (expertNameOverride?: string | null, title?: string) => {
    send({
      type: "chat_update",
      action: "create",
      expertName: expertNameOverride !== undefined ? expertNameOverride : (selectedExpert || null),
      title,
    });
  };

  const deleteChat = (chatId: string) => {
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
    send({
      type: "chat_update",
      action: "delete",
      chatId,
      expertName: selectedExpert || null,
    });
  };

  const renameChat = (chatId: string, title: string) => {
    send({
      type: "chat_update",
      action: "rename",
      chatId,
      title,
      expertName: selectedExpert || null,
    });
  };

  const togglePinChat = (chatId: string) => {
    send({
      type: "chat_update",
      action: "pin",
      chatId,
      expertName: selectedExpert || null,
    });
  };

  const switchChat = (chatId: string) => {
    setActiveChatId(chatId);
    setMessages([]); // Limpiar para cargar historia
    
    // Sincronizar experto
    const chat = chats.find(c => c.id === chatId) || channelChats.find(c => c.id === chatId);
    if (chat) {
      setSelectedExpert(chat.expertName || null);
    }

    if (currentUser) {
      localStorage.setItem(`lastChatId_${currentUser.userId}`, chatId);
    }
    send({ type: "switch_chat", chatId });
  };

  // Persistir activeChatId cuando cambie (por ejemplo, al recibir assistant_message)
  useEffect(() => {
    if (activeChatId && currentUser) {
      localStorage.setItem(`lastChatId_${currentUser.userId}`, activeChatId);
    }
  }, [activeChatId, currentUser]);

  // Cada vez que cambia el experto, pedir lista de chats de ese experto
  useEffect(() => {
    if (!currentUser) return;

    // Si cambiamos de experto, reseteamos la vista actual
    setMessages([]);
    setActiveChatId(null);

    // Pedir lista
    send({
      type: "chat_update",
      action: "list",
      expertName: selectedExpert || null,
    });
  }, [selectedExpert, currentUser, send]);

  const [didInitialLoad, setDidInitialLoad] = useState(false);
  useEffect(() => {
    if (chats.length > 0 && !activeChatId && currentUser && !didInitialLoad) {
      const savedChatId = localStorage.getItem(`lastChatId_${currentUser.userId}`);
      if (savedChatId && chats.some(c => c.id === savedChatId)) {
        switchChat(savedChatId);
      }
      setDidInitialLoad(true);
    }
  }, [chats, activeChatId, currentUser, didInitialLoad]);

  useEffect(() => {
    if (currentUser) setDidInitialLoad(true);
  }, [selectedExpert]);

  const registerUser = (
    userId: string,
    name: string,
    timezone: string,
    telegram_user?: string,
    telegram_token?: string,
    login_pin?: string,
  ) => {
    send({
      type: "user_register",
      userId,
      name,
      timezone,
      telegram_user,
      telegram_token,
      login_pin,
    });
    setCurrentUser({
      userId,
      name,
      timezone,
      telegram_user: telegram_user || null,
      telegram_token: telegram_token || null,
      login_pin: login_pin || "0000",
      created_at: new Date().toISOString(),
    });
  };

  const updateUser = (
    name: string,
    timezone: string,
    telegram_user?: string,
    telegram_token?: string,
    login_pin?: string,
  ) => {
    if (!currentUser) return;
    send({
      type: "user_update",
      userId: currentUser.userId,
      name,
      timezone,
      telegram_user,
      telegram_token,
      login_pin,
    });
    setCurrentUser({
      ...currentUser,
      name,
      timezone,
      telegram_user: telegram_user || null,
      telegram_token: telegram_token || null,
      login_pin: login_pin || currentUser.login_pin,
    });
  };

  const deleteAccount = () => {
    if (!currentUser) return;
    send({ type: "user_delete", userId: currentUser.userId });
    logout();
  };

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    userModel,
    isWaiting,
    isConnected,
    experts,
    availableTools,
    availableUsers,
    scheduledTasks,
    currentUser,
    selectedExpert,
    generalConfig,
    setSelectedExpert,
    isCreatorOpen,
    setIsCreatorOpen,
    isFeaturesOpen,
    setIsFeaturesOpen,
    editingExpert,
    setEditingExpert,
    editingTask,
    setEditingTask,
    textareaRef,
    identifyUser,
    continueAsGuest,
    registerUser,
    updateUser,
    sendMessage,
    upsertExpert,
    deleteExpert,
    deleteTask,
    updateTask,
    handleInputChange,
    renderContent,
    logout,
    deleteAccount,
    availableModels,
    upsertModel,
    deleteModel,
    // Chat
    chats,
    channelChats,
    activeChatId,
    createChat,
    deleteChat,
    renameChat,
    togglePinChat,
    switchChat,
    // Dashboard
    dashboardStats,
    requestStats: () => send({ type: "request_dashboard" } as any),
    // Model Info
    modelCapabilities,
    requestModelInfo: (modelName: string) =>
      send({ type: "request_model_info", modelName } as any),
  };
}
