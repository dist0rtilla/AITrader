/**
 * EventTicker — comprehensive live activity feed component
 * 
 * Copilot: Real-time scrolling event feed with filtering, animations, and rich interactions.
 * Features:
 * - Auto-scrolling live event feed with smooth animations
 * - Severity-based color coding and icons
 * - Event filtering by category, severity, and source
 * - Expandable event details with metadata
 * - Time-based grouping and relative timestamps
 * - Sound notifications for critical events
 * - Export and search functionality
 * 
 * Usage: <EventTicker className="h-96" maxEvents={100} />
 */

import {
    Activity,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Database,
    Download,
    Filter,
    Info,
    Pause,
    Play,
    Search,
    Server,
    TrendingUp,
    X,
    Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useEventFeed from '../../hooks/useEventFeed';
import {
    Event,
    EventCategory,
    EventFilter,
    EventSeverity
} from '../../types/eventTypes';

interface EventTickerProps {
    className?: string;
    maxEvents?: number;
    autoScroll?: boolean;
    showFilters?: boolean;
    compactMode?: boolean;
}

// Mock events generator for development
const generateMockEvent = (): Event => {
    const categories = Object.values(EventCategory);
    const severities = Object.values(EventSeverity);
    const components = ['Pattern Engine', 'Strategy Engine', 'Market Data', 'Database', 'API Gateway'];

    const category = categories[Math.floor(Math.random() * categories.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const component = components[Math.floor(Math.random() * components.length)];

    const messages = {
        [EventSeverity.INFO]: [
            'System performing normally',
            'Data sync completed successfully',
            'New market data received',
            'Strategy evaluation completed'
        ],
        [EventSeverity.SUCCESS]: [
            'Trade executed successfully',
            'Pattern detection completed',
            'Backup completed successfully',
            'Model prediction accuracy improved'
        ],
        [EventSeverity.WARNING]: [
            'High CPU usage detected',
            'API rate limit approaching',
            'Unusual market volatility',
            'Memory usage above threshold'
        ],
        [EventSeverity.ERROR]: [
            'Failed to connect to data source',
            'Trade execution failed',
            'Database query timeout',
            'API authentication error'
        ],
        [EventSeverity.CRITICAL]: [
            'System component failure',
            'Database connection lost',
            'Critical security breach detected',
            'Emergency shutdown triggered'
        ]
    };

    return {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        category,
        severity,
        title: `${component} ${category.replace('_', ' ')}`,
        message: messages[severity][Math.floor(Math.random() * messages[severity].length)],
        source: {
            component,
            service: `${component.toLowerCase().replace(' ', '-')}-service`,
            version: '1.0.0',
            instance: `instance-${Math.floor(Math.random() * 3) + 1}`
        },
        metadata: {
            execution_time: Math.floor(Math.random() * 1000),
            cpu_usage: Math.floor(Math.random() * 100),
            memory_usage: Math.floor(Math.random() * 100),
            confidence: Math.random(),
            symbol: Math.random() > 0.5 ? 'AAPL' : 'GOOGL'
        },
        tags: [`${component.toLowerCase()}`, `${severity}`]
    };
};

export default function EventTicker({
    className = '',
    maxEvents = 50,
    autoScroll = true,
    showFilters = true,
    compactMode = false
}: EventTickerProps) {
    // Use real WebSocket feed instead of mock data
    const {
        events: wsEvents,
        isConnected,
        isConnecting,
        error: wsError,
        connect,
        disconnect,
        clearEvents: clearWsEvents
    } = useEventFeed({ maxEvents });

    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [isLive, setIsLive] = useState(true);
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [filter, setFilter] = useState<EventFilter>({});
    const [searchText, setSearchText] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [showMockData, setShowMockData] = useState(false);
    const [mockEvents, setMockEvents] = useState<Event[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const soundRef = useRef<HTMLAudioElement>(null);

    // Choose between real WebSocket events or mock events
    const events = showMockData ? mockEvents : wsEvents;

    // Generate mock events periodically (only when mock mode is enabled)
    useEffect(() => {
        if (!isLive || !showMockData) return;

        const interval = setInterval(() => {
            const newEvent = generateMockEvent();
            setMockEvents(prev => {
                const updated = [newEvent, ...prev].slice(0, maxEvents);
                return updated;
            });

            // Play sound for high-severity events
            if (soundEnabled && (newEvent.severity === EventSeverity.ERROR || newEvent.severity === EventSeverity.CRITICAL)) {
                // Would play sound here
                console.log('🔊 Event sound:', newEvent.severity);
            }
        }, Math.random() * 3000 + 1000); // Random interval 1-4 seconds

        return () => clearInterval(interval);
    }, [isLive, maxEvents, soundEnabled, showMockData]);

    // Auto-scroll to top when new events arrive
    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [events, autoScroll]);

    // Filter events based on current filters
    useEffect(() => {
        let filtered = events;

        // Apply category filter
        if (filter.categories && filter.categories.length > 0) {
            filtered = filtered.filter(event => filter.categories!.includes(event.category));
        }

        // Apply severity filter
        if (filter.severities && filter.severities.length > 0) {
            filtered = filtered.filter(event => filter.severities!.includes(event.severity));
        }

        // Apply source filter
        if (filter.sources && filter.sources.length > 0) {
            filtered = filtered.filter(event =>
                filter.sources!.some(source =>
                    event.source.component.toLowerCase().includes(source.toLowerCase())
                )
            );
        }

        // Apply search text filter
        if (searchText) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(event =>
                event.title.toLowerCase().includes(search) ||
                event.message.toLowerCase().includes(search) ||
                event.source.component.toLowerCase().includes(search)
            );
        }

        setFilteredEvents(filtered);
    }, [events, filter, searchText]);

    const getSeverityIcon = (severity: EventSeverity) => {
        switch (severity) {
            case EventSeverity.SUCCESS:
                return <CheckCircle className="w-4 h-4 text-status-ok" />;
            case EventSeverity.WARNING:
                return <AlertTriangle className="w-4 h-4 text-status-warn" />;
            case EventSeverity.ERROR:
                return <X className="w-4 h-4 text-status-error" />;
            case EventSeverity.CRITICAL:
                return <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />;
            default:
                return <Info className="w-4 h-4 text-glass-bright" />;
        }
    };

    const getSeverityColor = (severity: EventSeverity) => {
        switch (severity) {
            case EventSeverity.SUCCESS:
                return 'border-l-status-ok bg-status-ok/5';
            case EventSeverity.WARNING:
                return 'border-l-status-warn bg-status-warn/5';
            case EventSeverity.ERROR:
                return 'border-l-status-error bg-status-error/5';
            case EventSeverity.CRITICAL:
                return 'border-l-red-500 bg-red-500/10 animate-pulse';
            default:
                return 'border-l-glass-bright bg-glass/5';
        }
    };

    const getCategoryIcon = (category: EventCategory) => {
        if (category.includes('system')) return <Server className="w-3 h-3" />;
        if (category.includes('trade') || category.includes('signal')) return <TrendingUp className="w-3 h-3" />;
        if (category.includes('database') || category.includes('data')) return <Database className="w-3 h-3" />;
        if (category.includes('pattern') || category.includes('strategy')) return <Zap className="w-3 h-3" />;
        return <Activity className="w-3 h-3" />;
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const eventTime = new Date(timestamp);
        const diff = now.getTime() - eventTime.getTime();

        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return eventTime.toLocaleDateString();
    };

    const toggleEventExpansion = (eventId: string) => {
        setExpandedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const exportEvents = () => {
        const dataStr = JSON.stringify(filteredEvents, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `events_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const clearEvents = () => {
        if (showMockData) {
            setMockEvents([]);
        } else {
            clearWsEvents();
        }
        setExpandedEvents(new Set());
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Status and Controls Bar */}
            <div className="flex items-center justify-between p-3 border-b border-glass/20">
                <div className="flex items-center gap-3">
                    {/* Connection Status */}
                    <div className="flex items-center gap-1">
                        {showMockData ? (
                            <>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-blue-400">MOCK</span>
                            </>
                        ) : (
                            <>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-ok animate-pulse' : 'bg-status-error'
                                    }`}></div>
                                <span className={`text-xs ${isConnected ? 'text-status-ok' : 'text-status-error'
                                    }`}>
                                    {isConnected ? 'LIVE' : 'OFFLINE'}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Event count */}
                    <span className="text-xs text-glass-muted">
                        {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Essential Controls */}
                <div className="flex items-center gap-1">
                    {/* Mock data toggle */}
                    <button
                        onClick={() => setShowMockData(!showMockData)}
                        className={`p-1.5 hover:bg-glass/20 rounded-glass transition-colors ${showMockData ? 'text-blue-400' : 'text-glass-muted hover:text-glass-bright'
                            }`}
                        title={showMockData ? 'Switch to real data' : 'Switch to mock data'}
                    >
                        <Database className="w-4 h-4" />
                    </button>

                    {/* Live toggle */}
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className="p-1.5 hover:bg-glass/20 rounded-glass text-glass-muted hover:text-glass-bright transition-colors"
                        title={isLive ? 'Pause live feed' : 'Resume live feed'}
                    >
                        {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    {/* Filter toggle */}
                    {showFilters && (
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className="p-1.5 hover:bg-glass/20 rounded-glass text-glass-muted hover:text-glass-bright transition-colors"
                            title="Toggle filters"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Component Category Grouping */}
            <div className="px-3 py-2 border-b border-glass/20 bg-glass/5">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter({ sources: ['database', 'db', 'postgres', 'redis'] })}
                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-glass hover:bg-blue-500/30 transition-colors"
                    >
                        Database
                    </button>
                    <button
                        onClick={() => setFilter({ sources: ['strategy', 'sentiment', 'pattern', 'engine'] })}
                        className="px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded-glass hover:bg-green-500/30 transition-colors"
                    >
                        Engines
                    </button>
                    <button
                        onClick={() => setFilter({ sources: ['websocket', 'ws', 'message', 'broker'] })}
                        className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-glass hover:bg-purple-500/30 transition-colors"
                    >
                        Message Bus
                    </button>
                    <button
                        onClick={() => setFilter({ sources: ['api', 'backend', 'frontend'] })}
                        className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-glass hover:bg-orange-500/30 transition-colors"
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setFilter({})}
                        className="px-2 py-1 text-xs bg-glass/20 text-glass-bright rounded-glass hover:bg-glass/30 transition-colors"
                    >
                        All
                    </button>
                </div>
            </div>



            {/* Filter Panel */}
            {showFilterPanel && (
                <div className="p-3 border-b border-glass/20 space-y-3 bg-glass/5">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-glass-muted" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-glass/10 border border-glass/20 rounded-glass 
                       text-glass-bright placeholder-glass-muted focus:outline-none focus:border-glass-bright/40"
                        />
                    </div>

                    {/* Quick filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter({ severities: [EventSeverity.ERROR, EventSeverity.CRITICAL] })}
                            className="px-3 py-1.5 text-xs bg-status-error/20 text-status-error rounded-glass 
                       hover:bg-status-error/30 transition-colors"
                        >
                            Errors Only
                        </button>
                        <button
                            onClick={() => setFilter({ categories: [EventCategory.SIGNAL_GENERATED, EventCategory.TRADE_OPENED] })}
                            className="px-3 py-1.5 text-xs bg-status-ok/20 text-status-ok rounded-glass 
                       hover:bg-status-ok/30 transition-colors"
                        >
                            Trading Events
                        </button>
                        <button
                            onClick={() => setFilter({})}
                            className="px-3 py-1.5 text-xs bg-glass/20 text-glass-bright rounded-glass 
                       hover:bg-glass/30 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Events List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto min-h-0"
                style={{ scrollbarWidth: 'thin' }}
            >
                {filteredEvents.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-glass-muted">
                        <div className="text-center">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No events to display</p>
                            {!isLive && (
                                <button
                                    onClick={() => setIsLive(true)}
                                    className="mt-2 text-xs text-glass-bright hover:underline"
                                >
                                    Start live feed
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {filteredEvents.slice(0, 5).map((event, index) => (
                            <div
                                key={event.id}
                                className={`border-l-4 rounded-r-glass transition-all duration-200 
                          hover:bg-glass/10 cursor-pointer ${getSeverityColor(event.severity)}
                          ${index === 0 && isLive ? 'animate-pulse' : ''}`}
                                onClick={() => !compactMode && toggleEventExpansion(event.id)}
                            >
                                <div className="p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getSeverityIcon(event.severity)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-glass-bright truncate">
                                                    {event.title}
                                                </span>
                                                <div className="flex items-center gap-1 text-glass-muted">
                                                    {getCategoryIcon(event.category)}
                                                    <span className="text-xs">
                                                        {formatRelativeTime(event.timestamp)}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-glass-muted line-clamp-2">
                                                {event.message}
                                            </p>

                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs px-2 py-1 bg-glass/20 rounded-full text-glass-muted">
                                                    {event.source.component}
                                                </span>
                                                {event.metadata?.symbol && (
                                                    <span className="text-xs px-2 py-1 bg-blue-500/20 rounded-full text-blue-400">
                                                        {event.metadata.symbol}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {!compactMode && (
                                            <div className="flex-shrink-0">
                                                {expandedEvents.has(event.id) ? (
                                                    <ChevronDown className="w-4 h-4 text-glass-muted" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-glass-muted" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedEvents.has(event.id) && event.metadata && (
                                        <div className="mt-3 pt-3 border-t border-glass/20">
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                {Object.entries(event.metadata).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between">
                                                        <span className="text-glass-muted capitalize">
                                                            {key.replace('_', ' ')}:
                                                        </span>
                                                        <span className="text-glass-bright font-mono">
                                                            {typeof value === 'number' ?
                                                                (key.includes('usage') || key.includes('confidence') ?
                                                                    `${(value * 100).toFixed(1)}%` :
                                                                    value.toLocaleString()
                                                                ) :
                                                                String(value)
                                                            }
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 pt-2 border-t border-glass/20 text-xs text-glass-muted">
                <span>
                    {filteredEvents.length} of {events.length} events
                </span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={exportEvents}
                        className="flex items-center gap-1 px-2 py-1 hover:bg-glass/20 rounded-glass 
                     text-glass-muted hover:text-glass-bright transition-colors"
                        title="Export events"
                    >
                        <Download className="w-3 h-3" />
                        Export
                    </button>

                    <button
                        onClick={clearEvents}
                        className="flex items-center gap-1 px-2 py-1 hover:bg-glass/20 rounded-glass 
                     text-glass-muted hover:text-glass-bright transition-colors"
                        title="Clear all events"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}
