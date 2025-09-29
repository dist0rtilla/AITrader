/**
 * AllSignalsModal — modal showing all signals with statistics and filtering.
 * 
 * Copilot: Modal for comprehensive signal overview with categorization.
 * Props: { signals: Signal[], isOpen: boolean, onClose: () => void }
 * Features:
 * - Signal statistics breakdown (bullish/bearish/neutral counts)
 * - Color-coded signal scoring with trend indicators
 * - Pagination support for large signal lists
 * - Modal ID: 'all-signals-modal' for proper modal management
 * 
 * Notes: Uses unified Modal component to prevent overlapping with other modals.
 * Integrates with SignalsTable for comprehensive signal exploration.
 */

import { Activity, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { Signal } from '../../types';
import Modal from '../ui/Modal';

interface AllSignalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    signals: Signal[];
    onSignalClick?: (signal: Signal) => void;
}

export default function AllSignalsModal({ isOpen, onClose, signals, onSignalClick }: AllSignalsModalProps) {
    const getScoreColor = (score: number) => {
        if (score > 0.3) return 'text-status-ok';
        if (score < -0.3) return 'text-status-error';
        return 'text-status-warn';
    };

    const getScoreBackground = (score: number) => {
        if (score > 0.3) return 'bg-status-ok-bg border-status-ok-border';
        if (score < -0.3) return 'bg-status-error-bg border-status-error-border';
        return 'bg-status-warn-bg border-status-warn-border';
    };

    const getScoreIcon = (score: number) => {
        if (score > 0.1) return <TrendingUp className="w-3 h-3" />;
        if (score < -0.1) return <TrendingDown className="w-3 h-3" />;
        return <Activity className="w-3 h-3" />;
    };

    const bullishSignals = signals.filter(s => s.score > 0.3);
    const bearishSignals = signals.filter(s => s.score < -0.3);
    const neutralSignals = signals.filter(s => s.score >= -0.3 && s.score <= 0.3);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="All Trading Signals" maxWidth="2xl" id="all-signals-modal">
            <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="glass-card rounded-glass-card p-4 text-center">
                        <div className="text-2xl font-bold text-status-ok mb-1">{bullishSignals.length}</div>
                        <div className="text-sm text-glass-muted flex items-center justify-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Bullish
                        </div>
                    </div>
                    <div className="glass-card rounded-glass-card p-4 text-center">
                        <div className="text-2xl font-bold text-status-error mb-1">{bearishSignals.length}</div>
                        <div className="text-sm text-glass-muted flex items-center justify-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Bearish
                        </div>
                    </div>
                    <div className="glass-card rounded-glass-card p-4 text-center">
                        <div className="text-2xl font-bold text-status-warn mb-1">{neutralSignals.length}</div>
                        <div className="text-sm text-glass-muted flex items-center justify-center gap-1">
                            <Activity className="w-3 h-3" />
                            Neutral
                        </div>
                    </div>
                </div>

                {/* Signals List */}
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {signals.length === 0 ? (
                        <div className="glass-card rounded-glass-card p-8 text-center">
                            <Clock className="w-12 h-12 text-glass-muted mx-auto mb-3" />
                            <p className="text-glass-muted">No signals available</p>
                            <p className="text-glass-muted text-sm mt-1">Waiting for patterns...</p>
                        </div>
                    ) : (
                        signals.map((signal) => (
                            <div
                                key={signal.id}
                                className="glass-card rounded-glass-card p-4 border border-glass hover:border-glass-bright cursor-pointer transition-all duration-300 group"
                                onClick={() => onSignalClick?.(signal)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse-glow"></div>
                                                <span className="font-bold text-glass-bright group-hover:text-white transition-colors duration-300">
                                                    {signal.symbol}
                                                </span>
                                            </div>
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold backdrop-blur-card transition-all duration-300 ${getScoreBackground(signal.score)} ${getScoreColor(signal.score)}`}>
                                                {getScoreIcon(signal.score)}
                                                {signal.score > 0 ? '+' : ''}{signal.score.toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-glass-muted">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(signal.time).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            {signal.meta?.pattern && (
                                                <span className="truncate">
                                                    {signal.meta.pattern}
                                                </span>
                                            )}
                                            {signal.meta?.confidence && (
                                                <span className="font-mono">
                                                    {(signal.meta.confidence * 100).toFixed(0)}% confidence
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mini chart placeholder */}
                                    <div className="w-16 h-8 glass-card rounded flex items-center justify-center group-hover:shadow-glass-card transition-all duration-300">
                                        <div className="flex items-center gap-px">
                                            <div className="w-px h-2 bg-accent-teal rounded-full animate-pulse"></div>
                                            <div className="w-px h-4 bg-accent-primary rounded-full animate-pulse delay-75"></div>
                                            <div className="w-px h-1 bg-accent-amber rounded-full animate-pulse delay-150"></div>
                                            <div className="w-px h-5 bg-accent-emerald rounded-full animate-pulse delay-200"></div>
                                            <div className="w-px h-3 bg-accent-purple rounded-full animate-pulse delay-300"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="glass-card rounded-glass-card p-4 text-center border-glass">
                    <p className="text-sm text-glass-muted">
                        Showing {signals.length} signal{signals.length !== 1 ? 's' : ''} •
                        <span className="text-accent-primary ml-1">Real-time updates</span>
                    </p>
                </div>
            </div>
        </Modal>
    );
}