import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdvancedChart } from "../charts/AdvancedChart";
import {
  FiBarChart2,
  FiTrendingUp,
  FiActivity,
  FiSliders,
  FiEye,
  FiChevronDown,
  FiTrendingDown,
  FiTrendingUp as FiTrendingUp2,
  FiBarChart,
  FiPercent,
  FiShare2,
  FiExternalLink,
  FiLink2,
} from "react-icons/fi";
import { useCryptoOHLCV } from "../../hooks/useCryptoOHLCV";
import AssetSelector from "./AssetSelector";
import {
  SMA,
  EMA,
  VWAP,
  BollingerBands,
  RSI,
  MACD,
  Stochastic,
  ATR,
  ADX,
  CCI,
  OBV,
  WilliamsR,
  StochasticRSI,
} from "technicalindicators";
import ChartEventMarkers, { ChartEvent } from "../charts/ChartEventMarkers";
import useSWR from "swr";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

const allAssets = [
  {
    label: "Solana",
    value: "solana",
    icon: "/icons/solana.svg",
    accent: "#00ffa3",
  },
  {
    label: "Bitcoin",
    value: "bitcoin",
    icon: "/icons/bitcoin.svg",
    accent: "#ffb300",
  },
  {
    label: "Ethereum",
    value: "ethereum",
    icon: "/icons/ethereum.svg",
    accent: "#0057ff",
  },
  {
    label: "Avalanche",
    value: "avalanche",
    icon: "/icons/avalanche.svg",
    accent: "#e84142",
  },
  {
    label: "Polygon",
    value: "polygon",
    icon: "/icons/polygon.svg",
    accent: "#7c3aed",
  },
  {
    label: "Dogecoin",
    value: "dogecoin",
    icon: "/icons/dogecoin.svg",
    accent: "#c2a633",
  },
];

const chartTypes = [
  {
    type: "Candlestick",
    label: "Candles",
    icon: <FiBarChart2 />,
    accent: "#00ffa3",
  },
  { type: "Line", label: "Line", icon: <FiTrendingUp />, accent: "#0057ff" },
  { type: "Area", label: "Area", icon: <FiActivity />, accent: "#ffb300" },
  {
    type: "Histogram",
    label: "Volume",
    icon: <FiSliders />,
    accent: "#7c3aed",
  },
];

const overlaysList = [
  {
    name: "Moving Avg",
    type: "Line",
    color: "#00ffa3",
    tooltip: "Simple Moving Average (3-day)",
    params: { period: 3 },
  },
  {
    name: "EMA",
    type: "Line",
    color: "#e84142",
    tooltip: "Exponential Moving Average (period 5)",
    params: { period: 5 },
  },
  {
    name: "VWAP",
    type: "Line",
    color: "#c2a633",
    tooltip: "Volume Weighted Average Price",
    params: {},
  },
  {
    name: "Bollinger Bands",
    type: "Area",
    color: "#7c3aed",
    tooltip: "Bollinger Bands (period 3, stdDev 2)",
    params: { period: 3, stdDev: 2 },
  },
  {
    name: "RSI",
    type: "Line",
    color: "#ffb300",
    tooltip: "Relative Strength Index (period 14)",
    params: { period: 14 },
  },
  {
    name: "MACD",
    type: "Histogram",
    color: "#ff4d4f",
    tooltip: "MACD (12,26,9)",
    params: { fast: 12, slow: 26, signal: 9 },
  },
  {
    name: "Stochastic",
    type: "Line",
    color: "#0057ff",
    tooltip: "Stochastic Oscillator (K line, period 14)",
    params: { period: 14, signal: 3 },
  },
  {
    name: "ATR",
    type: "Line",
    color: "#7c3aed",
    tooltip: "Average True Range (period 14)",
    params: { period: 14 },
  },
  {
    name: "ADX",
    type: "Line",
    color: "#ff4d4f",
    tooltip: "Average Directional Index (period 14)",
    params: { period: 14 },
  },
  {
    name: "CCI",
    type: "Line",
    color: "#00bcd4",
    tooltip: "Commodity Channel Index (period 20)",
    params: { period: 20 },
  },
  {
    name: "OBV",
    type: "Line",
    color: "#ffb300",
    tooltip: "On-Balance Volume",
    params: {},
  },
  {
    name: "Williams %R",
    type: "Line",
    color: "#7c3aed",
    tooltip: "Williams %R (period 14)",
    params: { period: 14 },
  },
  {
    name: "Stochastic RSI",
    type: "Line",
    color: "#e84142",
    tooltip: "Stochastic RSI (period 14)",
    params: { period: 14 },
  },
  {
    name: "Price Change %",
    type: "Line",
    color: "#c2a633",
    tooltip: "Price Change %",
    params: {},
  },
  {
    name: "Sentiment",
    type: "Area",
    color: "#0057ff",
    tooltip: "Sentiment (mock)",
    params: {},
  },
];

