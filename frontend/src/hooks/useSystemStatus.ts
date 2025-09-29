/**
 * System status hook — fetch system snapshot + fallback to fixtures in dev.
 * Inputs: optional refresh interval.
 * Outputs: { status: SystemStatus | null; loading: boolean; error: string | null; refetch: () => void }
 * Behavior: fetches on mount, handles errors gracefully, provides manual refetch.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSystemStatus } from '../api/healthClient';
import { SystemStatus } from '../types';

export interface UseSystemStatusReturn {
  status: SystemStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSystemStatus(refreshInterval?: number): UseSystemStatusReturn {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemStatus();
      setStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system status';
      setError(errorMessage);
      console.error('System status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    if (refreshInterval) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, refreshInterval]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
  };
}

export default useSystemStatus;
