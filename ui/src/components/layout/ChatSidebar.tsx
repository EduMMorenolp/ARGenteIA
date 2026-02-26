import {
    Plus,
    MessageSquare,
    Pin,
    Trash2,
    Edit2,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import type { ChatInfo } from "../../types";

interface ChatSidebarProps {
    chats: ChatInfo[];
    channelChats: ChatInfo[];
    activeChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onCreateChat: () => void;
    onDeleteChat: (chatId: string) => void;
    onRenameChat: (chatId: string, title: string) => void;
    onTogglePin: (chatId: string) => void;
    isOpen: boolean;
    onToggleOpen: () => void;
}

export function ChatSidebar({
    chats,
    channelChats,
    activeChatId,
    onSelectChat,
    onCreateChat,
    onDeleteChat,
    onRenameChat,
    onTogglePin,
    isOpen,
    onToggleOpen,
}: ChatSidebarProps) {
    const pinnedChats = chats.filter((c) => c.pinned);
    const recentChats = chats.filter((c) => !c.pinned);

    return (
        <aside className={`chat-sidebar ${isOpen ? "open" : "closed"}`}>
            <button className="toggle-chats-btn" onClick={onToggleOpen}>
                {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {isOpen && (
                <div className="chat-sidebar-content">
                    <div className="sidebar-header">
                        <div className="section-header">
                            <span className="section-title">Conversaciones</span>
                            <button className="add-chat-btn" onClick={onCreateChat} title="Nuevo Chat">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="sidebar-nav scrollbar-hide">
                        {/* Canales fijos (Telegram) */}
                        {channelChats.length > 0 && (
                            <div className="nav-section">
                                <div className="section-header">
                                    <span className="section-title">Canales</span>
                                </div>
                                <div className="chat-list">
                                    {channelChats.map((chat) => (
                                        <ChatItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={activeChatId === chat.id}
                                            onSelect={() => onSelectChat(chat.id)}
                                            onDelete={() => { }} // No se borran canales fijos
                                            onRename={() => { }}
                                            onTogglePin={() => { }}
                                            isFixed
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pinned Chats */}
                        {pinnedChats.length > 0 && (
                            <div className="nav-section">
                                <div className="section-header">
                                    <span className="section-title">Fijados</span>
                                </div>
                                <div className="chat-list">
                                    {pinnedChats.map((chat) => (
                                        <ChatItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={activeChatId === chat.id}
                                            onSelect={() => onSelectChat(chat.id)}
                                            onDelete={() => onDeleteChat(chat.id)}
                                            onRename={(title) => onRenameChat(chat.id, title)}
                                            onTogglePin={() => onTogglePin(chat.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Chats */}
                        <div className="nav-section">
                            <div className="section-header">
                                <span className="section-title">Recientes</span>
                            </div>
                            <div className="chat-list">
                                {recentChats.length === 0 ? (
                                    <div className="empty-state">No hay chats recientes</div>
                                ) : (
                                    recentChats.map((chat) => (
                                        <ChatItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={activeChatId === chat.id}
                                            onSelect={() => onSelectChat(chat.id)}
                                            onDelete={() => onDeleteChat(chat.id)}
                                            onRename={(title) => onRenameChat(chat.id, title)}
                                            onTogglePin={() => onTogglePin(chat.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}

interface ChatItemProps {
    chat: ChatInfo;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (title: string) => void;
    onTogglePin: () => void;
    isFixed?: boolean;
}

function ChatItem({
    chat,
    isActive,
    onSelect,
    onDelete,
    onRename,
    onTogglePin,
    isFixed,
}: ChatItemProps) {
    const handleRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newTitle = prompt("Renombrar chat:", chat.title);
        if (newTitle && newTitle.trim() !== "") {
            onRename(newTitle.trim());
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`¿Estás seguro de eliminar el chat "${chat.title}"?`)) {
            onDelete();
        }
    };

    const handleTogglePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTogglePin();
    };

    return (
        <div className={`chat-item-wrap ${isActive ? "active" : ""}`}>
            <button className="chat-item-main" onClick={onSelect}>
                <div className={`chat-avatar ${isFixed ? "fixed" : ""}`}>
                    <MessageSquare size={16} />
                </div>
                <div className="chat-info">
                    <span className="chat-title">{chat.title}</span>
                    {chat.lastMessage && <span className="chat-preview">{chat.lastMessage}</span>}
                </div>
            </button>
            {!isFixed && (
                <div className="chat-actions">
                    <button onClick={handleTogglePin} title={chat.pinned ? "Quitar pin" : "Fijar chat"}>
                        <Pin size={12} fill={chat.pinned ? "currentColor" : "none"} />
                    </button>
                    <button onClick={handleRename} title="Renombrar">
                        <Edit2 size={12} />
                    </button>
                    <button onClick={handleDelete} title="Eliminar" className="delete-btn">
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
