import { useState, useEffect, useCallback, useRef } from 'react';

type MessageHandler = (message: any) => void;
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: MessageHandler;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  lastMessage: any;
  error: Event | null;
}

/**
 * Hook for managing WebSocket connections
 * @param sessionIdParam - Session ID for the WebSocket connection path
 * @param options - Configuration options
 */
export function useWebSocketConnection(
  sessionIdParam: string | undefined,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const sessionId = sessionIdParam || '';
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<Event | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isReconnectingRef = useRef(false);

  // Cleanup function for WebSocket connection
  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Create WebSocket connection
  const connect = useCallback(() => {
    if (!sessionId) return;
    
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    cleanupWebSocket();
    setStatus('connecting');

    try {
      // Build WebSocket URL with correct protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        isReconnectingRef.current = false;
        
        // Send an initial message to identify this connection
        ws.send(JSON.stringify({
          type: 'identify',
          sessionId
        }));
        
        if (onOpen) onOpen();
      };

      ws.onclose = (event) => {
        if (event.wasClean) {
          setStatus('disconnected');
        } else {
          setStatus('error');
          
          // Attempt to reconnect if not manually disconnected
          if (!isReconnectingRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
            isReconnectingRef.current = true;
            reconnectAttemptsRef.current++;
            
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connect();
            }, reconnectInterval);
          }
        }
        
        if (onClose) onClose();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        setStatus('error');
        setError(event);
        if (onError) onError(event);
      };
    } catch (err) {
      setStatus('error');
      console.error('WebSocket connection error:', err);
    }
  }, [sessionId, cleanupWebSocket, onOpen, onClose, onMessage, onError, maxReconnectAttempts, reconnectInterval]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(messageToSend);
      return true;
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
      return false;
    }
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    isReconnectingRef.current = false;
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    cleanupWebSocket();
    setStatus('disconnected');
  }, [cleanupWebSocket, maxReconnectAttempts]);

  // Auto-connect on mount or when sessionId changes
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      cleanupWebSocket();
    };
  }, [sessionId, autoConnect, connect, cleanupWebSocket]);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    error
  };
}