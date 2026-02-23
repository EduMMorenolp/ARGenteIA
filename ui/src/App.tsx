import type { KeyboardEvent, FormEvent } from "react";
import {
  Zap,
  MessageSquare,
  Terminal,
  Info,
  Globe,
  Database,
  Calendar,
  Shield,
  Cpu,
} from "lucide-react";
import { useAssistant } from "./hooks/useAssistant";

// Components
import { LoginScreen } from "./components/LoginScreen";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatHeader } from "./components/chat/ChatHeader";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";
import { ExpertCreator } from "./components/modals/ExpertCreator";
import { FeaturesOverlay } from "./components/modals/FeaturesOverlay";
import { TaskEditor } from "./components/modals/TaskEditor";

export default function App() {
  const {
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
    sendMessage,
    upsertExpert,
    deleteExpert,
    deleteTask,
    updateTask,
    handleInputChange,
    renderContent,
    logout,
  } = useAssistant();

  const quickCommands = [
    { label: "Estado", cmd: "/status", icon: <Zap size={14} /> },
    { label: "Ayuda", cmd: "/ayuda", icon: <MessageSquare size={14} /> },
    { label: "Limpiar", cmd: "/reset", icon: <Terminal size={14} /> },
    { label: "Funciones", cmd: "features", icon: <Info size={14} /> },
  ];

  const features = [
    {
      name: "Navegación Web",
      icon: <Globe size={20} />,
      description:
        "Busca en internet, analiza contenido de URLs y extrae datos en tiempo real.",
    },
    {
      name: "Terminal Bash",
      icon: <Terminal size={20} />,
      description:
        "Ejecuta comandos Bash y scripts nativos para resolver tareas técnicas complejas.",
    },
    {
      name: "Gestión de Archivos",
      icon: <Database size={20} />,
      description:
        "Lee, escribe, edita y organiza archivos en tu sistema local con total seguridad.",
    },
    {
      name: "Planificación Cron",
      icon: <Calendar size={20} />,
      description:
        "Agenda tareas recurrentes con formato cron que se ejecutan incluso si no estás conectado.",
    },
    {
      name: "Privacidad Local",
      icon: <Shield size={20} />,
      description:
        "Tus datos se procesan localmente. El asistente solo usa la nube para la inteligencia del modelo.",
    },
    {
      name: "Expertos Multi-Agente",
      icon: <Cpu size={20} />,
      description:
        "Crea y delega tareas a expertos especializados en código, redacción, clima y mucho más.",
    },
  ];

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (isWaiting) return;
    sendMessage(inputText);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!currentUser) {
    return (
      <LoginScreen
        users={availableUsers}
        onSelect={identifyUser}
        onGuest={continueAsGuest}
        onRegister={registerUser}
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        quickCommands={quickCommands}
        experts={experts}
        scheduledTasks={scheduledTasks}
        userModel={userModel}
        isConnected={isConnected}
        selectedExpert={selectedExpert}
        onSelectExpert={setSelectedExpert}
        onEditExpert={(exp) => {
          setEditingExpert(exp);
          setIsCreatorOpen(true);
        }}
        onEditGeneral={() => {
          if (generalConfig) {
            setEditingExpert({ ...generalConfig, name: "__general__" }); // Usar nombre interno
            setIsCreatorOpen(true);
          }
        }}
        onDeleteExpert={deleteExpert}
        onEditTask={setEditingTask}
        onDeleteTask={deleteTask}
        onLogout={logout}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenFeatures={() => setIsFeaturesOpen(true)}
        sendMessage={sendMessage}
        isWaiting={isWaiting}
      />

      <main className="chat-area">
        <ChatHeader
          selectedExpert={selectedExpert}
          isTyping={isTyping}
          isConnected={isConnected}
          messageCount={messageCount}
        />

        <MessageList
          messages={messages}
          isTyping={isTyping}
          isConnected={isConnected}
          onSetInput={setInputText}
          onCreateExpert={() => setIsCreatorOpen(true)}
          renderContent={renderContent}
        />

        <ChatInput
          inputText={inputText}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
          isConnected={isConnected}
          isWaiting={isWaiting}
          selectedExpert={selectedExpert}
          textareaRef={textareaRef}
        />
      </main>

      {isCreatorOpen && (
        <ExpertCreator
          onClose={() => {
            setIsCreatorOpen(false);
            setEditingExpert(null);
          }}
          onSave={upsertExpert}
          initialData={editingExpert}
          availableTools={availableTools}
          allExperts={experts}
        />
      )}

      {isFeaturesOpen && (
        <FeaturesOverlay
          features={features}
          onClose={() => setIsFeaturesOpen(false)}
        />
      )}

      {editingTask && (
        <TaskEditor
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updateTask}
        />
      )}
    </div>
  );
}
