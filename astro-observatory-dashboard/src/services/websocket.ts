import { useEffect, useRef, useCallback } from 'react';

type WebSocketMessage = {
  type: string;
  data: any;
  timestamp: string;
};

type WebSocketHookProps = {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
};

export const useWebSocket = ({ 
  url, 
  onMessage, 
  onError, 
  onOpen, 
  onClose,
  reconnectAttempts = 5,
  reconnectInterval = 3000 
}: WebSocketHookProps) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      socketRef.current = new WebSocket(url);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectCountRef.current = 0;
        onOpen?.();
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      socketRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        onClose?.();

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Attempting to reconnect... (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      onError?.(error as Event);
    }
  }, [url, onMessage, onError, onOpen, onClose, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Message not sent:', message);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    sendMessage,
    disconnect,
    reconnect: connect,
    isConnected: socketRef.current?.readyState === WebSocket.OPEN
  };
};

// Simple WebSocket service for NINA real-time updates
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  
  constructor(private url: string) {}

  connect(onMessage?: (data: any) => void, onError?: (error: Event) => void) {
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('NINA WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('NINA WebSocket error:', error);
        onError?.(error);
      };
      
      this.socket.onclose = () => {
        console.log('NINA WebSocket connection closed');
        this.attemptReconnect(onMessage, onError);
      };
      
    } catch (error) {
      console.error('Error connecting to NINA WebSocket:', error);
      onError?.(error as Event);
    }
  }

  private attemptReconnect(onMessage?: (data: any) => void, onError?: (error: Event) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect to NINA WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(onMessage, onError);
      }, this.reconnectInterval);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }
}