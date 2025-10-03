/**
 * SafeComponentStatusModal — error-safe wrapper for ComponentStatusModal
 * 
 * Copilot: Provides guardrails around ComponentStatusModal to prevent app crashes.
 * Features:
 * - Error boundary protection
 * - Safe metadata parsing with fallbacks
 * - Loading states and error handling
 * - Graceful degradation to simple modal
 * 
 * Usage: Replace ComponentStatusModal imports with this component
 */

import { AlertTriangle, Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getComponentMetrics } from '../../api/healthClient';
import ErrorBoundary from '../ui/ErrorBoundary';
import ComponentStatusModal from './ComponentStatusModal';

interface SafeComponentStatusModalProps {
    name: string;
    meta: any;
    onClose: () => void;
}

/**
 * Simple fallback modal when ComponentStatusModal fails
 */
function FallbackModal({ name, meta, onClose }: SafeComponentStatusModalProps) {
    const safeStringify = (obj: any): string => {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return `[Error displaying data: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 glass-card rounded-glass border border-glass-bright/20">
                <Info className="w-6 h-6 text-glass-bright" />
                <div>
                    <h3 className="text-xl font-semibold text-glass-bright">{name || 'Component'}</h3>
                    <p className="text-sm text-glass-muted">Component Status (Fallback Mode)</p>
                </div>
            </div>

            <div className="glass-card rounded-glass-card p-4">
                <h4 className="text-lg font-semibold text-glass-bright mb-3">Raw Data</h4>
                <pre className="text-xs text-glass-muted font-mono leading-relaxed whitespace-pre-wrap 
                       bg-glass/10 p-3 rounded-glass border border-glass/20 max-h-64 overflow-auto">
                    {safeStringify(meta)}
                </pre>
            </div>

            <div className="flex items-center gap-2 p-3 glass-card rounded-glass border border-status-warn/20">
                <AlertTriangle className="w-4 h-4 text-status-warn" />
                <span className="text-sm text-glass-muted">
                    Enhanced modal unavailable - showing raw data instead
                </span>
            </div>
        </div>
    );
}

/**
 * Loading placeholder while checking if component is safe to render
 */
function LoadingModal({ name }: { name: string }) {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-3 p-4 glass-card rounded-glass border border-glass-bright/20">
                <div className="w-6 h-6 bg-glass/20 rounded-full"></div>
                <div>
                    <h3 className="text-xl font-semibold text-glass-bright">{name || 'Component'}</h3>
                    <p className="text-sm text-glass-muted">Loading status...</p>
                </div>
            </div>
            <div className="glass-card rounded-glass-card p-4">
                <div className="space-y-3">
                    <div className="h-4 bg-glass/20 rounded"></div>
                    <div className="h-4 bg-glass/20 rounded w-3/4"></div>
                    <div className="h-4 bg-glass/20 rounded w-1/2"></div>
                </div>
            </div>
        </div>
    );
}

export default function SafeComponentStatusModal(props: SafeComponentStatusModalProps) {
    const [isReady, setIsReady] = useState(false);
    const [hasValidData, setHasValidData] = useState(false);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [metricsData, setMetricsData] = useState<any>(null);

    useEffect(() => {
        // Validate props and data safety
        const validateData = () => {
            try {
                // Check if meta is safe to process
                if (props.meta && typeof props.meta === 'object') {
                    // Try to stringify to catch circular references
                    JSON.stringify(props.meta);
                    setHasValidData(true);
                } else {
                    setHasValidData(false);
                }
            } catch (error) {
                console.warn('SafeComponentStatusModal: Invalid meta data', error);
                setHasValidData(false);
            } finally {
                setIsReady(true);
            }
        };

        // Small delay to prevent immediate rendering issues
        const timer = setTimeout(validateData, 100);
        return () => clearTimeout(timer);
    }, [props.meta]);

    useEffect(() => {
        // Once validated, try to fetch live metrics for this component.
        if (!isReady || !hasValidData) return;

        const fetchMetrics = async () => {
            const componentId = props.meta && props.meta.id ? props.meta.id : (props.name || '').toLowerCase().replace(/\s+/g, '-');
            if (!componentId) return;
            setMetricsLoading(true);
            setMetricsError(null);
            try {
                const res = await getComponentMetrics(componentId);
                setMetricsData(res);
            } catch (err: any) {
                console.warn('Failed to fetch component metrics', err?.message || err);
                setMetricsError(err?.message || String(err));
                // If fetching metrics fails, we'll fall back to synthesizing metrics from the
                // provided `meta` object (many demo components include `memory`, `cpu`, `requests`, etc).
                try {
                    const synth = synthesizeMetricsFromMeta(props.meta);
                    if (synth) setMetricsData(synth);
                } catch (e) {
                    // ignore synthesis failures
                }
            } finally {
                setMetricsLoading(false);
            }
        };

        // Fire-and-forget, UI will show enhanced modal when ready
        fetchMetrics();
    }, [isReady, hasValidData, props.meta, props.name]);

    // Create a simple synthesized metrics object from the Component meta information.
    function synthesizeMetricsFromMeta(meta: any) {
        if (!meta || typeof meta !== 'object') return null;
        const metrics: Record<string, any> = {};

        // Parse memory like '1.0GB' or '512MB'
        if (meta.memory && typeof meta.memory === 'string') {
            const m = meta.memory.match(/([0-9]+(?:\.[0-9]+)?)\s*(GB|MB|KB)?/i);
            if (m) {
                const v = parseFloat(m[1]);
                const unit = (m[2] || '').toUpperCase();
                let bytes = v;
                if (unit === 'GB') bytes = v * 1024 * 1024 * 1024;
                else if (unit === 'MB') bytes = v * 1024 * 1024;
                else if (unit === 'KB') bytes = v * 1024;
                metrics.process_resident_memory_bytes = Math.round(bytes);
            }
        }

        // Parse cpu like '25%'
        if (meta.cpu && typeof meta.cpu === 'string') {
            const c = meta.cpu.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (c) {
                const pct = parseFloat(c[1]);
                // Use a heuristic to create a 'cpu seconds total' value for demo purposes
                metrics.process_cpu_seconds_total = Math.round(pct * 10);
            }
        }

        // Parse requests/inferences/ticks etc into a single http_requests_total metric
        const reqSources = ['requests', 'inferences', 'ticks', 'executions', 'patterns', 'tasks'];
        for (const k of reqSources) {
            if (meta[k]) {
                const found = String(meta[k]).match(/([0-9,\.]+)/);
                if (found) {
                    const num = Number(String(found[1]).replace(/,/g, ''));
                    if (!Number.isNaN(num)) {
                        metrics.http_requests_total = Math.round(num);
                        break;
                    }
                }
            }
        }

        // Add a timestamp
        return { component: meta.id || (props.name || '').toLowerCase().replace(/\s+/g, '-'), metrics, timestamp: new Date().toISOString() };
    }

    // Show loading state while validating
    if (!isReady) {
        return <LoadingModal name={props.name} />;
    }

    // If data is invalid or risky, use fallback
    if (!hasValidData) {
        return <FallbackModal {...props} />;
    }

    // Merge fetched metrics into meta (if available) before rendering enhanced modal
    const combinedMeta = React.useMemo(() => {
        if (!props.meta) return props.meta;
        const base = { ...props.meta };
        if (metricsData && metricsData.metrics) {
            base.metrics = { ...(base.metrics || {}), ...(metricsData.metrics || {}) };
        }
        return base;
    }, [props.meta, metricsData]);

    // Helper to render a small metrics summary panel when metricsData is available
    const MetricsPanel = () => {
        if (!metricsData || !metricsData.metrics) return null;
        const m = metricsData.metrics as Record<string, any>;
        const memory = m.process_resident_memory_bytes;
        const cpuSeconds = m.process_cpu_seconds_total;
        const httpReqs = m.http_requests_total;

        // Simple CPU seconds -> human readable
        const cpuText = typeof cpuSeconds === 'number' ? `${cpuSeconds.toFixed(1)}s` : 'n/a';
        const memText = typeof memory === 'number' ? `${(memory / (1024 * 1024)).toFixed(1)} MB` : 'n/a';
        const reqText = typeof httpReqs === 'number' ? `${httpReqs}` : 'n/a';

        return (
            <div className="glass-card rounded-glass-card p-4 mt-4 border border-glass/20">
                <h4 className="text-lg font-medium text-glass-bright mb-2">Live Metrics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-glass-muted">
                    <div>
                        <div className="text-xs uppercase text-glass-muted">Resident Memory</div>
                        <div className="text-glass-bright font-mono">{memText}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-glass-muted">CPU Time</div>
                        <div className="text-glass-bright font-mono">{cpuText}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-glass-muted">HTTP Requests</div>
                        <div className="text-glass-bright font-mono">{reqText}</div>
                    </div>
                </div>
            </div>
        );
    };

    // Try to render the enhanced modal with error boundary
    return (
        <ErrorBoundary
            fallback={<FallbackModal {...props} />}
            showDetails={process.env.NODE_ENV === 'development'}
        >
            {/* While metrics are loading we still render the modal; ComponentStatusModal
                will show metrics if present and ignore if absent. */}
            <ComponentStatusModal name={props.name} meta={combinedMeta} onClose={props.onClose} />
            {/* Inline metrics panel to surface parsed metrics from backend */}
            <MetricsPanel />
            {metricsLoading && (
                <div className="mt-2 text-sm text-glass-muted">Loading metrics...</div>
            )}
            {metricsError && (
                <div className="mt-2 text-sm text-status-warn">Failed to load metrics: {metricsError}</div>
            )}
        </ErrorBoundary>
    );
}