/**
 * ComponentStatusModal — rich status display for system components
 * 
 * Copilot: Replaces raw JSON with structured, visual component status information.
 * Features:
 * - Health status indicators with animations
 * - Performance metrics with progress bars
 * - Configuration details in organized sections
 * - Visual icons and color-coded status
 * - Responsive grid layout for metrics
 * 
 * Usage: <ComponentStatusModal name="Pattern Engine" meta={componentMeta} />
 */

import {
    Activity,
    Database,
    Gauge,
    Info,
    Server,
    Settings,
    TrendingUp,
    Zap
} from 'lucide-react';
import { parseComponentStatus } from '../../utils/componentStatusParser';
import MetricCard from '../ui/MetricCard';
import StatusIndicator from '../ui/StatusIndicator';

interface ComponentStatusModalProps {
    name: string;
    meta: any;
    onClose: () => void;
}

export default function ComponentStatusModal({ name, meta }: ComponentStatusModalProps) {
    const status = parseComponentStatus(name, meta);

    const getComponentIcon = () => {
        switch (status.type) {
            case 'database':
                return <Database className="w-6 h-6 text-blue-400" />;
            case 'engine':
                return <Zap className="w-6 h-6 text-purple-400" />;
            case 'api':
                return <Server className="w-6 h-6 text-green-400" />;
            case 'runner':
                return <Activity className="w-6 h-6 text-orange-400" />;
            case 'service':
                return <Settings className="w-6 h-6 text-cyan-400" />;
            default:
                return <Server className="w-6 h-6 text-gray-400" />;
        }
    };

    const formatConfigValue = (key: string, value: any): string => {
        if (value === null || value === undefined) return 'Not set';
        if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return String(value);
    };

    const hasMetrics = Object.keys(status.metrics).length > 0;
    const hasConfig = Object.keys(status.config).length > 0;

    const getHealthScoreColor = (score: number) => {
        if (score >= 80) return 'text-status-ok';
        if (score >= 60) return 'text-status-warn';
        return 'text-status-error';
    };

    const getStatusDescription = () => {
        const parts = [];
        if (status.health.uptime) parts.push(`Uptime: ${status.health.uptime}`);
        if (status.health.lastSeen) parts.push(`Last seen: ${status.health.lastSeen}`);
        return parts.join(' • ');
    };

    return (
        <div className="space-y-6">
            {/* Header with component info */}
            <div className="flex items-center gap-4 p-4 glass-card rounded-glass border border-glass-bright/20">
                {getComponentIcon()}
                <div className="flex-1">
                    <h3 className="text-xl font-semibold text-glass-bright">{name}</h3>
                    <p className="text-sm text-glass-muted capitalize">{status.type} Component</p>
                </div>
                <div className="text-right">
                    {status.health.healthScore !== undefined && (
                        <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-glass-muted" />
                            <span className="text-sm text-glass-muted">Health Score</span>
                            <span className={`font-bold ${getHealthScoreColor(status.health.healthScore)}`}>
                                {status.health.healthScore}/100
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Health Status */}
            <StatusIndicator
                status={status.health.status}
                label="Component Health"
                description={getStatusDescription()}
            />

            {/* Performance Metrics */}
            {hasMetrics && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-glass-bright" />
                        <h4 className="text-lg font-semibold text-glass-bright">Performance Metrics</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {status.metrics.cpuUsage !== undefined && (
                            <MetricCard
                                title="CPU Usage"
                                value={status.metrics.cpuUsage}
                                unit="%"
                                threshold={status.metrics.cpuUsage > 80 ? 'critical' : status.metrics.cpuUsage > 60 ? 'warning' : 'good'}
                                description="Processor utilization"
                            />
                        )}

                        {status.metrics.memoryUsage !== undefined && (
                            <MetricCard
                                title="Memory Usage"
                                value={status.metrics.memoryUsage}
                                unit="%"
                                threshold={status.metrics.memoryUsage > 90 ? 'critical' : status.metrics.memoryUsage > 70 ? 'warning' : 'good'}
                                description="RAM utilization"
                            />
                        )}

                        {status.metrics.requestsPerSecond !== undefined && (
                            <MetricCard
                                title="Requests/sec"
                                value={status.metrics.requestsPerSecond}
                                unit="req/s"
                                showProgress={false}
                                description="Request throughput"
                            />
                        )}

                        {status.metrics.responseTime !== undefined && (
                            <MetricCard
                                title="Response Time"
                                value={status.metrics.responseTime}
                                unit="ms"
                                max={1000}
                                threshold={status.metrics.responseTime > 500 ? 'critical' : status.metrics.responseTime > 200 ? 'warning' : 'good'}
                                description="Average response time"
                            />
                        )}

                        {status.metrics.errorRate !== undefined && (
                            <MetricCard
                                title="Error Rate"
                                value={status.metrics.errorRate}
                                unit="%"
                                threshold={status.metrics.errorRate > 5 ? 'critical' : status.metrics.errorRate > 1 ? 'warning' : 'good'}
                                description="Percentage of failed requests"
                            />
                        )}

                        {status.metrics.connections !== undefined && (
                            <MetricCard
                                title="Active Connections"
                                value={status.metrics.connections}
                                showProgress={false}
                                description="Current active connections"
                            />
                        )}

                        {status.metrics.processedItems !== undefined && (
                            <MetricCard
                                title="Items Processed"
                                value={status.metrics.processedItems}
                                showProgress={false}
                                description="Total processed items"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Configuration Details */}
            {hasConfig && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-glass-bright" />
                        <h4 className="text-lg font-semibold text-glass-bright">Configuration</h4>
                    </div>

                    <div className="glass-card rounded-glass-card p-4 space-y-3">
                        {Object.entries(status.config).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-start py-2 border-b border-glass/20 last:border-b-0">
                                <span className="font-medium text-glass-bright capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </span>
                                <span className="text-glass-muted text-right font-mono text-sm max-w-xs truncate">
                                    {formatConfigValue(key, value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Raw Data (Collapsible) */}
            <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-glass-muted hover:text-glass-bright transition-colors">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">Raw Metadata</span>
                    <span className="text-xs">(Click to expand)</span>
                </summary>

                <div className="mt-3 glass-card rounded-glass-card p-4 max-h-64 overflow-auto">
                    <pre className="text-xs text-glass-muted font-mono leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(status.rawData, null, 2)}
                    </pre>
                </div>
            </details>
        </div>
    );
}