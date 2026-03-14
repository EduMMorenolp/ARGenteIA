import { useState, useEffect } from 'react';
import { X, LayoutTemplate, Settings2 } from 'lucide-react';
import type { Expert, ModelConfig } from '../../types';
import { TEMPLATES, TOOL_LABELS } from '../../constants';

interface ExpertCreatorProps {
    onClose: () => void;
    onSave: (e: Expert) => void;
    initialData: Expert | null;
    availableTools: string[];
    allExperts: Expert[];
    availableModels: ModelConfig[];
    defaultModel?: string;
}

export function ExpertCreator({ onClose, onSave, initialData, availableTools, allExperts, availableModels, defaultModel }: ExpertCreatorProps) {
    const [formData, setFormData] = useState<Expert>(() => {
        if (initialData) {
            return {
                ...initialData,
                experts: initialData.experts || []
            };
        }

        // Determinar modelo inicial:
        // 1. El defaultModel pasado por prop (si es válido)
        // 2. El primer modelo de la lista disponible
        // 3. Un fallback de Llama si todo falla
        const initialModel = (defaultModel && defaultModel !== '–')
            ? defaultModel
            : (availableModels.length > 0 ? availableModels[0].name : 'openrouter/meta-llama/llama-3.3-70b-instruct');

        return {
            name: '',
            model: initialModel,
            system_prompt: '',
            temperature: 0.7,
            tools: [],
            experts: []
        };
    });

    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

    // Sincronizar modelo si el actual no está en la lista de disponibles
    // (Útil si se cargan los modelos después de abrir el modal)
    useEffect(() => {
        if (!initialData && availableModels.length > 0) {
            const isValid = availableModels.some(m => m.name === formData.model);
            if (!isValid) {
                setFormData(prev => ({ ...prev, model: availableModels[0].name }));
            }
        }
    }, [availableModels, initialData, formData.model]);

    const handleTemplateChange = (templateName: string) => {
        const template = TEMPLATES.find(t => t.name === templateName);
        if (template && template.name !== 'Personalizado') {
            setFormData({
                ...formData,
                name: template.name.split(' / ')[0], // Simplificar nombre
                system_prompt: template.prompt,
                tools: template.tools || []
            });
            // Opcional: Cerrar el panel tras elegir una plantilla para ver el formulario relleno
            setIsRightSidebarOpen(false);
        }
    };

    const toggleTool = (tool: string) => {
        const tools = formData.tools || [];
        if (tools.includes(tool)) {
            setFormData({ ...formData, tools: tools.filter(t => t !== tool) });
        } else {
            setFormData({ ...formData, tools: [...tools, tool] });
        }
    };

    const toggleExpert = (expertName: string) => {
        const experts = formData.experts || [];
        if (experts.includes(expertName)) {
            setFormData({ ...formData, experts: experts.filter(e => e !== expertName) });
        } else {
            setFormData({ ...formData, experts: [...experts, expertName] });
        }
    };

    const formatModelName = (modelStr: string, displayName?: string) => {
        if (displayName) return displayName;
        if (!modelStr) return 'Desconocido';
        // Ej: openrouter/meta-llama/llama-3.3-70b-instruct -> llama-3.3-70b-instruct (openrouter)
        const parts = modelStr.split('/');
        if (parts.length === 1) return modelStr;
        const provider = parts[0];
        const modelName = parts[parts.length - 1]; // tomar solo la última parte para que sea más corto
        return `${modelName} (${provider})`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-centered-wrapper" onClick={e => e.stopPropagation()}>
                
                {/* Panel Izquierdo (Opciones Avanzadas / En Construcción) */}
                <div className={`modal-side-panel left ${isLeftSidebarOpen ? "open" : ""}`}>
                    <div className="modal-side-inner" style={{ paddingTop: '56px' }}>
                        <h4 style={{ fontSize: "14px", color: "var(--text-main)", marginBottom: "12px" }}>Opciones Avanzadas</h4>
                        <div className="empty-state">
                            En construcción...
                        </div>
                    </div>
                </div>

                {/* Main Modal */}
                <div className="modal-content" style={{ position: 'relative', zIndex: 10, margin: 0 }}>
                    <button
                        className="modal-side-tab left"
                        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                        title="Opciones Avanzadas"
                    >
                        <Settings2 size={16} />
                    </button>

                    <button
                        className="modal-side-tab right"
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        title="Plantillas de Expertos"
                    >
                        <LayoutTemplate size={16} />
                    </button>

                    <div className="modal-header">
                        <h3>
                            {formData.name === '__general__'
                                ? 'Configurar Asistente General'
                                : initialData ? 'Editar Experto' : 'Crear Nuevo Experto'}
                        </h3>
                        <button className="icon-btn" onClick={onClose}><X size={18} /></button>
                    </div>
                    <div className="modal-body max-h-600">
                    <div className="form-group">
                        <label>Nombre</label>
                        <input
                            type="text"
                            placeholder="Ej: Coder, Escritor..."
                            value={formData.name === '__general__' ? 'Asistente General' : formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            disabled={!!initialData || formData.name === '__general__'}
                        />
                    </div>

                    <div className="form-group">
                        <label>Herramientas Habilitadas</label>
                        <div className="tools-selection-grid">
                            {availableTools.map(tool => (
                                <button
                                    key={tool}
                                    className={`tool-chip ${formData.tools?.includes(tool) ? 'selected' : ''}`}
                                    onClick={() => toggleTool(tool)}
                                >
                                    {TOOL_LABELS[tool] || tool}
                                </button>
                            ))}
                        </div>
                    </div>

                    {allExperts.length > 0 && (
                        <div className="form-group">
                            <label>Sub-Agentes (Expertos) que puede invocar</label>
                            <div className="tools-selection-grid">
                                {allExperts.map(exp => (
                                    <button
                                        key={exp.name}
                                        className={`tool-chip expert-chip ${formData.experts?.includes(exp.name) ? 'selected' : ''}`}
                                        onClick={() => toggleExpert(exp.name)}
                                    >
                                        🤖 {exp.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Modelo</label>
                        <select
                            value={formData.model}
                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                            className="model-select"
                        >
                            {availableModels.length === 0 ? (
                                <option value={formData.model}>{formatModelName(formData.model)}</option>
                            ) : (
                                availableModels.map(m => (
                                    <option key={m.name} value={m.name}>
                                        {formatModelName(m.name, m.displayName)}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Instrucciones (Prompt)</label>
                        <textarea
                            placeholder="Define cómo debe comportarse este experto..."
                            rows={4}
                            value={formData.system_prompt}
                            onChange={e => setFormData({ ...formData, system_prompt: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Temperatura ({formData.temperature})</label>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={formData.temperature}
                            onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>
                    <div className="modal-footer">
                        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button className="btn-primary" onClick={() => onSave(formData)}>
                            {formData.name === '__general__' ? 'Guardar Cambios' : 'Guardar Experto'}
                        </button>
                    </div>
                </div>

                {/* Panel Derecho: Plantillas */}
                <div className={`modal-side-panel right ${isRightSidebarOpen ? "open" : ""}`}>
                    <div className="modal-side-inner" style={{ paddingTop: '56px' }}>
                        <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "var(--text-main)" }}>Plantillas de Agentes</h4>
                        <div className="templates-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                            {TEMPLATES.map(t => {
                                if (t.name === 'Personalizado') return null;
                                return (
                                    <div key={t.name} className="template-card" style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                        onClick={() => handleTemplateChange(t.name)}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accents-5)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    >
                                        <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-main)' }}>{t.name}</h5>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{t.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
