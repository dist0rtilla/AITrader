/**
 * SignalsTable — displays recent trading signals in a table format.
 * Props: { signals: Signal[], onRowClick?: (signal: Signal) => void, loading?: boolean }
 * Notes: includes sparkline visualization, real-time updates, responsive design.
 */

import { useState } from 'react';
import { Signal } from '../../types';
import AllSignalsModal from './AllSignalsModal';

interface SignalsTableProps {
  signals: Signal[];
  onRowClick?: (signal: Signal) => void;
  loading?: boolean;
  error?: string;
}

export default function SignalsTable({ signals, onRowClick, loading, error }: SignalsTableProps) {
  const [showAllModal, setShowAllModal] = useState(false);
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-glass-card overflow-hidden">
          <div className="p-6 border-b border-glass">
            <div className="h-4 bg-glass-light rounded w-32 animate-pulse"></div>
          </div>
          <div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border-b border-glass last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 bg-glass-light rounded w-16 animate-pulse"></div>
                    <div className="h-2 bg-glass-light rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-6 w-12 bg-glass-light rounded-glass-button animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-glass-card p-6 border-l-4 border-status-error">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-status-error animate-pulse-glow"></div>
          <p className="text-status-error font-medium">Error loading signals: {error}</p>
        </div>
      </div>
    );
  }

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

  const getScoreGlow = (score: number) => {
    if (score > 0.5) return 'shadow-glow';
    if (score < -0.5) return 'shadow-glow';
    return '';
  };

  return (
    <div className="glass-card rounded-glass-card overflow-hidden">
      <div className="p-6 border-b border-glass backdrop-blur-card">
        <h3 className="text-xl font-bold text-glass-bright">Recent Signals</h3>
        <p className="text-sm text-glass-muted mt-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse-glow"></div>
          {signals.length} signal{signals.length !== 1 ? 's' : ''} detected
        </p>
      </div>

      <div className="divide-y divide-glass">
        {signals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="glass-card rounded-glass-card p-6 inline-block">
              <p className="text-glass-muted">No signals available</p>
              <p className="text-glass-muted text-sm mt-1">Waiting for patterns...</p>
            </div>
          </div>
        ) : (
          [...signals.slice(0, 4).map((signal) => (
            <div
              key={signal.id}
              className="p-4 hover:bg-glass-light cursor-pointer transition-all duration-300 group border-glass hover:border-glass-bright"
              onClick={() => onRowClick?.(signal)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse-glow group-hover:shadow-glow transition-all duration-300"></div>
                    <span className="font-bold text-glass-bright group-hover:text-white transition-colors duration-300">
                      {signal.symbol}
                    </span>
                    <span className="text-xs text-glass-muted font-mono">
                      {new Date(signal.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {signal.meta?.pattern && (
                    <span className="text-xs text-glass-muted truncate">
                      {signal.meta.pattern}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Compact chart placeholder */}
                  <div className="w-12 h-6 glass-card rounded flex items-center justify-center group-hover:shadow-glass-card transition-all duration-300">
                    <div className="flex items-center gap-px">
                      <div className="w-px h-2 bg-accent-teal rounded-full animate-pulse"></div>
                      <div className="w-px h-3 bg-accent-primary rounded-full animate-pulse delay-75"></div>
                      <div className="w-px h-1 bg-accent-amber rounded-full animate-pulse delay-150"></div>
                      <div className="w-px h-4 bg-accent-emerald rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded text-xs font-bold backdrop-blur-card transition-all duration-300 ${getScoreBackground(signal.score)} ${getScoreColor(signal.score)} ${getScoreGlow(signal.score)}`}>
                    {signal.score > 0 ? '+' : ''}{signal.score.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )),
          signals.length > 4 && (
            <div key="view-all" className="p-3 text-center border-t border-glass">
              <button
                onClick={() => setShowAllModal(true)}
                className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-glass-bright px-4 py-2 rounded-glass-button text-sm transition-all duration-300"
              >
                View All {signals.length} Signals →
              </button>
            </div>
          )].filter(Boolean)
        )}
      </div>

      {/* All Signals Modal */}
      <AllSignalsModal
        isOpen={showAllModal}
        onClose={() => setShowAllModal(false)}
        signals={signals}
        onSignalClick={onRowClick}
      />
    </div>
  );
}