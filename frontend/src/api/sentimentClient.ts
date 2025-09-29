/**
 * Sentiment client — fetch sentiment scores and analysis data.
 * Inputs: symbol, time window, optional sources filter.
 * Outputs: SentimentData[] with scores and metadata.
 * Errors: throws APIError on failures.
 */

import { SentimentData } from '../types';
import { getJSON } from './client';

export interface SentimentFilter {
  symbol?: string;
  window?: string; // '1h', '1d', '1w'
  sources?: string[];
  since?: string; // ISO timestamp
  limit?: number;
  cursor?: string;
}

export interface SentimentResponse {
  sentiment: SentimentData[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export async function getSentiment(filter: SentimentFilter = {}): Promise<SentimentResponse> {
  const params = new URLSearchParams();

  if (filter.symbol) params.set('symbol', filter.symbol);
  if (filter.window) params.set('window', filter.window);
  if (filter.sources) params.set('sources', filter.sources.join(','));
  if (filter.since) params.set('since', filter.since);
  if (filter.limit) params.set('limit', filter.limit.toString());
  if (filter.cursor) params.set('cursor', filter.cursor);

  const queryString = params.toString();
  const path = queryString ? `/api/sentiment?${queryString}` : '/api/sentiment';

  try {
    return await getJSON<SentimentResponse>(path);
  } catch (error) {
    // Fallback to fixture in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Sentiment API failed, using fixture data:', error);
      const fixture = await import('../fixtures/sentiment.json');
      return {
        sentiment: fixture.default as SentimentData[],
        hasMore: false,
        total: fixture.default.length,
      };
    }
    throw error;
  }
}

export async function getSentimentBySymbol(symbol: string): Promise<SentimentData[]> {
  return getJSON<SentimentData[]>(`/api/sentiment/${symbol}`);
}