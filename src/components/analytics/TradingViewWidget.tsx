declare global {
  interface Window {
    TradingView: any;
  }
}

import { useEffect, useRef } from "react";

export function TradingViewWidget({ symbol = "BTCUSD" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        window.TradingView &&
          new window.TradingView.widget({
            container_id: ref.current,
            symbol,
            interval: "60",
            theme: "dark",
            style: "1",
            locale: "en",
            width: "100%",
            height: 400,
          });
      };
      document.body.appendChild(script);
    }
  }, [symbol]);

  return (
    <div
      ref={ref}
      className="w-full h-[400px] rounded-xl overflow-hidden shadow-lg bg-[#181825]"
    />
  );
}
