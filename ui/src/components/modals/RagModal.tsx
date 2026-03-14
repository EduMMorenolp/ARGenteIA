import { Database, Plus, Trash2, X, UploadCloud, FileText } from 'lucide-react';
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

            console.log(`✅ [RAG] Documento "${newSource || 'manual_entry'}" subido exitosamente al contexto de ${ownerId}. ID: ${data.id}`);
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
        <div className="modal-overlay">
            <div className="modal-centered-wrapper">
                <div className="modal-content glass-panel" style={{ width: '560px', maxWidth: '90vw' }}>
                    <div className="modal-header">
                        <div className="flex items-center gap-3">
                            <div className="icon-box"><Database size={20} /></div>
                            <h2>Memoria de Contexto (RAG)</h2>
                        </div>
                        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                    </div>

                    <p className="modal-subtitle mb-4">
                        Gestionando contexto para: <strong className="text-accent">{ownerId === '__general__' ? 'Asistente General' : ownerId}</strong>
                    </p>

                    <div className="modal-body scrollbar-hide">
                        <div className="rag-form mb-6 p-4 rounded-xl" style={{ background: 'var(--surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', fontWeight: 600 }}>
                                    <UploadCloud size={14} /> Nuevo Documento
                                </h3>
                                <label className="btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
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
                                    style={{ width: '100%', minHeight: '180px', resize: 'vertical', fontSize: '14px' }}
                                    placeholder="Pega el texto que quieres que el agente memorice y use como contexto..."
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button className="btn-primary btn-sm" onClick={handleAdd} disabled={isSubmitting || !newText.trim()}>
                                    {isSubmitting ? 'Guardando...' : <><Plus size={14} /> Incorporar Conocimiento</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Tab to open/close stored knowledge */}
                <button
                    className={`modal-side-tab right ${isRightSidebarOpen ? 'open' : ''}`}
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    title="Conocimiento Almacenado"
                >
                    <FileText size={16} />
                </button>

                {/* Right Panel: Stored Knowledge */}
                {isRightSidebarOpen && (
                    <div className="modal-side-panel right open glass-panel">
                        <div className="panel-header">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-accent" />
                                <h3 className="panel-title">Almacenado</h3>
                            </div>
                        </div>
                        <div className="panel-body scrollbar-hide">
                            <p className="panel-desc">Documentos en memoria para <strong className="text-accent">{ownerId === '__general__' ? 'Asistente General' : ownerId}</strong></p>
                            
                            {loading ? (
                                <p className="text-muted text-sm text-center py-4">Cargando...</p>
                            ) : chunks.length === 0 ? (
                                <p className="text-empty text-center py-4">No hay documentos en memoria.</p>
                            ) : (
                                <div className="templates-grid list-view">
                                    {chunks.map((chunk) => (
                                        <div key={chunk.id} className="template-card" style={{ padding: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="template-name" style={{ fontSize: '13px' }}>{chunk.source}</h4>
                                            </div>
                                            <p className="template-desc mb-2" style={{ WebkitLineClamp: 4 }}>
                                                {chunk.text_content}
                                            </p>
                                            <div className="flex items-center justify-between mt-auto">
                                                <span className="text-muted" style={{ fontSize: '10px' }}>{new Date(chunk.created_at).toLocaleDateString()}</span>
                                                <button 
                                                    className="icon-btn-sm" 
                                                    style={{ color: 'var(--error)' }} 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(chunk.id); }}
                                                    title="Eliminar Documento"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
