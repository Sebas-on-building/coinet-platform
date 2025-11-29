import { useState, useRef } from "react";
import { TradingViewChart } from "./TradingViewChart";
// Placeholder for overlays and chart types
const CHART_TYPES = [
  { value: "candlestick", label: "Candlestick" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "bar", label: "Bar" },
];
const OVERLAYS = [
  { value: "SMA", label: "Simple MA" },
  { value: "EMA", label: "Exponential MA" },
  { value: "RSI", label: "RSI" },
  // Add more overlays
];

// Dummy news data for causal news (replace with real API integration)
const DUMMY_NEWS = [
  {
    time: "2024-06-01T12:00:00Z",
    title: "ETF Approval Rumor",
    details: "Rumors of ETF approval caused a spike in BTC price.",
  },
  {
    time: "2024-06-01T15:00:00Z",
    title: "Exchange Hack",
    details: "Major exchange hack led to a sharp drop.",
  },
];

export function ChartBuilder() {
  const [chartType, setChartType] = useState("candlestick");
  const [overlays, setOverlays] = useState<string[]>([]);
  const [showNews, setShowNews] = useState<string | null>(null);
  // For extensibility: asset, timeframe, etc.
  // For now, reuse TradingViewChart for the main chart rendering

  // Save/load layout (localStorage, DB-ready)
  const saveLayout = () => {
    localStorage.setItem(
      "chart_builder_layout",
      JSON.stringify({ chartType, overlays }),
    );
    alert("Layout saved!");
  };
  const loadLayout = () => {
    const data = localStorage.getItem("chart_builder_layout");
    if (data) {
      const { chartType, overlays } = JSON.parse(data);
      setChartType(chartType);
      setOverlays(overlays);
    }
  };

  // Drag-and-drop for overlays (future: use react-beautiful-dnd or similar)
  const toggleOverlay = (overlay: string) => {
    setOverlays((prev) =>
      prev.includes(overlay)
        ? prev.filter((o) => o !== overlay)
        : [...prev, overlay],
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h2 className="text-xl font-bold mb-4">
        Chart Builder{" "}
        <span className="text-xs text-blue-500">
          (Drag, drop, and click to create your own chart!)
        </span>
      </h2>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div>
          <label className="block text-xs font-semibold mb-1">Chart Type</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          >
            {CHART_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Overlays</label>
          <div className="flex gap-2 flex-wrap">
            {OVERLAYS.map((o) => (
              <button
                key={o.value}
                onClick={() => toggleOverlay(o.value)}
                className={`px-2 py-1 rounded ${overlays.includes(o.value) ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={saveLayout}
          className="px-3 py-2 rounded bg-green-600 text-white font-semibold"
        >
          Save Layout
        </button>
        <button
          onClick={loadLayout}
          className="px-3 py-2 rounded bg-yellow-500 text-white font-semibold"
        >
          Load Layout
        </button>
      </div>
      {/* Main Chart (reuse TradingViewChart for now, but can swap for custom chart lib) */}
      <div className="mb-6 min-h-[400px] h-[60vh] w-full">
        <TradingViewChart />
      </div>
      {/* Causal News below chart */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Causal News</h3>
        <div className="flex flex-col gap-2">
          {DUMMY_NEWS.map((news, idx) => (
            <button
              key={idx}
              className="text-left bg-blue-100 dark:bg-blue-900/30 rounded p-2 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
              onClick={() => setShowNews(news.time)}
            >
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {news.title}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                ({new Date(news.time).toLocaleString()})
              </span>
            </button>
          ))}
        </div>
        {/* Modal for news details */}
        {showNews && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-md w-full shadow-lg relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                onClick={() => setShowNews(null)}
              >
                &times;
              </button>
              <h4 className="text-lg font-bold mb-2">
                {DUMMY_NEWS.find((n) => n.time === showNews)?.title}
              </h4>
              <p className="text-gray-700 dark:text-gray-200 mb-2">
                {DUMMY_NEWS.find((n) => n.time === showNews)?.details}
              </p>
              <div className="text-xs text-gray-500">
                {new Date(showNews).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-neutral-400 mt-4">
        Tip: Drag overlays, click news for details, and save your favorite chart
        layouts!
      </div>
    </div>
  );
}
