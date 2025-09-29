/**
 * SignalsPage — Comprehensive trading signals dashboard with filtering, statistics, and visualization.
 * Features: SignalsTable, SignalDetailsDrawer, FiltersBar, Statistics Cards, real-time updates.
 */

import {
  Activity,
  BarChart3,
  Bell,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  Star,
  Target,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import Modal from '../components/ui/Modal';
import useSignals from '../hooks/useSignals';
import useWebSocket from '../hooks/useWebSocket';
import { Signal, WebSocketEvent } from '../types';

export default function SignalsPage() {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [scoreMin, setScoreMin] = useState<string>('');
  const [scoreMax, setScoreMax] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { signals, loading, error, hasMore, loadMore, refetch, updateFilter } = useSignals({
    autoRefresh: true,
    refreshInterval: 30000,
    filter: { limit: 50 }
  });

  // Listen for real-time signal updates
  useWebSocket('/api/ws/monitor', {
    onEvent: (event: WebSocketEvent) => {
      if (event.type === 'signal') {
        // Add new signal to the list or refresh
        refetch();
      }
    }
  });

  const getScoreColor = (score: number) => {
    if (score > 0.5) return 'text-green-400';
    if (score < -0.5) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getScoreBadge = (score: number) => {
    if (score > 0.5) return 'bg-green-500/20 text-green-400';
    if (score < -0.5) return 'bg-red-500/20 text-red-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  // Ensure signals is always an array to prevent map errors
  const safeSignals = signals || [];

  // Calculate signal statistics
  const signalStats = useMemo(() => {
    if (safeSignals.length === 0) {
      return {
        totalSignals: 0,
        bullishSignals: 0,
        bearishSignals: 0,
        neutralSignals: 0,
        avgScore: 0,
        avgConfidence: 0,
        topPattern: 'N/A'
      };
    }

    const bullish = safeSignals.filter(s => s.score > 0.1);
    const bearish = safeSignals.filter(s => s.score < -0.1);
    const neutral = safeSignals.filter(s => s.score >= -0.1 && s.score <= 0.1);

    const avgScore = safeSignals.reduce((sum, s) => sum + s.score, 0) / safeSignals.length;

    const confidenceScores = safeSignals
      .map(s => s.meta?.confidence)
      .filter(c => c !== undefined) as number[];
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
      : 0;

    // Find most common pattern
    const patterns = safeSignals
      .map(s => s.meta?.pattern)
      .filter(p => p !== undefined) as string[];
    const patternCounts = patterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topPattern = Object.keys(patternCounts).reduce((a, b) =>
      patternCounts[a] > patternCounts[b] ? a : b, 'N/A'
    );

    return {
      totalSignals: safeSignals.length,
      bullishSignals: bullish.length,
      bearishSignals: bearish.length,
      neutralSignals: neutral.length,
      avgScore,
      avgConfidence,
      topPattern
    };
  }, [safeSignals]);

  // Apply client-side filtering
  const filteredSignals = useMemo(() => {
    let filtered = safeSignals;

    // Symbol filter
    if (symbolFilter.trim()) {
      filtered = filtered.filter(s =>
        s.symbol.toLowerCase().includes(symbolFilter.toLowerCase())
      );
    }

    // Score range filter
    if (scoreMin && !isNaN(parseFloat(scoreMin))) {
      filtered = filtered.filter(s => s.score >= parseFloat(scoreMin));
    }
    if (scoreMax && !isNaN(parseFloat(scoreMax))) {
      filtered = filtered.filter(s => s.score <= parseFloat(scoreMax));
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (timeFilter) {
        case '1h':
          cutoff.setHours(now.getHours() - 1);
          break;
        case '4h':
          cutoff.setHours(now.getHours() - 4);
          break;
        case '24h':
          cutoff.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
      }

      filtered = filtered.filter(s => new Date(s.time) >= cutoff);
    }

    return filtered;
  }, [safeSignals, symbolFilter, scoreMin, scoreMax, timeFilter]);

  // Handle filter updates
  const handleFilterChange = () => {
    const newFilter: any = { limit: 50 };

    if (symbolFilter.trim()) newFilter.symbol = symbolFilter;
    if (scoreMin && !isNaN(parseFloat(scoreMin))) newFilter.scoreMin = parseFloat(scoreMin);
    if (scoreMax && !isNaN(parseFloat(scoreMax))) newFilter.scoreMax = parseFloat(scoreMax);

    updateFilter(newFilter);
  };

  if (loading && safeSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading signals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error loading signals: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen">
      {/* Header */}
      <div className="glass-container rounded-glass p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 glass-card rounded-glass-button animate-float">
              <Activity className="w-8 h-8 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-glass-bright mb-2">Trading Signals</h1>
              <p className="text-glass-muted">Real-time trading signals with AI-powered pattern recognition</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-primary"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              onClick={refetch}
              variant="outline"
              size="sm"
              className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-teal"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="glass-card glass-hover-lift rounded-glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Total Signals</div>
              <BarChart3 className="w-5 h-5 text-accent-primary" />
            </div>
            <div className="text-3xl font-bold text-glass-bright mb-2">{signalStats.totalSignals}</div>
            <div className="text-sm text-glass-muted">
              {signalStats.bullishSignals} bullish, {signalStats.bearishSignals} bearish
            </div>
          </div>

          <div className="glass-card glass-hover-lift rounded-glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Average Score</div>
              <Target className="w-5 h-5 text-accent-teal" />
            </div>
            <div className={`text-3xl font-bold mb-2 ${signalStats.avgScore > 0 ? 'text-status-ok' : 'text-status-error'}`}>
              {signalStats.avgScore > 0 ? '+' : ''}{signalStats.avgScore.toFixed(3)}
            </div>
            <div className="text-sm text-glass-muted">Signal strength</div>
          </div>

          <div className="glass-card glass-hover-lift rounded-glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Confidence</div>
              <Activity className="w-5 h-5 text-accent-amber" />
            </div>
            <div className="text-3xl font-bold text-glass-bright mb-2">
              {(signalStats.avgConfidence * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-glass-muted">Average confidence</div>
          </div>

          <div className="glass-card glass-hover-lift rounded-glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Top Pattern</div>
              <TrendingUp className="w-5 h-5 text-accent-violet" />
            </div>
            <div className="text-lg font-bold text-glass-bright mb-2 capitalize">
              {signalStats.topPattern.replace(/_/g, ' ')}
            </div>
            <div className="text-sm text-glass-muted">Most frequent pattern</div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-8 glass-card rounded-glass-card p-6">
            <h3 className="text-lg font-semibold text-glass-bright mb-4">Signal Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-glass-muted mb-2">Symbol</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-glass-muted" />
                  <input
                    type="text"
                    placeholder="e.g. AAPL, TSLA"
                    value={symbolFilter}
                    onChange={(e) => setSymbolFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 glass-card rounded-glass-button border border-glass bg-glass-dark text-glass-bright placeholder-glass-muted focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-glass-muted mb-2">Min Score</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="-1.0"
                  value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value)}
                  className="w-full px-4 py-2 glass-card rounded-glass-button border border-glass bg-glass-dark text-glass-bright placeholder-glass-muted focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-glass-muted mb-2">Max Score</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="1.0"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                  className="w-full px-4 py-2 glass-card rounded-glass-button border border-glass bg-glass-dark text-glass-bright placeholder-glass-muted focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-glass-muted mb-2">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-2 glass-card rounded-glass-button border border-glass bg-glass-dark text-glass-bright focus:outline-none focus:border-accent-primary"
                >
                  <option value="all">All Time</option>
                  <option value="1h">Last Hour</option>
                  <option value="4h">Last 4 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setSymbolFilter('');
                  setScoreMin('');
                  setScoreMax('');
                  setTimeFilter('all');
                  updateFilter({ limit: 50 });
                }}
                variant="outline"
                className="glass-button border-glass text-glass-muted hover:text-glass-bright"
              >
                Clear Filters
              </Button>
              <Button
                onClick={handleFilterChange}
                className="glass-button bg-accent-primary text-white hover:bg-accent-primary/90"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Signals Table */}
      <div className="glass-container rounded-glass p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-glass-bright">
            Recent Signals
            <span className="text-lg font-normal text-glass-muted ml-2">
              ({filteredSignals.length} of {safeSignals.length})
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-amber"
            >
              <Star className="w-4 h-4 mr-2" />
              Bookmark All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-teal"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-glass-card border-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-glass-surface border-b border-glass">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-glass-muted uppercase tracking-wide">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-glass-muted uppercase tracking-wide">Symbol</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-glass-muted uppercase tracking-wide">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-glass-muted uppercase tracking-wide">Pattern</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-glass-muted uppercase tracking-wide">Confidence</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-glass-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filteredSignals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-glass-muted">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No signals found</p>
                        <p className="text-sm">Try adjusting your filters or wait for new signals to arrive</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSignals.map((signal) => (
                    <tr key={signal.id} className="hover:bg-glass-surface/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-glass-bright">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-glass-muted" />
                          {new Date(signal.time).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="glass-badge border-accent-primary text-accent-primary">
                          {signal.symbol}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {signal.score > 0 ? (
                            <TrendingUp className="w-4 h-4 text-status-ok" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-status-error" />
                          )}
                          <span className={`font-mono text-sm font-medium ${getScoreColor(signal.score)}`}>
                            {signal.score > 0 ? '+' : ''}{signal.score.toFixed(3)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-glass-bright capitalize">
                        {signal.meta?.pattern?.replace(/_/g, ' ') || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`${getScoreBadge(signal.score)} border-0`}>
                          {((signal.meta?.confidence || 0) * 100).toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSignal(signal)}
                            className="glass-button text-glass-muted hover:text-accent-primary"
                          >
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="glass-button text-glass-muted hover:text-accent-amber"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="glass-button text-glass-muted hover:text-accent-teal"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={loadMore}
                variant="outline"
                className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-primary"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Load More Signals'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Signal Details Modal */}
      {selectedSignal && (
        <Modal
          isOpen={!!selectedSignal}
          onClose={() => setSelectedSignal(null)}
          title="Signal Details"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-glass-muted text-sm">Symbol</span>
                  <div className="text-xl font-bold text-glass-bright mt-1">{selectedSignal.symbol}</div>
                </div>
                <div>
                  <span className="text-glass-muted text-sm">Score</span>
                  <div className={`text-xl font-mono font-bold mt-1 ${getScoreColor(selectedSignal.score)}`}>
                    {selectedSignal.score > 0 ? '+' : ''}{selectedSignal.score.toFixed(3)}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-glass-muted text-sm">Time</span>
                  <div className="text-lg font-medium text-glass-bright mt-1">
                    {new Date(selectedSignal.time).toLocaleString()}
                  </div>
                </div>
                {selectedSignal.meta?.confidence && (
                  <div>
                    <span className="text-glass-muted text-sm">Confidence</span>
                    <div className="text-lg font-medium text-glass-bright mt-1">
                      {(selectedSignal.meta.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedSignal.meta && (
              <div>
                <span className="text-glass-muted text-sm">Metadata</span>
                <div className="glass-card rounded-glass-card mt-2 p-4 bg-glass-dark font-mono text-sm overflow-auto max-h-64">
                  <pre className="text-glass">{JSON.stringify(selectedSignal.meta, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}