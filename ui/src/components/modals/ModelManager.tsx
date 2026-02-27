import { useState } from "react";
import { X, Plus, Trash2, Edit2, Save, Server, Eye, EyeOff } from "lucide-react";
import type { ModelConfig } from "../../types";

interface ModelManagerProps {
    models: ModelConfig[];
    onClose: () => void;
    onSave: (model: ModelConfig, oldName?: string) => void;
    onDelete: (name: string) => void;
}

export function ModelManager({
    models,
    onClose,
    onSave,
    onDelete,
}: ModelManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [formData, setFormData] = useState<ModelConfig>({
        name: "",
        apiKey: "",
        baseUrl: "",
    });

    const startAdd = () => {
        setFormData({ name: "", apiKey: "", baseUrl: "" });
        setIsAdding(true);
        setEditingName(null);
    };

    const startEdit = (model: ModelConfig) => {
        setFormData({ ...model });
        setEditingName(model.name);
        setIsAdding(false);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;
        onSave(formData, editingName || undefined);
        setFormData({ name: "", apiKey: "", baseUrl: "" });
        setIsAdding(false);
        setEditingName(null);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingName(null);
        setFormData({ name: "", apiKey: "", baseUrl: "" });
    };

    const getProviderBadge = (name: string) => {
        if (name.startsWith("openrouter/")) return "OpenRouter";
        if (name.startsWith("ollama/")) return "Ollama";
        if (name.startsWith("anthropic/")) return "Anthropic";
        return "OpenAI";
    };

    const getProviderClass = (name: string) => {
        if (name.startsWith("openrouter/")) return "badge-openrouter";
        if (name.startsWith("ollama/")) return "badge-ollama";
        if (name.startsWith("anthropic/")) return "badge-anthropic";
        return "badge-openai";
    };

    const showForm = isAdding || editingName !== null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>
                        <Server size={18} style={{ marginRight: 8 }} />
                        Gestión de Modelos
                    </h3>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body max-h-600">
                    {/* Lista de modelos */}
                    <div className="models-list">
                        {models.length === 0 ? (
                            <div className="empty-state">
                                No hay modelos configurados. Agregá uno para empezar.
                            </div>
                        ) : (
                            models.map((m) => (
                                <div
                                    key={m.name}
                                    className={`model-item ${editingName === m.name ? "editing" : ""}`}
                                >
                                    <div className="model-item-info">
                                        <span className={`provider-badge ${getProviderClass(m.name)}`}>
                                            {getProviderBadge(m.name)}
                                        </span>
                                        <span className="model-item-name">{m.name}</span>
                                        {m.baseUrl && (
                                            <span className="model-item-url">
                                                {m.baseUrl.replace(/https?:\/\//, "").split("/")[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="model-item-actions">
                                        <button
                                            onClick={() => startEdit(m)}
                                            title="Editar"
                                            className="icon-btn-sm"
                                        >
                                            <Edit2 size={13} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Eliminar el modelo "${m.name}"?`)) {
                                                    onDelete(m.name);
                                                }
                                            }}
                                            title="Eliminar"
                                            className="icon-btn-sm danger"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Formulario agregar/editar */}
                    {showForm && (
                        <div className="model-form">
                            <div className="form-group">
                                <label>Nombre del modelo</label>
                                <input
                                    type="text"
                                    placeholder="ej: openrouter/meta-llama/llama-3.3-70b-instruct:free"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>API Key</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="sk-or-... o dejar vacío para Ollama"
                                        value={formData.apiKey || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, apiKey: e.target.value })
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="toggle-visibility"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        title={showApiKey ? "Ocultar" : "Mostrar"}
                                    >
                                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Base URL</label>
                                <input
                                    type="text"
                                    placeholder="ej: https://openrouter.ai/api/v1"
                                    value={formData.baseUrl || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, baseUrl: e.target.value })
                                    }
                                />
                            </div>
                            <div className="model-form-actions">
                                <button className="btn-secondary" onClick={handleCancel}>
                                    Cancelar
                                </button>
                                <button className="btn-primary" onClick={handleSave}>
                                    <Save size={14} />
                                    {editingName ? "Actualizar" : "Agregar"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {!showForm && (
                        <button className="btn-primary" onClick={startAdd}>
                            <Plus size={14} /> Agregar Modelo
                        </button>
                    )}
                    <button className="btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
