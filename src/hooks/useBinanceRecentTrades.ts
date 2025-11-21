import { useEffect, useState } from "react";

interface Trade {
  id: number;
  price: number;
  qty: number;
  side: "buy" | "sell";
  time: number;
}

export function useBinanceRecentTrades(symbol = "BTCUSDT", limit = 20) {
  const [trades, setTrades] = useState<Trade[]>([]);
  useEffect(() => {
    let isMounted = true;
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`,
    );
    const buffer: Trade[] = [];
    ws.onmessage = (event) => {
      if (!isMounted) return;
      const data = JSON.parse(event.data);
      const trade: Trade = {
        id: data.t,
        price: parseFloat(data.p),
        qty: parseFloat(data.q),
        side: data.m ? "sell" : "buy",
        time: data.T,
      };
      buffer.push(trade);
      if (buffer.length > limit) buffer.shift();
      setTrades([...buffer]);
    };
    return () => {
      isMounted = false;
      ws.close();
    };
  }, [symbol, limit]);
  return trades;
}
