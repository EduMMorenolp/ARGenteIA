import { useState } from "react";
import type { UserProfile } from "../types";

interface LoginScreenProps {
  users: UserProfile[];
  onSelect: (u: UserProfile) => void;
  onGuest: () => void;
  onRegister: (
    userId: string,
    name: string,
    timezone: string,
    telegramUser: string,
    telegramToken: string,
  ) => void;
}

export function LoginScreen({
  users,
  onSelect,
  onGuest,
  onRegister,
}: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    name: "",
    timezone: "America/Argentina/Buenos_Aires",
    telegramUser: "",
    telegramToken: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.name) return;
    onRegister(
      formData.userId,
      formData.name,
      formData.timezone,
      formData.telegramUser,
      formData.telegramToken,
    );
  };

  if (isRegistering) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-box">📝</div>
            <h1>Registro de Usuario</h1>
            <p>Completa tus datos para crear una identidad persistente.</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>ID de Usuario (ej: edu88)</label>
              <input
                type="text"
                required
                value={formData.userId}
                onChange={(e) =>
                  setFormData({ ...formData, userId: e.target.value })
                }
                placeholder="Identificador único"
              />
            </div>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Tu nombre"
              />
            </div>
            <div className="form-group">
              <label>Zona Horaria</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                placeholder="America/Argentina/Buenos_Aires"
              />
            </div>
            <div className="form-group">
              <label>Usuario de Telegram (opcional)</label>
              <input
                type="text"
                value={formData.telegramUser}
                onChange={(e) =>
                  setFormData({ ...formData, telegramUser: e.target.value })
                }
                placeholder="@tu_usuario"
              />
            </div>
            <div className="form-group">
              <label>Token del Bot de Telegram (opcional)</label>
              <input
                type="password"
                value={formData.telegramToken}
                onChange={(e) =>
                  setFormData({ ...formData, telegramToken: e.target.value })
                }
                placeholder="123456:ABC..."
              />
              <span className="field-hint">
                Permite que el asistente use tu propio bot.
              </span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Crear Perfil
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setIsRegistering(false)}
              >
                Volver
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-box">🤖</div>
          <h1>Bienvenido a ARGenteIA</h1>
          <p>Selecciona tu perfil para continuar o crea uno nuevo.</p>
        </div>

        <div className="user-grid">
          {users.map((user) => (
            <button
              key={user.userId}
              className="user-card"
              onClick={() => onSelect(user)}
            >
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="user-details">
                <span className="user-name">
                  {user.name || "Usuario sin nombre"}
                </span>
                <span className="user-id">ID: {user.userId}</span>
              </div>
            </button>
          ))}

          <button
            className="user-card register"
            onClick={() => setIsRegistering(true)}
          >
            <div className="user-avatar">+</div>
            <div className="user-details">
              <span className="user-name">Registrar Nuevo Perfil</span>
              <span className="user-id">Crear identidad propia</span>
            </div>
          </button>

          <button className="user-card guest" onClick={onGuest}>
            <div className="user-avatar">?</div>
            <div className="user-details">
              <span className="user-name">Continuar como Invitado</span>
              <span className="user-id">Sesión temporal</span>
            </div>
          </button>
        </div>

        <div className="login-footer">
          <p>
            Tus datos se sincronizarán con tu perfil de Telegram si lo
            configuras.
          </p>
        </div>
      </div>
    </div>
  );
}
