/**
 * Predictions client — fetch model forecasts and prediction data.
 * Inputs: symbol, model name, time horizon, optional pagination.
 * Outputs: Prediction[] with forecast values and metadata.
 * Errors: throws APIError on failures.
 */

import { Prediction } from '../types';
import { getJSON } from './client';

export interface PredictionsFilter {
  symbol?: string;
  model?: string;
  since?: string; // ISO timestamp
  horizon?: number;
  limit?: number;
  cursor?: string;
}

export interface PredictionsResponse {
  predictions: Prediction[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export async function getPredictions(filter: PredictionsFilter = {}): Promise<PredictionsResponse> {
  const params = new URLSearchParams();

  if (filter.symbol) params.set('symbol', filter.symbol);
  if (filter.model) params.set('model', filter.model);
  if (filter.since) params.set('since', filter.since);
  if (filter.horizon) params.set('horizon', filter.horizon.toString());
  if (filter.limit) params.set('limit', filter.limit.toString());
  if (filter.cursor) params.set('cursor', filter.cursor);

  const queryString = params.toString();
  const path = queryString ? `/api/predictions?${queryString}` : '/api/predictions';

  try {
    return await getJSON<PredictionsResponse>(path);
  } catch (error) {
    // Fallback to fixture in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Predictions API failed, using fixture data:', error);
      const fixture = await import('../fixtures/predictions.json');
      return {
        predictions: fixture.default as Prediction[],
        hasMore: false,
        total: fixture.default.length,
      };
    }
    throw error;
  }
}

export async function getPredictionById(id: string): Promise<Prediction> {
  return getJSON<Prediction>(`/api/predictions/${id}`);
}