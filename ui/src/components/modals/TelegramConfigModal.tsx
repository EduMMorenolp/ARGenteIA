import {
  Eye,
  EyeOff,
  MessageSquare,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

interface TelegramConfigModalProps {
  telegramUser: string;
  messengerServiceApiKey: string;
  allowedUsers: string[];
  onClose: () => void;
  onSave: (
    telegramUser: string,
    messengerServiceApiKey: string,
    allowedUsers: string[],
  ) => void;
}

export function TelegramConfigModal({
  telegramUser: initialTelegramUser,
  messengerServiceApiKey: initialApiKey,
  allowedUsers: initialAllowedUsers,
  onClose,
  onSave,
}: TelegramConfigModalProps) {
  const [telegramUser, setTelegramUser] = useState(initialTelegramUser || '');
  const [messengerServiceApiKey, setMessengerServiceApiKey] = useState(initialApiKey || '');
  const [allowedUsers, setAllowedUsers] = useState(initialAllowedUsers?.join(', ') || '');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    const users = allowedUsers
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    onSave(telegramUser, messengerServiceApiKey, users);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content telegram-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configuración de Telegram</h3>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="section-desc">Configura tu integración con Telegram.</p>

          <div className="form-group">
            <label>
              <MessageSquare size={14} /> Usuario de Telegram
            </label>
            <input
              type="text"
              value={telegramUser}
              onChange={(e) => setTelegramUser(e.target.value)}
              placeholder="@tu_usuario"
            />
            <span className="field-hint">Tu usuario de Telegram para las notificaciones.</span>
          </div>

          <div className="form-group">
            <label>
              <Zap size={14} /> API Key del Messenger Service
            </label>
            <div className="input-with-toggle">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={messengerServiceApiKey}
                onChange={(e) => setMessengerServiceApiKey(e.target.value)}
                placeholder="sk_..."
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Ocultar' : 'Mostrar'}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="field-hint">
              Genera esta clave en el panel de administración del Messenger Service.
            </span>
          </div>

          <div className="form-group">
            <label>
              <Users size={14} /> Usuarios Permitidos
            </label>
            <textarea
              value={allowedUsers}
              onChange={(e) => setAllowedUsers(e.target.value)}
              placeholder="usuario1, usuario2, usuario3"
              rows={4}
            />
            <span className="field-hint">
              Lista de usuarios de Telegram permitidos (separados por comas). Deja vacío para permitir a todos.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
