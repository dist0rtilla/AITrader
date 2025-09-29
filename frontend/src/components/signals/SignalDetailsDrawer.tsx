/**
 * SignalDetailsDrawer — modal/drawer that displays detailed signal information.
 * 
 * Copilot: UPDATED to use unified Modal component for consistent behavior.
 * Props: { signal: Signal | null, isOpen: boolean, onClose: () => void }
 * Features:
 * - Signal score interpretation with color-coded display
 * - Metadata JSON display with syntax highlighting
 * - Price history placeholder for future chart integration
 * - Modal ID: `signal-details-${signal.id}` for proper modal management
 * 
 * Notes: Previously used custom modal implementation, now uses unified Modal component
 * to prevent overlapping issues and ensure consistent z-index behavior.
 */

import { Signal } from '../../types';
import Modal from '../ui/Modal';

interface SignalDetailsDrawerProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SignalDetailsDrawer({ signal, isOpen, onClose }: SignalDetailsDrawerProps) {
  if (!isOpen || !signal) return null;

  const getScoreColor = (score: number) => {
    if (score > 0.3) return 'text-green-400';
    if (score < -0.3) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getScoreLabel = (score: number) => {
    if (score > 0.5) return 'Strong Buy';
    if (score > 0.2) return 'Buy';
    if (score > -0.2) return 'Neutral';
    if (score > -0.5) return 'Sell';
    return 'Strong Sell';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${signal.symbol} Signal`}
      maxWidth="2xl"
      id={`signal-details-${signal?.id || 'default'}`}
    >
      <div className="space-y-6">
        {/* Signal timestamp */}
        <p className="text-sm text-neutral-400">
          {new Date(signal.time).toLocaleString()}
        </p>

        {/* Score section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Score</h3>
            <div className={`text-3xl font-bold ${getScoreColor(signal.score)}`}>
              {signal.score > 0 ? '+' : ''}{signal.score.toFixed(3)}
            </div>
            <div className={`text-sm ${getScoreColor(signal.score)}`}>
              {getScoreLabel(signal.score)}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Signal ID</h3>
            <div className="font-mono text-sm bg-neutral-800 p-2 rounded">
              {signal.id}
            </div>
          </div>
        </div>

        {/* Metadata section */}
        {signal.meta && Object.keys(signal.meta).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Metadata</h3>
            <div className="bg-neutral-800 rounded-lg p-4">
              <pre className="text-sm text-neutral-300 overflow-x-auto">
                {JSON.stringify(signal.meta, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* TODO: Add chart/sparkline visualization */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Price History</h3>
          <div className="bg-neutral-800 rounded-lg p-8 text-center">
            <p className="text-neutral-400">Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}