import { ReactNode } from "react";
import { PriceChart } from "./PriceChart";
import { OnChainFlow } from "./OnChainFlow";
import { SocialBuzz } from "./SocialBuzz";
import { Tokenomics } from "./Tokenomics";
import { Execution } from "./Execution";
import { AdvancedAnalytics } from "./AdvancedAnalytics";
import { PortfolioAnalytics } from "./PortfolioAnalytics";
import { CustomAlerts } from "./CustomAlerts";
import { useCoinGeckoMarket } from "@/hooks/useCoinGeckoMarket";
import { useCoinGeckoAdvancedStats } from "@/hooks/useCoinGeckoAdvancedStats";
import { useCoinGeckoSearch } from "@/hooks/useCoinGeckoSearch";
import { useState, useEffect } from "react";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { NewsWidget } from "./NewsWidget";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import { MarketOverview as MarketOverviewWidget } from "@/components/widgets/MarketOverview";
import { TradingViewChart } from "@/components/widgets/TradingViewChart";
import { ChartBuilder } from "@/components/widgets/ChartBuilder";
import { CoinProfile } from "@/components/widgets/CoinProfile";

interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
  className?: string;
}

function TrendingCoins({
  onStar,
  watchlist,
  onSelect,
}: {
  onStar: (id: string, name: string) => void;
  watchlist: { id: string; name: string }[];
  onSelect: (id: string) => void;
}) {
  const { trending, loading, error } = useCoinGeckoMarket();
  if (loading)
    return <div className="text-gray-400">Loading trending coins...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  return (
    <div className="flex gap-4 overflow-x-auto">
      <AnimatePresence>
        {trending.map((coin) => {
          const isFav = watchlist.some((c) => c.id === coin.id);
          return (
            <motion.div
              key={coin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-w-[160px] bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-lg p-4 flex flex-col items-center border border-gray-700 relative group hover:scale-105 hover:shadow-2xl transition-all duration-300"
            >
              <button
                className="absolute top-2 right-2 text-yellow-400 opacity-80 hover:opacity-100 transition-all duration-200"
                onClick={() => onStar(coin.id, coin.name)}
                title={isFav ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                {isFav ? (
                  <StarSolid className="h-5 w-5" />
                ) : (
                  <StarOutline className="h-5 w-5" />
                )}
              </button>
              <img
                src={coin.image}
                alt={coin.name}
                className="w-10 h-10 rounded-full mb-2 bg-gray-700"
              />
              <div className="text-white font-semibold">{coin.name}</div>
              <div className="text-gray-400 text-xs uppercase">
                {coin.symbol}
              </div>
              <div className="text-green-400 text-sm mt-1">
                Rank #{coin.market_cap_rank ?? "?"}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function SearchBar({
  onSelect,
  compareMode,
  selectedCoins,
  onRemove,
  onStar,
  watchlist,
}: {
  onSelect: (coinId: string, coinName: string) => void;
  compareMode: boolean;
  selectedCoins: { id: string; name: string }[];
  onRemove: (coinId: string) => void;
  onStar: (id: string, name: string) => void;
  watchlist: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const { results, loading } = useCoinGeckoSearch(query);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="w-full flex flex-col items-center mb-6 relative z-20">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCoins.map((coin) => (
          <span
            key={coin.id}
            className="bg-blue-700 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm"
          >
            {coin.name}
            <button
              onClick={() => onRemove(coin.id)}
              className="ml-1 text-white hover:text-red-300"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={
          compareMode ? "Add coin to compare..." : "Search for a coin..."
        }
        className="w-full max-w-md px-5 py-3 rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700 text-white placeholder-gray-400 shadow focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        disabled={compareMode && selectedCoins.length >= 3}
      />
      {showDropdown && query.length > 1 && (
        <div className="absolute top-14 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-lg mt-1 overflow-y-auto max-h-72">
          {loading && <div className="p-4 text-gray-400">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="p-4 text-gray-400">No results</div>
          )}
          {results.map((coin) => {
            const isFav = watchlist.some((c) => c.id === coin.id);
            return (
              <div
                key={coin.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer transition group"
                onMouseDown={() => {
                  onSelect(coin.id, coin.name);
                  setQuery("");
                  setShowDropdown(false);
                }}
              >
                <img
                  src={coin.thumb}
                  alt={coin.symbol}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white font-medium">{coin.name}</span>
                <span className="text-gray-400 text-xs uppercase">
                  {coin.symbol}
                </span>
                <button
                  className="ml-auto text-yellow-400 opacity-80 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStar(coin.id, coin.name);
                  }}
                  title={isFav ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  {isFav ? (
                    <StarSolid className="h-5 w-5" />
                  ) : (
                    <StarOutline className="h-5 w-5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useWatchlistPrices(watchlist: { id: string; name: string }[]) {
  const [prices, setPrices] = useState<{
    [id: string]: { price: number; change: number };
  }>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (watchlist.length === 0) return;
    setLoading(true);
    Promise.all(
      watchlist.map((coin) =>
        fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`)
          .then((res) => res.json())
          .then((data) => ({
            id: coin.id,
            price: data.market_data?.current_price?.usd ?? 0,
            change: data.market_data?.price_change_percentage_24h ?? 0,
          })),
      ),
    ).then((results) => {
      const priceMap: { [id: string]: { price: number; change: number } } = {};
      results.forEach((r) => {
        priceMap[r.id] = { price: r.price, change: r.change };
      });
      setPrices(priceMap);
      setLoading(false);
    });
  }, [JSON.stringify(watchlist)]);
  return { prices, loading };
}

function WatchlistBar({
  watchlist,
  onSelect,
  compareMode,
  onReorder,
}: {
  watchlist: { id: string; name: string }[];
  onSelect: (id: string) => void;
  compareMode: boolean;
  onReorder: (newList: { id: string; name: string }[]) => void;
}) {
  const { prices, loading } = useWatchlistPrices(watchlist);
  if (watchlist.length === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap gap-2 items-center">
      <span className="font-semibold text-gray-400 mr-2">Watchlist:</span>
      <DragDropContext
        onDragEnd={(result: DropResult) => {
          if (!result.destination) return;
          const reordered = Array.from(watchlist);
          const [removed] = reordered.splice(result.source.index, 1);
          reordered.splice(result.destination.index, 0, removed);
          onReorder(reordered);
        }}
      >
        <Droppable droppableId="watchlist-bar" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-wrap gap-2 items-center"
            >
              <AnimatePresence>
                {watchlist.map((coin, idx) => {
                  const price = prices[coin.id]?.price;
                  const change = prices[coin.id]?.change;
                  return (
                    <Draggable key={coin.id} draggableId={coin.id} index={idx}>
                      {(dragProvided) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="inline-block"
                        >
                          <button
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-semibold hover:bg-yellow-300 transition-all duration-200 active:scale-95"
                            onClick={() => onSelect(coin.id)}
                          >
                            <StarSolid className="h-4 w-4" /> {coin.name}
                            {loading ? (
                              <span className="ml-2 text-xs text-gray-500">
                                ...
                              </span>
                            ) : price !== undefined ? (
                              <span className="ml-2 text-xs">
                                ${price.toLocaleString()}{" "}
                                <span
                                  className={
                                    change > 0
                                      ? "text-green-600"
                                      : change < 0
                                        ? "text-red-600"
                                        : "text-gray-600"
                                  }
                                >
                                  {change > 0 ? "+" : ""}
                                  {change?.toFixed(2)}%
                                </span>
                              </span>
                            ) : null}
                          </button>
                        </motion.div>
                      )}
                    </Draggable>
                  );
                })}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

function AdvancedStats() {
  const { gainers, losers, recent, loading, error } =
    useCoinGeckoAdvancedStats();
  if (loading)
    return <div className="text-gray-400">Loading advanced stats...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      {/* Top Gainers */}
      <div className="bg-gradient-to-br from-green-800/80 to-gray-900/80 rounded-xl shadow-lg p-6 border border-green-700 hover:scale-[1.03] hover:shadow-2xl transition-transform cursor-pointer">
        <div className="text-gray-300 text-xs mb-2">Top Gainers (24h)</div>
        {gainers.map((coin) => (
          <div key={coin.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <img
                src={coin.image}
                alt={coin.symbol}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-white text-sm font-medium">
                {coin.name}
              </span>
              <span className="text-gray-400 text-xs uppercase">
                {coin.symbol}
              </span>
            </div>
            <span className="text-green-400 font-semibold text-sm">
              +{coin.price_change_percentage_24h.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {/* Top Losers */}
      <div className="bg-gradient-to-br from-red-800/80 to-gray-900/80 rounded-xl shadow-lg p-6 border border-red-700 hover:scale-[1.03] hover:shadow-2xl transition-transform cursor-pointer">
        <div className="text-gray-300 text-xs mb-2">Top Losers (24h)</div>
        {losers.map((coin) => (
          <div key={coin.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <img
                src={coin.image}
                alt={coin.symbol}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-white text-sm font-medium">
                {coin.name}
              </span>
              <span className="text-gray-400 text-xs uppercase">
                {coin.symbol}
              </span>
            </div>
            <span className="text-red-400 font-semibold text-sm">
              {coin.price_change_percentage_24h.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {/* Recently Added */}
      <div className="bg-gradient-to-br from-blue-800/80 to-gray-900/80 rounded-xl shadow-lg p-6 border border-blue-700 hover:scale-[1.03] hover:shadow-2xl transition-transform cursor-pointer">
        <div className="text-gray-300 text-xs mb-2">Recently Added</div>
        {recent.map((coin) => (
          <div key={coin.id} className="flex items-center gap-2 py-1">
            <span className="text-white text-sm font-medium">{coin.name}</span>
            <span className="text-gray-400 text-xs uppercase">
              {coin.symbol}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardWidget({
  title,
  children,
  className = "",
}: DashboardWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-xl border border-gray-700 backdrop-blur-md ${className}`}
      style={{ boxShadow: "0 4px 32px 0 rgba(0,0,0,0.25)" }}
    >
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white tracking-wide">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

export function DashboardLayout() {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState<
    { id: string; name: string }[]
  >([{ id: "bitcoin", name: "Bitcoin" }]);
  const [watchlist, setWatchlist] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") return stored;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches)
        return "dark";
    }
    return "light";
  });
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("watchlist");
    if (stored) setWatchlist(JSON.parse(stored));
  }, []);
  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleSelectCoin = (id: string, name: string) => {
    if (compareMode) {
      if (selectedCoins.find((c) => c.id === id) || selectedCoins.length >= 3)
        return;
      setSelectedCoins([...selectedCoins, { id, name }]);
    } else {
      setSelectedCoins([{ id, name }]);
    }
  };
  const handleRemoveCoin = (id: string) => {
    setSelectedCoins(selectedCoins.filter((c) => c.id !== id));
  };
  const handleStar = (id: string, name: string) => {
    if (watchlist.find((c) => c.id === id)) {
      setWatchlist(watchlist.filter((c) => c.id !== id));
    } else {
      setWatchlist([...watchlist, { id, name }]);
    }
  };
  const handleReorderWatchlist = (newList: { id: string; name: string }[]) => {
    setWatchlist(newList);
  };

  if (!selectedCoins.length) {
    return (
      <div className="text-red-500">
        No coin selected. Please select a coin to view dashboard data.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Theme Toggle */}
      <div className="flex items-center justify-end mb-4">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
        >
          {theme === "dark" ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      {/* Watchlist Bar */}
      <WatchlistBar
        watchlist={watchlist}
        onSelect={setSelectedCoinId}
        compareMode={compareMode}
        onReorder={handleReorderWatchlist}
      />
      {/* Compare Toggle */}
      <div className="flex items-center justify-end mb-2">
        <button
          className={`px-4 py-2 rounded-lg font-semibold transition ${compareMode ? "bg-blue-700 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => {
            setCompareMode(!compareMode);
            if (!compareMode && selectedCoins.length === 1) return;
            if (!compareMode && selectedCoins.length > 1)
              setSelectedCoins([selectedCoins[0]]);
          }}
        >
          {compareMode ? "Exit Compare" : "Compare Coins"}
        </button>
      </div>
      {/* Search Bar */}
      <SearchBar
        onSelect={(id, name) => setSelectedCoinId(id)}
        compareMode={compareMode}
        selectedCoins={selectedCoins}
        onRemove={handleRemoveCoin}
        onStar={handleStar}
        watchlist={watchlist}
      />
      {/* Top: Trending Coins and Market Overview */}
      <div className="mb-8 space-y-6">
        <TrendingCoins
          onStar={handleStar}
          watchlist={watchlist}
          onSelect={setSelectedCoinId}
        />
        <MarketOverviewWidget />
        <AdvancedStats />
        <DashboardWidget title="Chart Builder">
          <ChartBuilder />
        </DashboardWidget>
      </div>
      {/* Compare Mode: Side-by-side widgets */}
      {compareMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {selectedCoins.map((coin) => (
            <div key={coin.id} className="space-y-8">
              <DashboardWidget title={`${coin.name} Price Chart`}>
                <TradingViewChart />
              </DashboardWidget>
              <DashboardWidget title={`${coin.name} Tokenomics`}>
                <Tokenomics coinId={coin.id} />
              </DashboardWidget>
              <DashboardWidget title={`${coin.name} Analytics`}>
                <AdvancedAnalytics coinId={coin.id} />
              </DashboardWidget>
              <DashboardWidget title="Latest News">
                <NewsWidget coinId={coin.id} />
              </DashboardWidget>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - Left Side (3 columns) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Price Chart Widget - Spans 2 columns */}
              <div className="lg:col-span-2">
                <DashboardWidget title="Price Chart">
                  <TradingViewChart />
                </DashboardWidget>
              </div>
              {/* On-Chain Flow Widget */}
              <div className="lg:col-span-1">
                <DashboardWidget title="On-Chain Flow">
                  <OnChainFlow coinId={selectedCoins[0].id} />
                </DashboardWidget>
              </div>
            </div>
            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DashboardWidget title="Advanced Analytics">
                <AdvancedAnalytics coinId={selectedCoins[0].id} />
              </DashboardWidget>
              <DashboardWidget title="Portfolio Analytics">
                <PortfolioAnalytics coinId={selectedCoins[0].id} />
              </DashboardWidget>
            </div>
            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <DashboardWidget title="Social Sentiment">
                <SocialBuzz coinId={selectedCoins[0].id} />
              </DashboardWidget>
              <DashboardWidget title="Tokenomics">
                <Tokenomics coinId={selectedCoins[0].id} />
              </DashboardWidget>
              <DashboardWidget title="Execution Status">
                <Execution coinId={selectedCoins[0].id} />
              </DashboardWidget>
            </div>
            {/* News Widget Row */}
            <DashboardWidget title="Latest News">
              <NewsWidget coinId={selectedCoins[0].id} />
            </DashboardWidget>
          </div>
          {/* Right Sidebar (1 column) */}
          <div className="lg:col-span-1 space-y-8">
            <DashboardWidget title="Custom Alerts" className="sticky top-6">
              <CustomAlerts coinId={selectedCoins[0].id} />
            </DashboardWidget>
          </div>
        </div>
      )}
    </div>
  );
}
