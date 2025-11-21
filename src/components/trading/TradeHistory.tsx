import React from 'react';
import { motion } from '@/lib/motion';

// Types
interface Trade {
  id: string;
  time: string; // ISO string
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}

interface TradeHistoryProps {
  data: Trade[];
  maxRows?: number;
  market: { base: string; quote: string };
}

const TradeHistory: React.FC<TradeHistoryProps> = ({
  data,
  maxRows = 15,
  market,
}) => {
  // Format timestamp
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
      <div className="min-w-full table text-xs">
        {/* Table header */}
        <div className="table-header-group">
          <div className="table-row text-gray-500 dark:text-gray-400 text-[10px] uppercase">
            <div className="table-cell p-2">Price ({market.quote})</div>
            <div className="table-cell p-2 text-right">Amount ({market.base})</div>
            <div className="table-cell p-2 text-right">Time</div>
          </div>
        </div>

        {/* Table body */}
        <div className="table-row-group">
          {data.length > 0 ? (
            data.slice(0, maxRows).map((trade) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="table-row hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {/* Price */}
                <div
                  className={`table-cell p-2 font-medium ${trade.side === 'buy' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                    }`}
                >
                  {trade.price.toFixed(2)}
                </div>

                {/* Amount */}
                <div className="table-cell p-2 text-right">
                  {trade.amount.toFixed(6)}
                </div>

                {/* Time */}
                <div className="table-cell p-2 text-right text-gray-500 dark:text-gray-400">
                  {formatTime(trade.time)}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="table-row">
              <div className="table-cell p-6 text-center text-gray-500 dark:text-gray-400">
                No trades yet
              </div>
              <div className="table-cell"></div>
              <div className="table-cell"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory; 