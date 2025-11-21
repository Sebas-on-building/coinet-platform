import { useEffect, useRef, useState } from "react";

export interface AnomalyEvent {
  symbol: string;
  time: string;
  price: number;
  ma20: number;
  volatility: number;
  reason: string;
}

export function useAnomaliesFeed() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [latest, setLatest] = useState<AnomalyEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    function connect() {
      ws = new WebSocket(
        (window.location.protocol === "https:" ? "wss://" : "ws://") +
          window.location.host +
          "/api/ws/anomalies",
      );
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatest(data);
          setAnomalies((prev) => {
            const next = [data, ...prev].slice(0, 20);
            return next;
          });
        } catch {}
      };
      ws.onclose = () => {
        // Try to reconnect after 2s
        reconnectTimeout = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        ws?.close();
      };
      wsRef.current = ws;
    }
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const clearLatest = () => setLatest(null);
  return { anomalies, latest, clearLatest };
}
