import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  content: any;
  [key: string]: any;
}

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  status: WebSocketStatus;
  sendMessage: (message: WebSocketMessage) => boolean;
  closeConnection: () => void;
  reconnect: () => void;
}

/**
 * A hook for interacting with WebSockets
 */
export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set default options
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onStatusChange,
    onError
  } = options;
  
  // Update the status and call the onStatusChange callback
  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }, [onStatusChange]);
  
  // Handle incoming message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Dispatch a custom event that can be listened to by other components
      const customEvent = new CustomEvent('websocket-message', { 
        detail: data 
      });
      window.dispatchEvent(customEvent);
      
      // Call the onMessage callback if provided
      if (onMessage) {
        onMessage(data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [onMessage]);
  
  // Handle WebSocket closure
  const handleClose = useCallback((event: CloseEvent) => {
    const wasConnected = status === 'open';
    updateStatus('closed');
    
    console.log(`WebSocket closed with code ${event.code}${event.reason ? `: ${event.reason}` : ''}`);
    
    // If autoReconnect is enabled and the connection was previously open or establishing
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts && wasConnected) {
      console.log(`Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
      
      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Set a timeout for reconnection
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        initWebSocket();
      }, reconnectInterval);
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval, status, updateStatus]);
  
  // Handle WebSocket error
  const handleError = useCallback((event: Event) => {
    console.error('WebSocket error:', event);
    updateStatus('error');
    
    if (onError) {
      onError(event);
    }
  }, [onError, updateStatus]);
  
  // Initialize the WebSocket connection
  const initWebSocket = useCallback(() => {
    try {
      updateStatus('connecting');
      
      // Close existing connection if any
      if (websocketRef.current && websocketRef.current.readyState < 2) {
        websocketRef.current.close();
      }
      
      // Create a new WebSocket connection
      const ws = new WebSocket(url);
      
      // Set up event handlers
      ws.onopen = () => {
        updateStatus('open');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        console.log('WebSocket connection established');
      };
      
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      
      // Store the WebSocket instance
      websocketRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      updateStatus('error');
      
      if (onError) {
        onError(error as Event);
      }
    }
  }, [url, handleClose, handleError, handleMessage, updateStatus, onError]);
  
  // Send a message through the WebSocket
  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      try {
        websocketRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, []);
  
  // Close the WebSocket connection
  const closeConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.onclose = null; // Prevent the handleClose callback from triggering
      websocketRef.current.close();
      websocketRef.current = null;
      updateStatus('closed');
    }
  }, [updateStatus]);
  
  // Reconnect to the WebSocket server
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0; // Reset reconnect attempts
    initWebSocket();
  }, [initWebSocket]);
  
  // Initialize the WebSocket connection when the component mounts
  // or when the URL changes
  useEffect(() => {
    if (url) {
      initWebSocket();
    }
    
    return () => {
      closeConnection();
    };
  }, [url, initWebSocket, closeConnection]);
  
  return {
    status,
    sendMessage,
    closeConnection,
    reconnect
  };
};