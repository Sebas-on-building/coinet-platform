import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
const WebSocketContext = createContext({ ws: null, subscribe: () => { } });
export const WebSocketProvider = ({ children }) => {
  const ws = useRef(null);
  const listeners = useRef({});

  const subscribe = useCallback((eventType, callback) => {
    listeners.current[eventType] = callback;
  }, []);

  useEffect(() => {
    ws.current = new WebSocket('wss://api.coinet.com/ws');
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type && listeners.current[data.type]) {
        listeners.current[data.type](data.payload);
      }
    };
    return () => ws.current?.close();
  }, []);

  return <WebSocketContext.Provider value={{ ws: ws.current, subscribe }}>{children}</WebSocketContext.Provider>;
};
export const useWebSocket = () => useContext(WebSocketContext); 