/**
 * Sentiment hook — fetch and manage sentiment analysis data.
 * Inputs: optional filter params (symbol, window, sources) and refresh options.
 * Outputs: { sentiment: SentimentData[]; loading: boolean; error: string | null; hasMore: boolean; loadMore: () => void; refetch: () => void }
 * Behavior: supports filtering by time window and data sources, real-time updates.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSentiment, SentimentFilter, SentimentResponse } from '../api/sentimentClient';
import { SentimentData } from '../types';

export interface UseSentimentOptions {
  filter?: SentimentFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSentimentReturn {
  sentiment: SentimentData[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  updateFilter: (newFilter: SentimentFilter) => void;
}

export function useSentiment(options: UseSentimentOptions = {}): UseSentimentReturn {
  const { filter = {}, autoRefresh = false, refreshInterval = 45000 } = options;

  const [sentiment, setSentiment] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string>();
  const [currentFilter, setCurrentFilter] = useState<SentimentFilter>(filter);

  const fetchSentiment = useCallback(async (appendMode = false, customFilter?: SentimentFilter) => {
    try {
      if (!appendMode) {
        setLoading(true);
        setError(null);
      }

      const filterToUse = customFilter || currentFilter;
      const requestFilter: SentimentFilter = {
        ...filterToUse,
        cursor: appendMode ? nextCursor : undefined,
        limit: filterToUse.limit || 20,
      };

      const response: SentimentResponse = await getSentiment(requestFilter);

      if (appendMode) {
        setSentiment(prev => [...prev, ...response.sentiment]);
      } else {
        setSentiment(response.sentiment);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sentiment data';
      setError(errorMessage);
      console.error('Sentiment fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilter, nextCursor]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchSentiment(true);
  }, [hasMore, loading, fetchSentiment]);

  const refetch = useCallback(async () => {
    await fetchSentiment(false);
  }, [fetchSentiment]);

  const updateFilter = useCallback((newFilter: SentimentFilter) => {
    setCurrentFilter(newFilter);
    setNextCursor(undefined);
    fetchSentiment(false, newFilter);
  }, [fetchSentiment]);

  useEffect(() => {
    fetchSentiment();

    if (autoRefresh && refreshInterval) {
      const interval = setInterval(() => fetchSentiment(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSentiment, autoRefresh, refreshInterval]);

  return {
    sentiment,
    loading,
    error,
    hasMore,
    nextCursor,
    loadMore,
    refetch,
    updateFilter,
  };
}

export default useSentiment;