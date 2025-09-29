/**
 * WebSocket hook with typed events, reconnect/backoff, and lastEvent ref.
 * Inputs: url (string), options { onEvent?: (ev: WebSocketEvent) => void, autoConnect?: boolean }
 * Outputs: { isConnected: boolean; lastEvent?: WebSocketEvent; send: (ev: any) => void; close: () => void }
 * Behavior: automatically JSON.parse incoming messages and route to onEvent. Provides internal queue for outgoing messages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketEvent } from '../types';

export interface UseWebSocketOptions {
  onEvent?: (event: WebSocketEvent) => void;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastEvent?: WebSocketEvent;
  send: (data: any) => void;
  close: () => void;
  reconnect: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { onEvent, autoConnect = true, maxReconnectAttempts = 10 } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent>();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<any[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          ws.send(JSON.stringify(message));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          setLastEvent(data);
          onEvent?.(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            500 * Math.pow(2, reconnectAttemptsRef.current) + Math.random() * 1000,
            30000 // Cap at 30s to avoid rate-limiting
          );

          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onEvent, maxReconnectAttempts]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      // Queue message for when connection is established
      messageQueueRef.current.push(data);
    }
  }, []);

  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect, autoConnect]);

  return {
    isConnected,
    lastEvent,
    send,
    close,
    reconnect: connect,
  };
}

export default useWebSocket;
