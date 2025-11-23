"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from '@/lib/motion';
import { useTheme } from 'next-themes';
import { ArrowDownIcon, ArrowUpIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { OrderBook as OrderBookType, MarketDepth } from "../../types/trading";
import { tradingService } from "../../services/tradingService";

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: 'bid' | 'ask';
}

interface OrderBookProps {
  data: {
    asks: OrderBookEntry[];
    bids: OrderBookEntry[];
  };
  lastPrice: number;
  market: { base: string; quote: string };
  maxRows?: number;
  precision?: number;
  onPriceClick?: (price: number, type: 'bid' | 'ask') => void;
}

const calculatePercentage = (value: number, max: number): number => {
  return (value / max) * 100;
};

const OrderBook: React.FC<OrderBookProps> = ({
  data,
  lastPrice,
  market,
  maxRows = 15,
  precision = 2,
  onPriceClick,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [layout, setLayout] = useState<'default' | 'bids' | 'asks'>('default');
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [grouping, setGrouping] = useState<number>(1);
  const orderBookRef = useRef<HTMLDivElement>(null);

  const maxDepth = useMemo(() => {
    const askMax = data.asks.reduce((max, ask) => Math.max(max, ask.total), 0);
    const bidMax = data.bids.reduce((max, bid) => Math.max(max, bid.total), 0);
    return Math.max(askMax, bidMax);
  }, [data]);

  const bids = useMemo(() => {
    return data.bids.slice(0, maxRows).map(bid => ({
      ...bid,
      formattedPrice: bid.price.toFixed(precision),
      formattedAmount: bid.amount.toFixed(precision),
      formattedTotal: bid.total.toFixed(precision),
      depthPercentage: calculatePercentage(bid.total, maxDepth),
    }));
  }, [data.bids, maxRows, precision, maxDepth]);

  const asks = useMemo(() => {
    return [...data.asks]
      .sort((a, b) => a.price - b.price)
      .slice(0, maxRows)
      .map(ask => ({
        ...ask,
        formattedPrice: ask.price.toFixed(precision),
        formattedAmount: ask.amount.toFixed(precision),
        formattedTotal: ask.total.toFixed(precision),
        depthPercentage: calculatePercentage(ask.total, maxDepth),
      }));
  }, [data.asks, maxRows, precision, maxDepth]);

  const spread = useMemo(() => {
    if (asks.length === 0 || bids.length === 0) return { value: 0, percentage: 0 };

    const lowestAsk = asks[0].price;
    const highestBid = bids[0].price;
    const spreadValue = lowestAsk - highestBid;
    const spreadPercentage = (spreadValue / lowestAsk) * 100;

    return {
      value: spreadValue,
      percentage: spreadPercentage,
    };
  }, [asks, bids]);

  const handlePriceClick = (price: number, type: 'bid' | 'ask') => {
    if (onPriceClick) {
      onPriceClick(price, type);
    }
  };

  const toggleLayout = () => {
    setLayout(prev => {
      if (prev === 'default') return 'bids';
      if (prev === 'bids') return 'asks';
      return 'default';
    });
  };

  const groupByOptions = [
    { value: 1, label: '1' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
  ];

  useEffect(() => {
    if (orderBookRef.current && layout === 'default') {
      const midPoint = orderBookRef.current.querySelector('.spread-row');
      if (midPoint) {
        midPoint.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [layout, data]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-2 text-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={toggleLayout}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle layout"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
          </button>

          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            {groupByOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setGrouping(option.value)}
                className={`px-2 py-0.5 text-xs ${grouping === option.value
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs font-medium">
          Order Book
        </div>
      </div>

      <div
        ref={orderBookRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        <div className="min-w-full table text-xs">
          <div className="table-header-group">
            <div className="table-row text-gray-500 dark:text-gray-400 text-[10px] uppercase">
              <div className="table-cell p-2">Price ({market.quote})</div>
              <div className="table-cell p-2 text-right">Amount ({market.base})</div>
              <div className="table-cell p-2 text-right">Total</div>
            </div>
          </div>

          {(layout === 'default' || layout === 'asks') && (
            <div className="table-row-group">
              <AnimatePresence initial={false}>
                {asks.map((ask, index) => (
                  <motion.div
                    key={`ask-${ask.price}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`table-row relative ${hoverPrice === ask.price ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    onMouseEnter={() => setHoverPrice(ask.price)}
                    onMouseLeave={() => setHoverPrice(null)}
                    onClick={() => handlePriceClick(ask.price, 'ask')}
                  >
                    <div
                      className="absolute right-0 top-0 h-full bg-red-500/20 dark:bg-red-500/10 z-0"
                      style={{ width: `${ask.depthPercentage}%` }}
                    />

                    <div className="table-cell p-2 font-medium text-red-500 dark:text-red-400 relative z-10 cursor-pointer">
                      {ask.formattedPrice}
                    </div>

                    <div className="table-cell p-2 text-right relative z-10">
                      {ask.formattedAmount}
                    </div>

                    <div className="table-cell p-2 text-right relative z-10">
                      {ask.formattedTotal}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {layout === 'default' && (
            <div className="table-row-group spread-row">
              <div className="table-row bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm text-center">
                <div className="table-cell p-2 text-gray-500 dark:text-gray-400 text-xs font-medium">
                  Spread: {spread.value.toFixed(precision)} ({spread.percentage.toFixed(2)}%)
                </div>
                <div className="table-cell"></div>
                <div className="table-cell"></div>
              </div>
            </div>
          )}

          {(layout === 'default' || layout === 'bids') && (
            <div className="table-row-group">
              <AnimatePresence initial={false}>
                {bids.map((bid, index) => (
                  <motion.div
                    key={`bid-${bid.price}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`table-row relative ${hoverPrice === bid.price ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    onMouseEnter={() => setHoverPrice(bid.price)}
                    onMouseLeave={() => setHoverPrice(null)}
                    onClick={() => handlePriceClick(bid.price, 'bid')}
                  >
                    <div
                      className="absolute right-0 top-0 h-full bg-green-500/20 dark:bg-green-500/10 z-0"
                      style={{ width: `${bid.depthPercentage}%` }}
                    />

                    <div className="table-cell p-2 font-medium text-green-500 dark:text-green-400 relative z-10 cursor-pointer">
                      {bid.formattedPrice}
                    </div>

                    <div className="table-cell p-2 text-right relative z-10">
                      {bid.formattedAmount}
                    </div>

                    <div className="table-cell p-2 text-right relative z-10">
                      {bid.formattedTotal}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-1">
          <span className="text-gray-500 dark:text-gray-400">Last:</span>
          <span className="font-medium">${lastPrice.toFixed(precision)}</span>
        </div>

        <div className="flex gap-2">
          <button
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Scroll to top"
            onClick={() => {
              if (orderBookRef.current) {
                orderBookRef.current.scrollTop = 0;
              }
            }}
          >
            <ArrowUpIcon className="w-4 h-4" />
          </button>

          <button
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Scroll to bottom"
            onClick={() => {
              if (orderBookRef.current) {
                orderBookRef.current.scrollTop = orderBookRef.current.scrollHeight;
              }
            }}
          >
            <ArrowDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
