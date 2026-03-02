import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, X, UploadCloud } from 'lucide-react';

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
            await fetch('/api/rag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_id: ownerId,
                    text_content: newText,
                    source: newSource || 'manual_entry',
                }),
            });
            setNewText('');
            setNewSource('');
            fetchChunks();
        } catch (err) {
            console.error(err);
            alert('Error al guardar documento');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ width: '600px', maxWidth: '90vw' }}>
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
                                <span>Subir Archivo Local</span>
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
                                style={{ width: '100%', minHeight: '100px', resize: 'vertical', fontSize: '14px' }}
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

                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Conocimiento Almacenado</h3>
                    {loading ? (
                        <p className="text-muted text-sm text-center py-4">Cargando...</p>
                    ) : chunks.length === 0 ? (
                        <p className="text-muted text-sm text-center py-4">No hay documentos en la memoria de este agente.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {chunks.map(chunk => (
                                <div key={chunk.id} className="p-3 rounded-lg border flex gap-3" style={{ borderColor: 'var(--border)' }}>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold text-accent">{chunk.source}</span>
                                            <span className="text-[10px] text-muted">{new Date(chunk.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-muted" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {chunk.text_content}
                                        </p>
                                    </div>
                                    <button className="icon-btn self-start text-error hover:bg-error/10" onClick={() => handleDelete(chunk.id)} title="Eliminar Documento">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
