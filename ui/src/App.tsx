import {
  BarChart3,
  Calendar,
  Cpu,
  Database,
  FileText,
  Globe,
  Info,
  Network,
  Settings2,
  Shield,
  Terminal,
} from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { ChatHeader } from './components/chat/ChatHeader';
import { ChatInput } from './components/chat/ChatInput';
import { MessageList } from './components/chat/MessageList';
// Components
import { LoginScreen } from './components/LoginScreen';
import { ChatSidebar } from './components/layout/ChatSidebar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardModal } from './components/modals/DashboardModal';
import { ExpertCreator } from './components/modals/ExpertCreator';
import { FeaturesOverlay } from './components/modals/FeaturesOverlay';
import { LogsModal } from './components/modals/LogsModal';
import { MemoryGraphModal } from './components/modals/MemoryGraphModal';
import { ModelManager } from './components/modals/ModelManager';
import { ProfileModal } from './components/modals/ProfileModal';
import { RagModal } from './components/modals/RagModal';
import { TaskEditor } from './components/modals/TaskEditor';
import { ToolManager } from './components/modals/ToolManager';
import { useAssistant } from './hooks/useAssistant';

export default function App() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(true);
  const [ragOwnerId, setRagOwnerId] = useState<string | null>(null);
  const {
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
    // Detailed Tools
    detailedTools,
    upsertTool,
    deleteTool,
    toggleTool,
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
    requestStats,
    // Model Info
    modelCapabilities,
    requestModelInfo,
    // Attachments
    attachments,
    addAttachment,
    removeAttachment,
    // Logs
    logs,
    logStats,
    requestLogs,
    requestLogStats,
    // Memory Graph
    memoryGraphData,
    requestMemoryGraph,
  } = useAssistant();

  const quickCommands = [
    { label: 'Funciones', cmd: 'features', icon: <Info size={14} /> },
    { label: 'Dashboard', cmd: 'dashboard', icon: <BarChart3 size={14} /> },
    { label: 'Herramientas', cmd: 'tools', icon: <Settings2 size={14} /> },
    { label: 'Logs e Informes', cmd: 'logs', icon: <FileText size={14} /> },
    { label: 'Mapa Mental', cmd: 'graph', icon: <Network size={14} /> },
  ];

  const features = [
    {
      name: 'Navegación Web',
      icon: <Globe size={20} />,
      description: 'Busca en internet, analiza contenido de URLs y extrae datos en tiempo real.',
    },
    {
      name: 'Terminal Bash',
      icon: <Terminal size={20} />,
      description:
        'Ejecuta comandos Bash y scripts nativos para resolver tareas técnicas complejas.',
    },
    {
      name: 'Gestión de Archivos',
      icon: <Database size={20} />,
      description:
        'Lee, escribe, edita y organiza archivos en tu sistema local con total seguridad.',
    },
    {
      name: 'Planificación Cron',
      icon: <Calendar size={20} />,
      description:
        'Agenda tareas recurrentes con formato cron que se ejecutan incluso si no estás conectado.',
    },
    {
      name: 'Privacidad Local',
      icon: <Shield size={20} />,
      description:
        'Tus datos se procesan localmente. El asistente solo usa la nube para la inteligencia del modelo.',
    },
    {
      name: 'Expertos Multi-Agente',
      icon: <Cpu size={20} />,
      description:
        'Crea y delega tareas a expertos especializados en código, redacción, clima y mucho más.',
    },
  ];

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (isWaiting) return;
    sendMessage(inputText);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  const activeChat =
    chats.find((c) => c.id === activeChatId) || channelChats.find((c) => c.id === activeChatId);

  return (
    <div
      className={`app-container ${!isSidebarOpen ? 'sidebar-closed' : ''} ${!isChatSidebarOpen ? 'chats-closed' : ''}`}
    >
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
            setEditingExpert({ ...generalConfig, name: '__general__' }); // Usar nombre interno
            setIsCreatorOpen(true);
          }
        }}
        onDeleteExpert={deleteExpert}
        onEditTask={setEditingTask}
        onDeleteTask={deleteTask}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenFeatures={() => setIsFeaturesOpen(true)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenTools={() => setIsToolsOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenTaskCreator={() => setEditingTask({ id: 0, userId: '', task: '', cron: '' })}
        sendMessage={sendMessage}
        isWaiting={isWaiting}
        availableModels={availableModels}
        onOpenModels={() => setIsModelsOpen(true)}
        onOpenRag={setRagOwnerId}
        onOpenMemoryGraph={() => setIsGraphOpen(true)}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="chat-area">
        <ChatHeader
          selectedExpert={selectedExpert}
          chatTitle={activeChat?.title}
          isTyping={isTyping}
          isConnected={isConnected}
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
          attachments={attachments}
          onAttach={addAttachment}
          onRemoveAttachment={removeAttachment}
        />
      </main>

      <ChatSidebar
        chats={chats}
        channelChats={channelChats}
        activeChatId={activeChatId}
        onSelectChat={switchChat}
        onCreateChat={() => createChat(selectedExpert)}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        onTogglePin={togglePinChat}
        isOpen={isChatSidebarOpen}
        onToggleOpen={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
        currentUser={currentUser}
        onLogout={logout}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

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
          availableModels={availableModels}
          defaultModel={userModel}
        />
      )}

      {isFeaturesOpen && (
        <FeaturesOverlay features={features} onClose={() => setIsFeaturesOpen(false)} />
      )}

      {editingTask && (
        <TaskEditor task={editingTask} onClose={() => setEditingTask(null)} onSave={updateTask} />
      )}

      {isProfileOpen && currentUser && (
        <ProfileModal
          user={currentUser}
          onClose={() => setIsProfileOpen(false)}
          onSave={updateUser}
          onDelete={deleteAccount}
        />
      )}

      {isModelsOpen && (
        <ModelManager
          models={availableModels}
          onClose={() => setIsModelsOpen(false)}
          onSave={upsertModel}
          onDelete={deleteModel}
          modelCapabilities={modelCapabilities}
          onRequestModelInfo={requestModelInfo}
        />
      )}

      {isDashboardOpen && (
        <DashboardModal
          stats={dashboardStats}
          onClose={() => setIsDashboardOpen(false)}
          onRequestStats={requestStats}
        />
      )}

      {isGraphOpen && (
        <MemoryGraphModal
          data={memoryGraphData}
          onClose={() => setIsGraphOpen(false)}
          onRequestGraph={requestMemoryGraph}
        />
      )}

      {ragOwnerId && <RagModal ownerId={ragOwnerId} onClose={() => setRagOwnerId(null)} />}

      {isToolsOpen && (
        <ToolManager
          tools={detailedTools}
          onClose={() => setIsToolsOpen(false)}
          onSave={upsertTool}
          onDelete={deleteTool}
          onToggle={toggleTool}
        />
      )}

      {isLogsOpen && (
        <LogsModal
          logs={logs}
          stats={logStats}
          onClose={() => setIsLogsOpen(false)}
          onRequestLogs={requestLogs}
          onRequestStats={requestLogStats}
        />
      )}
    </div>
  );
}
