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
} from "../types";
import { useWebSocket } from "./useWebSocket";

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userModel, setUserModel] = useState("–");
  const [messageCount, setMessageCount] = useState(0);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addMessage = useCallback(
    (
      role: "user" | "assistant",
      text: string,
      model?: string,
      type: "message" | "command" | "error" = "message",
      origin?: "web" | "telegram",
      usage?: any,
      latencyMs?: number,
      id?: string,
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
          setMessageCount(msg.messageCount || 0);
          if (msg.generalConfig) setGeneralConfig(msg.generalConfig);
          break;
        case "typing":
          setIsTyping(!!msg.isTyping);
          break;
        case "list_chats":
          if (msg.chats) setChats(msg.chats);
          if (msg.channelChats) setChannelChats(msg.channelChats);
          break;
        case "assistant_message":
          setIsTyping(false);
          setIsWaiting(false);

          // Si el mensaje trae chatId y no tenemos uno activo, lo activamos
          if (msg.chatId && !activeChatId) {
            setActiveChatId(msg.chatId);
          }

          if (msg.history && msg.history.length > 0) {
            const historicalMessages = msg.history.map((m) => ({
              id: "hist-" + Math.random().toString(36).substr(2, 9),
              role: (m.role === "user" ? "user" : "assistant") as
                | "user"
                | "assistant",
              text: m.text,
              origin: m.origin,
            }));
            setMessages(historicalMessages);
          } else if (msg.text && msg.text !== "Cargando historial...") {
            addMessage(
              "assistant",
              msg.text,
              msg.model,
              "message",
              msg.origin,
              msg.usage,
              msg.latencyMs,
            );
          }
          setMessageCount((prev) => prev + 1);
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

  const upsertModel = (model: ModelConfig) => {
    send({ type: "model_update", action: "upsert", model });
  };

  const deleteModel = (name: string) => {
    send({ type: "model_update", action: "delete", name });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const renderContent = (text: string) => ({
    __html: marked.parse(text) as string,
  });

  const logout = () => {
    setMessages([]);
    setChats([]);
    setChannelChats([]);
    setActiveChatId(null);
    setCurrentUser(null);
  };

  // ─── Funciones de Chat ───────────────────────────────────────────────────

  const createChat = (title?: string) => {
    send({
      type: "chat_update",
      action: "create",
      expertName: selectedExpert || null,
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
    send({ type: "switch_chat", chatId });
  };

  // Cada vez que cambia el experto, pedir lista de chats de ese experto
  useEffect(() => {
    if (currentUser) {
      // Usar setTimeout para evitar el error de setState en el cuerpo del efecto
      setTimeout(() => {
        setMessages([]);
        setActiveChatId(null);
        send({
          type: "chat_update",
          action: "list",
          expertName: selectedExpert || null,
        });
      }, 0);
    }
  }, [selectedExpert, currentUser, send]);

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
    messageCount,
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
  };
}
