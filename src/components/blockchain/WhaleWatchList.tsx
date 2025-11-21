import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUSD: number;
  timestamp: number;
  action: 'buy' | 'sell' | 'transfer' | 'unknown';
}

interface WhaleWatchListProps {
  chain: string;
}

/**
 * WhaleWatchList component
 * 
 * Displays large transactions from whale accounts on the blockchain
 */
export const WhaleWatchList: React.FC<WhaleWatchListProps> = ({ chain }) => {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - in a real app, this would fetch from a blockchain API
    const mockData: WhaleTransaction[] = [
      {
        hash: '0x7c59b0c689463c8bcd59b0c689463c8b34f5a',
        from: '0x6a8c7f88ea23df8ea23d4a34f5a',
        to: '0x4592b801e32c801e32cf5a34f5a',
        value: '1250',
        valueUSD: 2750000,
        timestamp: Date.now() - 15 * 60 * 1000,
        action: 'buy'
      },
      {
        hash: '0x9e32c801ea23df89463c8bc59b0c689',
        from: '0xf88ea23df8ea23d4a34f5a6a8c7',
        to: '0xe32c801e32cf5a34f5a4592b801',
        value: '950',
        valueUSD: 2090000,
        timestamp: Date.now() - 45 * 60 * 1000,
        action: 'transfer'
      },
      {
        hash: '0x1e32c801e68c7f88ea59b0c689463c8bc5',
        from: '0xa23d4a34f5a2c801e32cf5a34f5a',
        to: '0x68c7f88ea23df8ea23d4a34f5a6a8c7f',
        value: '825',
        valueUSD: 1815000,
        timestamp: Date.now() - 120 * 60 * 1000,
        action: 'sell'
      },
      {
        hash: '0x89463c8bc59b0c689e32c801ea23df',
        from: '0xea23d4a34f5a6a8c7f88ea23df8',
        to: '0x32cf5a34f5a4592b801e32c801e',
        value: '2100',
        valueUSD: 4620000,
        timestamp: Date.now() - 240 * 60 * 1000,
        action: 'buy'
      },
      {
        hash: '0x59b0c689463c8bc7c59b0c689463c8b',
        from: '0x34f5a6a8c7f88ea23df8ea23d4a',
        to: '0x4592b801e32c801e32cf5a34f5a',
        value: '1600',
        valueUSD: 3520000,
        timestamp: Date.now() - 360 * 60 * 1000,
        action: 'transfer'
      }
    ];

    const timer = setTimeout(() => {
      setTransactions(mockData);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [chain]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'var(--color-success)';
      case 'sell':
        return 'var(--color-error)';
      case 'transfer':
        return 'var(--color-info)';
      default:
        return 'var(--color-accent-blue)';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center">
        <span className="mr-2">🐋</span>
        Whale Transactions
        <span className="text-xs ml-2 text-gray-500">({chain.toUpperCase()})</span>
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex justify-between">
              <div className="bg-gray-300 dark:bg-gray-700 h-5 w-32 rounded"></div>
              <div className="bg-gray-300 dark:bg-gray-700 h-5 w-24 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.hash} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <Badge
                      variant="default"
                      style={{ backgroundColor: getActionColor(tx.action) }}
                      className="mr-2"
                    >
                      {tx.action.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">{formatTimeAgo(tx.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-mono text-blue-500">{formatAddress(tx.from)}</span>
                    <span className="mx-1">→</span>
                    <span className="font-mono">{formatAddress(tx.to)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{tx.value} {chain === 'ethereum' ? 'ETH' : chain === 'binance-smart-chain' ? 'BNB' : 'tokens'}</div>
                  <div className="text-xs text-gray-500">${tx.valueUSD.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-center text-gray-500 mt-4">
        Monitoring transactions above $1 million in value
      </div>
    </Card>
  );
}; 