/**
 * StatusIndicator — visual health status display for system components
 * 
 * Copilot: Reusable component for displaying system health with visual indicators.
 * Features:
 * - Color-coded status badges (green/yellow/red)
 * - Animated pulse for active states
 * - Text descriptions and icons
 * - Glass morphism styling consistent with design system
 * 
 * Usage: <StatusIndicator status="running" label="Pattern Engine" />
 */

import { AlertTriangle, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';

interface StatusIndicatorProps {
    status: 'running' | 'ok' | 'healthy' | 'warning' | 'warn' | 'error' | 'failed' | 'down' | 'stopped' | 'starting' | 'unknown';
    label: string;
    description?: string;
    showPulse?: boolean;
}

export default function StatusIndicator({ status, label, description, showPulse = true }: StatusIndicatorProps) {
    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'running':
            case 'ok':
            case 'healthy':
                return {
                    color: 'text-status-ok',
                    bgColor: 'bg-status-ok/20',
                    borderColor: 'border-status-ok/30',
                    icon: CheckCircle,
                    text: 'Healthy'
                };
            case 'warning':
            case 'warn':
                return {
                    color: 'text-status-warn',
                    bgColor: 'bg-status-warn/20',
                    borderColor: 'border-status-warn/30',
                    icon: AlertTriangle,
                    text: 'Warning'
                };
            case 'error':
            case 'failed':
            case 'down':
                return {
                    color: 'text-status-error',
                    bgColor: 'bg-status-error/20',
                    borderColor: 'border-status-error/30',
                    icon: XCircle,
                    text: 'Error'
                };
            case 'starting':
                return {
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-400/20',
                    borderColor: 'border-blue-400/30',
                    icon: Zap,
                    text: 'Starting'
                };
            case 'stopped':
                return {
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-400/20',
                    borderColor: 'border-gray-400/30',
                    icon: Clock,
                    text: 'Stopped'
                };
            default:
                return {
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-400/20',
                    borderColor: 'border-gray-400/30',
                    icon: Clock,
                    text: 'Unknown'
                };
        }
    };

    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-glass border ${config.borderColor} ${config.bgColor} transition-all duration-300`}>
            <div className={`relative ${config.color}`}>
                <Icon className="w-5 h-5" />
                {showPulse && (status === 'running' || status === 'ok' || status === 'healthy') && (
                    <div className={`absolute -inset-1 ${config.bgColor} rounded-full animate-ping opacity-75`} />
                )}
            </div>

            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-glass-bright">{label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                        {config.text}
                    </span>
                </div>
                {description && (
                    <p className="text-sm text-glass-muted mt-1">{description}</p>
                )}
            </div>
        </div>
    );
}