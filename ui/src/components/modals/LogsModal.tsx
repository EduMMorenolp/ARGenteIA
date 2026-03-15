import { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  X, 
  BarChart3, 
  Activity, 
  History,
  ShieldAlert,
  Cpu,
  Search,
  Layers
} from 'lucide-react';
import type { LogEntry, LogStats } from '../../types';
import '../../styles/logs-modal.css';

interface LogsModalProps {
  logs: LogEntry[];
  stats: LogStats | null;
  onClose: () => void;
  onRequestLogs: (limit?: number, filters?: any) => void;
  onRequestStats: () => void;
}

export function LogsModal({
  logs,
  stats,
  onClose,
  onRequestLogs,
  onRequestStats
}: LogsModalProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'reports'>('logs');
  const [filter, setFilter] = useState({ level: '', category: '' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    onRequestLogs(100);
    onRequestStats();
    
    // Auto-refresh cada 30 segundos si está abierto
    const interval = setInterval(() => {
      onRequestLogs(100);
      onRequestStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    onRequestLogs(100, newFilter);
  };

  const filteredLogs = logs.filter((log) => {
    if (!query.trim()) return true;
    const text = `${log.message} ${log.category} ${log.level}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const totalLogs = stats?.totalByLevel.reduce((acc, row) => acc + row.count, 0) || logs.length;
  const errorCount = stats?.totalByLevel.find((row) => row.level === 'ERROR')?.count || 0;
  const actionCount = stats?.totalByLevel.find((row) => row.level === 'ACTION')?.count || 0;
  const maxLevelCount = Math.max(1, ...(stats?.totalByLevel.map((row) => row.count) || [0]));
  const maxCategoryCount = Math.max(1, ...(stats?.totalByCategory.map((row) => row.count) || [0]));
  const maxToolCount = Math.max(1, ...(stats?.toolUsage.map((row) => row.count) || [0]));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content logs-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="logs-title-wrap">
            <ClipboardList className="text-accent" size={20} />
            <div>
              <h3>Logs e Informes</h3>
              <p className="logs-subtitle">Monitorizacion y auditoria del sistema en tiempo real</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="logs-tabs">
          <button 
            className={`logs-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={14} /> Actividad
            <span className="tab-count">{filteredLogs.length}</span>
          </button>
          <button 
            className={`logs-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BarChart3 size={14} /> Informes
            <span className="tab-count">{totalLogs}</span>
          </button>
        </div>

        <div className="modal-body">
          <div className="logs-container">
            <div className="logs-summary-row">
              <div className="logs-summary-item">
                <span className="logs-summary-label">Registros</span>
                <strong>{totalLogs}</strong>
              </div>
              <div className="logs-summary-item">
                <span className="logs-summary-label">Errores</span>
                <strong>{errorCount}</strong>
              </div>
              <div className="logs-summary-item">
                <span className="logs-summary-label">Acciones</span>
                <strong>{actionCount}</strong>
              </div>
            </div>

            {activeTab === 'logs' ? (
              <>
                <div className="logs-toolbar">
                  <div className="logs-toolbar-left">
                    <select 
                      className="logs-select"
                      value={filter.level}
                      onChange={e => handleFilterChange('level', e.target.value)}
                    >
                      <option value="">Todos los niveles</option>
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                      <option value="ACTION">ACTION (Tools)</option>
                    </select>
                    <select 
                      className="logs-select"
                      value={filter.category}
                      onChange={e => handleFilterChange('category', e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      <option value="system">Sistema</option>
                      <option value="tool">Herramientas</option>
                      <option value="agent">Agente</option>
                      <option value="security">Seguridad</option>
                    </select>
                  </div>

                  <div className="logs-toolbar-right">
                    <div className="logs-search-wrap">
                      <Search size={13} />
                      <input
                        className="logs-search"
                        type="text"
                        placeholder="Buscar en actividad"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-ghost logs-refresh" onClick={() => onRequestLogs(100, filter)}>
                    <Activity size={12} /> Refrescar
                  </button>
                  </div>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="logs-empty">No hay resultados para los filtros actuales.</div>
                ) : (
                  <div className="logs-table-wrapper">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Nivel</th>
                          <th>Categoría</th>
                          <th>Mensaje</th>
                          <th>Latencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="log-row">
                            <td className="text-muted whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td>
                              <span className={`log-level-badge level-${log.level}`}>
                                {log.level}
                              </span>
                            </td>
                            <td className="log-category">{log.category}</td>
                            <td title={log.data ? JSON.stringify(log.data, null, 2) : ''}>
                              {log.message}
                            </td>
                            <td className="text-muted">
                              {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="reports-grid">
                <div className="report-card">
                  <h4><ShieldAlert size={18} className="text-blue-400" /> Distribución por Nivel</h4>
                  <div className="stat-list">
                    {stats?.totalByLevel.length ? stats.totalByLevel.map(s => (
                      <div key={s.level} className="stat-item">
                        <span className="stat-label">{s.level}</span>
                        <div className="stat-bar-bg">
                          <div 
                            className="stat-bar-fill" 
                            style={{ 
                              width: `${(s.count / maxLevelCount) * 100}%`,
                              backgroundColor: s.level === 'ERROR' ? '#f87171' : ''
                            }} 
                          />
                        </div>
                        <span className="stat-value">{s.count}</span>
                      </div>
                    )) : <div className="report-empty">Aun sin datos de niveles.</div>}
                  </div>
                </div>

                <div className="report-card">
                  <h4><Layers size={18} className="text-blue-400" /> Distribución por Categoría</h4>
                  <div className="stat-list">
                    {stats?.totalByCategory.length ? stats.totalByCategory.map(s => (
                      <div key={s.category} className="stat-item">
                        <span className="stat-label">{s.category}</span>
                        <div className="stat-bar-bg">
                          <div
                            className="stat-bar-fill"
                            style={{ width: `${(s.count / maxCategoryCount) * 100}%` }}
                          />
                        </div>
                        <span className="stat-value">{s.count}</span>
                      </div>
                    )) : <div className="report-empty">Aun sin datos de categorias.</div>}
                  </div>
                </div>

                <div className="report-card">
                  <h4><Cpu size={18} className="text-purple-400" /> Top Herramientas Usadas</h4>
                  <div className="stat-list">
                    {stats?.toolUsage.length ? stats.toolUsage.map(s => (
                      <div key={s.tool} className="stat-item">
                        <span className="stat-label stat-truncate">{s.tool}</span>
                        <div className="stat-bar-bg">
                          <div 
                            className="stat-bar-fill" 
                            style={{ 
                              width: `${(s.count / maxToolCount) * 100}%`,
                              backgroundColor: '#6da2ff'
                            }} 
                          />
                        </div>
                        <span className="stat-value">{s.count}</span>
                      </div>
                    )) : <div className="report-empty">Aun sin herramientas registradas.</div>}
                  </div>
                </div>

                <div className="report-card">
                  <h4><History size={18} className="text-green-400" /> Resumen de Actividad</h4>
                  <p className="report-text">
                    Total de registros: {stats?.totalByLevel.reduce((a, b) => a + b.count, 0) || 0}
                  </p>
                  <p className="report-text report-text-spaced">
                    Errores críticos: {stats?.totalByLevel.find(l => l.level === 'ERROR')?.count || 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
