import { useState } from 'react';
import { X } from 'lucide-react';
import type { Expert, ModelConfig } from '../../types';
import { TEMPLATES, TOOL_LABELS } from '../../constants';

interface ExpertCreatorProps {
    onClose: () => void;
    onSave: (e: Expert) => void;
    initialData: Expert | null;
    availableTools: string[];
    allExperts: Expert[];
    availableModels: ModelConfig[];
}

export function ExpertCreator({ onClose, onSave, initialData, availableTools, allExperts, availableModels }: ExpertCreatorProps) {
    const [formData, setFormData] = useState<Expert>(() => {
        if (initialData) {
            return {
                ...initialData,
                experts: initialData.experts || []
            };
        }
        return {
            name: '',
            model: 'openrouter/meta-llama/llama-3.3-70b-instruct',
            system_prompt: '',
            temperature: 0.7,
            tools: [],
            experts: []
        };
    });

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const template = TEMPLATES.find(t => t.name === e.target.value);
        if (template && template.name !== 'Personalizado') {
            setFormData({
                ...formData,
                name: template.name.split(' / ')[0], // Simplificar nombre
                system_prompt: template.prompt,
                tools: template.tools || []
            });
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

    const formatModelName = (modelStr: string) => {
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
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>
                        {formData.name === '__general__'
                            ? 'Configurar Asistente General'
                            : initialData ? 'Editar Experto' : 'Crear Nuevo Experto'}
                    </h3>
                    <button className="icon-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body max-h-600">
                    {!initialData && (
                        <div className="form-group">
                            <label>Seleccionar Plantilla</label>
                            <select className="template-select" onChange={handleTemplateChange}>
                                {TEMPLATES.map(t => (
                                    <option key={t.name} value={t.name}>{t.name} - {t.description}</option>
                                ))}
                            </select>
                        </div>
                    )}
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
                                    <option key={m.name} value={m.name}>{formatModelName(m.name)}</option>
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
        </div>
    );
}
