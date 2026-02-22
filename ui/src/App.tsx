import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import {
  Send, Bot, Terminal,
  MessageSquare, Zap, Plus, Cpu, Info, X, ChevronRight,
  Shield, Globe, Database, Calendar, Trash2, Edit2
} from 'lucide-react';

interface Expert {
  name: string;
  model: string;
  system_prompt: string;
  temperature: number;
  tools?: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  type?: 'message' | 'command' | 'error';
}

interface WsMessage {
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
}

const WS_URL = `ws://${window.location.host}`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userModel, setUserModel] = useState('–');
  const [messageCount, setMessageCount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);

  // Expert management
  const [experts, setExperts] = useState<Expert[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const connect = () => {
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000);
    };
    socket.onerror = () => setIsConnected(false);
    socket.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data);
      handleServerMessage(msg);
    };
  };

  const handleServerMessage = (msg: WsMessage) => {
    switch (msg.type) {
      case 'status':
        setUserModel(msg.model || '–');
        setMessageCount(msg.messageCount || 0);
        break;

      case 'typing':
        setIsTyping(!!msg.isTyping);
        break;

      case 'assistant_message':
        setIsTyping(false);
        setIsWaiting(false);
        addMessage('assistant', msg.text || '', msg.model);
        setMessageCount(prev => prev + 1);
        break;

      case 'command_result':
        setIsTyping(false);
        setIsWaiting(false);
        addMessage('assistant', msg.result || '', undefined, 'command');
        break;

      case 'error':
        setIsTyping(false);
        setIsWaiting(false);
        addMessage('assistant', msg.message || 'Error desconocido', undefined, 'error');
        break;

      case 'list_experts':
        if (msg.experts) setExperts(msg.experts);
        break;

      case 'list_tools':
        if (msg.tools) setAvailableTools(msg.tools);
        break;
    }
  };

  const addMessage = (role: 'user' | 'assistant', text: string, model?: string, type: 'message' | 'command' | 'error' = 'message') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      text,
      model,
      type
    }]);
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    addMessage('user', trimmed);
    setMessageCount(prev => prev + 1);

    ws.current.send(JSON.stringify({
      type: 'user_message',
      text: trimmed,
      expertName: selectedExpert
    }));

    setIsWaiting(true);
    setIsTyping(true);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const upsertExpert = (expert: Expert) => {
    ws.current?.send(JSON.stringify({
      type: 'expert_update',
      action: 'upsert',
      expert
    }));
    setIsCreatorOpen(false);
    setEditingExpert(null);
  };

  const deleteExpert = (name: string) => {
    if (confirm(`¿Estás seguro de eliminar al experto "${name}"?`)) {
      ws.current?.send(JSON.stringify({
        type: 'expert_update',
        action: 'delete',
        name
      }));
      if (selectedExpert === name) setSelectedExpert(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isWaiting) return;
    sendMessage(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const quickCommands = [
    { label: 'Estado', cmd: '/status', icon: <Zap size={14} /> },
    { label: 'Ayuda', cmd: '/help', icon: <MessageSquare size={14} /> },
    { label: 'Limpiar', cmd: '/reset', icon: <Terminal size={14} /> }
  ];

  const features = [
    { name: 'Navegación Web', icon: <Globe size={20} />, description: 'Busca en internet y analiza contenido de URLs en tiempo real.' },
    { name: 'Ejecución de Código', icon: <Terminal size={20} />, description: 'Ejecuta comandos Bash y scripts para resolver tareas técnicas.' },
    { name: 'Gestión de Archivos', icon: <Database size={20} />, description: 'Lee, escribe y organiza archivos en tu sistema local.' },
    { name: 'Planificación', icon: <Calendar size={20} />, description: 'Agenda tareas y recordatorios automáticos con el Scheduler.' },
    { name: 'Privacidad', icon: <Shield size={20} />, description: 'Tus datos se procesan localmente y tus APIs están protegidas.' },
    { name: 'Multi-Agente', icon: <Cpu size={20} />, description: 'Delega tareas complejas a un equipo de expertos especializados.' }
  ];

  const renderContent = (text: string) => {
    return { __html: marked.parse(text) };
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-box">🤖</div>
            <span className="logo-text">ARGenteIA</span>
          </div>
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
                  onClick={() => !isWaiting && sendMessage(cmd.cmd)}
                  disabled={isWaiting}
                >
                  {cmd.icon} {cmd.label}
                </button>
              ))}
            </div>
          </div>

          <div className="nav-section">
            <div className="section-header">
              <span className="section-title">Expertos</span>
              <button className="icon-btn" onClick={() => setIsCreatorOpen(true)} title="Crear Experto">
                <Plus size={14} />
              </button>
            </div>
            <div className="experts-list">
              <button
                className={`expert-item ${selectedExpert === null ? 'active' : ''}`}
                onClick={() => setSelectedExpert(null)}
              >
                <div className="expert-avatar general"><Bot size={14} /></div>
                <div className="expert-info">
                  <span className="expert-name">Asistente General</span>
                </div>
              </button>
              {experts.map((exp) => (
                <div key={exp.name} className={`expert-item-wrap ${selectedExpert === exp.name ? 'active' : ''}`}>
                  <button
                    className="expert-item-main"
                    onClick={() => setSelectedExpert(exp.name)}
                  >
                    <div className="expert-avatar"><Cpu size={14} /></div>
                    <div className="expert-info">
                      <span className="expert-name">{exp.name}</span>
                      <span className="expert-model">{exp.model.split('/').pop()}</span>
                    </div>
                  </button>
                  <div className="expert-actions">
                    <button onClick={() => { setEditingExpert(exp); setIsCreatorOpen(true); }}><Edit2 size={12} /></button>
                    <button onClick={() => deleteExpert(exp.name)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="nav-section">
            <button className="feature-trigger" onClick={() => setIsFeaturesOpen(true)}>
              <Info size={16} /> <span>Funcionalidades</span>
              <ChevronRight size={14} className="ml-auto" />
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="model-badge">
            <Zap size={10} className="text-accent" />
            <span>{userModel.split('/').pop()}</span>
          </div>
          <div className="conn-status-wrap">
            <div className={`status-led ${isConnected ? 'online' : 'offline'}`} />
            <span className="status-label">{isConnected ? 'Conectado' : 'Sin conexión'}</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        <header className="chat-header">
          <div className="active-agent">
            <div className={`agent-icon ${selectedExpert ? 'expert' : 'general'}`}>
              {selectedExpert ? <Cpu size={18} /> : <Bot size={18} />}
            </div>
            <div className="agent-details">
              <h2>{selectedExpert || 'Asistente General'}</h2>
              <div className="typing-status">
                {isTyping ? (
                  <div className="typing-loader">
                    <span></span><span></span><span></span>
                    <small>Procesando...</small>
                  </div>
                ) : (
                  <span className="status-idle">{isConnected ? 'Listo para ayudar' : 'Reconectando...'}</span>
                )}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <div className="msg-counter">{messageCount} msgs</div>
          </div>
        </header>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-hero">
                <div className="hero-icon">🤖</div>
                <h1>¡Hola! Soy ARGenteIA</h1>
                <p>Tu centro de mando inteligente. Puedo navegar la web, escribir archivos, ejecutar código y coordinar expertos.</p>
              </div>
              <div className="welcome-cards">
                <div className="w-card" onClick={() => setInputText("¿Qué puedes hacer?")}>
                  <Zap size={16} />
                  <span>¿Qué puedes hacer?</span>
                </div>
                <div className="w-card" onClick={() => setInputText("Busca en Google las últimas noticias de IA")}>
                  <Globe size={16} />
                  <span>Noticias de IA</span>
                </div>
                <div className="w-card" onClick={() => setIsCreatorOpen(true)}>
                  <Plus size={16} />
                  <span>Crear un Agente</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.role}`}>
                <div className="msg-container">
                  <div className="msg-header">
                    <span className="msg-author">{msg.role === 'user' ? 'Tú' : (msg.model ? msg.model.split('/').pop() : '🤖')}</span>
                    {msg.type === 'command' && <span className="type-badge">Comando</span>}
                    {msg.type === 'error' && <span className="type-badge error">Error</span>}
                  </div>
                  <div className={`msg-bubble shadow-sm ${msg.type}`}>
                    <div
                      className="msg-content"
                      dangerouslySetInnerHTML={msg.role === 'assistant' ? renderContent(msg.text) : undefined}
                    >
                      {msg.role === 'user' ? msg.text : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-section">
          <form className="input-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <textarea
                ref={textareaRef}
                placeholder={selectedExpert ? `Hablando con ${selectedExpert}...` : "Escribe tu solicitud..."}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={!isConnected || isWaiting}
              />
              <button
                type="submit"
                className="send-trigger"
                disabled={!isConnected || isWaiting || !inputText.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modals */}
      {isCreatorOpen && (
        <ExpertCreator
          onClose={() => { setIsCreatorOpen(false); setEditingExpert(null); }}
          onSave={upsertExpert}
          initialData={editingExpert}
          availableTools={availableTools}
        />
      )}

      {isFeaturesOpen && (
        <FeaturesOverlay
          features={features}
          onClose={() => setIsFeaturesOpen(false)}
        />
      )}
    </div>
  );
}

const TEMPLATES = [
  {
    name: 'Personalizado',
    prompt: '',
    description: 'Empieza desde cero',
    tools: []
  },
  {
    name: 'Coder / Programador',
    prompt: 'Eres un experto senior en desarrollo de software. Tu objetivo es ayudar al usuario a escribir código limpio, eficiente y bien documentado. Resuelves bugs, explicas conceptos técnicos y diseñas arquitecturas de sistemas. Siempre proporcionas ejemplos de código completos y explicaciones paso a paso.',
    description: 'Experto en desarrollo de software',
    tools: ['read_file', 'write_file', 'bash']
  },
  {
    name: 'Escritor Creativo',
    prompt: 'Eres un escritor profesional con gran habilidad para la narrativa, redacción de artículos y corrección de estilo. Ayudas al usuario a redactar correos, ensayos, cuentos o cualquier tipo de texto, asegurando un tono adecuado, excelente gramática y fluidez.',
    description: 'Redacción y contenido',
    tools: ['write_file']
  },
  {
    name: 'Investigador / Researcher',
    prompt: 'Eres un experto en investigación y análisis de datos. Tu tarea es ayudar al usuario a encontrar información precisa, resumir temas complejos y proporcionar datos verificados. Eres crítico con las fuentes y siempre buscas la objetividad.',
    description: 'Análisis e investigación',
    tools: ['web_search', 'read_url']
  },
  {
    name: 'Traductor Profesional',
    prompt: 'Eres un experto en traducción y lingüística. Tu objetivo es traducir textos entre diferentes idiomas manteniendo no solo el significado literal, sino también el tono, el contexto cultural y los matices del mensaje original.',
    description: 'Traducción y localización',
    tools: []
  },
  {
    name: 'Analista de Negocios',
    prompt: 'Eres un estratega de negocios con experiencia en emprendimiento y gestión de proyectos. Ayudas al usuario a validar ideas, crear planes de negocio, analizar mercados y optimizar procesos organizativos.',
    description: 'Estrategia y negocios',
    tools: ['web_search', 'scheduler_add_task']
  }
];

function ExpertCreator({ onClose, onSave, initialData, availableTools }: {
  onClose: () => void,
  onSave: (e: Expert) => void,
  initialData: Expert | null,
  availableTools: string[]
}) {
  const [formData, setFormData] = useState<Expert>(initialData || {
    name: '',
    model: 'openrouter/meta-llama/llama-3.3-70b-instruct',
    system_prompt: '',
    temperature: 0.7,
    tools: []
  });

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = TEMPLATES.find(t => t.name === e.target.value);
    if (template && template.name !== 'Personalizado') {
      setFormData({
        ...formData,
        name: template.name.split(' / ')[0], // Simplificar nombre
        system_prompt: template.prompt,
        tools: template.tools || []
      });
    }
  };

  const toggleTool = (tool: string) => {
    const tools = formData.tools || [];
    if (tools.includes(tool)) {
      setFormData({ ...formData, tools: tools.filter(t => t !== tool) });
    } else {
      setFormData({ ...formData, tools: [...tools, tool] });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialData ? 'Editar Experto' : 'Crear Nuevo Experto'}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body max-h-600">
          {!initialData && (
            <div className="form-group">
              <label>Seleccionar Plantilla</label>
              <select className="template-select" onChange={handleTemplateChange}>
                {TEMPLATES.map(t => (
                  <option key={t.name} value={t.name}>{t.name} - {t.description}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Ej: Coder, Escritor..."
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              disabled={!!initialData}
            />
          </div>

          <div className="form-group">
            <label>Herramientas Habilitadas</label>
            <div className="tools-selection-grid">
              {availableTools.map(tool => (
                <button
                  key={tool}
                  className={`tool-chip ${formData.tools?.includes(tool) ? 'selected' : ''}`}
                  onClick={() => toggleTool(tool)}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Modelo (OpenRouter)</label>
            <input
              type="text"
              value={formData.model}
              onChange={e => setFormData({ ...formData, model: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Instrucciones (Prompt)</label>
            <textarea
              placeholder="Define cómo debe comportarse este experto..."
              rows={4}
              value={formData.system_prompt}
              onChange={e => setFormData({ ...formData, system_prompt: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Temperatura ({formData.temperature})</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={formData.temperature}
              onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(formData)}>Guardar Experto</button>
        </div>
      </div>
    </div>
  );
}

function FeaturesOverlay({ features, onClose }: { features: any[], onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Funcionalidades del Sistema</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.name} className="feature-card">
              <div className="feat-icon">{f.icon}</div>
              <h4>{f.name}</h4>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
