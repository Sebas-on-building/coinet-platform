import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from '@/lib/motion';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { VariantCard } from '@/components/ui/Card/VariantCard';
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
import {
  ArrowPathIcon,
  BellIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MoonIcon,
  SunIcon,
  CogIcon,
  BoltIcon as LightningBoltIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { VariantOptions } from '@/hooks/useVariant';
import { Tab } from '@headlessui/react';

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
    <div className="w-full h-full min-h-[400px] flex items-center justify-center backdrop-blur-lg rounded-xl">
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

// Visual Variants for different UI components
const chartCardVariant: VariantOptions = {
  type: 'frosted',
  intensity: 'strong',
  glow: 'medium',
  animation: 'subtle'
};

const orderFormCardVariant: VariantOptions = {
  type: 'neon',
  intensity: 'normal',
  glow: 'subtle',
  color: 'primary',
  animation: 'subtle'
};

const orderBookCardVariant: VariantOptions = {
  type: 'neon',
  intensity: 'light',
  animation: 'subtle',
  color: 'secondary'
};

const portfolioCardVariant: VariantOptions = {
  type: 'minimal',
  glow: 'subtle',
  animation: 'subtle'
};

const historyCardVariant: VariantOptions = {
  type: 'minimal',
  glow: 'subtle',
  animation: 'subtle'
};

// Button variants
const primaryButtonVariant: VariantOptions = {
  type: 'neon',
  intensity: 'normal',
  glow: 'medium',
  color: 'primary'
};

const secondaryButtonVariant: VariantOptions = {
  type: 'frosted',
  intensity: 'normal',
  glow: 'subtle'
};

// Import strategy builder component with dynamic loading
const VisualStrategyBuilder = dynamic(
  () => import('../charts/VisualStrategyBuilder'),
  { ssr: false, loading: () => <div className="w-full h-[600px] flex items-center justify-center">Loading strategy builder...</div> }
);

// Placeholder components
const TradingChart = dynamic(
  () => import('../charts/TradingChart'),
  { ssr: false, loading: () => <div className="w-full h-[500px] flex items-center justify-center">Loading chart...</div> }
);

const AdvancedParameterControls = dynamic(
  () => import('../charts/AdvancedParameterControls'),
  { ssr: false }
);

/**
 * Tab content helpers
 */
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Enhanced Trading Dashboard
 * 
 * A comprehensive trading dashboard featuring advanced charting,
 * visual strategy building, and portfolio optimization tools.
 */
const EnhancedTradingDashboard: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Responsive layout state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Trading state
  const [selectedMarket, setSelectedMarket] = useState({ base: 'BTC', quote: 'USDT' });
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframes[3]); // Default to 1h
  const [selectedChartType, setSelectedChartType] = useState(chartTypes[0]); // Default to candles
  const [selectedOrderType, setSelectedOrderType] = useState(orderTypes[0]); // Default to market
  const [isBuySelected, setIsBuySelected] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'default' | 'advanced' | 'compact'>('default');

  // Dashboard visual style variant
  const [dashboardVariant, setDashboardVariant] = useState<'default' | 'frosted' | 'neon' | 'minimal'>('frosted');

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

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle theme toggle
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

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

  // Determine background gradient based on theme
  const backgroundClass = isDark
    ? 'bg-gradient-to-br from-[#0a0a23] via-[#18192b] to-[#23234d]'
    : 'bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9]';

  // State for strategy code
  const [strategyCode, setStrategyCode] = useState<string>('');
  const [isStrategyValid, setIsStrategyValid] = useState<boolean>(false);

  // Callback for when strategy generates code
  const handleCodeGenerate = useCallback((code: string) => {
    setStrategyCode(code);
  }, []);

  // Callback for strategy validation changes
  const handleStrategyChange = useCallback((valid: boolean) => {
    setIsStrategyValid(valid);
  }, []);

  // Sample parameter groups for the trading chart
  const chartParameters = [
    {
      id: 'chart',
      name: 'Chart Settings',
      expanded: true,
      parameters: [
        {
          id: 'timeframe',
          name: 'Timeframe',
          type: 'select' as const,
          value: '1h',
          defaultValue: '1h',
          options: [
            { label: '1 minute', value: '1m' },
            { label: '5 minutes', value: '5m' },
            { label: '15 minutes', value: '15m' },
            { label: '1 hour', value: '1h' },
            { label: '4 hours', value: '4h' },
            { label: '1 day', value: '1d' },
          ]
        },
        {
          id: 'chartType',
          name: 'Chart Type',
          type: 'select' as const,
          value: 'candle',
          defaultValue: 'candle',
          options: [
            { label: 'Candlestick', value: 'candle' },
            { label: 'OHLC', value: 'ohlc' },
            { label: 'Line', value: 'line' },
            { label: 'Area', value: 'area' }
          ]
        },
        {
          id: 'theme',
          name: 'Chart Theme',
          type: 'select' as const,
          value: 'auto',
          defaultValue: 'auto',
          options: [
            { label: 'System Default', value: 'auto' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'TradingView', value: 'tradingview' }
          ]
        }
      ]
    },
    {
      id: 'indicators',
      name: 'Indicators',
      expanded: true,
      parameters: [
        {
          id: 'showMA',
          name: 'Moving Average',
          type: 'boolean' as const,
          value: true,
          defaultValue: true
        },
        {
          id: 'maPeriod',
          name: 'MA Period',
          type: 'number' as const,
          value: 20,
          defaultValue: 20,
          min: 5,
          max: 200,
          step: 1,
          dependsOn: 'showMA',
          dependsValue: true
        },
        {
          id: 'showVolume',
          name: 'Volume',
          type: 'boolean' as const,
          value: true,
          defaultValue: true
        },
        {
          id: 'showRSI',
          name: 'RSI',
          type: 'boolean' as const,
          value: false,
          defaultValue: false
        },
        {
          id: 'rsiPeriod',
          name: 'RSI Period',
          type: 'number' as const,
          value: 14,
          defaultValue: 14,
          min: 2,
          max: 50,
          step: 1,
          dependsOn: 'showRSI',
          dependsValue: true
        }
      ]
    }
  ];

  // Handle chart parameter changes
  const handleChartParamChange = (parameterId: string, value: any) => {
    console.log('Chart parameter changed:', parameterId, value);
    // In a real app, this would update the chart configuration
  };

  return (
    <div className={`w-full min-h-screen ${backgroundClass}`}>
      <div className={`container mx-auto p-4 ${isFullscreen ? 'max-w-none' : ''}`}>
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
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="backdrop-blur-md"
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4 mr-1" />
              )}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>

            <Button
              variant="glass"
              size="sm"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="backdrop-blur-md"
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 mr-1" />
              ) : (
                <MoonIcon className="w-4 h-4 mr-1" />
              )}
              {isDark ? 'Light Mode' : 'Dark Mode'}
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
            <VariantCard
              variant={chartCardVariant}
              className="h-[600px] overflow-hidden"
              withPadding={false}
            >
              <div className="flex justify-between items-center p-4">
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
            </VariantCard>
          </div>

          {/* Order panel and book - spans 1 column on large screens */}
          <div className="lg:col-span-1 space-y-4">
            {/* Order form */}
            <VariantCard
              variant={orderFormCardVariant}
              className="overflow-hidden"
            >
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
            </VariantCard>

            {/* Order book and trade history */}
            <VariantCard
              variant={orderBookCardVariant}
              className="overflow-hidden"
              withPadding={false}
            >
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
            </VariantCard>
          </div>
        </div>

        {/* Portfolio, open orders, and trade history section */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <VariantCard
            variant={portfolioCardVariant}
            title="Portfolio Summary"
            animate={true}
          >
            <PortfolioSummary portfolio={portfolio} totalBalance={totalBalance} />
          </VariantCard>

          <VariantCard
            variant={historyCardVariant}
            className="lg:col-span-2"
            animate={true}
            withHeader={false}
          >
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
          </VariantCard>
        </div>

        {/* Strategy Builder and Backtest section */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Tab.Group>
              <Tab.List className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
                <Tab
                  className={({ selected }) =>
                    classNames(
                      'w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center',
                      'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                      selected
                        ? 'bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                    )
                  }
                >
                  <ChartBarIcon className="w-5 h-5 mr-2" />
                  Chart
                </Tab>
                <Tab
                  className={({ selected }) =>
                    classNames(
                      'w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center',
                      'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                      selected
                        ? 'bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                    )
                  }
                >
                  <CogIcon className="w-5 h-5 mr-2" />
                  Strategy Builder
                </Tab>
                <Tab
                  className={({ selected }) =>
                    classNames(
                      'w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center',
                      'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                      selected
                        ? 'bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                    )
                  }
                >
                  <LightningBoltIcon className="w-5 h-5 mr-2" />
                  Backtest
                </Tab>
              </Tab.List>

              <Tab.Panels className="mt-2">
                {/* Chart Panel */}
                <Tab.Panel>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <TradingChart />
                    </div>
                    <div className="lg:col-span-1">
                      <AdvancedParameterControls
                        groups={chartParameters}
                        onChange={handleChartParamChange}
                      />
                    </div>
                  </div>
                </Tab.Panel>

                {/* Strategy Builder Panel */}
                <Tab.Panel>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <VisualStrategyBuilder
                        onCodeGenerate={handleCodeGenerate}
                        onStrategyChange={handleStrategyChange}
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                            <DocumentTextIcon className="w-5 h-5 mr-2" />
                            Generated Code
                          </h3>
                          <div className={`px-2 py-1 text-xs rounded-full ${isStrategyValid ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}`}>
                            {isStrategyValid ? 'Valid' : 'Incomplete'}
                          </div>
                        </div>

                        <div className="p-4">
                          {strategyCode ? (
                            <pre className="text-xs bg-gray-50 dark:bg-gray-850 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
                              <code className="text-gray-800 dark:text-gray-300">
                                {strategyCode}
                              </code>
                            </pre>
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                              <DocumentTextIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                              <p>Create a strategy in the builder to generate code</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab.Panel>

                {/* Backtest Panel */}
                <Tab.Panel>
                  <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                    <LightningBoltIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-xl font-medium mb-2">Backtest Your Strategies</h3>
                    <p className="max-w-md mx-auto">
                      Create a strategy in the strategy builder tab first, then run comprehensive backtests with historical data.
                    </p>
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTradingDashboard; 