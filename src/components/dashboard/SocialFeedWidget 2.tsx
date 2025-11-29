import React from "react";
import { useRef, useMemo, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Twitter,
  Newspaper,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import Image from "next/image";
import { FixedSizeList as List } from "react-window";
import useSWR from "swr";
import { useSocialFeedRealtime } from "../../hooks/useSocialFeedRealtime";

interface FeedItem {
  id: string;
  type: "news" | "tweet" | "comment";
  user: string;
  avatar: string;
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  timestamp: number;
}

const ITEM_HEIGHT = 80;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SocialFeedWidgetComponent = ({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, error, isLoading } = useSWR(
    `/api/social-feed/${symbol}`,
    fetcher,
    { refreshInterval: 30000 },
  );
  const feed: FeedItem[] = data?.feed || [];
  const hasMore = feed.length >= 20;

  // Real-time feed integration
  const {
    events: realtimeEvents,
    latest: latestRealtime,
    clearLatest,
  } = useSocialFeedRealtime(symbol);
  // Merge real-time events (dedup by id)
  const mergedFeed = useMemo(() => {
    const ids = new Set<string>();
    const all = [...(realtimeEvents as FeedItem[]), ...feed];
    return all.filter((item) => {
      if (ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
  }, [realtimeEvents, feed]);

  const iconForType = useMemo(
    () => (type: string) => {
      if (type === "news")
        return (
          <Newspaper className="text-blue-400 w-5 h-5" aria-label="News" />
        );
      if (type === "tweet")
        return <Twitter className="text-sky-400 w-5 h-5" aria-label="Tweet" />;
      return (
        <MessageCircle
          className="text-green-400 w-5 h-5"
          aria-label="Comment"
        />
      );
    },
    [],
  );
  const sentimentIcon = useMemo(
    () => (sentiment: string) => {
      if (sentiment === "positive")
        return (
          <span title="Positive sentiment">
            <Smile className="text-green-400 w-4 h-4" aria-label="Positive" />
          </span>
        );
      if (sentiment === "negative")
        return (
          <span title="Negative sentiment">
            <Frown className="text-red-400 w-4 h-4" aria-label="Negative" />
          </span>
        );
      return (
        <span title="Neutral sentiment">
          <Meh className="text-yellow-400 w-4 h-4" aria-label="Neutral" />
        </span>
      );
    },
    [],
  );
  const sentimentBg = useMemo(
    () => (sentiment: string) => {
      if (sentiment === "positive") return "bg-green-50";
      if (sentiment === "negative") return "bg-red-50";
      return "bg-yellow-50";
    },
    [],
  );

  // Virtualized row renderer
  const Row = memo(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = mergedFeed[index];
      const isRealtime = realtimeEvents.some((e) => e.id === item.id);
      return (
        <motion.div
          key={item.id}
          className={`flex items-start gap-3 mb-4 p-3 rounded-xl shadow-sm bg-glass/60 transition hover:bg-glass/80 focus-within:ring-2 focus-within:ring-blue-300 focus:ring-2 focus:ring-blue-400 ${sentimentBg(item.sentiment)} ${isRealtime ? "ring-2 ring-green-400 animate-pulse" : ""}`}
          style={style}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          tabIndex={0}
          aria-label={`${item.type} by ${item.user}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              // Future: expand or focus item
            }
          }}
        >
          <Image
            src={item.avatar}
            alt={item.user}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-avatar.png";
            }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-800">
                {item.user}
              </span>
              {iconForType(item.type)}
              <span className="ml-2 text-xs text-gray-400">
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className="ml-auto"
                tabIndex={0}
                title={
                  item.sentiment.charAt(0).toUpperCase() +
                  item.sentiment.slice(1) +
                  " sentiment"
                }
              >
                {sentimentIcon(item.sentiment)}
              </span>
            </div>
            <div className="text-sm text-gray-700 leading-snug">
              {item.content}
            </div>
          </div>
        </motion.div>
      );
    },
  );

  // Accessibility: Announce new real-time item
  const liveRegionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (latestRealtime && liveRegionRef.current) {
      liveRegionRef.current.textContent = `New ${latestRealtime.type} by ${latestRealtime.user}: ${latestRealtime.content}`;
      const timeout = setTimeout(() => {
        if (liveRegionRef.current) liveRegionRef.current.textContent = "";
        clearLatest();
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [latestRealtime, clearLatest]);

  return (
    <motion.div
      className="rounded-2xl bg-glass/80 p-6 shadow-xl w-full max-w-2xl mx-auto mb-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      aria-label="Social Feed Widget"
    >
      <div className="flex items-center gap-3 mb-4">
        <Twitter className="text-brand w-6 h-6" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight">Social Feed</h2>
        <span className="ml-auto text-xs text-muted">
          {symbol.toUpperCase()}
        </span>
      </div>
      <div
        ref={containerRef}
        className="overflow-y-auto max-h-96 custom-scrollbar focus:outline-none"
        tabIndex={0}
        aria-label="Feed list"
        aria-live="polite"
        style={{ outline: "none", height: 384 }}
      >
        <AnimatePresence>
          <List
            height={384}
            itemCount={mergedFeed.length}
            itemSize={ITEM_HEIGHT}
            width={"100%"}
          >
            {Row}
          </List>
        </AnimatePresence>
        {isLoading && (
          <div className="flex items-center justify-center py-4 animate-pulse">
            <div className="w-6 h-6 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-brand">Loading…</span>
          </div>
        )}
        {error && (
          <div className="text-center text-red-400 py-8">
            Failed to load feed.
          </div>
        )}
        {!isLoading && mergedFeed.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No feed items found.
          </div>
        )}
        {hasMore && !isLoading && (
          <button
            className="w-full mt-2 py-2 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300"
            onClick={() => {}}
            aria-label="Load more feed items"
            disabled
          >
            Load More
          </button>
        )}
      </div>
      {/* Live region for screen readers */}
      <div
        ref={liveRegionRef}
        aria-live="assertive"
        role="status"
        className="sr-only"
      />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(120deg, #00ffa3 0%, #0057ff 100%);
          border-radius: 8px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #00ffa3 #0057ff;
        }
      `}</style>
    </motion.div>
  );
};

export const SocialFeedWidget = memo(SocialFeedWidgetComponent);
