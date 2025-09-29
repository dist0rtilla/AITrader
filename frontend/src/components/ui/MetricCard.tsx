/**
 * MetricCard — display component for system metrics with visual indicators
 * 
 * Copilot: Shows quantitative metrics with progress bars, trends, and contextual information.
 * Features:
 * - Progress bar visualization for percentage values
 * - Trend indicators (up/down arrows)
 * - Color-coded thresholds (green/yellow/red)
 * - Glass morphism styling
 * - Optional units and descriptions
 * 
 * Usage: <MetricCard title="CPU Usage" value={75} unit="%" threshold="warning" />
 */

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: number | string;
    unit?: string;
    max?: number;
    threshold?: 'good' | 'warning' | 'critical';
    trend?: 'up' | 'down' | 'stable';
    description?: string;
    showProgress?: boolean;
}

export default function MetricCard({
    title,
    value,
    unit = '',
    max = 100,
    threshold = 'good',
    trend,
    description,
    showProgress = true
}: MetricCardProps) {
    const numericValue = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
    const percentage = max > 0 ? Math.min((numericValue / max) * 100, 100) : 0;

    const getThresholdConfig = (threshold: string, percentage: number) => {
        // Auto-determine threshold based on percentage if not specified
        let actualThreshold = threshold;
        if (threshold === 'good' && percentage > 80) actualThreshold = 'critical';
        else if (threshold === 'good' && percentage > 60) actualThreshold = 'warning';

        switch (actualThreshold) {
            case 'critical':
                return {
                    color: 'text-status-error',
                    bgColor: 'bg-status-error/20',
                    progressColor: 'bg-status-error',
                    borderColor: 'border-status-error/30'
                };
            case 'warning':
                return {
                    color: 'text-status-warn',
                    bgColor: 'bg-status-warn/20',
                    progressColor: 'bg-status-warn',
                    borderColor: 'border-status-warn/30'
                };
            default:
                return {
                    color: 'text-status-ok',
                    bgColor: 'bg-status-ok/20',
                    progressColor: 'bg-status-ok',
                    borderColor: 'border-status-ok/30'
                };
        }
    };

    const config = getThresholdConfig(threshold, percentage);

    const getTrendIcon = () => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="w-4 h-4 text-status-ok" />;
            case 'down':
                return <TrendingDown className="w-4 h-4 text-status-error" />;
            case 'stable':
                return <Minus className="w-4 h-4 text-glass-muted" />;
            default:
                return null;
        }
    };

    return (
        <div className={`p-4 rounded-glass border ${config.borderColor} ${config.bgColor} glass-card transition-all duration-300 hover:shadow-glass-hover`}>
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-glass-bright">{title}</h4>
                {trend && getTrendIcon()}
            </div>

            <div className="flex items-baseline gap-1 mb-3">
                <span className={`text-2xl font-bold ${config.color}`}>
                    {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
                </span>
                {unit && <span className="text-sm text-glass-muted">{unit}</span>}
            </div>

            {showProgress && typeof value === 'number' && (
                <div className="space-y-2">
                    <div className="w-full bg-glass/20 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full ${config.progressColor} transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-glass-muted">
                        <span>0</span>
                        <span>{max}{unit}</span>
                    </div>
                </div>
            )}

            {description && (
                <p className="text-xs text-glass-muted mt-2">{description}</p>
            )}
        </div>
    );
}