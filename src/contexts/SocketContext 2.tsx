'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types for the socket context
interface SocketContextType {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
}

// Create the context with a default value
const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  lastMessage: null,
  sendMessage: () => { },
  connect: () => { },
  disconnect: () => { },
});

// Mock WebSocket for demonstration
class MockWebSocket {
  private callbacks: { [key: string]: ((event: any) => void)[] } = {};
  private mockConnected = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private url: string) { }

  addEventListener(event: string, callback: (event: any) => void) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  removeEventListener(event: string, callback: (event: any) => void) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  send(data: string) {
    console.log('Mock WebSocket sending:', data);
    // Mock response after a short delay
    setTimeout(() => {
      this.triggerEvent('message', {
        data: JSON.stringify({
          type: 'response',
          message: 'Message received',
          originalData: data,
        }),
      });
    }, 300);
  }

  connect() {
    if (!this.mockConnected) {
      this.mockConnected = true;
      // Trigger open event
      setTimeout(() => {
        this.triggerEvent('open', {});

        // Start sending mock price updates
        this.intervalId = setInterval(() => {
          const price = 60000 + Math.random() * 2000;
          this.triggerEvent('message', {
            data: JSON.stringify({
              type: 'price_update',
              symbol: 'BTC/USDT',
              price: price.toFixed(2),
              timestamp: Date.now(),
            }),
          });
        }, 5000);
      }, 500);
    }
  }

  close() {
    if (this.mockConnected) {
      this.mockConnected = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.triggerEvent('close', {});
    }
  }

  private triggerEvent(event: string, data: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }
}

// Provider component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<MockWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socket) return;

    // In a real app, use actual WebSocket
    // const newSocket = new WebSocket('wss://your-api.com/ws');
    const newSocket = new MockWebSocket('wss://mock-api.com/ws');

    setSocket(newSocket);

    // Setup event listeners
    const onOpen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    const onMessage = (event: any) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    const onClose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    const onError = (error: any) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    newSocket.addEventListener('open', onOpen);
    newSocket.addEventListener('message', onMessage);
    newSocket.addEventListener('close', onClose);
    newSocket.addEventListener('error', onError);

    // Connect the mock socket
    newSocket.connect();

    // Cleanup function
    return () => {
      newSocket.removeEventListener('open', onOpen);
      newSocket.removeEventListener('message', onMessage);
      newSocket.removeEventListener('close', onClose);
      newSocket.removeEventListener('error', onError);
      newSocket.close();
    };
  }, [socket]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  }, [socket, isConnected]);

  // Connect on mount (optional, depending on your use case)
  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
      disconnect();
    };
  }, [connect, disconnect]);

  // Context value
  const value = {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

// Custom hook to use the socket context
export const useSocket = () => useContext(SocketContext); 