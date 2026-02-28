import { useEffect } from "react";
import {
    X,
    MessageSquare,
    Zap,
    Clock,
    BarChart3,
    Cpu,
    TrendingUp,
} from "lucide-react";
import type { DashboardStats } from "../../types";

interface DashboardModalProps {
    stats: DashboardStats | null;
    onClose: () => void;
    onRequestStats: () => void;
}

export function DashboardModal({
    stats,
    onClose,
    onRequestStats,
}: DashboardModalProps) {
    useEffect(() => {
        onRequestStats();
    }, []);

    const formatNumber = (n: number): string => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
        return n.toString();
    };

    const formatLatency = (ms: number): string => {
        if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
        return ms + "ms";
    };

    // Get max value for chart scaling
    const maxMessages = stats
        ? Math.max(...stats.dailyActivity.map((d) => d.messages), 1)
        : 1;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="dashboard-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>
                        <BarChart3 size={22} /> Dashboard
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {!stats ? (
                    <div className="dashboard-loading">
                        <div className="typing-loader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <p>Cargando estadísticas...</p>
                    </div>
                ) : (
                    <div className="dashboard-body scrollbar-hide">
                        {/* KPI Cards */}
                        <div className="kpi-grid">
                            <div className="kpi-card">
                                <div className="kpi-icon messages">
                                    <MessageSquare size={20} />
                                </div>
                                <div className="kpi-data">
                                    <span className="kpi-value">
                                        {formatNumber(stats.totalMessages)}
                                    </span>
                                    <span className="kpi-label">Total Mensajes</span>
                                </div>
                                <div className="kpi-sub">
                                    <span>
                                        👤 {stats.totalUserMessages} · 🤖{" "}
                                        {stats.totalAssistantMessages}
                                    </span>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-icon tokens">
                                    <Zap size={20} />
                                </div>
                                <div className="kpi-data">
                                    <span className="kpi-value">
                                        {formatNumber(stats.totalTokens)}
                                    </span>
                                    <span className="kpi-label">Tokens Usados</span>
                                </div>
                                <div className="kpi-sub">
                                    <span>
                                        📥 {formatNumber(stats.totalPromptTokens)} · 📤{" "}
                                        {formatNumber(stats.totalCompletionTokens)}
                                    </span>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-icon speed">
                                    <Clock size={20} />
                                </div>
                                <div className="kpi-data">
                                    <span className="kpi-value">
                                        {formatLatency(stats.avgLatencyMs)}
                                    </span>
                                    <span className="kpi-label">Velocidad Promedio</span>
                                </div>
                                <div className="kpi-sub">
                                    <span>
                                        Min: {formatLatency(stats.minLatencyMs)} · Max:{" "}
                                        {formatLatency(stats.maxLatencyMs)}
                                    </span>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-icon requests">
                                    <TrendingUp size={20} />
                                </div>
                                <div className="kpi-data">
                                    <span className="kpi-value">{stats.totalRequests}</span>
                                    <span className="kpi-label">Peticiones IA</span>
                                </div>
                                <div className="kpi-sub">
                                    <span>
                                        ~
                                        {stats.totalRequests > 0
                                            ? formatNumber(
                                                Math.round(stats.totalTokens / stats.totalRequests),
                                            )
                                            : 0}{" "}
                                        tokens/petición
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Daily Activity Chart */}
                        <div className="dashboard-section">
                            <h3>
                                <BarChart3 size={16} /> Actividad Diaria
                            </h3>
                            {stats.dailyActivity.length === 0 ? (
                                <div className="empty-state">
                                    No hay datos de actividad aún. ¡Envía algunos mensajes!
                                </div>
                            ) : (
                                <div className="chart-container">
                                    <div className="bar-chart">
                                        {stats.dailyActivity.map((day) => {
                                            const heightPct = (day.messages / maxMessages) * 100;
                                            const date = new Date(day.date + "T12:00:00");
                                            const label = `${date.getDate()}/${date.getMonth() + 1}`;
                                            return (
                                                <div key={day.date} className="bar-group">
                                                    <div className="bar-tooltip">
                                                        {day.messages} msg · {formatNumber(day.tokens)} tok
                                                    </div>
                                                    <div className="bar-track">
                                                        <div
                                                            className="bar-fill"
                                                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                                                        />
                                                    </div>
                                                    <span className="bar-label">{label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Expert Ranking */}
                        <div className="dashboard-section">
                            <h3>
                                <Cpu size={16} /> Uso por Experto
                            </h3>
                            {stats.expertRanking.length === 0 ? (
                                <div className="empty-state">
                                    Sin datos de expertos aún.
                                </div>
                            ) : (
                                <div className="expert-ranking-table">
                                    <div className="ranking-header">
                                        <span>Experto</span>
                                        <span>Peticiones</span>
                                        <span>Tokens</span>
                                        <span>Vel. Prom.</span>
                                    </div>
                                    {stats.expertRanking.map((exp, i) => (
                                        <div key={exp.expert} className="ranking-row">
                                            <span className="ranking-name">
                                                <span className="ranking-pos">#{i + 1}</span>
                                                {exp.expert}
                                            </span>
                                            <span className="ranking-count">{exp.count}</span>
                                            <span className="ranking-tokens">
                                                {formatNumber(exp.tokens)}
                                            </span>
                                            <span className="ranking-latency">
                                                {formatLatency(exp.avgLatency)}
                                            </span>
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
