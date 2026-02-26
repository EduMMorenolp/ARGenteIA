import {
  Zap,
  Bot,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  LogOut,
  Cpu,
  User,
  Server,
} from "lucide-react";
import type { Expert, ModelConfig } from "../../types";

interface SidebarProps {
  quickCommands: any[];
  experts: Expert[];
  scheduledTasks: any[];
  userModel: string;
  isConnected: boolean;
  selectedExpert: string | null;
  onSelectExpert: (name: string | null) => void;
  onEditExpert: (exp: Expert) => void;
  onEditGeneral: () => void;
  onDeleteExpert: (name: string) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (id: number) => void;
  onLogout: () => void;
  onOpenCreator: () => void;
  onOpenFeatures: () => void;
  onOpenProfile: () => void;
  sendMessage: (cmd: string) => void;
  isWaiting: boolean;
  availableModels: ModelConfig[];
  onOpenModels: () => void;
}

export function Sidebar({
  quickCommands,
  experts,
  scheduledTasks,
  userModel,
  isConnected,
  selectedExpert,
  onSelectExpert,
  onEditExpert,
  onEditGeneral,
  onDeleteExpert,
  onEditTask,
  onDeleteTask,
  onLogout,
  onOpenCreator,
  onOpenFeatures,
  onOpenProfile,
  sendMessage,
  isWaiting,
  availableModels,
  onOpenModels,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box">🤖</div>
        <div className="logo-text">ARGenteIA</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="section-header">
            <span className="section-title">Comandos</span>
          </div>
          <div className="commands-grid">
            {quickCommands.map((cmd) => (
              <button
                key={cmd.cmd}
                className="cmd-pill"
                onClick={() => {
                  if (cmd.cmd === "features") onOpenFeatures();
                  else if (!isWaiting) sendMessage(cmd.cmd);
                }}
                disabled={isWaiting && cmd.cmd !== "features"}
              >
                {cmd.icon} {cmd.label}
              </button>
            ))}
          </div>
        </div>

        <div className="nav-section">
          <div className="section-header">
            <span className="section-title">Expertos</span>
            <button className="icon-btn-sm" onClick={onOpenCreator}>
              <Plus size={12} />
            </button>
          </div>
          <div className="experts-list">
            <div
              className={`expert-item-wrap ${selectedExpert === null ? "active" : ""}`}
            >
              <button
                className="expert-item-main"
                onClick={() => onSelectExpert(null)}
              >
                <div className="expert-avatar general">
                  <Bot size={14} />
                </div>
                <div className="expert-info">
                  <span className="expert-name">Asistente General</span>
                </div>
              </button>
              <div className="expert-actions">
                <button
                  onClick={onEditGeneral}
                  title="Configurar Asistente General"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "¿Restablecer configuración original del Asistente General?",
                      )
                    ) {
                      onDeleteExpert("__general__");
                    }
                  }}
                  title="Restablecer original"
                >
                  <Plus size={12} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>
            </div>
            {experts.map((exp) => (
              <div
                key={exp.name}
                className={`expert-item-wrap ${selectedExpert === exp.name ? "active" : ""}`}
              >
                <button
                  className="expert-item-main"
                  onClick={() => onSelectExpert(exp.name)}
                >
                  <div className="expert-avatar">
                    <Cpu size={14} />
                  </div>
                  <div className="expert-info">
                    <span className="expert-name">{exp.name}</span>
                    <span className="expert-model">
                      {exp.model.split("/").pop()}
                    </span>
                  </div>
                </button>
                <div className="expert-actions">
                  <button onClick={() => onEditExpert(exp)}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => onDeleteExpert(exp.name)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="nav-section">
          <div className="section-header">
            <span className="section-title">Tareas Programadas</span>
            <Calendar size={12} className="text-muted" />
          </div>
          <div className="tasks-list">
            {scheduledTasks.length === 0 ? (
              <div className="empty-state">No hay tareas programadas</div>
            ) : (
              scheduledTasks.map((t) => (
                <div key={t.id} className="task-item">
                  <div className="task-info" onClick={() => onEditTask(t)}>
                    <span className="task-desc">{t.task}</span>
                    <span className="task-cron">{t.cron}</span>
                  </div>
                  <button
                    className="task-delete"
                    onClick={() => onDeleteTask(t.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="nav-section">
          <div className="section-header">
            <span className="section-title">Modelos</span>
            <button className="icon-btn-sm" onClick={onOpenModels}>
              <Server size={12} />
            </button>
          </div>
          <div className="models-summary" onClick={onOpenModels} style={{ cursor: 'pointer' }}>
            <span className="model-count">{availableModels.length} modelos configurados</span>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="model-badge">
          <Zap size={10} className="text-accent" />
          <span>{userModel.split("/").pop()}</span>
        </div>
        <div className="conn-status-wrap">
          <div className={`status-led ${isConnected ? "online" : "offline"}`} />
          <span className="status-label">
            {isConnected ? "Conectado" : "Sin conexión"}
          </span>
        </div>
        <button
          className="logout-trigger profile-btn"
          onClick={onOpenProfile}
          title="Mi Perfil"
        >
          <User size={14} /> <span>Mi Perfil</span>
        </button>
        <button
          className="logout-trigger"
          onClick={onLogout}
          title="Cerrar Sesión"
        >
          <LogOut size={14} /> <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
