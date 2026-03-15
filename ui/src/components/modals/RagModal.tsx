import { Database, FileText, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

interface ComponentProps {
  onClose: () => void;
  ownerId: string;
}

interface Chunk {
  id: number;
  owner_id: string;
  source: string;
  text_content: string;
  created_at: string;
}

export function RagModal({ onClose, ownerId }: ComponentProps) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newSource, setNewSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  useEffect(() => {
    fetchChunks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const fetchChunks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rag/${encodeURIComponent(ownerId)}`);
      const data = await res.json();
      if (data.chunks) setChunks(data.chunks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este documento del contexto?')) return;
    try {
      await fetch(`/api/rag/${encodeURIComponent(ownerId)}/${id}`, { method: 'DELETE' });
      fetchChunks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setNewSource(file.name);
      setNewText(text);
    } catch (err) {
      alert('Error al leer el archivo. Asegúrate de que sea texto.');
    }
    // clear input value so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: ownerId,
          text_content: newText,
          source: newSource || 'manual_entry',
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Network response was not ok');
      }

      console.log(
        `✅ [RAG] Documento "${newSource || 'manual_entry'}" subido exitosamente al contexto de ${ownerId}. ID: ${data.id}`,
      );
      setNewText('');
      setNewSource('');
      fetchChunks();
    } catch (err) {
      console.error('[RAG] Error al guardar documento:', err);
      alert('Error al guardar documento. Revisa la consola para más detalles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-centered-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Panel Izquierdo: (Opcional - Buscador / etc) */}
        <div className={`modal-side-panel left ${isLeftSidebarOpen ? 'open' : ''}`}>
          <div className="modal-side-inner" style={{ paddingTop: '56px' }}>
            <h4
              style={{
                fontSize: '14px',
                color: 'var(--text-main)',
                margin: 0,
                marginBottom: '12px',
              }}
            >
              Archivos
            </h4>
            <div className="empty-state">En construcción...</div>
          </div>
        </div>

        {/* Main Modal */}
        <div
          className="modal-content"
          style={{ position: 'relative', zIndex: 10, margin: 0, width: '560px', maxWidth: '100%' }}
        >
          <button
            className={`modal-side-tab left ${isLeftSidebarOpen ? 'open' : ''}`}
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            title="Archivos"
          >
            <Database size={16} />
          </button>

          <button
            className={`modal-side-tab right ${isRightSidebarOpen ? 'open' : ''}`}
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            title="Conocimiento Almacenado"
          >
            <FileText size={16} />
          </button>

          <div className="modal-header">
            <div className="flex items-center gap-3">
              <Database size={18} style={{ marginRight: 8, color: 'var(--text-main)' }} />
              <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-main)' }}>
                Memoria de Contexto (RAG)
              </h2>
            </div>
            <button className="icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <p className="modal-subtitle mb-4">
            Gestionando contexto para:{' '}
            <strong className="text-accent">
              {ownerId === '__general__' ? 'Asistente General' : ownerId}
            </strong>
          </p>

          <div className="modal-body max-h-600 scrollbar-hide">
            <div className="rag-form p-4 rounded-xl" style={{ background: 'var(--surface)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <UploadCloud size={14} /> Nuevo Documento
                </h3>
                <label
                  className="btn-secondary btn-sm"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: 0,
                  }}
                >
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".txt,.md,.csv,.json,.ts,.js,.html,.css"
                    onChange={handleFileUpload}
                  />
                  <span>Subir Archivo</span>
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', fontSize: '14px' }}
                  placeholder="Fuente o Título (ej: Documentación API)"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <textarea
                  className="input-field"
                  style={{
                    width: '100%',
                    minHeight: '180px',
                    resize: 'vertical',
                    fontSize: '14px',
                  }}
                  placeholder="Pega el texto que quieres que el agente memorice y use como contexto..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  className="btn-primary btn-sm"
                  onClick={handleAdd}
                  disabled={isSubmitting || !newText.trim()}
                >
                  {isSubmitting ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Plus size={14} /> Incorporar Conocimiento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Stored Knowledge */}
        <div className={`modal-side-panel right ${isRightSidebarOpen ? 'open' : ''}`}>
          <div className="modal-side-inner" style={{ paddingTop: '56px' }}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-accent" />
              <h4 style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>Almacenado</h4>
            </div>
            <p className="text-muted text-sm mb-4" style={{ lineHeight: 2.8 }}>
              Documentos en memoria para{' '}
              <strong className="text-accent">
                {ownerId === '__general__' ? 'Asistente General' : ownerId}
              </strong>
            </p>

            {loading ? (
              <div className="text-center py-4 text-muted">Cargando...</div>
            ) : chunks.length === 0 ? (
              <div className="empty-state">No hay documentos.</div>
            ) : (
              <div
                className="or-models-list scrollbar-hide"
                style={{ paddingRight: '4px', height: 'calc(100% - 120px)' }}
              >
                {chunks.map((chunk: Chunk) => (
                  <div
                    key={chunk.id}
                    className="or-model-item"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
                  >
                    <div className="flex items-center justify-between" style={{ width: '100%' }}>
                      <h4
                        style={{
                          fontSize: '13px',
                          margin: 0,
                          fontWeight: 600,
                          color: 'var(--text-main)',
                        }}
                      >
                        {chunk.source}
                      </h4>
                      <button
                        className="icon-btn-sm"
                        style={{ color: 'var(--error)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(chunk.id);
                        }}
                        title="Eliminar Documento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {chunk.text_content}
                    </p>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {new Date(chunk.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
