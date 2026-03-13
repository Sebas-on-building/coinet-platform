import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketData, TechnicalIndicator } from "@/types/database";

interface UseRealtimeDataOptions {
  onMarketUpdate?: (data: MarketData) => void;
  onTechnicalUpdate?: (data: TechnicalIndicator) => void;
  onError?: (error: Error) => void;
}

export function useRealtimeData(symbols: string[] = [], options: UseRealtimeDataOptions = {}) {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [technicalData, setTechnicalData] = useState<Record<string, TechnicalIndicator[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // WebSocket connection for real-time price feeds
  const [priceSocket, setPriceSocket] = useState<WebSocket | null>(null);

  // Initialize real-time connections
  useEffect(() => {
    if (symbols.length === 0) return;

    // Supabase realtime for technical indicators
    const channel = supabase
      .channel('market-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data',
          filter: `symbol=in.(${symbols.join(',')})`
        },
        (payload) => {
          const newData = payload.new as MarketData;
          setMarketData(prev => ({
            ...prev,
            [newData.symbol]: newData
          }));
          setLastUpdate(new Date());
          options.onMarketUpdate?.(newData);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'technical_indicators',
          filter: `symbol=in.(${symbols.join(',')})`
        },
        (payload) => {
          const newIndicator = payload.new as TechnicalIndicator;
          setTechnicalData(prev => ({
            ...prev,
            [newIndicator.symbol]: [
              ...(prev[newIndicator.symbol] || []),
              newIndicator
            ].slice(-50) // Keep only recent indicators
          }));
          options.onTechnicalUpdate?.(newIndicator);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // WebSocket for real-time price updates (when integrated with exchanges)
    const connectWebSocket = () => {
      try {
        // This would connect to your WebSocket edge function
        const ws = new WebSocket(`wss://${window.location.host}/api/websocket/market-stream`);
        
        ws.onopen = () => {
          console.log('Price WebSocket connected');
          // Subscribe to symbols
          ws.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbols
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'price_update') {
              setMarketData(prev => ({
                ...prev,
                [data.symbol]: {
                  ...prev[data.symbol],
                  price: data.price,
                  price_change_24h: data.change,
                  volume_24h: data.volume,
                  timestamp: data.timestamp
                }
              }));
              setLastUpdate(new Date());
            }
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          options.onError?.(new Error('WebSocket connection error'));
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected, attempting reconnect...');
          setTimeout(connectWebSocket, 5000);
        };

        setPriceSocket(ws);
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        options.onError?.(error as Error);
      }
    };

    // Uncomment when WebSocket edge function is implemented
    // connectWebSocket();

    return () => {
      supabase.removeChannel(channel);
      if (priceSocket) {
        priceSocket.close();
      }
    };
  }, [symbols]);

  // Fetch initial market data
  const fetchMarketData = useCallback(async (symbolList: string[] = symbols) => {
    if (symbolList.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .in('symbol', symbolList)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group by symbol and take latest
      const latestData: Record<string, MarketData> = {};
      data?.forEach(item => {
        if (!latestData[item.symbol] ||
            new Date(item.timestamp) > new Date(latestData[item.symbol].timestamp)) {
          latestData[item.symbol] = item;
        }
      });

      setMarketData(latestData);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      options.onError?.(error as Error);
    }
  }, [symbols]);

  // Fetch technical indicators
  const fetchTechnicalData = useCallback(async (symbolList: string[] = symbols) => {
    if (symbolList.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('technical_indicators')
        .select('*')
        .in('symbol', symbolList)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by symbol
      const grouped: Record<string, TechnicalIndicator[]> = {};
      data?.forEach(item => {
        if (!grouped[item.symbol]) {
          grouped[item.symbol] = [];
        }
        grouped[item.symbol].push(item);
      });

      setTechnicalData(grouped);
    } catch (error) {
      console.error('Failed to fetch technical data:', error);
      options.onError?.(error as Error);
    }
  }, [symbols]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchMarketData(),
      fetchTechnicalData()
    ]);
  }, [fetchMarketData, fetchTechnicalData]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Connection status
  const getConnectionStatus = () => {
    return {
      supabase: isConnected,
      websocket: priceSocket?.readyState === WebSocket.OPEN,
      lastUpdate
    };
  };

  // Get market data for a specific symbol
  const getMarketDataForSymbol = (symbol: string) => {
    return marketData[symbol] || null;
  };

  // Get technical indicators for a specific symbol
  const getTechnicalDataForSymbol = (symbol: string, indicatorType?: string) => {
    const data = technicalData[symbol] || [];
    return indicatorType 
      ? data.filter(item => item.indicator_type === indicatorType)
      : data;
  };

  return {
    marketData,
    technicalData,
    isConnected: getConnectionStatus(),
    lastUpdate,
    refreshData,
    getMarketDataForSymbol,
    getTechnicalDataForSymbol,
    // Helper functions for common operations
    getPrice: (symbol: string) => marketData[symbol]?.price,
    getPriceChange: (symbol: string) => marketData[symbol]?.price_change_24h,
    getVolume: (symbol: string) => marketData[symbol]?.volume_24h,
    getRSI: (symbol: string) => {
      const indicators = getTechnicalDataForSymbol(symbol, 'rsi');
      return indicators[0]?.value;
    },
    getMACD: (symbol: string) => {
      const indicators = getTechnicalDataForSymbol(symbol, 'macd');
      return indicators[0]?.value;
    }
  };
}