// Mock data for fallback
const mockData = [
  {
    time: "2024-06-01",
    value: 120,
    open: 115,
    high: 125,
    low: 110,
    close: 120,
    volume: 1000,
  },
  {
    time: "2024-06-02",
    value: 130,
    open: 120,
    high: 135,
    low: 118,
    close: 130,
    volume: 1200,
  },
  {
    time: "2024-06-03",
    value: 128,
    open: 130,
    high: 132,
    low: 125,
    close: 128,
    volume: 900,
  },
  {
    time: "2024-06-04",
    value: 140,
    open: 128,
    high: 142,
    low: 127,
    close: 140,
    volume: 1500,
  },
  {
    time: "2024-06-05",
    value: 138,
    open: 140,
    high: 145,
    low: 135,
    close: 138,
    volume: 1100,
  },
];

// Parameter state for overlays
const defaultParams = {
  "Moving Avg": 3,
  EMA: 5,
  "Bollinger Bands": { period: 3, stdDev: 2 },
  RSI: 14,
  MACD: { fast: 12, slow: 26, signal: 9 },
  Stochastic: { period: 14, signal: 3 },
  ATR: 14,
  ADX: 14,
  CCI: 20,
  "Williams %R": 14,
  "Stochastic RSI": 14,
};

// Mock news/events for demo
const mockEvents: ChartEvent[] = [
  {
    time: "2024-06-02",
    type: "news",
    title: "Solana DeFi TVL Hits ATH",
    description: "Solana DeFi total value locked reaches new all-time high.",
    color: "#00ffa3",
  },
  {
    time: "2024-06-03",
    type: "signal",
    title: "BTC Breakout Signal",
    description: "Algorithmic signal: BTC breakout detected.",
    color: "#ffb300",
  },
  {
    time: "2024-06-04",
    type: "onchain",
    title: "ETH Whale Transfer",
    description: "Large ETH transfer detected on-chain.",
    color: "#0057ff",
  },
];

