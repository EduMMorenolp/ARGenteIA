import { Paperclip, Send, X } from 'lucide-react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useRef } from 'react';

interface Attachment {
  name: string;
  type: string;
  dataUrl: string;
  preview?: string;
}

interface ChatInputProps {
  inputText: string;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent) => void;
  isConnected: boolean;
  isWaiting: boolean;
  selectedExpert: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  attachments: Attachment[];
  onAttach: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
}

export function ChatInput({
  inputText,
  onInputChange,
  onKeyDown,
  onSubmit,
  isConnected,
  isWaiting,
  selectedExpert,
  textareaRef,
  attachments,
  onAttach,
  onRemoveAttachment,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      onAttach(files[i]);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="input-section">
      {/* Attachment preview chips */}
      {attachments.length > 0 && (
        <div className="attachment-preview">
          {attachments.map((att, i) => (
            <div key={i} className="attachment-chip">
              {att.preview ? (
                <img src={att.preview} alt={att.name} className="attachment-thumb" />
              ) : (
                <span className="attachment-icon">📄</span>
              )}
              <span className="attachment-name">{att.name}</span>
              <button
                className="attachment-remove"
                onClick={() => onRemoveAttachment(i)}
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="input-form" onSubmit={onSubmit}>
        <div className="input-group">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,text/*,.json,.md,.csv,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || isWaiting}
            title="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>
          <textarea
            ref={textareaRef}
            placeholder={
              selectedExpert ? `Hablando con ${selectedExpert}...` : 'Escribe tu solicitud...'
            }
            rows={1}
            value={inputText}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            disabled={!isConnected || isWaiting}
          />
          <button
            type="submit"
            className="send-trigger"
            disabled={!isConnected || isWaiting || (!inputText.trim() && attachments.length === 0)}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
