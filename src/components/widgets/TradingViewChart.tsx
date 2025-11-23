import { useEffect, useRef, useState } from "react";

const ASSETS = [
  { symbol: "BTCUSD", name: "Bitcoin" },
  { symbol: "ETHUSD", name: "Ethereum" },
  { symbol: "SOLUSD", name: "Solana" },
  { symbol: "BNBUSD", name: "Binance Coin" },
  { symbol: "ADAUSD", name: "Cardano" },
  // Add more assets as needed
];

const TIMEFRAMES = [
  { value: "1", label: "1m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "60", label: "1h" },
  { value: "240", label: "4h" },
  { value: "D", label: "1D" },
  { value: "W", label: "1W" },
  { value: "M", label: "1M" },
];

export function TradingViewChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState(
    () => localStorage.getItem("tv_symbol") || "BTCUSD",
  );
  const [interval, setInterval] = useState(
    () => localStorage.getItem("tv_interval") || "D",
  );

  useEffect(() => {
    localStorage.setItem("tv_symbol", symbol);
    localStorage.setItem("tv_interval", interval);
  }, [symbol, interval]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView && containerRef.current) {
        // @ts-ignore
        new window.TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}`,
          interval: interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#131722",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          studies: [],
          withdateranges: true,
          hide_side_toolbar: false,
          details: true,
          hotlist: true,
          calendar: true,
        });
      }
    };
    containerRef.current.appendChild(script);
  }, [symbol, interval]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
        >
          {ASSETS.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setInterval(tf.value)}
              className={`px-2 py-1 rounded ${interval === tf.value ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      <div
        id="tradingview-widget-container"
        ref={containerRef}
        style={{ minHeight: 500, width: "100%" }}
        className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900"
      />
      <div className="text-xs text-neutral-400 mt-2 text-right">
        Powered by{" "}
        <a
          href="https://tradingview.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          TradingView
        </a>
      </div>
    </div>
  );
}