// Fetch real news/events for the selected asset
function useAssetEvents(symbol: string) {
  // Example: fetch from /api/news-events/[symbol]
  const { data, error, isLoading } = useSWR(
    `/api/news-events/${symbol}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch events");
      const events = await res.json();
      // Transform to ChartEvent format
      return events.map((ev: any) => ({
        time: ev.time || ev.date || "",
        type: ev.type || "news",
        title: ev.title || "",
        description: ev.description || "",
        color: ev.color,
        icon: undefined,
      }));
    },
    { refreshInterval: 60000 },
  );
  return { events: data, isLoading, error };
}

// Add more event types/colors/icons
const typeColorMap: Record<string, string> = {
  news: "#00ffa3",
  signal: "#ffb300",
  onchain: "#0057ff",
  custom: "#7c3aed",
  hack: "#ff4d4f",
  upgrade: "#e84142",
  partnership: "#c2a633",
  regulation: "#00bcd4",
  airdrop: "#ffb3e6",
  governance: "#b3ffb3",
  funding: "#b3e6ff",
  scam: "#ff4d4f",
};

export function TradingViewPanel() {
  const [chartType, setChartType] = useState<
    "Candlestick" | "Line" | "Area" | "Histogram"
  >("Candlestick");
  const [overlays, setOverlays] = useState<string[]>([]);
  const [crosshairInfo, setCrosshairInfo] = useState<{
    price: number;
    time: string;
  } | null>(null);
  const [asset, setAsset] = useState(allAssets[0]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [params, setParams] = useState<any>(defaultParams);
  const [paramPopover, setParamPopover] = useState<string | null>(null);
  const paramBtnRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [crosshairTime, setCrosshairTime] = useState<string | null>(null);

  const { data, isLoading, error } = useCryptoOHLCV(asset.value, 30);
  const isSampleData = !data || data.length === 0;
  const mainData = data && data.length > 0 ? data : mockData;
  const {
    events: assetEvents,
    isLoading: eventsLoading,
    error: eventsError,
  } = useAssetEvents(asset.value);
  const displayEvents = assetEvents && assetEvents.length > 0 ? assetEvents : (import.meta.env.DEV ? mockEvents : []);
  const isSampleEvents = !assetEvents || assetEvents.length === 0;
  // Overlay calculations using technicalindicators
  // Moving Average (SMA, period 3)
  const smaValues = SMA.calculate({
    period: params["Moving Avg"],
    values: mainData.map((d: any) => d.close),
  });
  const movingAvg = mainData.map((d: any, i: number) => ({
    time: d.time,
    value:
      i < params["Moving Avg"] - 1
        ? d.close
        : smaValues[i - (params["Moving Avg"] - 1)],
  }));
  // EMA (period 5)
  const emaValues = EMA.calculate({
    period: params["EMA"],
    values: mainData.map((d: any) => d.close),
  });
  const ema = mainData.map((d: any, i: number) => ({
    time: d.time,
    value: i < params["EMA"] - 1 ? d.close : emaValues[i - (params["EMA"] - 1)],
  }));
  // VWAP
  const vwapValues = VWAP.calculate({
    close: mainData.map((d: any) => d.close),
    volume: mainData.map((d: any) => d.volume),
    high: mainData.map((d: any) => d.high),
    low: mainData.map((d: any) => d.low),
  });
  const vwap = mainData.map((d: any, i: number) => ({
    time: d.time,
    value: i < vwapValues.length ? vwapValues[i] : d.close,
  }));
  // Bollinger Bands (period 3, stdDev 2)
  const bb = BollingerBands.calculate({
    period: params["Bollinger Bands"].period,
    stdDev: params["Bollinger Bands"].stdDev,
    values: mainData.map((d: any) => d.close),
  });
  const bollingerBands = mainData.map((d: any, i: number) => {
    if (i < params["Bollinger Bands"].period - 1)
      return { time: d.time, value: d.close, upper: d.close, lower: d.close };
    return {
      time: d.time,
      value: smaValues[i - (params["Bollinger Bands"].period - 1)],
      upper: bb[i - (params["Bollinger Bands"].period - 1)]?.upper || d.close,
      lower: bb[i - (params["Bollinger Bands"].period - 1)]?.lower || d.close,
    };
  });
  // RSI (period 14)
  const rsiValues = RSI.calculate({
    period: params["RSI"],
    values: mainData.map((d: any) => d.close),
  });
  const rsi = mainData.map((d: any, i: number) => ({
    time: d.time,
    value: i < params["RSI"] - 1 ? 50 : rsiValues[i - (params["RSI"] - 1)],
  }));
  // MACD (fast 12, slow 26, signal 9)
  const macdValues = MACD.calculate({
    values: mainData.map((d: any) => d.close),
    fastPeriod: params["MACD"].fast,
    slowPeriod: params["MACD"].slow,
    signalPeriod: params["MACD"].signal,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const macd = mainData.map((d: any, i: number) => ({
    time: d.time,
    value:
      i < params["MACD"].slow - 1
        ? 0
        : macdValues[i - (params["MACD"].slow - 1)]?.MACD || 0,
  }));
  // Stochastic Oscillator (K line, period 14)
  const stochasticValues = Stochastic.calculate({
    high: mainData.map((d: any) => d.high),
    low: mainData.map((d: any) => d.low),
    close: mainData.map((d: any) => d.close),
    period: params["Stochastic"].period,
    signalPeriod: params["Stochastic"].signal,
  });
  const stochastic = mainData.map((d: any, i: number) => ({
    time: d.time,
    value:
      i < params["Stochastic"].period - 1
        ? 50
        : stochasticValues[i - (params["Stochastic"].period - 1)]?.k || 50,
  }));
  // ATR (period 14)
  const atrValues = ATR.calculate({
    high: mainData.map((d: any) => d.high),
    low: mainData.map((d: any) => d.low),
    close: mainData.map((d: any) => d.close),
    period: params["ATR"],
  });
  const atr = mainData.map((d: any, i: number) => ({
    time: d.time,
    value: i < params["ATR"] - 1 ? 0 : atrValues[i - (params["ATR"] - 1)],
  }));
  // Sentiment overlay (mocked for now)
  const sentiment = mainData.map((d: any, i: number) => ({
    time: d.time,
    value: 0.5 + 0.1 * Math.sin(i),
  }));

  const activeOverlays = [];
  if (overlays.includes("Moving Avg")) {
    activeOverlays.push({
      name: "Moving Avg",
      type: "Line" as "Line",
      data: movingAvg,
      color: "#00ffa3",
    });
  }
  if (overlays.includes("EMA")) {
    activeOverlays.push({
      name: "EMA",
      type: "Line" as "Line",
      data: ema,
      color: "#e84142",
    });
  }
  if (overlays.includes("VWAP")) {
    activeOverlays.push({
      name: "VWAP",
      type: "Line" as "Line",
      data: vwap,
      color: "#c2a633",
    });
  }
  if (overlays.includes("Bollinger Bands")) {
    // For simplicity, add upper and lower as two area overlays
    activeOverlays.push({
      name: "Bollinger Upper",
      type: "Area" as "Area",
      data: bollingerBands.map((b) => ({ time: b.time, value: b.upper })),
      color: "#7c3aed",
    });
    activeOverlays.push({
      name: "Bollinger Lower",
      type: "Area" as "Area",
      data: bollingerBands.map((b) => ({ time: b.time, value: b.lower })),
      color: "#7c3aed",
    });
  }
  if (overlays.includes("RSI")) {
    activeOverlays.push({
      name: "RSI",
      type: "Line" as "Line",
      data: rsi,
      color: "#ffb300",
    });
  }
  if (overlays.includes("MACD")) {
    activeOverlays.push({
      name: "MACD",
      type: "Histogram" as "Histogram",
      data: macd,
      color: "#ff4d4f",
    });
  }
  if (overlays.includes("Stochastic")) {
    activeOverlays.push({
      name: "Stochastic",
      type: "Line" as "Line",
      data: stochastic,
      color: "#0057ff",
    });
  }
  if (overlays.includes("ATR")) {
    activeOverlays.push({
      name: "ATR",
      type: "Line" as "Line",
      data: atr,
      color: "#7c3aed",
    });
  }
  if (overlays.includes("Sentiment")) {
    activeOverlays.push({
      name: "Sentiment",
      type: "Area" as "Area",
      data: sentiment,
      color: "#0057ff",
    });
  }

  // Find the closest event to the crosshair time
  const highlightedIndex =
    crosshairTime && displayEvents.length > 0
      ? displayEvents.reduce((bestIdx: number, ev: any, idx: number) => {
          if (!ev.time) return bestIdx;
          const bestTime = displayEvents[bestIdx]?.time;
          return Math.abs(
            new Date(ev.time).getTime() - new Date(crosshairTime).getTime(),
          ) <
            Math.abs(
              new Date(bestTime || "").getTime() - new Date(crosshairTime).getTime(),
            )
            ? idx
            : bestIdx;
        }, 0)
      : null;

  // Placeholder for websocket/push integration for true real-time updates
  // useEffect(() => {
  //   const ws = new WebSocket('wss://your-backend/ws/news-events');
  //   ws.onmessage = (msg) => { /* update events in real time */ };
  //   return () => ws.close();
  // }, [asset.value]);

  return (
    <motion.div
      className="relative rounded-3xl shadow-2xl border-2 border-[#23234d] bg-gradient-to-br from-[#181836] to-[#23234d] p-8 my-8 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ duration: 0.7, type: "spring" }}
      style={{ boxShadow: "0 0 0 3px #00ffa344" }}
    >
      {/* Asset selector button */}
      <div className="flex gap-3 mb-4 items-center">
        {(isSampleData || isSampleEvents) && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Sample Data
          </span>
        )}
        <span className="text-blue-300 font-mono text-sm">Asset:</span>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold border-2 transition-all bg-[#23234d] text-blue-200 border-transparent hover:border-blue-400"
          style={{ borderColor: asset.accent, color: asset.accent }}
          onClick={() => setSelectorOpen(true)}
        >
          <img
            src={asset.icon}
            alt={asset.label}
            className="w-6 h-6 rounded-full bg-[#23234d]"
          />
          <span className="font-bold text-lg" style={{ color: asset.accent }}>
            {asset.label}
          </span>
          <FiChevronDown />
        </button>
      </div>
      <AssetSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={setAsset}
      />
      {/* Chart type toggle */}
      <div className="flex gap-3 mb-4">
        {chartTypes.map((ct) => (
          <button
            key={ct.type}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold border-2 transition-all ${chartType === ct.type ? "bg-white text-[#23234d]" : "bg-[#23234d] text-blue-200"} border-transparent hover:border-blue-400`}
            style={
              chartType === ct.type
                ? { borderColor: ct.accent, color: ct.accent }
                : {}
            }
            onClick={() => setChartType(ct.type as any)}
          >
            <span className="text-xl">{ct.icon}</span> {ct.label}
          </button>
        ))}
        {/* Overlay toggles */}
        <div className="flex items-center gap-2 ml-6">
          {overlaysList.map((ov) => (
            <Tooltip key={ov.name} content={ov.tooltip} side="top">
              <motion.button
                className={`flex items-center gap-1 px-3 py-2 rounded-lg font-bold border-2 transition-all relative ${overlays.includes(ov.name) ? "bg-white text-[#23234d]" : "bg-[#23234d] text-blue-200"} border-transparent hover:border-blue-400`}
                style={
                  overlays.includes(ov.name)
                    ? { borderColor: ov.color, color: ov.color }
                    : {}
                }
                onClick={() =>
                  setOverlays((o) =>
                    o.includes(ov.name)
                      ? o.filter((x) => x !== ov.name)
                      : [...o, ov.name],
                  )
                }
                whileHover={{ scale: 1.08, boxShadow: `0 0 16px ${ov.color}` }}
                whileTap={{ scale: 0.97 }}
                aria-label={ov.tooltip}
              >
                {ov.name === "Bollinger Bands" && (
                  <FiBarChart className="text-xl" />
                )}
                {ov.name === "RSI" && <FiPercent className="text-xl" />}
                {ov.name === "MACD" && <FiTrendingDown className="text-xl" />}
                {ov.name === "Moving Avg" && (
                  <FiTrendingUp2 className="text-xl" />
                )}
                {ov.name === "Sentiment" && <FiEye className="text-xl" />}
                {ov.name === "EMA" && <FiTrendingUp className="text-xl" />}
                {ov.name === "VWAP" && <FiSliders className="text-xl" />}
                {ov.name === "Stochastic" && <FiActivity className="text-xl" />}
                {ov.name === "ATR" && <FiBarChart2 className="text-xl" />}
                {ov.name}
              </motion.button>
            </Tooltip>
          ))}
        </div>
      </div>
      {/* Chart event markers (animated, above chart) */}
      <div className="relative w-full" style={{ height: 0, minHeight: 0 }}>
        {eventsLoading ? (
          <motion.div
            className="flex items-center justify-center w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-[#00ffa3] mx-auto" />
          </motion.div>
        ) : displayEvents.length > 0 ? (
          <ChartEventMarkers
            events={displayEvents}
            xScale={(time) => {
              const idx = mainData.findIndex((d) => d.time === time);
              if (idx === -1) return 0;
              return (idx / (mainData.length - 1)) * 900;
            }}
            y={8}
            highlightedIndex={highlightedIndex}
            assetSymbol={asset.value}
          />
        ) : null}
      </div>
      {/* Chart */}
      <div className="relative min-h-[440px] flex items-center justify-center">
        {isLoading ? (
          <motion.div
            className="flex items-center justify-center w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00ffa3] mx-auto" />
          </motion.div>
        ) : error ? (
          <div className="text-amber-400 text-center text-sm">
            Failed to load live data. Showing sample data.
          </div>
        ) : null}
        <AdvancedChart
          data={mainData}
          type={chartType}
          height={420}
          width={900}
          overlays={activeOverlays}
          onCrosshairMove={(price, time) => {
            setCrosshairInfo({ price, time });
            setCrosshairTime(time);
          }}
        />
        {/* Animated info panel on crosshair */}
        <AnimatePresence>
          {crosshairInfo && (
            <motion.div
              className="absolute top-6 right-6 bg-[#23234d] rounded-xl shadow-xl border-2 border-[#00ffa3] px-6 py-4 text-white z-20"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="font-mono text-blue-300 text-xs mb-1">
                {crosshairInfo.time}
              </div>
              <div className="text-2xl font-bold" style={{ color: "#00ffa3" }}>
                ${crosshairInfo.price.toLocaleString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Animated, color-coded legend for active overlays */}
      <div className="flex flex-wrap gap-3 mb-4">
        {activeOverlays.map((ov, i) => (
          <motion.div
            key={ov.name}
            className="flex items-center gap-2 px-3 py-1 rounded-lg shadow border"
            style={{
              background: ov.color + "22",
              color: ov.color,
              borderColor: ov.color + "88",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: ov.color }}
            />
            <span className="font-bold text-xs">{ov.name}</span>
            <span className="text-xs font-mono">
              {ov.data && ov.data.length > 0
                ? typeof ov.data[ov.data.length - 1].value === "number"
                  ? ov.data[ov.data.length - 1].value.toFixed(2)
                  : ""
                : ""}
            </span>
          </motion.div>
        ))}
      </div>
      {/* Parameter customization popover */}
      <AnimatePresence>
        {paramPopover && (
          <Popover
            open={!!paramPopover}
            onOpenChange={(open) => !open && setParamPopover(null)}
          >
            <PopoverContent>
              <div className="font-bold text-blue-200 mb-2">
                Customize {paramPopover} Parameters
              </div>
              {/* Render parameter controls based on overlay */}
              {paramPopover === "Moving Avg" && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-blue-300">Period:</span>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={params["Moving Avg"]}
                    onChange={(e) =>
                      setParams((p: any) => ({
                        ...p,
                        "Moving Avg": Number(e.target.value),
                      }))
                    }
                    className="bg-[#181836] border border-blue-400 rounded px-2 py-1 text-white w-16"
                  />
                </div>
              )}
              {paramPopover === "EMA" && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-blue-300">Period:</span>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={params["EMA"]}
                    onChange={(e) =>
                      setParams((p: any) => ({
                        ...p,
                        EMA: Number(e.target.value),
                      }))
                    }
                    className="bg-[#181836] border border-blue-400 rounded px-2 py-1 text-white w-16"
                  />
                </div>
              )}
              {/* Add more parameter controls as needed */}
              <motion.button
                className="mt-4 px-4 py-2 rounded bg-[#00ffa3] text-[#23234d] font-bold"
                onClick={() => setParamPopover(null)}
                whileHover={{ scale: 1.08, boxShadow: "0 0 12px #00ffa3" }}
                whileTap={{ scale: 0.96 }}
              >
                Close
              </motion.button>
            </PopoverContent>
          </Popover>
        )}
      </AnimatePresence>
      {/* Sub-panels for RSI, MACD, Stochastic */}
      <AnimatePresence>
        {overlays.includes("RSI") && (
          <motion.div
            className="mt-6 p-4 rounded-2xl bg-[#181836] border-2 border-[#ffb300] shadow-xl max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="font-bold text-[#ffb300] mb-2">
              RSI (period {params["RSI"]})
            </div>
            <div className="w-full h-24 flex items-end gap-1">
              {rsi.slice(-30).map((pt, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#ffb300]"
                  style={{
                    height: `${Math.max(0, Math.min(100, pt.value))}%`,
                    minHeight: 2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
        {overlays.includes("MACD") && (
          <motion.div
            className="mt-6 p-4 rounded-2xl bg-[#181836] border-2 border-[#ff4d4f] shadow-xl max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="font-bold text-[#ff4d4f] mb-2">
              MACD (fast {params["MACD"].fast}, slow {params["MACD"].slow},
              signal {params["MACD"].signal})
            </div>
            <div className="w-full h-24 flex items-end gap-1">
              {macd.slice(-30).map((pt, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#ff4d4f]"
                  style={{
                    height: `${Math.abs(pt.value) * 2}px`,
                    minHeight: 2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
        {overlays.includes("Stochastic") && (
          <motion.div
            className="mt-6 p-4 rounded-2xl bg-[#181836] border-2 border-[#0057ff] shadow-xl max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="font-bold text-[#0057ff] mb-2">
              Stochastic Oscillator (period {params["Stochastic"].period})
            </div>
            <div className="w-full h-24 flex items-end gap-1">
              {stochastic.slice(-30).map((pt, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#0057ff]"
                  style={{
                    height: `${Math.max(0, Math.min(100, pt.value))}%`,
                    minHeight: 2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
export default TradingViewPanel;
