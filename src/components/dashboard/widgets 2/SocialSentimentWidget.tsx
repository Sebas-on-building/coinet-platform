import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChartWithOverlays } from "@/components/charts/ChartWithOverlays";
import { Overlay } from "@/components/charts/ChartOverlay";

/**
 * SocialSentimentWidget
 * - Divine perfection: overlays, chart controls, micro-interactions, pixel-perfect design
 * - Modular, extensible, theme-aware, accessible
 */
interface SocialSentimentWidgetProps {
  config?: {
    platform?: string;
    metric?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function SocialSentimentWidget({ config, analyticsEvent }: SocialSentimentWidgetProps) {
  // Placeholder data
  const data = {
    sentimentScore: "+0.72",
    trendingTopics: ["#BTC", "#BullRun", "#ETH", "#SOL"],
    influencers: ["@APompliano", "@cz_binance"],
    trend: [0.5, 0.6, 0.7, 0.68, 0.72],
    anomaly: { label: "Spike", description: "Mentions of #BTC up 200% in 24h" },
    aiExplainer:
      "Positive sentiment is rising, led by BTC and ETH. Influencer activity is above average.",
    news: [
      { label: "ETF Rumor", x: 0.2, details: "ETF approval rumor trending on Twitter.", source: "Twitter" },
      { label: "Hack Alert", x: 0.7, details: "Major DeFi hack discussed.", source: "Reddit" },
    ],
    sentimentSpikes: [
      { x: 0.4, impact: "positive", details: "Sentiment spike after bullish tweet." },
      { x: 0.9, impact: "negative", details: "Sentiment drop after hack news." },
    ],
    annotations: [
      { x: 0.6, userId: "@user123", details: "Annotated: Watch this level!" },
    ],
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "SocialSentimentWidget",
      });
    }
  }, [analyticsEvent]);

  // Chart data and overlays
  const chartData = Array.isArray(data.trend)
    ? data.trend.map((y: number, i: number) => ({ x: i / (data.trend.length - 1), y: (y + 1) / 2 }))
    : [];
  const overlays: Overlay[] = [];
  // News overlays
  if (Array.isArray(data.news)) {
    data.news.forEach((n: any) => {
      overlays.push({
        type: "news",
        label: n.label,
        x: n.x,
        color: "#0057ff",
        details: n.details,
        source: n.source,
      });
    });
  }
  // Sentiment spike overlays
  if (Array.isArray(data.sentimentSpikes)) {
    data.sentimentSpikes.forEach((s: any) => {
      overlays.push({
        type: "sentiment",
        label: s.impact === "positive" ? "Sentiment ↑" : "Sentiment ↓",
        x: s.x,
        impact: s.impact,
        details: s.details,
        pulse: true,
      });
    });
  }
  // Annotation overlays
  if (Array.isArray(data.annotations)) {
    data.annotations.forEach((a: any) => {
      overlays.push({
        type: "annotation",
        label: "Note",
        x: a.x,
        userId: a.userId,
        details: a.details,
      });
    });
  }
  // Anomaly overlay
  if (data.anomaly) {
    overlays.push({
      type: "anomaly",
      label: data.anomaly.label,
      x: 0.8,
      color: "#ffb300",
      details: data.anomaly.description,
    });
  }

  // Chart controls (timeframe, overlays)
  const [selectedTimeframe, setSelectedTimeframe] = useState(config?.timeframe || "7d");
  const [showNews, setShowNews] = useState(true);
  const [showSentiment, setShowSentiment] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
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
        className={`px-2 py-1 rounded ${showAnnotations ? "bg-fuchsia-500 text-white" : "bg-white/20 text-fuchsia-200"}`}
        onClick={() => setShowAnnotations(v => !v)}
        aria-pressed={showAnnotations}
      >
        Annotations
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
    (ov.type === "annotation" && showAnnotations) ||
    (ov.type === "anomaly" && showAnomalies)
  );

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Social Sentiment"
      className="bg-gradient-to-br from-[#23234d]/90 via-[#23234d]/80 to-[#18192b]/90 text-white shadow-2xl ring-1 ring-white/10 ring-inset border border-blue-900/40 font-semibold"
    >
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-2xl font-extrabold text-white drop-shadow-xl" tabIndex={0}>
          Social Sentiment
        </h2>
        {config?.platform && <Badge variant="info">{config.platform}</Badge>}
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
        aria-label="Trending Topics & Influencers"
      >
        <div className="font-semibold mb-2">Trending Topics</div>
        <ul className="flex flex-wrap gap-2">
          {data.trendingTopics.map((topic) => (
            <li
              key={topic}
              className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs"
            >
              {topic}
            </li>
          ))}
        </ul>
        <div className="font-semibold mt-3 mb-1">Influencer Mentions</div>
        <ul className="flex flex-wrap gap-2">
          {data.influencers.map((inf) => (
            <li
              key={inf}
              className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
            >
              {inf}
            </li>
          ))}
        </ul>
      </Card>
      <Card
        variant="primary"
        className="p-4 mb-2 bg-blue-900/30 text-blue-100 shadow-inner"
        hover
        aria-label="AI Explainer"
      >
        <div className="font-semibold text-blue-200 mb-1">AI Explainer</div>
        <div className="text-sm text-blue-100">{data.aiExplainer}</div>
      </Card>
      <Card
        variant="glass"
        className="p-4 mt-2 bg-white/10 text-white shadow-inner"
        hover
        aria-label="Community Q&A"
      >
        <div className="font-semibold mb-1">Community Q&amp;A</div>
        <div className="text-xs text-blue-100">
          Coming soon: Ask questions and get AI-powered answers about social
          sentiment.
        </div>
      </Card>
    </Card>
  );
}
