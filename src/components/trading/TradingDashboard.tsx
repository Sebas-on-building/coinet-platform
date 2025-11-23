import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from '@/lib/motion';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import MarketSelector from './MarketSelector';
import OrderBook from './OrderBook';
import TradeHistory from './TradeHistory';
import PortfolioSummary from './PortfolioSummary';
import OrderForm from './OrderForm';
import MarketDepth from './MarketDepth';
import TimeframeSelector from './TimeframeSelector';
import TradingToolbar from './TradingToolbar';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingPreferences } from '@/hooks/useTradingPreferences';
import { ArrowPathIcon, BellIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

// Mock hooks for missing modules
const usePortfolio = () => ({
  portfolio: {},
  totalBalance: 0,
  refreshPortfolio: () => { }
});

// Define the type for the message to avoid type errors
interface SocketMessage {
  type: string;
  [key: string]: any;
}

const useSocket = () => ({
  isConnected: false,
  lastMessage: null as SocketMessage | null
});

// Dynamically import the chart component to avoid SSR issues
const TradingViewChart = dynamic(() => import('./TradingViewChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-surface/30 dark:bg-surface-dark/30 backdrop-blur-lg rounded-xl">
      <LoadingSpinner size="lg" text="Loading chart..." />
    </div>
  ),
});

// AnimatedNumber component for smooth price transitions
const AnimatedNumber = ({ value, precision = 2 }: { value: number; precision?: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.6, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0.6, y: -8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="tabular-nums"
    >
      {value.toFixed(precision)}
    </motion.span>
  );
};

