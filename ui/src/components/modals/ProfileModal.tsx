import { useState } from "react";
import {
  X,
  User,
  Globe,
  MessageSquare,
  Zap,
  Lock,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import type { UserProfile } from "../../types";

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (
    name: string,
    timezone: string,
    telegramUser: string,
    telegramToken: string,
    loginPin: string,
  ) => void;
  onDelete: () => void;
}

export function ProfileModal({
  user,
  onClose,
  onSave,
  onDelete,
}: ProfileModalProps) {
  const [name, setName] = useState(user.name || "");
  const [timezone, setTimezone] = useState(
    user.timezone || "America/Argentina/Buenos_Aires",
  );
  const [telegramUser, setTelegramUser] = useState(user.telegram_user || "");
  const [telegramToken, setTelegramToken] = useState(user.telegram_token || "");
  const [loginPin, setLoginPin] = useState(user.login_pin || "0000");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    if (loginPin.length !== 4) return;
    onSave(name, timezone, telegramUser, telegramToken, loginPin);
    onClose();
  };

  const handleDelete = () => {
    if (isConfirmingDelete) {
      onDelete();
      onClose();
    } else {
      setIsConfirmingDelete(true);
    }
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
          {isConfirmingDelete ? (
            <div className="delete-confirmation">
              <AlertTriangle size={48} color="#ff4d4d" />
              <h4>¿Estás absolutamente seguro?</h4>
              <p>
                Esta acción eliminará permanentemente tu perfil, historial de
                mensajes y expertos vinculados a tu ID (<b>{user.userId}</b>).
              </p>
              <p>Esta acción no se puede deshacer.</p>
            </div>
          ) : (
            <>
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

              <div className="form-group">
                <label>
                  <Zap size={14} /> Token del Bot de Telegram (API Key)
                </label>
                <div className="input-with-toggle">
                  <input
                    type={showTelegramToken ? "text" : "password"}
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456789:ABCDEF..."
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    title={showTelegramToken ? "Ocultar" : "Mostrar"}
                  >
                    {showTelegramToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="field-hint">
                  Si lo cambias, el bot se reiniciará con el nuevo token.
                </span>
              </div>

              <div className="form-group">
                <label>
                  <Lock size={14} /> PIN de Seguridad (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setLoginPin(val);
                  }}
                  placeholder="0000"
                />
                <span className="field-hint">
                  Se te pedirá este PIN para ingresar a la web.
                </span>
              </div>

              <div className="info-box">
                <span className="info-label">ID de Sistema:</span>
                <code className="info-value">{user.userId}</code>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          {isConfirmingDelete ? (
            <>
              <button
                className="btn-secondary"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancelar
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={16} /> Sí, Eliminar Cuenta
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-danger-ghost"
                onClick={() => setIsConfirmingDelete(true)}
                title="Eliminar mi cuenta permanentemente"
              >
                <Trash2 size={16} /> Eliminar Cuenta
              </button>
              <div style={{ flex: 1 }}></div>
              <button className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!name.trim() || loginPin.length !== 4}
              >
                Guardar Cambios
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
