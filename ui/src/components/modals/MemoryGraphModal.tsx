import { Clock, Database, MousePointer2, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { MemoryGraphData } from '../../types';

interface MemoryGraphModalProps {
  data: MemoryGraphData | null;
  onClose: () => void;
  onRequestGraph: (limit: number) => void;
}

export function MemoryGraphModal({ data, onClose, onRequestGraph }: MemoryGraphModalProps) {
  const [limit, setLimit] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    handleRefresh();
  }, []);

  useEffect(() => {
    if (data) setIsLoading(false);
  }, [data]);

  const handleRefresh = () => {
    setIsLoading(true);
    onRequestGraph(limit);
  };

  const estimatedTime = useMemo(() => {
    // Basic estimation based on O(N^2) complexity
    const seconds = (limit * limit) / 100000;
    return seconds < 1 ? '1s' : `${Math.round(seconds)}s`;
  }, [limit]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="memory-graph-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Zap size={22} className="text-secondary" />
            <div>
              <h2>Mapa Mental</h2>
              <p className="subtitle">Relaciones semánticas de tu memoria</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="graph-controls">
          <div className="control-group">
            <label>Densidad de Memoria: {limit} nodos</label>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
          <div className="control-info">
            <Clock size={14} />
            <span>Carga estimada: ~{estimatedTime}</span>
          </div>
          <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Calculando...' : 'Generar Grafo'}
          </button>
        </div>

        <div className="graph-container">
          {!data || isLoading ? (
            <div className="graph-loading">
              <div className="typing-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p>Analizando conexiones semánticas...</p>
            </div>
          ) : data.nodes.length === 0 ? (
            <div className="graph-empty">
              <Database size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>No hay suficientes recuerdos o fragmentos para generar un mapa.</p>
              <p className="subtitle">
                Interactúa con el asistente o carga documentos para ver cómo se conectan.
              </p>
            </div>
          ) : (
            <ForceGraph2D
              graphData={data}
              nodeLabel={(node: any) => `
                <div class="graph-tooltip">
                  <strong>${node.group === 'fact' ? '📌 Hecho' : '📄 RAG'}</strong><br/>
                  ${node.content}
                </div>
              `}
              nodeColor={(node: any) => (node.group === 'fact' ? '#4f46e5' : '#10b981')}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.label;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Inter, sans-serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.2);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                if (ctx.roundRect) {
                  ctx.roundRect(
                    node.x - bckgDimensions[0] / 2,
                    node.y - bckgDimensions[1] / 2,
                    bckgDimensions[0],
                    bckgDimensions[1],
                    [2],
                  );
                } else {
                  // Fallback for older browsers
                  ctx.rect(
                    node.x - bckgDimensions[0] / 2,
                    node.y - bckgDimensions[1] / 2,
                    bckgDimensions[0],
                    bckgDimensions[1],
                  );
                }
                ctx.fill();

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = node.group === 'fact' ? '#4f46e5' : '#10b981';
                ctx.fillText(label, node.x, node.y);

                node.__bckgDimensions = bckgDimensions;
              }}
              nodePointerAreaPaint={(node: any, color, ctx) => {
                ctx.fillStyle = color;
                const bckgDimensions = node.__bckgDimensions;
                bckgDimensions &&
                  ctx.fillRect(
                    node.x - bckgDimensions[0] / 2,
                    node.y - bckgDimensions[1] / 2,
                    bckgDimensions[0],
                    bckgDimensions[1],
                  );
              }}
              linkColor={() => 'rgba(255, 255, 255, 0.1)'}
              linkWidth={(link: any) => link.weight * 2}
              backgroundColor="#0f172a00"
            />
          )}
        </div>

        <div className="graph-footer">
          <div className="legend">
            <div className="legend-item">
              <span className="dot fact"></span>
              <span>Hechos Memorizados</span>
            </div>
            <div className="legend-item">
              <span className="dot rag"></span>
              <span>Fragmentos RAG</span>
            </div>
          </div>
          <div className="guide">
            <MousePointer2 size={12} />
            <span>Arrastra para rotar · Scroll para zoom</span>
          </div>
        </div>
      </div>

      <style>{`
        .memory-graph-modal {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          width: 90vw;
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .subtitle {
          font-size: 0.8rem;
          opacity: 0.6;
        }

        .graph-controls {
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 200px;
        }

        .control-group label {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .control-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .refresh-btn {
          margin-left: auto;
          background: var(--secondary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .graph-container {
          flex: 1;
          position: relative;
          background: radial-gradient(circle at center, rgba(79, 70, 229, 0.05) 0%, transparent 70%);
        }

        .graph-loading, .graph-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 10;
          text-align: center;
          padding: 20px;
        }
 
        .graph-empty p {
          font-size: 1.1rem;
          font-weight: 500;
          opacity: 0.8;
          margin: 0;
        }
 
        .graph-empty .subtitle {
          font-size: 0.9rem;
          opacity: 0.5;
          max-width: 300px;
        }

        .graph-footer {
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.2);
        }

        .legend {
          display: flex;
          gap: 20px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .dot.fact { background: #4f46e5; }
        .dot.rag { background: #10b981; }

        .guide {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          opacity: 0.4;
        }

        .graph-tooltip {
          padding: 8px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.85rem;
          max-width: 300px;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
