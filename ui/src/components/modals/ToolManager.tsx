import { useState } from 'react';
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
  FileJson
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container tool-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Wrench className="text-accent" size={20} />
            <div>
              <h3>Gestor de Herramientas</h3>
              <p className="text-muted text-xs">Administra las funciones nativas y crea nuevas con JS</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {(!editingTool && !isCreating) ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted">{tools.length} herramientas cargadas</span>
                <button 
                  className="btn btn-primary btn-sm flex items-center gap-2"
                  onClick={() => {
                    setEditingTool(emptyTool);
                    setIsCreating(true);
                  }}
                >
                  <Plus size={14} /> Nueva Herramienta
                </button>
              </div>

              <div className="tools-grid">
                {tools.map(tool => (
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

                    <div className="tool-card-footer">
                      <span className="text-xs text-muted">
                        Última act: {new Date(tool.updated_at).toLocaleDateString()}
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
                    className="modal-input"
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
                    className="modal-input"
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
                <div className="flex items-center gap-1 text-[10px] text-muted">
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
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[11px] text-blue-300">
                    <AlertCircle size={14} />
                    <span>Tienes acceso a <b>args</b> (parámetros) y <b>context</b> (sessionId, origin). Debes retornar un String o un Objeto JSON.</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  className="btn btn-ghost"
                  onClick={() => { setEditingTool(null); setIsCreating(false); }}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary flex items-center gap-2"
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
