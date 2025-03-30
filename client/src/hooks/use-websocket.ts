import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

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

interface UseWebSocketReturn {
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  lastMessage: any;
  error: Event | null;
}

export const useWebSocket = (
  sessionId?: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
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
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Build WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      setStatus('connecting');
      
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Clear any reconnect timer
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        
        // Join session if sessionId is provided
        if (sessionId) {
          ws.send(JSON.stringify({
            type: 'join',
            sessionId,
            userId: uuidv4(),
            displayName: 'Anonymous'
          }));
        }
        
        if (onOpen) onOpen();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        setStatus('disconnected');
        
        // Attempt to reconnect if it wasn't a clean close
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          
          // Set up reconnection timer
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
        
        if (onClose) onClose();
      };

      ws.onerror = (evt) => {
        setStatus('error');
        setError(evt);
        if (onError) onError(evt);
      };
    } catch (err) {
      setStatus('error');
      console.error('WebSocket connection error:', err);
    }
  }, [
    getWebSocketUrl, 
    sessionId, 
    onMessage, 
    onOpen, 
    onClose, 
    onError, 
    maxReconnectAttempts, 
    reconnectInterval
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear any reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Leave session if in one
      if (sessionId) {
        wsRef.current.send(JSON.stringify({
          type: 'leave'
        }));
      }
      
      wsRef.current.close();
      wsRef.current = null;
      setStatus('disconnected');
    }
  }, [sessionId]);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message: any): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    error
  };
};
