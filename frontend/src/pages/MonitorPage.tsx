/**
 * MonitorPage — Main dashboard displaying overall system status with real-time updates
 */

import { Activity, Heart, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import MLForecastsTable from '../components/forecasts/MLForecastsTable';
import EventTicker from '../components/monitor/EventTicker';
import SystemsMonitor from '../components/monitor/SystemsMonitor';
import SignalsMonitor from '../components/signals/SignalsMonitor';
import { Badge } from '../components/ui/badge';
import usePredictions from '../hooks/usePredictions';
import useSignals from '../hooks/useSignals';
import useSystemStatus from '../hooks/useSystemStatus';
import useWebSocket from '../hooks/useWebSocket';
import { WebSocketEvent } from '../types';

export default function MonitorPage() {
  const { status: systemStatus, loading: statusLoading, error: statusError, refetch: refreshStatus } = useSystemStatus();
  const { isConnected, lastEvent } = useWebSocket('/api/ws/monitor', {
    onEvent: (event: WebSocketEvent) => {
      console.log('WebSocket event:', event);
      // Handle real-time events here
    },
    autoConnect: true
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // Get recent signals and predictions for dashboard summary
  const { signals, loading: signalsLoading, error: signalsError } = useSignals({
    filter: { limit: 10 },
    autoRefresh: true
  });
  const { predictions } = usePredictions({
    filter: { limit: 3 },
    autoRefresh: false
  });

  // Track recent WebSocket events for activity feed
  useEffect(() => {
    if (lastEvent) {
      setRecentEvents(prev => [
        { ...lastEvent, timestamp: new Date().toISOString() },
        ...prev.slice(0, 9) // Keep last 10 events
      ]);
    }
  }, [lastEvent]);

  // components is already an array in the correct format
  const componentsArray = systemStatus?.components || [];

  if (statusLoading && !systemStatus) {
    return <div className="flex items-center justify-center h-64">Loading system status...</div>;
  }

  return (
    <div className="space-y-10 min-h-screen">
      {/* Enhanced header with glass styling */}
      <div className="glass-container rounded-glass p-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 glass-card rounded-glass-button animate-float">
            <Activity className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-glass-bright mb-2">System Monitor</h1>
            <p className="text-glass-muted">Real-time monitoring of all trading components</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className={`px-4 py-2 font-medium border-glass backdrop-blur-card ${isConnected
                ? 'bg-status-ok-bg border-status-ok-border text-status-ok'
                : 'bg-status-error-bg border-status-error-border text-status-error'
              }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-status-ok animate-pulse-glow' : 'bg-status-error animate-pulse-glow'
              }`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Enhanced stats dashboard with glass morphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="glass-card glass-hover-lift rounded-glass-card p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Components</div>
            <div className="p-2 glass-button rounded-glass-button group-hover:shadow-glow-sm transition-all duration-300">
              <Heart className="w-4 h-4 text-accent-teal" />
            </div>
          </div>
          <div className="text-3xl font-bold text-glass-bright mb-2 group-hover:text-white transition-colors duration-300">
            {componentsArray.length}
          </div>
          <div className="text-sm text-glass-muted flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-status-ok" />
            {componentsArray.filter(c => c.status === 'ok').length} healthy systems
          </div>
        </div>

        <div className="glass-card glass-hover-lift rounded-glass-card p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Recent Signals</div>
            <div className="p-2 glass-button rounded-glass-button group-hover:shadow-glow-sm transition-all duration-300">
              <Zap className="w-4 h-4 text-accent-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold text-glass-bright mb-2 group-hover:text-white transition-colors duration-300">
            {signals?.length || 0}
          </div>
          <div className="text-sm text-glass-muted flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-primary" />
            {signals?.filter(s => s.score > 0.3).length || 0} bullish patterns
          </div>
        </div>

        <div className="glass-card glass-hover-lift rounded-glass-card p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Active Predictions</div>
            <div className="p-2 glass-button rounded-glass-button group-hover:shadow-glow-sm transition-all duration-300">
              <TrendingUp className="w-4 h-4 text-accent-emerald" />
            </div>
          </div>
          <div className="text-3xl font-bold text-glass-bright mb-2 group-hover:text-white transition-colors duration-300">
            {predictions?.length || 0}
          </div>
          <div className="text-sm text-glass-muted flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-emerald" />
            ML forecasts running
          </div>
        </div>

        <div className="glass-card glass-hover-lift rounded-glass-card p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Live Events</div>
            <div className="p-2 glass-button rounded-glass-button group-hover:shadow-glow-sm transition-all duration-300">
              <Activity className="w-4 h-4 text-accent-amber" />
            </div>
          </div>
          <div className="text-3xl font-bold text-glass-bright mb-2 group-hover:text-white transition-colors duration-300">
            {recentEvents.length}
          </div>
          <div className="text-sm text-glass-muted flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-amber" />
            last 10 minutes
          </div>
        </div>
      </div>

      {/* Enhanced main content grid with glass layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column - Systems Monitor with glass container */}
        <div className="xl:col-span-8 space-y-8">
          {/* System Components */}
          <div className="glass-container rounded-glass p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 glass-card rounded-glass-button">
                <Heart className="w-5 h-5 text-accent-teal" />
              </div>
              <h2 className="text-2xl font-bold text-glass-bright">System Components</h2>
            </div>
            <SystemsMonitor
              components={componentsArray}
              loading={statusLoading}
              error={statusError || undefined}
              onRestart={async (id: string) => {
                try {
                  const res = await fetch(`/api/components/${id}/restart`, { method: 'POST' });
                  if (!res.ok) throw new Error('Restart failed');
                  // Refresh status after restart
                  refreshStatus();
                } catch (e) {
                  console.error('restart error', e);
                  throw e;
                }
              }}
            />
          </div>

          {/* Live Systems Activity */}
          <div className="glass-container rounded-glass p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 glass-card rounded-glass-button">
                <Activity className="w-5 h-5 text-accent-amber" />
              </div>
              <h2 className="text-2xl font-bold text-glass-bright">Live Systems Activity</h2>
            </div>
            <div className="flex-1 min-h-0">
              <EventTicker
                className="h-full"
                maxEvents={100}
                autoScroll={true}
                showFilters={true}
                compactMode={false}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Signals Monitor and Activity with glass styling */}
        <div className="xl:col-span-4 space-y-8">
          {/* Signals Monitor with glass container and height constraint */}
          <div className="glass-container rounded-glass p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 glass-card rounded-glass-button">
                <Zap className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-2xl font-bold text-glass-bright">Trading Signals</h2>
            </div>
            <div className="flex-1 min-h-0">
              <SignalsMonitor
                signals={signals || []}
                loading={signalsLoading}
                error={signalsError || undefined}
              />
            </div>
          </div>

          {/* ML Forecasts */}
          <div className="glass-container rounded-glass p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 glass-card rounded-glass-button">
                <TrendingUp className="w-5 h-5 text-accent-emerald" />
              </div>
              <h2 className="text-2xl font-bold text-glass-bright">ML Forecasts</h2>
            </div>
            <div className="flex-1 min-h-0">
              <MLForecastsTable
                forecasts={[]}
                loading={false}
                error={undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Debug Info with glass styling */}
      {(!isConnected || statusError) && (
        <div className="glass-container rounded-glass p-8 border-l-4 border-status-warn">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 glass-card rounded-glass-button">
              <Activity className="w-5 h-5 text-status-warn" />
            </div>
            <h3 className="text-xl font-bold text-status-warn">Debug Information</h3>
          </div>
          <div className="glass-card rounded-glass-card p-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-glass-muted">Connection State:</span>
              <Badge variant="outline" className={`border-glass ${isConnected ? 'bg-status-ok-bg border-status-ok-border text-status-ok' : 'bg-status-error-bg border-status-error-border text-status-error'
                }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-glass-muted">Last Update:</span>
              <span className="text-glass font-mono text-sm">{systemStatus?.timestamp}</span>
            </div>
            {statusError && (
              <div className="flex justify-between items-start">
                <span className="text-glass-muted">Error:</span>
                <span className="text-status-error font-mono text-sm max-w-xs text-right">{statusError}</span>
              </div>
            )}
          </div>
          <button
            onClick={refreshStatus}
            className="mt-6 glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-glass-bright hover:shadow-glass-card px-4 py-2 rounded-glass-button transition-all duration-300"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}
