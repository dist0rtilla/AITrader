/**
 * SignalsMonitor — combines SignalsTable with SignalDetailsDrawer for full signals functionality.
 * Props: { signals: Signal[], loading?: boolean, error?: string }
 * Notes: manages drawer state, handles signal selection, integrates with real-time updates.
 */

import { useState } from 'react';
import { Signal } from '../../types';
import SignalDetailsDrawer from './SignalDetailsDrawer';
import SignalsTable from './SignalsTable';

interface SignalsMonitorProps {
  signals: Signal[];
  loading?: boolean;
  error?: string;
}

export default function SignalsMonitor({ signals, loading, error }: SignalsMonitorProps) {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSignal(null);
  };

  return (
    <div className="space-y-4">
      <SignalsTable
        signals={signals}
        onRowClick={handleSignalClick}
        loading={loading}
        error={error}
      />

      <SignalDetailsDrawer
        signal={selectedSignal}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}