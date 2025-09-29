/**
 * SystemsMonitor — grid of ComponentCard element      <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4\">
        {components.map((component) => (
          <ComponentCard
            key={component.name}
            name={component.name}
            meta={component}
            onRestart={onRestart}
          />
        ))} system health.
 * Props: { components: ComponentMetrics[], onRestart?: (id: string) => Promise<void> }
 * Notes: responsive grid layout, uses ComponentCard for individual component display.
 */

import { ComponentInfo } from '../../types';
import ComponentCard from './ComponentCard';

interface SystemsMonitorProps {
  components: ComponentInfo[];
  onRestart?: (id: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export default function SystemsMonitor({ components, onRestart, loading, error }: SystemsMonitorProps) {
  // Placeholder data when no real components are available
  const placeholderComponents: ComponentInfo[] = [
    {
      id: 'frontend-api',
      name: 'Frontend API',
      status: 'ok',
      details: 'All endpoints responding normally'
    },
    {
      id: 'pattern-engine',
      name: 'Pattern Engine',
      status: 'ok',
      details: 'Processing market patterns'
    },
    {
      id: 'sentiment-engine',
      name: 'Sentiment Analysis',
      status: 'ok',
      details: 'Analyzing news sentiment'
    },
    {
      id: 'strategy-engine',
      name: 'Strategy Engine',
      status: 'ok',
      details: 'Executing trading strategies'
    },
    {
      id: 'market-data',
      name: 'Market Data Feed',
      status: 'ok',
      details: 'Real-time data streaming'
    },
    {
      id: 'database',
      name: 'Database',
      status: 'ok',
      details: 'All connections healthy'
    }
  ];

  // Use placeholder data when no real components
  const displayComponents = components.length > 0 ? components : placeholderComponents;
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-glass-card p-6 animate-pulse">
              <div className="h-5 bg-glass-light rounded-glass-button mb-3"></div>
              <div className="h-3 bg-glass-light rounded-glass-button w-2/3 mb-4"></div>
              <div className="h-8 bg-glass-light rounded-glass-button w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-glass-card p-6 border-l-4 border-status-error">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-status-error animate-pulse-glow"></div>
            <p className="text-status-error font-medium">Error loading components: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayComponents.map((component) => (
          <ComponentCard
            key={component.id}
            name={component.name}
            meta={component}
            onRestart={onRestart}
          />
        ))}
      </div>

      {components.length === 0 && (
        <div className="glass-card rounded-glass-card p-4 border border-accent-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse-glow"></div>
            <p className="text-glass-muted text-sm">
              Showing demo system components • Connect to backend for live monitoring
            </p>
          </div>
        </div>
      )}
    </div>
  );
}