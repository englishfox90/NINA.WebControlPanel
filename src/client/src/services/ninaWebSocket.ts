import { useEffect, useRef, useCallback, useState } from 'react';
import { getWsUrl } from '../config/api';

export interface NINAWebSocketEvent {
  Type: string;
  Timestamp: string;
  Source: string;
  Data?: any;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

type EventCallback = (event: NINAWebSocketEvent) => void;
type EventCallbackMap = {
  [eventType: string]: EventCallback[];
};

export class NINAWebSocketManager {
  private static instance: NINAWebSocketManager;
  private socket: WebSocket | null = null;
  private callbacks: EventCallbackMap = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;
  private url: string;

  private constructor(url: string = getWsUrl('ws/nina')) {
    this.url = url;
  }

  public static getInstance(url?: string): NINAWebSocketManager {
    if (!NINAWebSocketManager.instance) {
      NINAWebSocketManager.instance = new NINAWebSocketManager(url);
    }
    return NINAWebSocketManager.instance;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('NINA WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            // Handle NINA events specifically
            if (message.type === 'nina-event' && message.data) {
              this.handleNINAEvent(message.data);
            }
          } catch (error) {
            console.error('Error parsing NINA WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('NINA WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log('NINA WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.attemptReconnect();
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleNINAEvent(event: NINAWebSocketEvent) {
    console.log('NINA Event received:', event.Type, event);
    
    // Trigger callbacks for this specific event type
    const typeCallbacks = this.callbacks[event.Type] || [];
    typeCallbacks.forEach(callback => callback(event));

    // Trigger callbacks for 'all' events
    const allCallbacks = this.callbacks['*'] || [];
    allCallbacks.forEach(callback => callback(event));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting NINA WebSocket reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectInterval);
    } else {
      console.error('Max NINA WebSocket reconnection attempts reached');
    }
  }

  public subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks[eventType] = this.callbacks[eventType].filter(cb => cb !== callback);
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.callbacks = {};
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }
}

// React hook for using NINA WebSocket
export const useNINAWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const wsManagerRef = useRef<NINAWebSocketManager | null>(null);

  useEffect(() => {
    wsManagerRef.current = NINAWebSocketManager.getInstance();
    
    wsManagerRef.current.connect()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    return () => {
      // Don't disconnect here as other components might be using it
      // wsManagerRef.current?.disconnect();
    };
  }, []);

  const subscribe = useCallback((eventType: string, callback: EventCallback) => {
    return wsManagerRef.current?.subscribe(eventType, callback) || (() => {});
  }, []);

  return {
    isConnected,
    subscribe,
    wsManager: wsManagerRef.current
  };
};

// Hook for subscribing to specific NINA events
export const useNINAEvent = (eventType: string, callback: EventCallback) => {
  const { subscribe } = useNINAWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, subscribe]);
};

export default NINAWebSocketManager;
