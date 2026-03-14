import { useState, useEffect } from 'react';
import { X, LayoutTemplate, Settings2, Search, Home, Code, Palmtree, ShieldCheck, Sparkles } from 'lucide-react';
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
    
    // Plantillas: Búsqueda y Filtros
    const [templateSearch, setTemplateSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = [
        { id: 'All', label: 'Todos', icon: Sparkles },
        { id: 'Hogar', label: 'Hogar', icon: Home },
        { id: 'Tech', label: 'Tech', icon: Code },
        { id: 'Ocio', label: 'Ocio', icon: Palmtree },
        { id: 'Soporte', label: 'Soporte', icon: ShieldCheck },
    ];

    const filteredTemplates = TEMPLATES.filter(t => {
        if (t.name === 'Personalizado') return false;
        
        const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                             t.description.toLowerCase().includes(templateSearch.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });

    const getCategoryIcon = (cat: string) => {
        switch(cat) {
            case 'Hogar': return <Home size={12} />;
            case 'Tech': return <Code size={12} />;
            case 'Ocio': return <Palmtree size={12} />;
            case 'Soporte': return <ShieldCheck size={12} />;
            default: return <Sparkles size={12} />;
        }
    };

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
                        <div className="flex items-center gap-2 mb-3">
                            <LayoutTemplate size={16} className="text-accent" />
                            <h4 style={{ fontSize: "14px", color: "var(--text-main)", margin: 0 }}>Plantillas de Agentes</h4>
                        </div>

                        {/* Buscador de Plantillas */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                            <input 
                                type="text" 
                                className="input-field pl-9 py-2 text-sm w-full" 
                                placeholder="Buscar agente..."
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                style={{ borderRadius: '8px', background: 'var(--bg-input)' }}
                            />
                        </div>

                        {/* Filtros de Categoría */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all
                                        ${selectedCategory === cat.id 
                                            ? 'bg-accent text-white shadow-lg' 
                                            : 'bg-surface hover:bg-surface-hover text-muted'}`}
                                >
                                    <cat.icon size={11} />
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="templates-grid scrollbar-hide" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
                            {filteredTemplates.length === 0 ? (
                                <div className="empty-state py-8">
                                    <Search size={24} className="mb-2 opacity-20" />
                                    <p>No se encontraron agentes</p>
                                </div>
                            ) : (
                                filteredTemplates.map(t => (
                                    <div key={t.name} className="template-card relative group" style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                        onClick={() => handleTemplateChange(t.name)}
                                        onMouseEnter={(e) => { 
                                            e.currentTarget.style.borderColor = 'var(--accent)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                                        }}
                                        onMouseLeave={(e) => { 
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface text-[10px] text-accent uppercase font-bold tracking-wider">
                                                {getCategoryIcon(t.category)}
                                                {t.category}
                                            </span>
                                        </div>
                                        <h5 style={{ margin: '0 0 6px 0', fontSize: '13.5px', color: 'var(--text-main)', fontWeight: 600 }}>{t.name}</h5>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{t.description}</p>
                                        
                                        {/* Vista previa de botones sugeridos */}
                                        {t.telegram_buttons && t.telegram_buttons.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/[0.05]">
                                                {t.telegram_buttons.map(btn => (
                                                    <span key={btn.text} className="px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent/80 text-[9px] font-medium border border-accent/20">
                                                        [{btn.text}]
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
