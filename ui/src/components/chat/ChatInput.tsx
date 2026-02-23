import type { FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
    inputText: string;
    onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: FormEvent) => void;
    isConnected: boolean;
    isWaiting: boolean;
    selectedExpert: string | null;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({
    inputText,
    onInputChange,
    onKeyDown,
    onSubmit,
    isConnected,
    isWaiting,
    selectedExpert,
    textareaRef
}: ChatInputProps) {
    return (
        <div className="input-section">
            <form className="input-form" onSubmit={onSubmit}>
                <div className="input-group">
                    <textarea
                        ref={textareaRef}
                        placeholder={selectedExpert ? `Hablando con ${selectedExpert}...` : "Escribe tu solicitud..."}
                        rows={1}
                        value={inputText}
                        onChange={onInputChange}
                        onKeyDown={onKeyDown}
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
    );
}
