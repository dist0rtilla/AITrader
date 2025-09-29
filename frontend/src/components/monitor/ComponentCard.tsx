
/**
 * ComponentCard — small presentational card used on Monitor page.
 * 
 * Copilot: This component displays system component status with expandable details modal.
 * Props: { name: string, meta: any, onRestart?: (id: string) => Promise<void> }
 * Features:
 * - Glass morphism card design with status indicators
 * - Click to open detailed metadata modal with JSON display
 * - Restart functionality for system components
 * - Modal uses unique ID: `component-${name}` for proper modal management
 * 
 * Notes: Uses unified Modal component for consistent behavior and prevents modal overlapping.
 */

import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import Modal from '../ui/Modal';
import SafeComponentStatusModal from './SafeComponentStatusModal';

export default function ComponentCard({ name, meta, onRestart }: { name: string, meta: any, onRestart?: (id: string) => Promise<void> }) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const running = meta && (meta.running === true || meta.status === 'running' || meta.status === 'ok');
    const statusText = running ? 'running' : (meta && meta.status ? String(meta.status) : 'stopped');
    const hasError = meta && (meta.status === 'error' || meta.status === 'failed' || meta.status === 'down');

    const handleRestart = async () => {
        if (!onRestart) return;
        setLoading(true);
        try {
            await onRestart(name);
        } catch (e) {
            console.error('restart failed', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeVariant = () => {
        if (hasError) return 'destructive';
        if (running) return 'default';
        return 'outline';
    };

    return (
        <div className="glass-card glass-hover-lift p-6 rounded-glass-card group">
            <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                    <div className="font-semibold text-glass-bright text-lg group-hover:text-white transition-colors duration-300">
                        {name}
                    </div>
                    <Badge
                        variant="outline"
                        className={`text-xs font-medium border-glass backdrop-blur-card ${hasError
                                ? 'bg-status-error-bg border-status-error-border text-status-error'
                                : running
                                    ? 'bg-status-ok-bg border-status-ok-border text-status-ok'
                                    : 'bg-status-warn-bg border-status-warn-border text-status-warn'
                            }`}
                    >
                        {statusText}
                    </Badge>
                </div>

                {/* Enhanced status indicator with glow effect */}
                <div className={`w-4 h-4 rounded-full shadow-glow transition-all duration-300 ${hasError
                        ? 'bg-status-error animate-pulse-glow'
                        : running
                            ? 'bg-status-ok animate-pulse-glow'
                            : 'bg-status-warn animate-pulse-glow'
                    }`} />
            </div>

            {/* Enhanced metadata section - flexible grow to fill available space */}
            <div className="flex-1">
                {meta && (
                    <div className="space-y-2 mb-4">
                        {meta.uptime && (
                            <div className="text-sm text-glass-muted flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-accent-teal" />
                                <span>Uptime: <span className="text-glass text-xs font-mono">{meta.uptime}</span></span>
                            </div>
                        )}
                        {meta.version && (
                            <div className="text-sm text-glass-muted flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-accent-amber" />
                                <span>Version: <span className="text-glass text-xs font-mono">{meta.version}</span></span>
                            </div>
                        )}
                        {meta.memory && (
                            <div className="text-sm text-glass-muted flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-accent-primary" />
                                <span>Memory: <span className="text-glass text-xs font-mono">{meta.memory}</span></span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Buttons at the bottom */}
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(true)}
                    className="flex-1 glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-glass-bright hover:shadow-glass-card transition-all duration-300"
                >
                    <span className="text-sm font-medium">Details</span>
                </Button>
                {onRestart && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRestart}
                        disabled={loading}
                        className={`flex-1 glass-button border-glass hover:border-glass-bright hover:shadow-glass-card transition-all duration-300 ${loading
                                ? 'text-glass-muted cursor-not-allowed opacity-50'
                                : 'text-glass-muted hover:text-glass-bright'
                            }`}
                    >
                        <span className="text-sm font-medium">
                            {loading ? 'Restarting...' : 'Restart'}
                        </span>
                    </Button>
                )}
            </div>

            {/* Component details modal */}
            <Modal
                isOpen={open}
                onClose={() => setOpen(false)}
                title={`${name} Details`}
                maxWidth="2xl"
                id={`component-${name.toLowerCase().replace(/\s+/g, '-')}`}
            >
                <SafeComponentStatusModal name={name} meta={meta} onClose={() => setOpen(false)} />
            </Modal>
        </div>
    );
}
