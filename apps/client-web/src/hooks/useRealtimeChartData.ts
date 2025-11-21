import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RealtimeDataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  metadata?: Record<string, any>;
}

export interface StreamConfig {
  symbol: string;
  interval?: number; // milliseconds between updates
  bufferSize?: number; // max data points to keep
  enableCompression?: boolean;
}

export function useRealtimeChartData(config: StreamConfig) {
  const [data, setData] = useState<RealtimeDataPoint[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [latency, setLatency] = useState<number>(0);
  
  const channelRef = useRef<any>(null);
  const bufferRef = useRef<RealtimeDataPoint[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());
  const latencyCheckerRef = useRef<number | null>(null);

  // Monitor connection quality
  useEffect(() => {
    if (!isStreaming) {
      setConnectionQuality('disconnected');
      return;
    }

    latencyCheckerRef.current = window.setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      
      if (timeSinceLastUpdate < 1000) {
        setConnectionQuality('excellent');
      } else if (timeSinceLastUpdate < 3000) {
        setConnectionQuality('good');
      } else if (timeSinceLastUpdate < 10000) {
        setConnectionQuality('poor');
      } else {
        setConnectionQuality('disconnected');
      }
    }, 1000);

    return () => {
      if (latencyCheckerRef.current) {
        clearInterval(latencyCheckerRef.current);
      }
    };
  }, [isStreaming]);

  // Start streaming
  const startStream = useCallback(async () => {
    try {
      setIsStreaming(true);

      // Subscribe to market context updates for real-time data
      const channel = supabase
        .channel(`realtime:${config.symbol}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'market_context',
            filter: `asset_symbol=eq.${config.symbol}`,
          },
          (payload) => {
            const sendTime = payload.new.timestamp;
            const receiveTime = Date.now();
            const currentLatency = receiveTime - new Date(sendTime).getTime();
            setLatency(currentLatency);
            lastUpdateRef.current = receiveTime;

            const newDataPoint: RealtimeDataPoint = {
              timestamp: new Date(payload.new.timestamp).getTime(),
              value: payload.new.price,
              volume: payload.new.volume_24h,
              metadata: {
                volatility: payload.new.volatility,
                sentiment: payload.new.social_sentiment,
              },
            };

            // Add to buffer
            bufferRef.current = [
              ...bufferRef.current,
              newDataPoint,
            ].slice(-(config.bufferSize || 500));

            setData([...bufferRef.current]);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Streaming started for ${config.symbol}`);
          } else if (status === 'CHANNEL_ERROR') {
            toast.error('Real-time connection error');
            setIsStreaming(false);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Failed to start stream:', error);
      toast.error('Failed to start real-time stream');
      setIsStreaming(false);
    }
  }, [config.symbol, config.bufferSize]);

  // Stop streaming
  const stopStream = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsStreaming(false);
    console.log(`Streaming stopped for ${config.symbol}`);
  }, [config.symbol]);

  // Toggle streaming
  const toggleStream = useCallback(() => {
    if (isStreaming) {
      stopStream();
    } else {
      startStream();
    }
  }, [isStreaming, startStream, stopStream]);

  // Clear data
  const clearData = useCallback(() => {
    setData([]);
    bufferRef.current = [];
  }, []);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async (limit: number = 100) => {
    try {
      const { data: historicalData, error } = await supabase
        .from('market_context')
        .select('timestamp, price, volume_24h, volatility, social_sentiment')
        .eq('asset_symbol', config.symbol)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (historicalData) {
        const formattedData: RealtimeDataPoint[] = historicalData
          .reverse()
          .map(point => ({
            timestamp: new Date(point.timestamp).getTime(),
            value: point.price,
            volume: point.volume_24h,
            metadata: {
              volatility: point.volatility,
              sentiment: point.social_sentiment,
            },
          }));

        bufferRef.current = formattedData;
        setData(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      toast.error('Failed to load historical data');
    }
  }, [config.symbol]);

  // Auto-start on mount if configured
  useEffect(() => {
    fetchHistoricalData();
    
    return () => {
      stopStream();
    };
  }, [fetchHistoricalData]);

  // Calculate statistics
  const statistics = {
    dataPoints: data.length,
    latency,
    connectionQuality,
    averageValue: data.length > 0
      ? data.reduce((sum, point) => sum + point.value, 0) / data.length
      : 0,
    minValue: data.length > 0 ? Math.min(...data.map(p => p.value)) : 0,
    maxValue: data.length > 0 ? Math.max(...data.map(p => p.value)) : 0,
  };

  return {
    data,
    isStreaming,
    connectionQuality,
    latency,
    statistics,
    startStream,
    stopStream,
    toggleStream,
    clearData,
    fetchHistoricalData,
  };
}
