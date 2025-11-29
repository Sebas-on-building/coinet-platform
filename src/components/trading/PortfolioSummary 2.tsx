import React from 'react';
import { motion } from '@/lib/motion';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

// Types
interface Asset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  price: number;
  changePercent24h: number;
}

interface PortfolioSummaryProps {
  portfolio: {
    [key: string]: { available: number; locked: number };
  };
  totalBalance: number;
  assets?: Asset[];
}

// Default assets (mock data)
const defaultAssets: Asset[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    amount: 0.025,
    value: 1582.75,
    price: 63310.00,
    changePercent24h: 2.34,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    amount: 0.42,
    value: 1364.55,
    price: 3249.98,
    changePercent24h: 1.56,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    amount: 12.8,
    value: 1542.40,
    price: 120.50,
    changePercent24h: 3.21,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    amount: 2500,
    value: 2500,
    price: 1.00,
    changePercent24h: 0.01,
  },
];

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  totalBalance,
  assets = defaultAssets,
}) => {
  // Function to format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate 24h change
  const totalChange = assets.reduce((total, asset) => {
    return total + (asset.value * asset.changePercent24h / 100);
  }, 0);

  const changePercent = (totalChange / totalBalance) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Portfolio summary header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-sm text-gray-500 dark:text-gray-400">Total Balance</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatCurrency(totalBalance)}</span>
            <div
              className={`flex items-center text-sm ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
            >
              {changePercent >= 0 ? (
                <ArrowUpIcon className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownIcon className="w-3 h-3 mr-1" />
              )}
              {Math.abs(changePercent).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
            Deposit
          </button>
          <button className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Withdraw
          </button>
        </div>
      </div>

      {/* Assets table */}
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 font-medium">Asset</th>
              <th className="text-right py-2 font-medium">Amount</th>
              <th className="text-right py-2 font-medium">Value</th>
              <th className="text-right py-2 font-medium">24h</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <motion.tr
                key={asset.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/20"
              >
                <td className="py-3">
                  <div className="flex items-center">
                    <img
                      src={`/crypto-icons/${asset.symbol.toLowerCase()}.svg`}
                      alt={asset.symbol}
                      className="w-6 h-6 mr-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/crypto-icons/generic.svg';
                      }}
                    />
                    <div>
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-xs text-gray-500">{asset.name}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right py-3">
                  <div className="font-medium">{asset.amount.toFixed(asset.symbol === 'BTC' ? 8 : 4)}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(asset.price)}</div>
                </td>
                <td className="text-right py-3 font-medium">
                  {formatCurrency(asset.value)}
                </td>
                <td className="text-right py-3">
                  <div
                    className={`flex items-center justify-end ${asset.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                  >
                    {asset.changePercent24h >= 0 ? (
                      <ArrowUpIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownIcon className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(asset.changePercent24h).toFixed(2)}%
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Portfolio stats footer */}
      <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Assets</div>
          <div className="font-medium">{assets.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">24h Change</div>
          <div
            className={`font-medium ${totalChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
          >
            {formatCurrency(totalChange)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">PnL</div>
          <div className="font-medium text-green-500">+12.4%</div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary; 