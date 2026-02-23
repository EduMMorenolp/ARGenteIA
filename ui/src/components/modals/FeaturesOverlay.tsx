import { X } from 'lucide-react';

interface Feature {
    name: string;
    icon: React.ReactNode;
    description: string;
}

interface FeaturesOverlayProps {
    features: Feature[];
    onClose: () => void;
}

export function FeaturesOverlay({ features, onClose }: FeaturesOverlayProps) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content wide" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Funcionalidades del Sistema</h3>
                    <button className="icon-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="features-grid">
                    {features.map(f => (
                        <div key={f.name} className="feature-card">
                            <div className="feat-icon">{f.icon}</div>
                            <h4>{f.name}</h4>
                            <p>{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
