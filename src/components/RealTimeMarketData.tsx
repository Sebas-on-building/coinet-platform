import React, { useEffect, useState } from "react";
import {
  RealTimeMarketService,
  RealTimePrice,
  OrderBookUpdate,
  TradeUpdate,
} from "../services/realTimeMarket";

interface RealTimeMarketDataProps {
  symbol: string;
}

export const RealTimeMarketData: React.FC<RealTimeMarketDataProps> = ({
  symbol,
}) => {
  const [price, setPrice] = useState<RealTimePrice | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookUpdate | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradeUpdate[]>([]);
  const [marketService] = useState(() => new RealTimeMarketService());

  useEffect(() => {
    // Subscribe to price updates
    marketService.subscribeToPriceUpdates(symbol, (newPrice) => {
      setPrice(newPrice);
    });

    // Subscribe to order book updates
    marketService.subscribeToOrderBookUpdates(symbol, (newOrderBook) => {
      setOrderBook(newOrderBook);
    });

    // Subscribe to trade updates
    marketService.subscribeToTradeUpdates(symbol, (trade) => {
      setRecentTrades((prev) => [trade, ...prev].slice(0, 50)); // Keep last 50 trades
    });

    // Cleanup subscriptions
    return () => {
      // Use the callback functions directly for unsubscribing
      if (marketService.unsubscribeFromPriceUpdates) {
        marketService.unsubscribeFromPriceUpdates(symbol, setPrice);
      }
      marketService.unsubscribeFromOrderBookUpdates(symbol, setOrderBook);
      marketService.unsubscribeFromTradeUpdates(symbol, (trade) => {
        setRecentTrades((prev) => [trade, ...prev].slice(0, 50));
      });
      marketService.close();
    };
  }, [symbol, marketService]);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Price Card */}
      <div className="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
        <h3 className="text-lg font-medium mb-4">Price Information</h3>
        {price ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Price</span>
              <span className="font-medium">{formatPrice(price.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">24h Change</span>
              <span
                className={`font-medium ${
                  price.priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {formatChange(price.priceChange24h)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">24h Volume</span>
              <span className="font-medium">
                {formatPrice(price.volume24h)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">Loading price data...</div>
        )}
      </div>

      {/* Order Book Card */}
      <div className="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
        <h3 className="text-lg font-medium mb-4">Order Book</h3>
        {orderBook ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-500 mb-2">Bids</h4>
              <div className="space-y-1">
                {orderBook.bids.slice(0, 5).map(([price, quantity], index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-green-500">{formatPrice(price)}</span>
                    <span>{quantity.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-500 mb-2">Asks</h4>
              <div className="space-y-1">
                {orderBook.asks.slice(0, 5).map(([price, quantity], index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-red-500">{formatPrice(price)}</span>
                    <span>{quantity.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">Loading order book...</div>
        )}
      </div>

      {/* Recent Trades Card */}
      <div className="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
        <h3 className="text-lg font-medium mb-4">Recent Trades</h3>
        {recentTrades.length > 0 ? (
          <div className="space-y-2">
            {recentTrades.slice(0, 10).map((trade, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span
                  className={
                    trade.side === "buy" ? "text-green-500" : "text-red-500"
                  }
                >
                  {formatPrice(trade.price)}
                </span>
                <span>{trade.quantity.toFixed(4)}</span>
                <span className="text-gray-500">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500">Waiting for trades...</div>
        )}
      </div>
    </div>
  );
};
