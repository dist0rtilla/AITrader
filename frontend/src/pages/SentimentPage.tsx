/**
 * SentimentPage — Enhanced FinBERT sentiment analysis with visualization and source tracking.
 * Follows glass morphism design patterns and CRITICAL CONTAINER GUARDRAILS.
 */

import { Activity, BarChart3, Heart, MessageSquare, Newspaper, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import useSentiment from '../hooks/useSentiment';
import { SentimentData } from '../types';

interface SentimentCardProps {
  sentiment: SentimentData;
}

function SentimentCard({ sentiment }: SentimentCardProps) {
  const sentimentColor = sentiment.score > 0.3 ? 'text-accent-emerald' :
    sentiment.score < -0.3 ? 'text-status-error' : 'text-accent-amber';

  const sentimentBg = sentiment.score > 0.3 ? 'bg-accent-emerald/20' :
    sentiment.score < -0.3 ? 'bg-status-error/20' : 'bg-accent-amber/20';

  const sentimentIcon = sentiment.score > 0.3 ? TrendingUp :
    sentiment.score < -0.3 ? TrendingDown : BarChart3;

  const SentimentIcon = sentimentIcon;

  const sentimentLabel = sentiment.score > 0.3 ? 'Bullish' :
    sentiment.score < -0.3 ? 'Bearish' : 'Neutral';

  return (
    <div className="glass-card glass-hover-lift rounded-glass-card border border-glass-bright/20 flex flex-col overflow-hidden group">
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 glass-button rounded-glass-button ${sentimentBg}`}>
              <SentimentIcon className={`w-4 h-4 ${sentimentColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-glass-bright">{sentiment.symbol}</h3>
              <p className="text-sm text-glass-muted">{sentiment.window} window</p>
            </div>
          </div>

          <Badge variant={sentiment.score > 0 ? 'default' : 'destructive'} className="glass-button">
            {sentimentLabel}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Sentiment Score Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-glass-muted">Sentiment Score</span>
              <span className={`text-lg font-mono font-bold ${sentimentColor}`}>
                {sentiment.score >= 0 ? '+' : ''}{sentiment.score.toFixed(3)}
              </span>
            </div>

            {/* Score bar */}
            <div className="relative h-2 glass-input rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-status-error via-accent-amber to-accent-emerald opacity-20" />
              <div
                className={`absolute top-0 left-1/2 h-full w-1 ${sentimentBg} rounded-full transform transition-all duration-300`}
                style={{
                  transform: `translateX(${(sentiment.score * 50)}%) translateX(-50%)`,
                  backgroundColor: sentiment.score > 0.3 ? '#10B981' :
                    sentiment.score < -0.3 ? '#EF4444' : '#F59E0B'
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-glass-muted">
              <span>-1.0 (Very Bearish)</span>
              <span>0 (Neutral)</span>
              <span>+1.0 (Very Bullish)</span>
            </div>
          </div>

          {/* Sources */}
          {sentiment.sources && sentiment.sources.length > 0 && (
            <div className="pt-4 border-t border-glass-bright/10">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="w-4 h-4 text-glass-muted" />
                <span className="text-sm text-glass-muted">Sources ({sentiment.sources.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sentiment.sources.slice(0, 3).map((source, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs glass-button rounded-glass-button text-glass-muted"
                  >
                    {source}
                  </span>
                ))}
                {sentiment.sources.length > 3 && (
                  <span className="px-2 py-1 text-xs glass-button rounded-glass-button text-glass-muted">
                    +{sentiment.sources.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="pt-2 border-t border-glass-bright/10">
            <div className="flex items-center justify-between text-xs text-glass-muted">
              <span>Last Updated</span>
              <span>{new Date(sentiment.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SentimentSummaryProps {
  sentiments: SentimentData[];
}

function SentimentSummary({ sentiments }: SentimentSummaryProps) {
  const safeData = sentiments || [];
  const bullish = safeData.filter(s => s.score > 0.3).length;
  const bearish = safeData.filter(s => s.score < -0.3).length;
  const neutral = safeData.length - bullish - bearish;

  const avgSentiment = safeData.reduce((sum, s) => sum + s.score, 0) / (safeData.length || 1); return (
    <div className="glass-container rounded-glass p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 glass-button rounded-glass-button">
          <Activity className="w-5 h-5 text-accent-purple" />
        </div>
        <h3 className="text-lg font-semibold text-glass-bright">Market Overview</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card rounded-glass-card p-4 border border-glass-bright/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent-emerald" />
            <div>
              <div className="text-sm text-glass-muted">Bullish</div>
              <div className="text-2xl font-bold text-accent-emerald">{bullish}</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-glass-card p-4 border border-glass-bright/20">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-status-error" />
            <div>
              <div className="text-sm text-glass-muted">Bearish</div>
              <div className="text-2xl font-bold text-status-error">{bearish}</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-glass-card p-4 border border-glass-bright/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-accent-amber" />
            <div>
              <div className="text-sm text-glass-muted">Neutral</div>
              <div className="text-2xl font-bold text-accent-amber">{neutral}</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-glass-card p-4 border border-glass-bright/20">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-accent-blue" />
            <div>
              <div className="text-sm text-glass-muted">Avg Score</div>
              <div className={`text-2xl font-bold ${avgSentiment > 0 ? 'text-accent-emerald' : avgSentiment < 0 ? 'text-status-error' : 'text-accent-amber'}`}>
                {avgSentiment >= 0 ? '+' : ''}{avgSentiment.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall sentiment bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-glass-muted">Market Sentiment</span>
          <span className={`text-sm font-bold ${avgSentiment > 0.1 ? 'text-accent-emerald' : avgSentiment < -0.1 ? 'text-status-error' : 'text-accent-amber'}`}>
            {avgSentiment > 0.1 ? 'Bullish' : avgSentiment < -0.1 ? 'Bearish' : 'Neutral'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 h-3 rounded-glass overflow-hidden">
          <div className="bg-status-error/60" style={{ opacity: bearish / (safeData.length || 1) }} />
          <div className="bg-accent-amber/60" style={{ opacity: neutral / (safeData.length || 1) }} />
          <div className="bg-accent-emerald/60" style={{ opacity: bullish / (safeData.length || 1) }} />
        </div>
      </div>
    </div>
  );
}

export default function SentimentPage() {
  const [windowFilter, setWindowFilter] = useState('1h');
  const { sentiment, loading, error, refetch } = useSentiment({
    autoRefresh: true,
    filter: { window: windowFilter }
  });

  const timeWindows = ['1h', '4h', '1d', '1w'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">
      {/* Header */}
      <div className="glass-container rounded-glass p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 glass-button rounded-glass-button">
              <MessageSquare className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-glass-bright">FinBERT Sentiment Analysis</h1>
              <p className="text-glass-muted">Real-time market sentiment powered by FinBERT AI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Window Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-glass-muted">Window:</span>
              {timeWindows.map(window => (
                <button
                  key={window}
                  onClick={() => setWindowFilter(window)}
                  className={`px-3 py-1 rounded-glass-button text-sm transition-all duration-200 ${windowFilter === window
                      ? 'glass-button-active text-white'
                      : 'glass-button text-glass-muted hover:text-glass-bright'
                    }`}
                >
                  {window}
                </button>
              ))}
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
        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <SentimentSummary sentiments={sentiment} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="glass-container rounded-glass p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-glass-bright">Sentiment Analysis Results</h2>
              {loading && (
                <div className="flex items-center gap-2 text-glass-muted">
                  <div className="w-4 h-4 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
                  Loading...
                </div>
              )}
              {error && (
                <div className="text-status-error text-sm">Error: {error}</div>
              )}
            </div>

            {/* Sentiment Grid */}
            <div className="flex-1 min-h-0">
              {(sentiment || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                  {(sentiment || []).map((sentimentData, idx) => (
                    <SentimentCard key={`${sentimentData.symbol}-${idx}`} sentiment={sentimentData} />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-glass-card p-8 border border-glass-bright/20 text-center">
                  <MessageSquare className="w-12 h-12 text-glass-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-glass-bright mb-2">No Sentiment Data Available</h3>
                  <p className="text-glass-muted">
                    {loading ? 'Loading sentiment analysis...' : 'No sentiment data available for the selected time window.'}
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