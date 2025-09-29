/**
 * Predictions hook — fetch and manage model predictions and forecasts.
 * Inputs: optional filter params (symbol, model, horizon) and refresh options.
 * Outputs: { predictions: Prediction[]; loading: boolean; error: string | null; hasMore: boolean; loadMore: () => void; refetch: () => void }
 * Behavior: supports cursor-based pagination, model filtering, real-time updates.
 */

import { useCallback, useEffect, useState } from 'react';
import { getPredictions, PredictionsFilter, PredictionsResponse } from '../api/predictionsClient';
import { Prediction } from '../types';

export interface UsePredictionsOptions {
  filter?: PredictionsFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePredictionsReturn {
  predictions: Prediction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  updateFilter: (newFilter: PredictionsFilter) => void;
}

export function usePredictions(options: UsePredictionsOptions = {}): UsePredictionsReturn {
  const { filter = {}, autoRefresh = false, refreshInterval = 60000 } = options;

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string>();
  const [currentFilter, setCurrentFilter] = useState<PredictionsFilter>(filter);

  const fetchPredictions = useCallback(async (appendMode = false, customFilter?: PredictionsFilter) => {
    try {
      if (!appendMode) {
        setLoading(true);
        setError(null);
      }

      const filterToUse = customFilter || currentFilter;
      const requestFilter: PredictionsFilter = {
        ...filterToUse,
        cursor: appendMode ? nextCursor : undefined,
        limit: filterToUse.limit || 20,
      };

      const response: PredictionsResponse = await getPredictions(requestFilter);

      if (appendMode) {
        setPredictions(prev => [...prev, ...response.predictions]);
      } else {
        setPredictions(response.predictions);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch predictions';
      setError(errorMessage);
      console.error('Predictions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilter, nextCursor]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchPredictions(true);
  }, [hasMore, loading, fetchPredictions]);

  const refetch = useCallback(async () => {
    await fetchPredictions(false);
  }, [fetchPredictions]);

  const updateFilter = useCallback((newFilter: PredictionsFilter) => {
    setCurrentFilter(newFilter);
    setNextCursor(undefined);
    fetchPredictions(false, newFilter);
  }, [fetchPredictions]);

  useEffect(() => {
    fetchPredictions();

    if (autoRefresh && refreshInterval) {
      const interval = setInterval(() => fetchPredictions(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPredictions, autoRefresh, refreshInterval]);

  return {
    predictions,
    loading,
    error,
    hasMore,
    nextCursor,
    loadMore,
    refetch,
    updateFilter,
  };
}

export default usePredictions;