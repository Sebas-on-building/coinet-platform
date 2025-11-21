import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface WebSocketContextValue {
  send: (msg: any) => void;
  subscribe: (cb: (msg: any) => void) => () => void;
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const subscribers = useRef(new Set<(msg: any) => void>());

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    const connect = () => {
      ws = new WebSocket('wss://your-realtime-endpoint');
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        subscribers.current.forEach(cb => cb(msg));
      };
    };
    connect();
    return () => {
      ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const send = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const subscribe = (cb: (msg: any) => void) => {
    subscribers.current.add(cb);
    return () => subscribers.current.delete(cb);
  };

  return (
    <WebSocketContext.Provider value={{ send, subscribe, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
} 