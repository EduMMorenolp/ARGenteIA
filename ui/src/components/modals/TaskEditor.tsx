import { useState } from 'react';
import { X } from 'lucide-react';

interface TaskEditorProps {
    task: any;
    onClose: () => void;
    onSave: (id: number, task: string, cron: string) => void;
}

export function TaskEditor({ task, onClose, onSave }: TaskEditorProps) {
    const parts = (task.cron || "0 0 * * *").split(' ');
    const [initialMin, initialHour, , , initialDow] = parts;

    const [description, setDescription] = useState(task.task);
    const [minute, setMinute] = useState(initialMin || '00');
    const [hour, setHour] = useState(initialHour || '12');
    const [days, setDays] = useState<string[]>(
        initialDow === '*' ? ['0', '1', '2', '3', '4', '5', '6'] : initialDow.split(',')
    );

    const daysOfWeek = [
        { label: 'Lun', value: '1' },
        { label: 'Mar', value: '2' },
        { label: 'Mié', value: '3' },
        { label: 'Jue', value: '4' },
        { label: 'Vie', value: '5' },
        { label: 'Sáb', value: '6' },
        { label: 'Dom', value: '0' },
    ];

    const toggleDay = (day: string) => {
        setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleSave = () => {
        const dow = days.length === 7 ? '*' : days.sort().join(',');
        const cleanCron = `${minute.padStart(1, '0')} ${hour.padStart(1, '0')} * * ${dow}`;
        onSave(task.id, description, cleanCron);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Editar Tarea</h3>
                    <button className="icon-btn" onClick={onClose} title="Cerrar">
                        <X size={18} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Descripción</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="¿Qué debe hacer el asistente?"
                        />
                    </div>

                    <div className="time-row">
                        <div className="form-group">
                            <label>Hora</label>
                            <div className="time-input-wrap">
                                <input
                                    type="number" min="0" max="23"
                                    value={hour}
                                    onChange={e => setHour(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Minuto</label>
                            <div className="time-input-wrap">
                                <input
                                    type="number" min="0" max="59"
                                    value={minute}
                                    onChange={e => setMinute(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Repetir los días</label>
                        <div className="days-selector">
                            {daysOfWeek.map(d => (
                                <div
                                    key={d.value}
                                    className={`day-chip ${days.includes(d.value) ? 'active' : ''}`}
                                    onClick={() => toggleDay(d.value)}
                                >
                                    {d.label}
                                </div>
                            ))}
                        </div>
                        <span className="field-hint">
                            {days.length === 7 ? 'Todos los días' : days.length === 0 ? 'Nunca (selecciona al menos uno)' : 'Días seleccionados'}
                        </span>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={!description.trim() || days.length === 0}
                    >
                        Actualizar Tarea
                    </button>
                </div>
            </div>
        </div>
    );
}
