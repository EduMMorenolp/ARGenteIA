import { useState } from "react";
import { X, User, Globe, MessageSquare } from "lucide-react";
import type { UserProfile } from "../../types";

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (name: string, timezone: string, telegramUser: string) => void;
}

export function ProfileModal({ user, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState(user.name || "");
  const [timezone, setTimezone] = useState(
    user.timezone || "America/Argentina/Buenos_Aires",
  );
  const [telegramUser, setTelegramUser] = useState(user.telegram_user || "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, timezone, telegramUser);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Mi Perfil</h3>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="section-desc">
            Configura tu identidad y conexiones externas.
          </p>

          <div className="form-group">
            <label>
              <User size={14} /> Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <div className="form-group">
            <label>
              <Globe size={14} /> Zona Horaria
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Argentina/Buenos_Aires"
            />
            <span className="field-hint">
              Usada para tus tareas programadas.
            </span>
          </div>

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
            <span className="field-hint">
              Vincula tu cuenta con el bot de Telegram.
            </span>
          </div>

          <div className="info-box">
            <span className="info-label">ID de Sistema:</span>
            <code className="info-value">{user.userId}</code>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
