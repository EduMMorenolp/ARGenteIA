import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { Send, Bot, User, Settings, AlertCircle, Terminal, MessageSquare, Zap } from 'lucide-react';

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
    ws.current.send(JSON.stringify({ type: 'user_message', text: trimmed }));

    setIsWaiting(true);
    setIsTyping(true);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
    { label: 'Limpiar', cmd: '/clear', icon: <Terminal size={14} /> }
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
            <span className="logo-icon">🤖</span>
            <span className="logo-text">ARGenteIA</span>
          </div>
        </div>

        <div className="model-info">
          <div className="model-label">Modelo Activo</div>
          <div className="model-name" title={userModel}>{userModel}</div>
        </div>

        <div className="commands-list">
          <div className="commands-title">Comandos Rápidos</div>
          {quickCommands.map((cmd) => (
            <button
              key={cmd.cmd}
              className="cmd-btn"
              onClick={() => !isWaiting && sendMessage(cmd.cmd)}
              disabled={isWaiting}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {cmd.icon} {cmd.label}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
            <span className="status-text">{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
          <div className="msg-count">{messageCount} mensajes</div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        <header className="chat-header">
          <h1>Asistente Personal</h1>
          {isTyping && (
            <div className="typing-indicator">
              <span></span><span></span><span></span>
              <small>Escribiendo...</small>
            </div>
          )}
        </header>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-msg">
              <div className="welcome-icon">👋</div>
              <h2>¡Bienvenido a ARGenteIA!</h2>
              <p>Tu asistente inteligente está listo para ayudarte.<br />Prueba enviando un mensaje o seleccionando un comando.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="msg-avatar">
                  {msg.role === 'user' ? <User size={18} /> :
                    msg.type === 'command' ? <Settings size={18} /> :
                      msg.type === 'error' ? <AlertCircle size={18} /> : <Bot size={18} />}
                </div>
                <div className={`msg-bubble ${msg.type === 'command' ? 'command' : ''} ${msg.type === 'error' ? 'error' : ''}`}>
                  {msg.model && <div className="msg-meta">{msg.model}</div>}
                  <div
                    className="msg-content"
                    dangerouslySetInnerHTML={msg.role === 'assistant' ? renderContent(msg.text) : undefined}
                  >
                    {msg.role === 'user' ? msg.text : null}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <form className="input-wrapper" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              id="user-input"
              placeholder="Escribe un mensaje..."
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={!isConnected || isWaiting}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!isConnected || isWaiting || !inputText.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
