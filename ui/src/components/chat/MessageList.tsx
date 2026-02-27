import { useEffect, useRef } from 'react';
import { Send, Zap, Globe, Plus } from 'lucide-react';
import type { Message } from '../../types';

interface MessageListProps {
    messages: Message[];
    isTyping: boolean;
    isConnected: boolean;
    onSetInput: (text: string) => void;
    onCreateExpert: () => void;
    renderContent: (text: string) => { __html: string };
}

export function MessageList({
    messages,
    isTyping,
    onSetInput,
    onCreateExpert,
    renderContent
}: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    if (messages.length === 0) {
        return (
            <div className="messages">
                <div className="welcome-container">
                    <div className="welcome-hero">
                        <div className="hero-icon">🤖</div>
                        <h1>¡Hola! Soy ARGenteIA</h1>
                        <p>Tu centro de mando inteligente. Puedo navegar la web, escribir archivos, ejecutar código y coordinar expertos.</p>
                    </div>
                    <div className="welcome-cards">
                        <div className="w-card" onClick={() => onSetInput("¿Qué puedes hacer?")}>
                            <Zap size={16} />
                            <span>¿Qué puedes hacer?</span>
                        </div>
                        <div className="w-card" onClick={() => onSetInput("Busca en Google las últimas noticias de IA")}>
                            <Globe size={16} />
                            <span>Noticias de IA</span>
                        </div>
                        <div className="w-card" onClick={onCreateExpert}>
                            <Plus size={16} />
                            <span>Crear un Agente</span>
                        </div>
                    </div>
                </div>
                <div ref={messagesEndRef} />
            </div>
        );
    }

    return (
        <div className="messages">
            {messages.map((msg) => {
                if (msg.type === 'action_log') {
                    return (
                        <div key={msg.id} className="message-row assistant action-log">
                            <div className="msg-container">
                                <div className="msg-bubble shadow-sm action_log" style={{ background: 'transparent', border: 'none', padding: '4px 12px', opacity: 0.7 }}>
                                    <div className="msg-content" style={{ fontStyle: 'italic', fontSize: '0.9em', color: 'var(--text-muted)' }}>
                                        ⏳ {msg.text}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={msg.id} className={`message-row ${msg.role}`}>
                        <div className="msg-container">
                            <div className="msg-header">
                                <span className="msg-author">
                                    {msg.role === 'user' ? 'Tú' : (msg.model ? msg.model.split('/').pop() : '🤖')}
                                    {msg.origin === 'telegram' && (
                                        <span title="Desde Telegram" style={{ marginLeft: '6px', opacity: 0.6 }}>
                                            <Send size={10} />
                                        </span>
                                    )}
                                </span>
                                {msg.timestamp && (
                                    <span className="msg-time" style={{ fontSize: '10px', opacity: 0.5, marginLeft: '8px' }}>
                                        {new Date(msg.timestamp).toLocaleString([], {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                )}
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

                                {msg.role === 'assistant' && (msg.latencyMs || msg.usage) && (
                                    <div className="msg-footer" style={{
                                        fontSize: '10px',
                                        opacity: 0.5,
                                        marginTop: '8px',
                                        display: 'flex',
                                        gap: '12px',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        paddingTop: '6px'
                                    }}>
                                        {msg.latencyMs && (
                                            <span>⏱️ {(() => {
                                                const sec = msg.latencyMs / 1000;
                                                if (sec < 60) return `${sec.toFixed(2)}s`;
                                                const min = sec / 60;
                                                if (min < 60) return `${min.toFixed(1)}m`;
                                                const hr = min / 60;
                                                return `${hr.toFixed(1)}h`;
                                            })()}</span>
                                        )}
                                        {msg.usage && (
                                            <span>💎 {msg.usage.total_tokens} tokens</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}
