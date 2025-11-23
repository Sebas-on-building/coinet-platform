"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useMarketData } from '@/hooks/useMarketData';
import { MarketTick } from '@/lib/data/marketTick';

interface MarketTickerCardProps {
  symbol: string;
  exchange?: string;
  className?: string;
}

/**
 * Market Ticker Card Component
 * 
 * Displays real-time price and market data for a trading pair
 * with visual indicators for price movement.
 */
export function MarketTickerCard({
  symbol,
  exchange = 'binance',
  className = ''
}: MarketTickerCardProps) {
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // Connect to real-time market data
  const {
    latestTick,
    isConnected,
    isConnecting,
    error,
    priceChange1h,
    connect,
    disconnect
  } = useMarketData({
    symbol,
    exchange,
    autoConnect: true
  });

  // Flash price when it changes
  useEffect(() => {
    if (!latestTick || !lastPrice) {
      setLastPrice(latestTick?.price || null);
      return;
    }

    if (latestTick.price > lastPrice) {
      setPriceFlash('up');
    } else if (latestTick.price < lastPrice) {
      setPriceFlash('down');
    }

    setLastPrice(latestTick.price);

    // Clear flash after animation
    const timer = setTimeout(() => {
      setPriceFlash(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [latestTick, lastPrice]);

  // Format price with appropriate precision
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else if (price >= 10) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3
      });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      });
    } else {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    }
  };

  // Format percentage change
  const formatPercentChange = (change: number | null): string => {
    if (change === null) return '0.00%';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (error) {
      return (
        <div className="flex items-center text-xs text-red-500">
          <span className="h-2 w-2 rounded-full bg-red-500 mr-1"></span>
          Error
        </div>
      );
    }

    if (isConnecting) {
      return (
        <div className="flex items-center text-xs text-yellow-500">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Connecting
        </div>
      );
    }

    if (isConnected) {
      return (
        <div className="flex items-center text-xs text-green-500">
          <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
          Live
        </div>
      );
    }

    return (
      <div className="flex items-center text-xs text-gray-500">
        <span className="h-2 w-2 rounded-full bg-gray-500 mr-1"></span>
        Disconnected
      </div>
    );
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold flex items-center">
            {symbol}
            <Badge variant="default" className="ml-2 text-xs">
              {exchange}
            </Badge>
          </h3>
          <div className="text-sm text-gray-500">
            {latestTick?.timestamp ? new Date(latestTick.timestamp).toLocaleTimeString() : '--:--:--'}
          </div>
        </div>
        {renderConnectionStatus()}
      </div>

      <div className="mb-4">
        <div className={`text-3xl font-bold transition-colors duration-300 ${priceFlash === 'up' ? 'text-green-500' :
            priceFlash === 'down' ? 'text-red-500' :
              'text-gray-900 dark:text-gray-100'
          }`}>
          {latestTick ? formatPrice(latestTick.price) : '---.--'}
        </div>

        {priceChange1h.percentChange !== null && (
          <div className={`flex items-center mt-1 ${priceChange1h.percentChange > 0 ? 'text-green-500' :
              priceChange1h.percentChange < 0 ? 'text-red-500' :
                'text-gray-500'
            }`}>
            {priceChange1h.percentChange > 0 ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : priceChange1h.percentChange < 0 ? (
              <ArrowDown className="h-4 w-4 mr-1" />
            ) : null}
            <span>{formatPercentChange(priceChange1h.percentChange)}</span>
            <span className="text-xs text-gray-500 ml-1">1h</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {latestTick?.bid && (
          <div>
            <div className="text-gray-500">Bid</div>
            <div>{formatPrice(latestTick.bid)}</div>
          </div>
        )}

        {latestTick?.ask && (
          <div>
            <div className="text-gray-500">Ask</div>
            <div>{formatPrice(latestTick.ask)}</div>
          </div>
        )}

        {latestTick?.volume && (
          <div>
            <div className="text-gray-500">Volume</div>
            <div>{latestTick.volume.toLocaleString()}</div>
          </div>
        )}

        {latestTick?.high && (
          <div>
            <div className="text-gray-500">High</div>
            <div>{formatPrice(latestTick.high)}</div>
          </div>
        )}
      </div>

      {/* Connection control buttons */}
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={() => isConnected ? disconnect() : connect()}
          className={`px-3 py-1 rounded text-xs ${isConnected
              ? 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </Card>
  );
} 