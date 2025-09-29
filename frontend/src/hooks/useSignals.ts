/**
 * Signals hook — fetch and manage trading signals with filtering and pagination.
 * Inputs: optional filter params and refresh options.
 * Outputs: { signals: Signal[]; loading: boolean; error: string | null; hasMore: boolean; loadMore: () => void; refetch: () => void }
 * Behavior: supports cursor-based pagination, real-time updates via WebSocket.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSignals, SignalsFilter, SignalsResponse } from '../api/signalsClient';
import { Signal } from '../types';

export interface UseSignalsOptions {
  filter?: SignalsFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSignalsReturn {
  signals: Signal[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  updateFilter: (newFilter: SignalsFilter) => void;
}

export function useSignals(options: UseSignalsOptions = {}): UseSignalsReturn {
  const { filter = {}, autoRefresh = false, refreshInterval = 30000 } = options;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string>();
  const [currentFilter, setCurrentFilter] = useState<SignalsFilter>(filter);

  const fetchSignals = useCallback(async (appendMode = false, customFilter?: SignalsFilter) => {
    try {
      if (!appendMode) {
        setLoading(true);
        setError(null);
      }

      const filterToUse = customFilter || currentFilter;
      const requestFilter: SignalsFilter = {
        ...filterToUse,
        cursor: appendMode ? nextCursor : undefined,
        limit: filterToUse.limit || 20,
      };

      const response: SignalsResponse = await getSignals(requestFilter);

      if (appendMode) {
        setSignals(prev => [...prev, ...response.signals]);
      } else {
        setSignals(response.signals);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch signals';
      setError(errorMessage);
      console.error('Signals fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilter, nextCursor]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchSignals(true);
  }, [hasMore, loading, fetchSignals]);

  const refetch = useCallback(async () => {
    await fetchSignals(false);
  }, [fetchSignals]);

  const updateFilter = useCallback((newFilter: SignalsFilter) => {
    setCurrentFilter(newFilter);
    setNextCursor(undefined);
    fetchSignals(false, newFilter);
  }, [fetchSignals]);

  useEffect(() => {
    fetchSignals();

    if (autoRefresh && refreshInterval) {
      const interval = setInterval(() => fetchSignals(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSignals, autoRefresh, refreshInterval]);

  return {
    signals,
    loading,
    error,
    hasMore,
    nextCursor,
    loadMore,
    refetch,
    updateFilter,
  };
}

export default useSignals;