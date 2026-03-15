import { useMemo, useState } from 'react';
import { 
  Wrench, 
  X, 
  Plus, 
  Trash2, 
  Code, 
  Save, 
  AlertCircle,
  Settings2,
  Cpu,
  Terminal,
  FileJson,
  Search,
  SlidersHorizontal,
  ToggleLeft
} from 'lucide-react';
import { type DetailedTool } from '../../types/index';
import '../../styles/tool-manager.css';

interface ToolManagerProps {
  tools: DetailedTool[];
  onClose: () => void;
  onSave: (tool: DetailedTool) => void;
  onDelete: (name: string) => void;
  onToggle: (name: string, enabled: boolean) => void;
}

export function ToolManager({
  tools,
  onClose,
  onSave,
  onDelete,
  onToggle
}: ToolManagerProps) {
  const [editingTool, setEditingTool] = useState<DetailedTool | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dynamic' | 'system'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const emptyTool: DetailedTool = {
    name: '',
    description: '',
    parameters: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string" }
      }
    }, null, 2),
    is_dynamic: 1,
    script: '// args contiene los parámetros, context contiene sesión\nreturn "Hola " + args.query;',
    enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const handleSave = () => {
    if (!editingTool) return;
    if (!editingTool.name.trim()) {
      alert("El nombre de la herramienta es obligatorio");
      return;
    }
    // Validar JSON de parámetros
    try {
      JSON.parse(editingTool.parameters);
    } catch (e) {
      alert("El JSON de parámetros es inválido");
      return;
    }
    onSave(editingTool);
    setEditingTool(null);
    setIsCreating(false);
  };

  const totalTools = tools.length;
  const dynamicTools = tools.filter((tool) => tool.is_dynamic === 1).length;
  const activeTools = tools.filter((tool) => tool.enabled === 1).length;

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesQuery =
        !query.trim() ||
        tool.name.toLowerCase().includes(query.toLowerCase()) ||
        (tool.description || '').toLowerCase().includes(query.toLowerCase());

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'dynamic' && tool.is_dynamic === 1) ||
        (typeFilter === 'system' && tool.is_dynamic !== 1);

      const matchesState =
        stateFilter === 'all' ||
        (stateFilter === 'enabled' && tool.enabled === 1) ||
        (stateFilter === 'disabled' && tool.enabled === 0);

      return matchesQuery && matchesType && matchesState;
    });
  }, [tools, query, typeFilter, stateFilter]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tool-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="tools-title-wrap">
            <Wrench className="text-accent" size={20} />
            <div>
              <h3>Gestor de Herramientas</h3>
              <p className="tools-subtitle">Administra las funciones nativas y crea nuevas con JS</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {(!editingTool && !isCreating) ? (
            <>
              <div className="tool-kpi-row">
                <div className="tool-kpi-item">
                  <span>Total</span>
                  <strong>{totalTools}</strong>
                </div>
                <div className="tool-kpi-item">
                  <span>Dinámicas</span>
                  <strong>{dynamicTools}</strong>
                </div>
                <div className="tool-kpi-item">
                  <span>Activas</span>
                  <strong>{activeTools}</strong>
                </div>
              </div>

              <div className="tools-toolbar">
                <div className="tools-toolbar-left">
                  <div className="tools-search-wrap">
                    <Search size={13} />
                    <input
                      className="tools-search"
                      type="text"
                      placeholder="Buscar herramienta"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className="tools-filter-wrap">
                    <SlidersHorizontal size={13} />
                    <select
                      className="tools-filter-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as 'all' | 'dynamic' | 'system')}
                    >
                      <option value="all">Todos los tipos</option>
                      <option value="dynamic">Dinámicas</option>
                      <option value="system">Sistema</option>
                    </select>
                  </div>

                  <div className="tools-filter-wrap">
                    <ToggleLeft size={13} />
                    <select
                      className="tools-filter-select"
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                    >
                      <option value="all">Todos los estados</option>
                      <option value="enabled">Activas</option>
                      <option value="disabled">Inactivas</option>
                    </select>
                  </div>
                </div>

                <button 
                  className="btn-primary tool-new-btn"
                  onClick={() => {
                    setEditingTool(emptyTool);
                    setIsCreating(true);
                  }}
                >
                  <Plus size={14} /> Nueva Herramienta
                </button>
              </div>

              {filteredTools.length === 0 ? (
                <div className="tools-empty-state">
                  <AlertCircle size={16} />
                  <span>No hay herramientas para los filtros actuales.</span>
                </div>
              ) : (
                <div className="tools-grid">
                {filteredTools.map(tool => (
                  <div key={tool.name} className={`tool-card ${tool.enabled === 0 ? 'disabled' : ''}`}>
                    <div className="tool-card-header">
                      <div className="tool-info">
                        <h3>
                          {tool.is_dynamic === 1 ? <Code size={16} className="text-purple-400" /> : <Terminal size={16} className="text-blue-400" />}
                          {tool.name}
                        </h3>
                        <span className={`tool-badge ${tool.is_dynamic === 1 ? 'badge-dynamic' : 'badge-system'}`}>
                          {tool.is_dynamic === 1 ? 'Dinámica' : 'Sistema'}
                        </span>
                      </div>
                      <div className="toggle-switch">
                        <input 
                          type="checkbox" 
                          id={`toggle-${tool.name}`}
                          checked={tool.enabled === 1}
                          onChange={(e) => onToggle(tool.name, e.target.checked)}
                        />
                        <label htmlFor={`toggle-${tool.name}`}></label>
                      </div>
                    </div>
                    
                    <p className="tool-desc">{tool.description || 'Sin descripción'}</p>

                    <div className="tool-meta-row">
                      <span className="tool-meta-pill">{tool.enabled === 1 ? 'Activa' : 'Inactiva'}</span>
                      <span className="tool-meta-pill">Actualizada {new Date(tool.updated_at).toLocaleDateString()}</span>
                    </div>

                    <div className="tool-card-footer">
                      <span className="tool-card-footnote">
                        {tool.is_dynamic === 1 ? 'Herramienta dinámica' : 'Herramienta del sistema'}
                      </span>
                      <div className="tool-actions">
                        <button 
                          className="icon-btn" 
                          title="Editar"
                          onClick={() => setEditingTool(tool)}
                        >
                          <Settings2 size={16} />
                        </button>
                        {tool.is_dynamic === 1 && (
                          <button 
                            className="icon-btn text-red-400" 
                            title="Eliminar"
                            onClick={() => onDelete(tool.name)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </>
          ) : (
            <div className="tool-editor">
              <div className="tool-card-header mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="text-accent" size={20} />
                  <h4>{isCreating ? 'Nueva Herramienta Dinámica' : `Editando: ${editingTool?.name}`}</h4>
                </div>
                <button className="icon-btn" onClick={() => { setEditingTool(null); setIsCreating(false); }}>
                  <X size={18} />
                </button>
              </div>

              <div className="tool-editor-grid">
                <div className="tool-editor-field">
                  <label>Nombre de la función (slug)</label>
                  <input 
                    type="text" 
                    className="tool-input"
                    value={editingTool?.name}
                    disabled={!isCreating}
                    onChange={e => setEditingTool(prev => prev ? {...prev, name: e.target.value} : null)}
                    placeholder="ej. obtener_clima_detallado"
                  />
                </div>
                <div className="tool-editor-field">
                  <label>Descripción (lo que lee la IA)</label>
                  <input 
                    type="text" 
                    className="tool-input"
                    value={editingTool?.description}
                    onChange={e => setEditingTool(prev => prev ? {...prev, description: e.target.value} : null)}
                    placeholder="ej. Obtiene el clima detallado de una ciudad"
                  />
                </div>
              </div>

              <div className="tool-editor-field">
                <label>Parámetros (JSON Schema)</label>
                <textarea 
                  className="tool-textarea"
                  style={{ minHeight: '120px' }}
                  value={editingTool?.parameters}
                  onChange={e => setEditingTool(prev => prev ? {...prev, parameters: e.target.value} : null)}
                />
                <div className="tool-hint-inline">
                  <FileJson size={10} />
                  <span>Define los campos que la IA debe completar para llamar a esta función</span>
                </div>
              </div>

              {editingTool?.is_dynamic === 1 && (
                <div className="tool-editor-field">
                  <label>Código JavaScript (Async Node.js)</label>
                  <textarea 
                    className="tool-textarea"
                    style={{ minHeight: '200px', fontSize: '12px' }}
                    value={editingTool?.script || ''}
                    onChange={e => setEditingTool(prev => prev ? {...prev, script: e.target.value} : null)}
                  />
                  <div className="tool-note">
                    <AlertCircle size={14} />
                    <span>Tienes acceso a <b>args</b> (parámetros) y <b>context</b> (sessionId, origin). Debes retornar un String o un Objeto JSON.</span>
                  </div>
                </div>
              )}

              <div className="tool-editor-actions">
                <button 
                  className="btn-ghost"
                  onClick={() => { setEditingTool(null); setIsCreating(false); }}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-primary tool-save-btn"
                  onClick={handleSave}
                >
                  <Save size={16} /> Guardar Cambios
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
