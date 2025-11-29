import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChartWithOverlays } from "@/components/charts/ChartWithOverlays";
import { Overlay } from "@/components/charts/ChartOverlay";

/**
 * NewsFeedWidget
 * - Divine perfection: overlays, chart controls, micro-interactions, pixel-perfect design
 * - Modular, extensible, theme-aware, accessible
 */
interface NewsFeedWidgetProps {
  config?: {
    source?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function NewsFeedWidget({ config, analyticsEvent }: NewsFeedWidgetProps) {
  // Placeholder news data
  const newsData = [
    {
      title: "BTC ETF Rumor Drives Market Surge",
      url: "#",
      source: "CryptoPanic",
      sentiment: "positive",
      impact: "high",
      published_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      x: 0.1,
    },
    {
      title: "Major DeFi Hack: $100M Lost",
      url: "#",
      source: "Reddit",
      sentiment: "negative",
      impact: "high",
      published_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      x: 0.3,
    },
    {
      title: "ETH Gas Fees Hit 6-Month High",
      url: "#",
      source: "Twitter",
      sentiment: "neutral",
      impact: "medium",
      published_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      x: 0.5,
    },
    {
      title: "SOL Ecosystem Expands Rapidly",
      url: "#",
      source: "CryptoPanic",
      sentiment: "positive",
      impact: "medium",
      published_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      x: 0.7,
    },
    {
      title: "Regulatory Uncertainty Looms",
      url: "#",
      source: "Reddit",
      sentiment: "negative",
      impact: "high",
      published_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
      x: 0.9,
    },
  ];

  // Placeholder chart data (e.g., news impact score over time)
  const chartData = [0.2, 0.5, 0.7, 0.6, 0.3].map((y, i) => ({ x: i / 4, y }));

  // Overlays for news events, sentiment shifts, anomalies
  const overlays: Overlay[] = [];
  // News event overlays
  newsData.forEach((n, i) => {
    overlays.push({
      type: "news",
      label: n.title,
      x: n.x,
      color:
        n.sentiment === "positive"
          ? "#10b981"
          : n.sentiment === "negative"
            ? "#ef4444"
            : "#fbbf24",
      details: `${n.source} | ${n.impact} impact` + (n.published_at ? ` | ${new Date(n.published_at).toLocaleString()}` : ""),
      source: n.source,
      confidence: n.impact === "high" ? 0.95 : n.impact === "medium" ? 0.7 : 0.5,
    });
  });
  // Sentiment shift overlay
  overlays.push({
    type: "sentiment",
    label: "Sentiment Shift",
    x: 0.6,
    impact: "negative",
    details: "Sudden negative sentiment in news",
    pulse: true,
  });
  // Anomaly overlay
  overlays.push({
    type: "anomaly",
    label: "Anomaly",
    x: 0.8,
    color: "#ffb300",
    details: "Unusual spike in negative news",
  });

  // Chart controls (timeframe, overlays)
  const [selectedTimeframe, setSelectedTimeframe] = useState(config?.timeframe || "7d");
  const [showNews, setShowNews] = useState(true);
  const [showSentiment, setShowSentiment] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const chartControls = (
    <div className="flex gap-2 items-center bg-white/10 rounded-lg px-3 py-1 shadow">
      <select
        className="bg-transparent text-white font-semibold outline-none"
        value={selectedTimeframe}
        onChange={e => setSelectedTimeframe(e.target.value)}
        aria-label="Select timeframe"
      >
        <option value="24h">24h</option>
        <option value="7d">7d</option>
        <option value="30d">30d</option>
      </select>
      <button
        className={`px-2 py-1 rounded ${showNews ? "bg-blue-500 text-white" : "bg-white/20 text-blue-200"}`}
        onClick={() => setShowNews(v => !v)}
        aria-pressed={showNews}
      >
        News
      </button>
      <button
        className={`px-2 py-1 rounded ${showSentiment ? "bg-green-500 text-white" : "bg-white/20 text-green-200"}`}
        onClick={() => setShowSentiment(v => !v)}
        aria-pressed={showSentiment}
      >
        Sentiment
      </button>
      <button
        className={`px-2 py-1 rounded ${showAnomalies ? "bg-yellow-500 text-white" : "bg-white/20 text-yellow-200"}`}
        onClick={() => setShowAnomalies(v => !v)}
        aria-pressed={showAnomalies}
      >
        Anomalies
      </button>
    </div>
  );

  // Filter overlays based on toggles
  const filteredOverlays = overlays.filter(ov =>
    (ov.type === "news" && showNews) ||
    (ov.type === "sentiment" && showSentiment) ||
    (ov.type === "anomaly" && showAnomalies)
  );

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "NewsFeedWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="News Feed"
      className="bg-gradient-to-br from-[#23234d]/90 via-[#23234d]/80 to-[#18192b]/90 text-white shadow-2xl ring-1 ring-white/10 ring-inset border border-blue-900/40 font-semibold"
    >
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-2xl font-extrabold text-white drop-shadow-xl" tabIndex={0}>
          News Feed
        </h2>
        {config?.source && <Badge variant="info">{config.source}</Badge>}
        {config?.timeframe && <Badge variant="primary">{config.timeframe}</Badge>}
      </div>
      {/* Chart with overlays */}
      {chartData.length > 1 && (
        <div className="my-4">
          <ChartWithOverlays
            data={chartData}
            overlays={filteredOverlays}
            width={420}
            height={180}
            controls={chartControls}
          />
        </div>
      )}
      <Card
        variant="default"
        className="p-4 mb-2 bg-white/10 text-white shadow-inner"
        hover
        aria-label="Latest News"
      >
        <div className="font-semibold mb-2">Latest News</div>
        <ul className="space-y-2">
          {newsData.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 border-b pb-2 last:border-b-0"
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline focus:underline text-blue-100"
                tabIndex={0}
                aria-label={item.title}
              >
                {item.title}
              </a>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-200">{item.source}</span>
                <span
                  className={
                    item.sentiment === "positive"
                      ? "text-green-400"
                      : item.sentiment === "negative"
                        ? "text-red-400"
                        : "text-blue-100"
                  }
                >
                  {item.sentiment}
                </span>
                <span
                  className={[
                    item.impact === "high"
                      ? "bg-red-900/40 text-red-200"
                      : item.impact === "medium"
                        ? "bg-yellow-900/40 text-yellow-200"
                        : "bg-green-900/40 text-green-200",
                    "px-2 py-0.5 rounded-full",
                  ].join(" ")}
                >
                  {item.impact}
                </span>
                <span className="text-blue-300">
                  {new Date(item.published_at).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card
        variant="primary"
        className="p-4 mb-2 bg-blue-900/30 text-blue-100 shadow-inner"
        hover
        aria-label="AI Summary"
      >
        <div className="font-semibold text-blue-200 mb-1">AI Summary</div>
        <div className="text-sm text-blue-100">
          Market news is mostly positive, with BTC leading. Monitor SOL for
          further developments.
        </div>
      </Card>
      <Card
        variant="glass"
        className="p-4 mt-2 bg-white/10 text-white shadow-inner"
        hover
        aria-label="Community Q&A"
      >
        <div className="font-semibold mb-1">Community Q&amp;A</div>
        <div className="text-xs text-blue-100">
          Coming soon: Ask questions and get AI-powered answers about the news.
        </div>
      </Card>
    </Card>
  );
}
