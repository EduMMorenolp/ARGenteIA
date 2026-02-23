import { Bot, Cpu } from 'lucide-react';

interface ChatHeaderProps {
    selectedExpert: string | null;
    isTyping: boolean;
    isConnected: boolean;
    messageCount: number;
}

export function ChatHeader({
    selectedExpert,
    isTyping,
    isConnected,
    messageCount
}: ChatHeaderProps) {
    return (
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
    );
}
