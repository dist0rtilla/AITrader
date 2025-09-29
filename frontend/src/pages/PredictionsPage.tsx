/**
 * PredictionsPage — Enhanced ML model predictions with forecasts, confidence intervals, and model comparison.
 * Follows glass morphism design patterns and CRITICAL CONTAINER GUARDRAILS.
 */

import { Activity, Brain, Filter, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import usePredictions from '../hooks/usePredictions';
import { Prediction } from '../types';

interface PredictionCardProps {
  prediction: Prediction;
}

function PredictionCard({ prediction }: PredictionCardProps) {
  const currentPrice = prediction.values[0];
  const predictedPrice = prediction.values[prediction.values.length - 1];
  const change = predictedPrice - currentPrice;
  const changePercent = (change / currentPrice) * 100;

  const confidenceColor = prediction.confidence && prediction.confidence >= 0.8 ? 'text-accent-emerald' :
    prediction.confidence && prediction.confidence >= 0.6 ? 'text-accent-amber' : 'text-status-warn';

  return (
    <div className="glass-card glass-hover-lift rounded-glass-card border border-glass-bright/20 flex flex-col overflow-hidden group">
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 glass-button rounded-glass-button">
              <TrendingUp className="w-4 h-4 text-accent-blue" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-glass-bright">{prediction.symbol}</h3>
              <p className="text-sm text-glass-muted">{prediction.model} • {prediction.horizon}h horizon</p>
            </div>
          </div>
          <Badge variant={changePercent >= 0 ? 'default' : 'destructive'} className="glass-button">
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-glass-muted">Current Price</span>
            <span className="text-lg font-mono text-glass-bright">${currentPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-glass-muted">Predicted Price</span>
            <span className={`text-lg font-mono font-bold ${changePercent >= 0 ? 'text-accent-emerald' : 'text-status-error'}`}>
              ${predictedPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-glass-muted">Confidence</span>
            <span className={`text-sm font-bold ${confidenceColor}`}>
              {prediction.confidence ? `${(prediction.confidence * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </div>

          {/* Mini forecast visualization */}
          <div className="pt-4 border-t border-glass-bright/10">
            <div className="flex items-end justify-between h-12 gap-1">
              {prediction.values.map((value, idx) => {
                const height = ((value - Math.min(...prediction.values)) /
                  (Math.max(...prediction.values) - Math.min(...prediction.values))) * 100;
                return (
                  <div
                    key={idx}
                    className="bg-gradient-to-t from-accent-blue/60 to-accent-blue/20 rounded-t-sm flex-1 min-w-0 group-hover:from-accent-blue/80 group-hover:to-accent-blue/40 transition-all duration-300"
                    style={{ height: `${Math.max(height, 10)}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-glass-muted mt-2">
              <span>Now</span>
              <span>+{prediction.horizon}h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  onFilterChange: (filter: any) => void;
  currentFilter: any;
}

function FilterPanel({ onFilterChange, currentFilter }: FilterPanelProps) {
  const models = ['All', 'N-BEATS', 'LSTM', 'Transformer'];

  return (
    <div className="glass-container rounded-glass p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 glass-button rounded-glass-button">
          <Filter className="w-4 h-4 text-accent-purple" />
        </div>
        <h3 className="text-lg font-semibold text-glass-bright">Filters</h3>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm text-glass-muted mb-2 block">Model Type</label>
          <div className="flex flex-wrap gap-2">
            {models.map(model => (
              <button
                key={model}
                onClick={() => onFilterChange({ ...currentFilter, model: model === 'All' ? undefined : model })}
                className={`px-3 py-1 rounded-glass-button text-sm transition-all duration-200 ${(model === 'All' && !currentFilter.model) || currentFilter.model === model
                    ? 'glass-button-active text-white'
                    : 'glass-button text-glass-muted hover:text-glass-bright'
                  }`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-glass-muted mb-2 block">Min Confidence</label>
          <select
            className="w-full glass-input rounded-glass-button"
            value={currentFilter.minConfidence || ''}
            onChange={(e) => onFilterChange({ ...currentFilter, minConfidence: e.target.value ? parseFloat(e.target.value) : undefined })}
          >
            <option value="">Any</option>
            <option value="0.9">90%+</option>
            <option value="0.8">80%+</option>
            <option value="0.7">70%+</option>
            <option value="0.6">60%+</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const [filter, setFilter] = useState<any>({});
  const { predictions, loading, error, refetch } = usePredictions({
    autoRefresh: true,
    filter
  });

  const filteredPredictions = (predictions || []).filter(pred => {
    if (filter.minConfidence && (!pred.confidence || pred.confidence < filter.minConfidence)) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">
      {/* Header */}
      <div className="glass-container rounded-glass p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 glass-button rounded-glass-button">
              <Brain className="w-6 h-6 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-glass-bright">ML Predictions</h1>
              <p className="text-glass-muted">Model forecasts with confidence intervals and comparison</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-card rounded-glass-card p-4 border border-glass-bright/20">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-accent-emerald" />
                <div>
                  <div className="text-sm text-glass-muted">Active Predictions</div>
                  <div className="text-2xl font-bold text-glass-bright">{filteredPredictions.length}</div>
                </div>
              </div>
            </div>

            <button
              onClick={refetch}
              className="glass-button glass-hover-lift rounded-glass-button px-4 py-2 text-sm font-medium text-glass-bright hover:text-white transition-all duration-200"
            >
              <Zap className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <FilterPanel onFilterChange={setFilter} currentFilter={filter} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="glass-container rounded-glass p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-glass-bright">Forecast Results</h2>
              {loading && (
                <div className="flex items-center gap-2 text-glass-muted">
                  <div className="w-4 h-4 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
                  Loading...
                </div>
              )}
              {error && (
                <div className="text-status-error text-sm">Error: {error}</div>
              )}
            </div>

            {/* Predictions Grid */}
            <div className="flex-1 min-h-0">
              {filteredPredictions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                  {filteredPredictions.map((prediction) => (
                    <PredictionCard key={prediction.id} prediction={prediction} />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-glass-card p-8 border border-glass-bright/20 text-center">
                  <Brain className="w-12 h-12 text-glass-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-glass-bright mb-2">No Predictions Available</h3>
                  <p className="text-glass-muted">
                    {loading ? 'Loading predictions...' : 'No predictions match your current filters.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}