const timeframes = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1h' },
  { id: '4h', label: '4h' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

const chartTypes = [
  { id: 'candles', label: 'Candles' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
  { id: 'bars', label: 'Bars' },
];

const orderTypes = [
  { id: 'market', label: 'Market' },
  { id: 'limit', label: 'Limit' },
  { id: 'stop', label: 'Stop' },
  { id: 'oco', label: 'OCO' },
];

const TradingDashboard: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Trading state
  const [selectedMarket, setSelectedMarket] = useState({ base: 'BTC', quote: 'USDT' });
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframes[3]); // Default to 1h
  const [selectedChartType, setSelectedChartType] = useState(chartTypes[0]); // Default to candles
  const [selectedOrderType, setSelectedOrderType] = useState(orderTypes[0]); // Default to market
  const [isBuySelected, setIsBuySelected] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'default' | 'advanced' | 'compact'>('default');

  // Fetch real-time market data using custom hook
  const {
    latestTick,
    tickHistory,
    isConnected,
    isConnecting,
    error,
    priceChange1m,
    priceChange5m,
    priceChange15m,
    priceChange1h,
    connect,
    disconnect
  } = useMarketData({
    symbol: `${selectedMarket.base}${selectedMarket.quote}`,
    exchange: 'binance'
  });

  // Derive values from the hook data
  const lastPrice = latestTick?.price || 0;
  const priceChangePercent = priceChange1h.percentChange || 0;

  // Use the latest tick for additional market data
  const high24h = latestTick?.high || 0;
  const low24h = latestTick?.low || 0;
  const volume24h = latestTick?.volume || 0;

  // Create mock data for components that expect it
  const orderBook = useMemo(() => ({
    bids: [],
    asks: []
  }), []);

  const tradeHistory = useMemo(() =>
    tickHistory.map(tick => {
      const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
      return {
        id: tick.timestamp.toString(),
        price: tick.price,
        amount: tick.volume || 0,
        time: new Date(tick.timestamp).toISOString(),
        side
      };
    })
    , [tickHistory]);

  const chartData = useMemo(() =>
    tickHistory.map(tick => ({
      time: new Date(tick.timestamp).toISOString(),
      open: tick.price,
      high: tick.price * 1.0005,
      low: tick.price * 0.9995,
      close: tick.price,
      volume: tick.volume || 0
    }))
    , [tickHistory]);

  // Function to refresh data
  const refreshData = () => {
    // Reconnect to refresh data
    disconnect();
    connect();
  };

  // Helper for checking loading state
  const isLoading = isConnecting || tickHistory.length === 0;

  // Trading preferences and portfolio data
  const { preferences, updatePreferences } = useTradingPreferences();
  const { portfolio, totalBalance, refreshPortfolio } = usePortfolio();

  // Socket connection for real-time updates
  const { isConnected: socketConnected, lastMessage } = useSocket();

  // Smooth color transition for price changes
  const priceColor = useMemo(() => {
    if (priceChangePercent > 0) return 'text-green-500';
    if (priceChangePercent < 0) return 'text-red-500';
    return 'text-gray-500 dark:text-gray-400';
  }, [priceChangePercent]);

  // Effect to handle real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'price_update') {
      // Update happens automatically via the useMarketData hook
    }
  }, [lastMessage]);

  // Memoized rendering of price information
  const PriceInfo = useMemo(() => (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <AnimatePresence mode="wait">
          <motion.h2
            key={lastPrice}
            className="text-3xl font-bold tabular-nums"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.8 }}
          >
            ${lastPrice?.toFixed(2) || '0.00'}
          </motion.h2>
        </AnimatePresence>
        <span className={`${priceColor} text-lg font-medium`}>
          {priceChangePercent > 0 ? '+' : ''}{priceChangePercent?.toFixed(2)}%
        </span>
      </div>
      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>24h H: <span className="font-medium text-gray-700 dark:text-gray-300">${high24h?.toFixed(2) || '0.00'}</span></span>
        <span>24h L: <span className="font-medium text-gray-700 dark:text-gray-300">${low24h?.toFixed(2) || '0.00'}</span></span>
        <span>24h Vol: <span className="font-medium text-gray-700 dark:text-gray-300">${(volume24h / 1000000 || 0).toFixed(2)}M</span></span>
      </div>
    </div>
  ), [lastPrice, priceChangePercent, high24h, low24h, volume24h, priceColor]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] dark:from-[#0a0a23] dark:via-[#18192b] dark:to-[#23234d]">
      <div className="container mx-auto p-4">
        {/* Header section with market selection and price info */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <MarketSelector
              selectedMarket={selectedMarket}
              onSelect={setSelectedMarket}
            />
            {PriceInfo}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={refreshData}
              aria-label="Refresh data"
              className="backdrop-blur-md"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              Refresh
            </Button>

            <Button
              variant={showAnalysis ? "primary" : "glass"}
              size="sm"
              onClick={() => setShowAnalysis(!showAnalysis)}
              aria-label="Toggle analysis"
              className="backdrop-blur-md"
            >
              <ChartBarIcon className="w-4 h-4 mr-1" />
              Analysis
            </Button>

            <Button
              variant="glass"
              size="sm"
              aria-label="Set alerts"
              className="backdrop-blur-md"
            >
              <BellIcon className="w-4 h-4 mr-1" />
              Alerts
            </Button>

            <Button
              variant="glass"
              size="sm"
              aria-label="Settings"
              className="backdrop-blur-md"
            >
              <Cog6ToothIcon className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main trading interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chart area - spans 3 columns on large screens */}
          <div className="lg:col-span-3">
            <Card variant="glass" className="p-4 backdrop-blur-xl h-[600px] overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <TimeframeSelector
                  timeframes={timeframes}
                  selected={selectedTimeframe}
                  onSelect={setSelectedTimeframe}
                />
                <TradingToolbar
                  chartTypes={chartTypes}
                  selectedType={selectedChartType}
                  onSelectType={setSelectedChartType}
                  showAnalysis={showAnalysis}
                  onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
                />
              </div>

              {/* Chart component */}
              <div className="h-[500px] relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner size="lg" text="Loading chart data..." />
                  </div>
                ) : (
                  <TradingViewChart
                    data={chartData}
                    symbol={`${selectedMarket.base}/${selectedMarket.quote}`}
                    timeframe={selectedTimeframe.id}
                    chartType={selectedChartType.id}
                    theme={isDark ? 'dark' : 'light'}
                    showAnalysis={showAnalysis}
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Order panel and book - spans 1 column on large screens */}
          <div className="lg:col-span-1 space-y-4">
            {/* Order form */}
            <Card variant="glass" className="p-4 backdrop-blur-xl">
              <Tabs
                tabs={[
                  { id: 'buy', label: 'Buy', icon: null },
                  { id: 'sell', label: 'Sell', icon: null }
                ]}
                activeTab={isBuySelected ? 'buy' : 'sell'}
                onChange={(tab) => setIsBuySelected(tab === 'buy')}
                variant="pills"
                className="mb-4"
              >
                {/* Empty child to satisfy the children prop requirement */}
                <div></div>
              </Tabs>

              <Tabs
                tabs={orderTypes.map(type => ({ id: type.id, label: type.label, icon: null }))}
                activeTab={selectedOrderType.id}
                onChange={(id) => setSelectedOrderType(orderTypes.find(type => type.id === id) || orderTypes[0])}
                variant="underline"
                className="mb-4"
              >
                {/* Empty child to satisfy the children prop requirement */}
                <div></div>
              </Tabs>

              <OrderForm
                orderType={selectedOrderType.id}
                side={isBuySelected ? 'buy' : 'sell'}
                market={selectedMarket}
                lastPrice={lastPrice || 0}
                portfolio={portfolio}
              />
            </Card>

            {/* Order book and trade history */}
            <Card variant="glass" className="backdrop-blur-xl overflow-hidden">
              <Tabs
                tabs={[
                  { id: 'orderbook', label: 'Order Book', icon: null },
                  { id: 'trades', label: 'Trades', icon: null },
                  { id: 'depth', label: 'Depth', icon: null }
                ]}
                variant="segmented"
                className="p-2"
                contentClassName="h-[360px] overflow-hidden"
              >
                <OrderBook
                  data={orderBook}
                  lastPrice={lastPrice || 0}
                  maxRows={15}
                  market={selectedMarket}
                />
                <TradeHistory
                  data={tradeHistory}
                  maxRows={15}
                  market={selectedMarket}
                />
                <MarketDepth
                  data={orderBook}
                  lastPrice={lastPrice || 0}
                  market={selectedMarket}
                />
              </Tabs>
            </Card>
          </div>
        </div>

        {/* Portfolio, open orders, and trade history section */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card variant="glass" className="p-4 backdrop-blur-xl">
            <h3 className="text-lg font-bold mb-3">Portfolio Summary</h3>
            <PortfolioSummary portfolio={portfolio} totalBalance={totalBalance} />
          </Card>

          <Card variant="glass" className="p-4 backdrop-blur-xl lg:col-span-2">
            <Tabs
              tabs={[
                { id: 'open-orders', label: 'Open Orders', icon: null },
                { id: 'order-history', label: 'Order History', icon: null },
                { id: 'trade-history', label: 'Trade History', icon: null }
              ]}
              variant="underline"
              className="mb-4"
            >
              <div className="h-[220px] overflow-y-auto">
                {/* These components would be implemented in their own files */}
                <div id="open-orders">
                  {/* Open orders component */}
                  <p className="text-center text-gray-500 dark:text-gray-400 py-10">No open orders</p>
                </div>
                <div id="order-history">
                  {/* Order history component */}
                  <p className="text-center text-gray-500 dark:text-gray-400 py-10">No recent orders</p>
                </div>
                <div id="trade-history">
                  {/* Trade history component */}
                  <p className="text-center text-gray-500 dark:text-gray-400 py-10">No recent trades</p>
                </div>
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard; 