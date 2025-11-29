/**
 * Market Data Hook
 * 
 * This hook provides components with access to real-time market data
 * via WebSocket connections. It handles subscription management, 
 * data caching, and automatically reconnects on errors.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MarketTick } from '@/lib/data/marketTick';

/**
 * Subscription options
 */
interface UseMarketDataOptions {
  /** Symbol to subscribe to (e.g., "BTCUSDT") */
  symbol: string;

  /** Exchange to use (default: "binance") */
  exchange?: string;

  /** Initial data to use while loading */
  initialData?: MarketTick;

  /** Buffer size for tick history (default: 100) */
  historySize?: number;

  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * Market data state
 */
interface MarketDataState {
  /** The latest market tick */
  latestTick: MarketTick | null;

  /** Array of recent ticks (newest first) */
  tickHistory: MarketTick[];

  /** Whether we're currently connected */
  isConnected: boolean;

  /** Whether we're currently trying to connect */
  isConnecting: boolean;

  /** Any error that occurred */
  error: Error | null;
}

/**
 * React hook for subscribing to real-time market data
 */
export function useMarketData({
  symbol,
  exchange = 'binance',
  initialData = null,
  historySize = 100,
  autoConnect = true,
}: UseMarketDataOptions) {
  // Normalize symbol to uppercase
  const normalizedSymbol = symbol.toUpperCase();

  // Socket.io connection reference
  const socketRef = useRef<Socket | null>(null);

  // Market data state
  const [state, setState] = useState<MarketDataState>({
    latestTick: initialData,
    tickHistory: initialData ? [initialData] : [],
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  /**
   * Connect to the WebSocket server and subscribe to the symbol
   */
  const connect = useCallback(() => {
    if (socketRef.current) {
      // Already have a socket, just subscribe
      if (state.isConnected && !state.isConnecting) {
        socketRef.current.emit('subscribe', {
          symbols: [normalizedSymbol],
          exchange,
        });
      }
      return;
    }

    // Set connecting state
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Create new Socket.IO connection
      const socket = io({
        path: '/api/subscribe',
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 10,
        timeout: 20000,
      });

      // Set up event handlers
      socket.on('connect', () => {
        console.log(`[MarketData] Connected to WebSocket server`);

        // Update state
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));

        // Subscribe to our symbol
        socket.emit('subscribe', {
          symbols: [normalizedSymbol],
          exchange,
        });
      });

      socket.on('connect_error', (err) => {
        console.error(`[MarketData] Connection error:`, err);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: new Error(`Connection error: ${err.message}`)
        }));
      });

      socket.on('disconnect', (reason) => {
        console.warn(`[MarketData] Disconnected: ${reason}`);
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: reason === 'io server disconnect' ? new Error('Server disconnected') : null
        }));
      });

      socket.on('market-update', (tick: MarketTick) => {
        if (tick.symbol === normalizedSymbol) {
          setState(prev => {
            // Add new tick to history, limiting size
            const newHistory = [tick, ...prev.tickHistory.slice(0, historySize - 1)];

            return {
              ...prev,
              latestTick: tick,
              tickHistory: newHistory,
            };
          });
        }
      });

      socket.on('subscribed', ({ symbol }) => {
        console.log(`[MarketData] Subscribed to ${symbol}`);
      });

      socket.on('error', (error) => {
        console.error(`[MarketData] Server error:`, error);
        setState(prev => ({ ...prev, error: new Error(error.message || 'Unknown error') }));
      });

      // Store socket reference
      socketRef.current = socket;
    } catch (err) {
      console.error(`[MarketData] Failed to connect:`, err);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err instanceof Error ? err : new Error(String(err))
      }));
    }
  }, [normalizedSymbol, exchange, historySize, state.isConnected, state.isConnecting]);

  /**
   * Disconnect from the WebSocket server and clean up
   */
  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Unsubscribe from the symbol
    socket.emit('unsubscribe', { symbols: [normalizedSymbol] });

    // Disconnect
    socket.disconnect();
    socketRef.current = null;

    // Update state
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
  }, [normalizedSymbol]);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  // Reconnect if symbol or exchange changes
  useEffect(() => {
    if (socketRef.current && state.isConnected) {
      // Unsubscribe from previous symbol
      socketRef.current.emit('unsubscribe', {
        symbols: [normalizedSymbol]
      });

      // Subscribe to new symbol
      socketRef.current.emit('subscribe', {
        symbols: [normalizedSymbol],
        exchange
      });

      // Reset state for new subscription
      setState(prev => ({
        ...prev,
        latestTick: initialData,
        tickHistory: initialData ? [initialData] : [],
      }));
    }
  }, [normalizedSymbol, exchange, initialData]);

  /**
   * Helper to get price change since a duration
   * @param durationMs Duration in milliseconds
   */
  const getPriceChangeSince = useCallback((durationMs: number): {
    price: number | null;
    change: number | null;
    percentChange: number | null;
  } => {
    const { tickHistory, latestTick } = state;

    if (!latestTick || !tickHistory.length) {
      return { price: null, change: null, percentChange: null };
    }

    const currentPrice = latestTick.price;

    // Find a tick that's at least as old as the specified duration
    const now = Date.now();
    const targetTime = now - durationMs;

    // Find the oldest tick newer than targetTime, or the newest tick older than targetTime
    const oldTick = tickHistory.find(tick => tick.timestamp <= targetTime);

    if (!oldTick) {
      // If no tick found, use the oldest available
      const oldestTick = tickHistory[tickHistory.length - 1];
      const oldPrice = oldestTick.price;

      const change = currentPrice - oldPrice;
      const percentChange = (change / oldPrice) * 100;

      return { price: oldPrice, change, percentChange };
    }

    // Calculate change
    const oldPrice = oldTick.price;
    const change = currentPrice - oldPrice;
    const percentChange = (change / oldPrice) * 100;

    return { price: oldPrice, change, percentChange };
  }, [state]);

  // Computed values
  const priceChange1m = getPriceChangeSince(60 * 1000);
  const priceChange5m = getPriceChangeSince(5 * 60 * 1000);
  const priceChange15m = getPriceChangeSince(15 * 60 * 1000);
  const priceChange1h = getPriceChangeSince(60 * 60 * 1000);

  // Return state and methods
  return {
    ...state,
    priceChange1m,
    priceChange5m,
    priceChange15m,
    priceChange1h,
    connect,
    disconnect,
  };
}

export type UseMarketDataReturn = ReturnType<typeof useMarketData>;

/**
 * Basic wrapper with minimal options
 */
export function useSimpleMarketData(symbol: string) {
  return useMarketData({ symbol });
} 