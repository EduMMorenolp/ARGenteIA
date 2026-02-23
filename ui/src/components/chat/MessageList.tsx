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
            {messages.map((msg) => (
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
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}
