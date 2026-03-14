import {
  Bot,
  Edit2,
  Trash2,
  Plus,
  CalendarClock,
  Cpu,
  Server,
  ChevronLeft,
  ChevronRight,
  Database,
  TerminalSquare,
  Network,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import type { Expert, ModelConfig, ScheduledTask } from '../../types';

interface QuickCommand {
  label: string;
  cmd: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  quickCommands: QuickCommand[];
  experts: Expert[];
  scheduledTasks: ScheduledTask[];
  userModel: string;
  isConnected: boolean;
  selectedExpert: string | null;
  onSelectExpert: (name: string | null) => void;
  onEditExpert: (exp: Expert) => void;
  onEditGeneral: () => void;
  onDeleteExpert: (name: string) => void;
  onEditTask: (task: ScheduledTask) => void;
  onDeleteTask: (id: number) => void;
  onOpenCreator: () => void;
  onOpenFeatures: () => void;
  onOpenDashboard: () => void;
  onOpenTools: () => void;
  sendMessage: (cmd: string) => void;
  isWaiting: boolean;
  availableModels: ModelConfig[];
  onOpenModels: () => void;
  onOpenRag: (agentName: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function Sidebar({
  quickCommands,
  experts,
  scheduledTasks,
  isConnected,
  selectedExpert,
  onSelectExpert,
  onEditExpert,
  onEditGeneral,
  onDeleteExpert,
  onEditTask,
  onDeleteTask,
  onOpenCreator,
  onOpenFeatures,
  onOpenDashboard,
  sendMessage,
  isWaiting,
  availableModels,
  onOpenModels,
  onOpenRag,
  onOpenTools,
  isOpen,
  onToggleOpen,
}: SidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    commands: false,
    experts: false,
    tasks: false,
    models: false,
  });

  const toggleSection = (sec: string) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button className="toggle-sidebar-btn" onClick={onToggleOpen}>
        {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {isOpen && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="logo-box">🤖</div>
            <div className="logo-text">ARGenteIA</div>
          </div>

          <nav className="sidebar-nav scrollbar-hide">
            <div className="nav-section">
              <div className="section-header" onClick={() => toggleSection('commands')} style={{ cursor: 'pointer' }}>
                <div className="section-title-wrap">
                  {collapsedSections['commands'] ? <ChevronRight size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  <TerminalSquare size={14} className="text-muted" />
                  <span className="section-title">Comandos</span>
                </div>
              </div>
              {!collapsedSections['commands'] && (
                <div className="commands-grid">
                  {quickCommands.map((cmd) => (
                    <button
                      key={cmd.cmd}
                      className="cmd-pill"
                      onClick={() => {
                        if (cmd.cmd === 'features') onOpenFeatures();
                        else if (cmd.cmd === 'dashboard') onOpenDashboard();
                        else if (cmd.cmd === 'tools') onOpenTools();
                        else if (!isWaiting) sendMessage(cmd.cmd);
                      }}
                      disabled={isWaiting && cmd.cmd !== 'features' && cmd.cmd !== 'dashboard'}
                    >
                      {cmd.icon} {cmd.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="nav-section">
              <div className="section-header" onClick={() => toggleSection('experts')} style={{ cursor: 'pointer' }}>
                <div className="section-title-wrap">
                  {collapsedSections['experts'] ? <ChevronRight size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  <Network size={14} className="text-muted" />
                  <span className="section-title">Expertos</span>
                </div>
                <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); onOpenCreator(); }}>
                  <Plus size={14} />
                </button>
              </div>
              {!collapsedSections['experts'] && (
                <div className="experts-list">
                  <div className={`expert-item-wrap ${selectedExpert === null ? 'active' : ''}`}>
                    <button className="expert-item-main" onClick={() => onSelectExpert(null)}>
                      <div className="expert-avatar general">
                        <Bot size={14} />
                      </div>
                      <div className="expert-info">
                        <span className="expert-name">Asistente General</span>
                      </div>
                    </button>
                    <div className="expert-actions">
                      <button onClick={() => onEditGeneral()} title="Configurar Asistente General">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => onOpenRag('__general__')} title="Memoria de Contexto (RAG)">
                        <Database size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Restablecer configuración original del Asistente General?')) {
                            onDeleteExpert('__general__');
                          }
                        }}
                        title="Restablecer original"
                      >
                        <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
                      </button>
                    </div>
                  </div>
                  {experts.map((exp) => (
                    <div
                      key={exp.name}
                      className={`expert-item-wrap ${selectedExpert === exp.name ? 'active' : ''}`}
                    >
                      <button className="expert-item-main" onClick={() => onSelectExpert(exp.name)}>
                        <div className="expert-avatar">
                          <Cpu size={14} />
                        </div>
                        <div className="expert-info">
                          <span className="expert-name">{exp.name}</span>
                          <span className="expert-model">
                            {availableModels.find(m => m.name === exp.model)?.displayName || exp.model.split('/').pop()}
                          </span>
                        </div>
                      </button>
                      <div className="expert-actions">
                        <button onClick={() => onEditExpert(exp)} title="Editar Experto">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => onOpenRag(exp.name)} title="Memoria de Contexto (RAG)">
                          <Database size={12} />
                        </button>
                        <button onClick={() => onDeleteExpert(exp.name)} title="Eliminar Experto">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="nav-section">
              <div className="section-header">
                <div className="section-title-wrap">
                  <Database size={14} className="text-muted" />
                  <span className="section-title">Memoria Global (RAG)</span>
                </div>
                <button className="icon-btn-sm" onClick={() => onOpenRag('global')} title="Gestionar Conocimiento Base">
                  <Database size={12} />
                </button>
              </div>
            </div>

            <div className="nav-section">
              <div className="section-header" onClick={() => toggleSection('tasks')} style={{ cursor: 'pointer' }}>
                <div className="section-title-wrap">
                  {collapsedSections['tasks'] ? <ChevronRight size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  <CalendarClock size={14} className="text-muted" />
                  <span className="section-title">Tareas Programadas</span>
                </div>
              </div>
              {!collapsedSections['tasks'] && (
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
                        <button className="task-delete" onClick={() => onDeleteTask(t.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="nav-section">
              <div className="section-header" onClick={() => toggleSection('models')} style={{ cursor: 'pointer' }}>
                <div className="section-title-wrap">
                  {collapsedSections['models'] ? <ChevronRight size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  <Cpu size={14} className="text-muted" />
                  <span className="section-title">Modelos</span>
                </div>
                <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); onOpenModels(); }}>
                  <Server size={14} />
                </button>
              </div>
              {!collapsedSections['models'] && (
                <div className="models-summary" onClick={onOpenModels} style={{ cursor: 'pointer' }}>
                  <span className="model-count">{availableModels.length} modelos configurados</span>
                </div>
              )}
            </div>

            <div className="nav-section">
              <div className="section-header" onClick={onOpenTools} style={{ cursor: 'pointer' }}>
                <div className="section-title-wrap">
                  <TerminalSquare size={14} className="text-muted" />
                  <span className="section-title">Herramientas</span>
                </div>
                <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); onOpenTools(); }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="conn-status-wrap">
              <div className={`status-led ${isConnected ? 'online' : 'offline'}`} />
              <span className="status-label">{isConnected ? 'Conectado' : 'Sin conexión'}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
