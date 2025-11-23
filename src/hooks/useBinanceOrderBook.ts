import { useEffect, useRef, useState } from "react";

interface Order {
  price: number;
  size: number;
}

export function useBinanceOrderBook(symbol = "BTCUSDT", depth = 20) {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth`,
    );
    wsRef.current = ws;
    ws.onmessage = (event) => {
      if (!isMounted) return;
      const data = JSON.parse(event.data);
      if (data.b && data.a) {
        setBids(
          data.b.slice(0, depth).map(([price, size]: [string, string]) => ({
            price: parseFloat(price),
            size: parseFloat(size),
          })),
        );
        setAsks(
          data.a.slice(0, depth).map(([price, size]: [string, string]) => ({
            price: parseFloat(price),
            size: parseFloat(size),
          })),
        );
      }
    };
    return () => {
      isMounted = false;
      ws.close();
    };
  }, [symbol, depth]);

  return { bids, asks };
}
