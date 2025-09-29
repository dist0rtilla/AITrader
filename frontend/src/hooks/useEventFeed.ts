/**
 * useEventFeed — WebSocket hook for real-time event streaming
 * 
 * Copilot: Manages WebSocket connection for live event feed with automatic reconnection.
 * Features:
 * - Real-time event streaming from WebSocket
 * - Automatic reconnection with exponential backoff
 * - Event filtering and transformation
 * - Connection state management
 * - Error handling and logging
 * 
 * Usage: const { events, isConnected, error } = useEventFeed();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Event, EventCategory, EventSeverity } from '../types/eventTypes';

interface EventFeedOptions {
    maxEvents?: number;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    transformEvent?: (rawEvent: any) => Event;
}

interface EventFeedState {
    events: Event[];
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    lastEventTime: string | null;
    connectionAttempts: number;
}

export default function useEventFeed(options: EventFeedOptions = {}) {
    const {
        maxEvents = 100,
        autoReconnect = true,
        reconnectDelay = 1000,
        maxReconnectAttempts = 5,
        transformEvent
    } = options;

    const [state, setState] = useState<EventFeedState>({
        events: [],
        isConnected: false,
        isConnecting: false,
        error: null,
        lastEventTime: null,
        connectionAttempts: 0
    });

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // Transform raw websocket data to Event format
    const defaultTransformEvent = useCallback((rawEvent: any): Event => {
        // Handle different event formats from the WebSocket
        if (rawEvent.type === 'event' && rawEvent.data) {
            const data = rawEvent.data;

            return {
                id: data.id || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: data.timestamp || new Date().toISOString(),
                category: mapToEventCategory(data.category || data.type || 'system'),
                severity: mapToEventSeverity(data.severity || data.level || 'info'),
                title: data.title || data.message || 'WebSocket Event',
                message: data.message || data.description || JSON.stringify(data),
                source: {
                    component: data.source?.component || data.component || 'WebSocket',
                    service: data.source?.service || data.service,
                    version: data.source?.version || data.version,
                    instance: data.source?.instance || data.instance
                },
                metadata: data.metadata || data.data || {},
                tags: data.tags || []
            };
        }

        // Fallback for unknown formats
        return {
            id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            category: EventCategory.DEBUG,
            severity: EventSeverity.INFO,
            title: 'WebSocket Message',
            message: typeof rawEvent === 'string' ? rawEvent : JSON.stringify(rawEvent),
            source: {
                component: 'WebSocket'
            },
            metadata: typeof rawEvent === 'object' ? rawEvent : {}
        };
    }, []);

    // Map string values to enum types
    const mapToEventCategory = (category: string): EventCategory => {
        const categoryMap: Record<string, EventCategory> = {
            'system': EventCategory.SYSTEM_HEALTH,
            'trade': EventCategory.TRADE_OPENED,
            'signal': EventCategory.SIGNAL_GENERATED,
            'market': EventCategory.MARKET_DATA_RECEIVED,
            'pattern': EventCategory.PATTERN_DETECTED,
            'strategy': EventCategory.STRATEGY_EXECUTION,
            'sentiment': EventCategory.SENTIMENT_UPDATE,
            'database': EventCategory.DATA_INGESTION,
            'api': EventCategory.API_REQUEST,
            'error': EventCategory.SYSTEM_ERROR
        };

        return categoryMap[category.toLowerCase()] || EventCategory.DEBUG;
    };

    const mapToEventSeverity = (severity: string): EventSeverity => {
        const severityMap: Record<string, EventSeverity> = {
            'info': EventSeverity.INFO,
            'information': EventSeverity.INFO,
            'success': EventSeverity.SUCCESS,
            'ok': EventSeverity.SUCCESS,
            'warn': EventSeverity.WARNING,
            'warning': EventSeverity.WARNING,
            'error': EventSeverity.ERROR,
            'err': EventSeverity.ERROR,
            'critical': EventSeverity.CRITICAL,
            'fatal': EventSeverity.CRITICAL
        };

        return severityMap[severity.toLowerCase()] || EventSeverity.INFO;
    };

    // Add new event to the feed
    const addEvent = useCallback((event: Event) => {
        if (!mountedRef.current) return;

        setState(prev => ({
            ...prev,
            events: [event, ...prev.events].slice(0, maxEvents),
            lastEventTime: event.timestamp
        }));
    }, [maxEvents]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        setState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Use the same WebSocket endpoint as the monitor
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/ws/monitor`;

            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                if (!mountedRef.current) return;

                console.log('EventFeed WebSocket connected');
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    isConnecting: false,
                    error: null,
                    connectionAttempts: 0
                }));
            };

            wsRef.current.onmessage = (event) => {
                if (!mountedRef.current) return;

                try {
                    const rawData = JSON.parse(event.data);
                    const transformedEvent = transformEvent ? transformEvent(rawData) : defaultTransformEvent(rawData);
                    addEvent(transformedEvent);
                } catch (error) {
                    console.warn('Failed to parse WebSocket event:', error);
                    // Create a fallback event for unparseable data
                    addEvent(defaultTransformEvent({
                        type: 'parse_error',
                        message: 'Failed to parse WebSocket message',
                        data: event.data
                    }));
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('EventFeed WebSocket error:', error);
                if (!mountedRef.current) return;

                setState(prev => ({
                    ...prev,
                    error: 'WebSocket connection error',
                    isConnecting: false
                }));
            };

            wsRef.current.onclose = (event) => {
                if (!mountedRef.current) return;

                console.log('EventFeed WebSocket closed:', event.code, event.reason);
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    isConnecting: false,
                    error: event.code !== 1000 ? `Connection closed: ${event.reason || event.code}` : null
                }));

                // Auto-reconnect if enabled
                if (autoReconnect && state.connectionAttempts < maxReconnectAttempts) {
                    const delay = reconnectDelay * Math.pow(2, state.connectionAttempts); // Exponential backoff
                    console.log(`Reconnecting EventFeed WebSocket in ${delay}ms...`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (!mountedRef.current) return;
                        setState(prev => ({ ...prev, connectionAttempts: prev.connectionAttempts + 1 }));
                        connect();
                    }, delay);
                }
            };

        } catch (error) {
            console.error('Failed to create EventFeed WebSocket:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to create WebSocket connection',
                isConnecting: false
            }));
        }
    }, [autoReconnect, maxReconnectAttempts, reconnectDelay, transformEvent, defaultTransformEvent, addEvent, state.connectionAttempts]);

    // Disconnect WebSocket
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }

        setState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            error: null
        }));
    }, []);

    // Clear all events
    const clearEvents = useCallback(() => {
        setState(prev => ({ ...prev, events: [] }));
    }, []);

    // Initialize connection on mount
    useEffect(() => {
        connect();

        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    return {
        events: state.events,
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        error: state.error,
        lastEventTime: state.lastEventTime,
        connectionAttempts: state.connectionAttempts,
        connect,
        disconnect,
        clearEvents
    };
}