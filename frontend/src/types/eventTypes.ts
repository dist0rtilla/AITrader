/**
 * Event Types — comprehensive TypeScript interfaces for event system
 * 
 * Copilot: Defines event data structures for real-time activity tracking.
 * Features:
 * - Event categories and severity levels
 * - Metadata and source tracking
 * - Performance metrics and operational data
 * - Type-safe event handling
 * 
 * Usage: import { Event, EventSeverity, EventCategory } from './eventTypes';
 */

export enum EventSeverity {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export enum EventCategory {
    // System Events
    SYSTEM_START = 'system_start',
    SYSTEM_STOP = 'system_stop',
    SYSTEM_RESTART = 'system_restart',
    SYSTEM_ERROR = 'system_error',
    SYSTEM_HEALTH = 'system_health',

    // Trading Events
    SIGNAL_GENERATED = 'signal_generated',
    SIGNAL_EXECUTED = 'signal_executed',
    TRADE_OPENED = 'trade_opened',
    TRADE_CLOSED = 'trade_closed',
    POSITION_UPDATED = 'position_updated',

    // Market Data Events
    MARKET_DATA_RECEIVED = 'market_data_received',
    MARKET_DATA_ERROR = 'market_data_error',
    PRICE_ALERT = 'price_alert',
    VOLUME_SPIKE = 'volume_spike',
    VOLATILITY_CHANGE = 'volatility_change',

    // Pattern Engine Events
    PATTERN_DETECTED = 'pattern_detected',
    PATTERN_ANALYSIS = 'pattern_analysis',
    MODEL_PREDICTION = 'model_prediction',
    CONFIDENCE_UPDATE = 'confidence_update',

    // Strategy Engine Events
    STRATEGY_EXECUTION = 'strategy_execution',
    STRATEGY_UPDATE = 'strategy_update',
    RISK_ASSESSMENT = 'risk_assessment',
    PORTFOLIO_REBALANCE = 'portfolio_rebalance',

    // Sentiment Analysis Events
    SENTIMENT_UPDATE = 'sentiment_update',
    NEWS_ANALYSIS = 'news_analysis',
    SOCIAL_SENTIMENT = 'social_sentiment',

    // Database Events
    DATA_INGESTION = 'data_ingestion',
    BACKUP_COMPLETED = 'backup_completed',
    MIGRATION_STARTED = 'migration_started',
    INDEX_REBUILD = 'index_rebuild',

    // Performance Events
    PERFORMANCE_METRIC = 'performance_metric',
    RESOURCE_USAGE = 'resource_usage',
    LATENCY_ALERT = 'latency_alert',
    THROUGHPUT_UPDATE = 'throughput_update',

    // API Events
    API_REQUEST = 'api_request',
    API_ERROR = 'api_error',
    RATE_LIMIT = 'rate_limit',
    AUTHENTICATION = 'authentication',

    // General
    USER_ACTION = 'user_action',
    CONFIGURATION_CHANGE = 'configuration_change',
    MAINTENANCE = 'maintenance',
    DEBUG = 'debug'
}

export interface EventSource {
    component: string;
    service?: string;
    version?: string;
    instance?: string;
    host?: string;
}

export interface EventMetadata {
    // Trading-specific metadata
    symbol?: string;
    price?: number;
    volume?: number;
    signal_strength?: number;
    confidence?: number;

    // Performance metadata
    execution_time?: number;
    cpu_usage?: number;
    memory_usage?: number;
    latency?: number;
    throughput?: number;

    // System metadata
    error_code?: string;
    error_message?: string;
    stack_trace?: string;
    request_id?: string;
    user_id?: string;
    session_id?: string;

    // Custom metadata
    [key: string]: any;
}

export interface Event {
    id: string;
    timestamp: string; // ISO 8601 format
    category: EventCategory;
    severity: EventSeverity;
    title: string;
    message: string;
    source: EventSource;
    metadata?: EventMetadata;
    tags?: string[];
    correlation_id?: string;
    duration?: number; // in milliseconds
    resolved?: boolean;
    resolved_at?: string;
    resolved_by?: string;
}

export interface EventFilter {
    categories?: EventCategory[];
    severities?: EventSeverity[];
    sources?: string[];
    timeRange?: {
        start: string;
        end: string;
    };
    searchText?: string;
    showResolved?: boolean;
}

export interface EventStats {
    total: number;
    by_severity: Record<EventSeverity, number>;
    by_category: Record<EventCategory, number>;
    recent_count: number; // events in last hour
    error_rate: number; // percentage of error/critical events
}

// Event subscription configuration
export interface EventSubscription {
    id: string;
    filters: EventFilter;
    callback: (event: Event) => void;
    active: boolean;
}

// Real-time event feed configuration
export interface EventFeedConfig {
    maxEvents: number;
    autoScroll: boolean;
    showTimestamps: boolean;
    groupByComponent: boolean;
    refreshInterval: number; // in milliseconds
    enableSound: boolean;
    soundSettings: {
        [key in EventSeverity]?: {
            enabled: boolean;
            sound?: string;
        };
    };
}