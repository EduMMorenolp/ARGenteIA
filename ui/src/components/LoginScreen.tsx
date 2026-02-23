import type { UserProfile } from '../types';

interface LoginScreenProps {
    users: UserProfile[];
    onSelect: (u: UserProfile) => void;
    onGuest: () => void;
}

export function LoginScreen({ users, onSelect, onGuest }: LoginScreenProps) {
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-box">🤖</div>
                    <h1>Bienvenido a ARGenteIA</h1>
                    <p>Selecciona tu perfil para continuar o inicia como invitado.</p>
                </div>

                <div className="user-grid">
                    {users.map(user => (
                        <button key={user.userId} className="user-card" onClick={() => onSelect(user)}>
                            <div className="user-avatar">
                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user.name || 'Usuario sin nombre'}</span>
                                <span className="user-id">ID: {user.userId}</span>
                            </div>
                        </button>
                    ))}

                    <button className="user-card guest" onClick={onGuest}>
                        <div className="user-avatar">?</div>
                        <div className="user-details">
                            <span className="user-name">Continuar como Invitado</span>
                            <span className="user-id">Sesión temporal</span>
                        </div>
                    </button>
                </div>

                <div className="login-footer">
                    <p>Tus datos se sincronizarán con tu perfil de Telegram.</p>
                </div>
            </div>
        </div>
    );
}
