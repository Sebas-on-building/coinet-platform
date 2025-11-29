import { useState, useEffect } from 'react';

// Types
export interface TradingPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultLayout: 'default' | 'advanced' | 'compact';
  showOrderBook: boolean;
  showTradeHistory: boolean;
  showDepthChart: boolean;
  favoriteMarkets: string[];
  defaultTimeframe: string;
  defaultChartType: string;
  indicators: {
    id: string;
    visible: boolean;
  }[];
  alertVolume: boolean;
  tradeSounds: boolean;
}

// Default preferences
const defaultPreferences: TradingPreferences = {
  theme: 'system',
  defaultLayout: 'default',
  showOrderBook: true,
  showTradeHistory: true,
  showDepthChart: true,
  favoriteMarkets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  defaultTimeframe: '1h',
  defaultChartType: 'candles',
  indicators: [
    { id: 'ma20', visible: true },
    { id: 'ma50', visible: true },
    { id: 'ma200', visible: false },
    { id: 'rsi', visible: false },
    { id: 'macd', visible: false },
    { id: 'volume', visible: true },
    { id: 'bollinger', visible: false },
    { id: 'fibonacci', visible: false },
  ],
  alertVolume: true,
  tradeSounds: true,
};

export function useTradingPreferences() {
  const [preferences, setPreferences] = useState<TradingPreferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('tradingPreferences');

    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse trading preferences:', error);
      }
    }

    setLoaded(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem('tradingPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save trading preferences:', error);
    }
  }, [preferences, loaded]);

  // Update preferences
  const updatePreferences = (newPreferences: Partial<TradingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  // Toggle individual indicator
  const toggleIndicator = (indicatorId: string) => {
    setPreferences(prev => ({
      ...prev,
      indicators: prev.indicators.map(indicator =>
        indicator.id === indicatorId
          ? { ...indicator, visible: !indicator.visible }
          : indicator
      ),
    }));
  };

  // Toggle favorite market
  const toggleFavoriteMarket = (market: string) => {
    setPreferences(prev => {
      const isFavorite = prev.favoriteMarkets.includes(market);

      return {
        ...prev,
        favoriteMarkets: isFavorite
          ? prev.favoriteMarkets.filter(m => m !== market)
          : [...prev.favoriteMarkets, market],
      };
    });
  };

  // Reset preferences to defaults
  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return {
    preferences,
    updatePreferences,
    toggleIndicator,
    toggleFavoriteMarket,
    resetPreferences,
    isLoaded: loaded,
  };
} 