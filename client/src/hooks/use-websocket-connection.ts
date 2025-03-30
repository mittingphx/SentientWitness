import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  clientId: string | null;
  sendMessage: (message: WebSocketMessage) => boolean;
  lastMessage: WebSocketMessage | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Event) => void;
}

/**
 * A hook for managing WebSocket connections
 * @param options Configuration options for the WebSocket
 */
export const useWebSocketConnection = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onStatusChange,
    onError
  } = options;

  // Determine the WebSocket URL based on current protocol and host
  const wsUrl = useRef<string>(
    options.url || 
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}://${window.location.host}/ws`
  );

  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Refs to maintain connection state across renders
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update the connection status and notify via callback if provided
   */
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }, [onStatusChange]);

  /**
   * Establish a WebSocket connection
   */
  const connect = useCallback(() => {
    // Don't connect if already connecting or connected
    if (['connecting', 'connected', 'reconnecting'].includes(status)) {
      return;
    }

    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Update status
    updateStatus('connecting');

    // Create new WebSocket connection
    try {
      const socket = new WebSocket(wsUrl.current);
      socketRef.current = socket;

      // Setup event handlers
      socket.onopen = () => {
        console.log('WebSocket connection established');
        updateStatus('connected');
        setReconnectAttempt(0);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle client ID message specially
          if (message.type === 'connected' && message.clientId) {
            setClientId(message.clientId);
          }
          
          // Update last message and notify via callback
          setLastMessage(message);
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        socketRef.current = null;
        
        if (event.code === 1000) {
          // Normal closure
          updateStatus('disconnected');
        } else if (reconnectAttempt < maxReconnectAttempts) {
          // Attempt to reconnect
          updateStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, reconnectDelay);
        } else {
          // Max reconnect attempts reached
          updateStatus('error');
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) {
          onError(error);
        }
        updateStatus('error');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      updateStatus('error');
    }
  }, [
    status,
    reconnectAttempt,
    maxReconnectAttempts,
    reconnectDelay,
    onMessage,
    onError,
    updateStatus
  ]);

  /**
   * Disconnect the WebSocket connection
   */
  const disconnect = useCallback(() => {
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close the connection if it exists
    if (socketRef.current) {
      socketRef.current.close(1000, 'Normal closure');
      socketRef.current = null;
    }

    // Update status
    updateStatus('disconnected');
    setReconnectAttempt(0);
  }, [updateStatus]);

  /**
   * Attempt to reconnect to the WebSocket
   */
  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempt(0);
    connect();
  }, [disconnect, connect]);

  /**
   * Send a message through the WebSocket connection
   */
  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [autoConnect, connect]);

  return {
    status,
    clientId,
    sendMessage,
    lastMessage,
    connect,
    disconnect,
    reconnect
  };
};