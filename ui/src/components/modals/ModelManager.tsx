import { useState, useEffect } from "react";
import {
    X,
    Plus,
    Trash2,
    Edit2,
    Save,
    Server,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronRight,
    Image,
    Volume2,
    Type,
    Layers,
    DollarSign,
    Search,
    HelpCircle,
} from "lucide-react";
import type { ModelConfig, ModelCapabilities } from "../../types";

interface ModelManagerProps {
    models: ModelConfig[];
    onClose: () => void;
    onSave: (model: ModelConfig, oldName?: string) => void;
    onDelete: (name: string) => void;
    modelCapabilities: Record<string, ModelCapabilities>;
    onRequestModelInfo: (modelName: string) => void;
}

export function ModelManager({
    models,
    onClose,
    onSave,
    onDelete,
    modelCapabilities,
    onRequestModelInfo,
}: ModelManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [expandedModel, setExpandedModel] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [formData, setFormData] = useState<ModelConfig>({
        name: "",
        displayName: "",
        apiKey: "",
        baseUrl: "",
    });

    // OpenRouter y Paneles
    const [orQuery, setOrQuery] = useState("");
    const [orModels, setOrModels] = useState<any[]>([]);
    const [loadingOr, setLoadingOr] = useState(false);
    const [isOrSidebarOpen, setIsOrSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [orFilters, setOrFilters] = useState<Set<string>>(new Set());
    const [isOrDocOpen, setIsOrDocOpen] = useState(false);

    const toggleOrFilter = (filter: string) => {
        setOrFilters((prev) => {
            const next = new Set(prev);
            if (next.has(filter)) next.delete(filter);
            else next.add(filter);
            return next;
        });
    };

    useEffect(() => {
        setLoadingOr(true);
        fetch("https://openrouter.ai/api/v1/models")
            .then((res) => res.json())
            .then((data) => {
                if (data && data.data) {
                    setOrModels(data.data);
                }
            })
            .catch((err) => console.error("Error fetching OR models", err))
            .finally(() => setLoadingOr(false));
    }, []);

    const filteredOrModels = orModels
        .filter((m) => {
            // Filtros activos
            if (orFilters.has("free")) {
                const price = parseFloat(m.pricing?.prompt || "1");
                if (price > 0) return false;
            }
            if (orFilters.has("vision")) {
                const inputs = m.architecture?.input_modalities || [];
                if (!inputs.includes("image")) return false;
            }
            if (orFilters.has("audio")) {
                const inputs = m.architecture?.input_modalities || [];
                if (!inputs.includes("audio")) return false;
            }
            // Búsqueda de texto
            if (orQuery) {
                return (m.name + " " + m.id).toLowerCase().includes(orQuery.toLowerCase());
            }
            return true;
        })
        .slice(0, 50);

    const addOrModel = (m: any) => {
        setFormData({
            name: `openrouter/${m.id}`,
            displayName: m.name,
            apiKey: "",
            baseUrl: "https://openrouter.ai/api/v1",
        });
        setIsAdding(true);
        setEditingName(null);
        setExpandedModel(null);
    };

    // Pedir info cuando se expande un modelo
    useEffect(() => {
        if (expandedModel && !modelCapabilities[expandedModel]) {
            onRequestModelInfo(expandedModel);
        }
    }, [expandedModel]);

    const startAdd = () => {
        setFormData({ name: "", displayName: "", apiKey: "", baseUrl: "" });
        setIsAdding(true);
        setEditingName(null);
        setExpandedModel(null);
    };

    const startEdit = (model: ModelConfig) => {
        setFormData({ ...model });
        setEditingName(model.name);
        setIsAdding(false);
        setExpandedModel(model.name);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;
        onSave(formData, editingName || undefined);
        setFormData({ name: "", displayName: "", apiKey: "", baseUrl: "" });
        setIsAdding(false);
        setEditingName(null);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingName(null);
        setFormData({ name: "", displayName: "", apiKey: "", baseUrl: "" });
    };

    const toggleExpand = (name: string) => {
        if (editingName === name) return; // No colapsar mientras edita
        setExpandedModel((prev) => (prev === name ? null : name));
        setEditingName(null);
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

    const formatContext = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
        return n.toString();
    };

    const formatPrice = (p: string) => {
        const n = parseFloat(p);
        if (n === 0) return "Gratis";
        if (n < 0.001) return "$" + n.toFixed(6);
        return "$" + n.toFixed(4);
    };

    const caps = (name: string) => modelCapabilities[name];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-centered-wrapper" onClick={(e) => e.stopPropagation()}>

                {/* Panel Izquierdo: Buscador OpenRouter */}
                <div className={`modal-side-panel left ${isOrSidebarOpen ? "open" : ""}`}>
                    <div className="modal-side-inner" style={{ paddingTop: '56px' }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <h4 style={{ fontSize: "14px", color: "var(--text-main)", margin: 0 }}>Buscar en OpenRouter</h4>
                            <button
                                className="or-doc-btn"
                                onClick={() => setIsOrDocOpen(!isOrDocOpen)}
                                title="Cómo usar OpenRouter"
                            >
                                <HelpCircle size={14} /> Doc
                            </button>
                        </div>
                        {isOrDocOpen && (
                            <div className="or-doc-panel">
                                <p><strong>¿Cómo usar modelos de OpenRouter?</strong></p>
                                <ol>
                                    <li>Creá una cuenta en <a href="https://openrouter.ai" target="_blank" rel="noreferrer">openrouter.ai</a></li>
                                    <li>Andá a <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a> y generá una API Key</li>
                                    <li>Buscá el modelo que querés usar en la lista de abajo y hacé click en <strong>"+ Añadir"</strong></li>
                                    <li>En el formulario que aparece, pegá tu API Key en el campo correspondiente</li>
                                    <li>La URL base <code>https://openrouter.ai/api/v1</code> ya viene configurada automáticamente</li>
                                </ol>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                    💡 Los modelos marcados como <strong style={{ color: "#10b981" }}>Gratis</strong> no consumen créditos.
                                </p>
                            </div>
                        )}
                        <input
                            type="text"
                            className="or-search-input"
                            placeholder="Ej: claude 3.5, mixtral..."
                            value={orQuery}
                            onChange={(e) => setOrQuery(e.target.value)}
                        />
                        <div className="or-filters">
                            <button
                                className={`or-filter-chip ${orFilters.has("free") ? "active" : ""}`}
                                onClick={() => toggleOrFilter("free")}
                            >
                                🆓 Gratis
                            </button>
                            <button
                                className={`or-filter-chip ${orFilters.has("vision") ? "active" : ""}`}
                                onClick={() => toggleOrFilter("vision")}
                            >
                                👁️ Visión
                            </button>
                            <button
                                className={`or-filter-chip ${orFilters.has("audio") ? "active" : ""}`}
                                onClick={() => toggleOrFilter("audio")}
                            >
                                🔊 Audio
                            </button>
                            <span className="or-filter-count">{filteredOrModels.length} modelos</span>
                        </div>
                        <div className="or-models-list">
                            {loadingOr ? (
                                <div className="model-loading" style={{ justifyContent: "center" }}>
                                    <div className="typing-loader"><span></span><span></span><span></span></div>
                                </div>
                            ) : filteredOrModels.length === 0 ? (
                                <div className="empty-state">No se encontraron modelos.</div>
                            ) : (
                                filteredOrModels.map((m) => {
                                    const promptPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1000000 : 0;
                                    return (
                                        <div key={m.id} className="or-model-item">
                                            <div className="or-model-header">
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="or-model-name">{m.name}</div>
                                                    <div className="or-model-id">{m.id.split('/').pop()}</div>
                                                </div>
                                                <button className="btn-add-or" onClick={() => addOrModel(m)}>
                                                    <Plus size={12} /> Añadir
                                                </button>
                                            </div>
                                            <div className="or-model-caps">
                                                {promptPrice > 0 ? (
                                                    <span className="cap-dot context">${promptPrice.toFixed(2)}/M</span>
                                                ) : (
                                                    <span className="cap-dot context or" style={{ color: "#10b981" }}>Gratis</span>
                                                )}
                                                <span className="cap-dot context">{formatContext(m.context_length)} ctx</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Modal */}
                <div className="modal-content" style={{ position: 'relative', zIndex: 10, margin: 0 }}>
                    <button
                        className="modal-side-tab left"
                        onClick={() => setIsOrSidebarOpen(!isOrSidebarOpen)}
                        title="Buscador OpenRouter"
                    >
                        <Search size={16} />
                    </button>

                    <button
                        className="modal-side-tab right"
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        title="Herramientas"
                    >
                        <Layers size={16} />
                    </button>

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
                                models.map((m) => {
                                    const isExpanded = expandedModel === m.name;
                                    const isEditing = editingName === m.name;
                                    const info = caps(m.name);

                                    return (
                                        <div
                                            key={m.name}
                                            className={`model-item-expandable ${isExpanded ? "expanded" : ""}`}
                                        >
                                            {/* Header del modelo (clickeable) */}
                                            <button
                                                className="model-item-header"
                                                onClick={() => toggleExpand(m.name)}
                                            >
                                                <span className="model-expand-icon">
                                                    {isExpanded ? (
                                                        <ChevronDown size={14} />
                                                    ) : (
                                                        <ChevronRight size={14} />
                                                    )}
                                                </span>
                                                <span
                                                    className={`provider-badge ${getProviderClass(m.name)}`}
                                                >
                                                    {getProviderBadge(m.name)}
                                                </span>
                                                <span className="model-item-name">
                                                    {m.displayName || m.name}
                                                </span>
                                                {/* Badges inline de capacidades */}
                                                {info && (
                                                    <span className="model-caps-inline">
                                                        {info.supportsVision && (
                                                            <span className="cap-dot vision" title="Soporta imágenes">📷</span>
                                                        )}
                                                        {info.supportsAudio && (
                                                            <span className="cap-dot audio" title="Soporta audio">🎤</span>
                                                        )}
                                                        {info.contextLength > 0 && (
                                                            <span className="cap-dot context" title="Context window">
                                                                {formatContext(info.contextLength)}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Dropdown expandible */}
                                            {isExpanded && (
                                                <div className="model-dropdown">
                                                    {isEditing ? (
                                                        /* Formulario de edición inline */
                                                        <div className="model-edit-form">
                                                            <div className="form-group">
                                                                <label>Nombre personalizado</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Ej: Mi GPT-4, Llama Local..."
                                                                    value={formData.displayName || ""}
                                                                    onChange={(e) =>
                                                                        setFormData({ ...formData, displayName: e.target.value })
                                                                    }
                                                                />
                                                                <span className="field-hint">Opcional. Se mostrará en lugar del nombre técnico.</span>
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Nombre del modelo</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="ej: openrouter/meta-llama/llama-3.3-70b"
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
                                                                        placeholder="sk-or-... o vacío para Ollama"
                                                                        value={formData.apiKey || ""}
                                                                        onChange={(e) =>
                                                                            setFormData({ ...formData, apiKey: e.target.value })
                                                                        }
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="toggle-visibility"
                                                                        onClick={() => setShowApiKey(!showApiKey)}
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
                                                                    <Save size={14} /> Actualizar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Detalles del modelo */
                                                        <>
                                                            {!info ? (
                                                                <div className="model-loading">
                                                                    <div className="typing-loader">
                                                                        <span></span><span></span><span></span>
                                                                    </div>
                                                                    <span>Obteniendo info...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="model-details">
                                                                    {/* Badges de modalidades */}
                                                                    <div className="model-modalities">
                                                                        {info.inputModalities.map((mod) => (
                                                                            <span key={mod} className={`modality-badge ${mod}`}>
                                                                                {mod === "text" && <Type size={12} />}
                                                                                {mod === "image" && <Image size={12} />}
                                                                                {mod === "audio" && <Volume2 size={12} />}
                                                                                {mod}
                                                                            </span>
                                                                        ))}
                                                                    </div>

                                                                    {/* Context window */}
                                                                    <div className="model-detail-row">
                                                                        <Layers size={14} />
                                                                        <span className="detail-label">Context Window</span>
                                                                        <span className="detail-value">
                                                                            {formatContext(info.contextLength)} tokens
                                                                        </span>
                                                                    </div>

                                                                    {/* Pricing */}
                                                                    {info.pricing && (
                                                                        <div className="model-detail-row">
                                                                            <DollarSign size={14} />
                                                                            <span className="detail-label">Precio</span>
                                                                            <span className="detail-value">
                                                                                {formatPrice(info.pricing.prompt)}/prompt ·{" "}
                                                                                {formatPrice(info.pricing.completion)}/completion
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Descripción */}
                                                                    {info.description && (
                                                                        <p className="model-description">
                                                                            {info.description.length > 200
                                                                                ? info.description.substring(0, 200) + "..."
                                                                                : info.description}
                                                                        </p>
                                                                    )}

                                                                    {/* URL */}
                                                                    {m.baseUrl && (
                                                                        <div className="model-detail-row">
                                                                            <Server size={14} />
                                                                            <span className="detail-label">URL</span>
                                                                            <span className="detail-value mono">
                                                                                {m.baseUrl.replace(/https?:\/\//, "").split("/")[0]}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Acciones al pie */}
                                                            <div className="model-dropdown-actions">
                                                                <button
                                                                    className="btn-ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        startEdit(m);
                                                                    }}
                                                                >
                                                                    <Edit2 size={13} /> Editar
                                                                </button>
                                                                <button
                                                                    className="btn-ghost danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`¿Eliminar el modelo "${m.name}"?`)) {
                                                                            onDelete(m.name);
                                                                            setExpandedModel(null);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 size={13} /> Eliminar
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Formulario para agregar nuevo modelo */}
                        {isAdding && (
                            <div className="model-form">
                                <div className="form-group">
                                    <label>Nombre personalizado</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Mi asistente, Llama Local..."
                                        value={formData.displayName || ""}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    />
                                    <span className="field-hint">Opcional. Se mostrará en lugar del nombre técnico.</span>
                                </div>
                                <div className="form-group">
                                    <label>Nombre del modelo</label>
                                    <input
                                        type="text"
                                        placeholder="ej: openrouter/meta-llama/llama-3.3-70b-instruct:free"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>API Key</label>
                                    <div className="input-with-toggle">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            placeholder="sk-or-... o dejar vacío para Ollama"
                                            value={formData.apiKey || ""}
                                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            className="toggle-visibility"
                                            onClick={() => setShowApiKey(!showApiKey)}
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
                                        onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                    />
                                </div>
                                <div className="model-form-actions">
                                    <button className="btn-secondary" onClick={handleCancel}>
                                        Cancelar
                                    </button>
                                    <button className="btn-primary" onClick={handleSave}>
                                        <Save size={14} /> Agregar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        {!isAdding && (
                            <button className="btn-primary" onClick={startAdd}>
                                <Plus size={14} /> Agregar Modelo
                            </button>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Herramientas (En construcción) */}
                <div className={`modal-side-panel right ${isRightSidebarOpen ? "open" : ""}`}>
                    <div className="modal-side-inner" style={{ paddingTop: '56px' }}>
                        <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "var(--text-main)" }}>Herramientas</h4>
                        <div className="empty-state">
                            En construcción...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
