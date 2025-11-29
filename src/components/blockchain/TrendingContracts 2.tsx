import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Users, Activity, DollarSign } from 'lucide-react';

interface ContractData {
  address: string;
  name: string;
  category: 'defi' | 'nft' | 'gaming' | 'dao' | 'bridge' | 'other';
  interactions: number;
  tvl: number;
  change24h: number;
  verified: boolean;
}

interface TrendingContractsProps {
  chain: string;
}

/**
 * TrendingContracts component
 * 
 * Displays trending and popular smart contracts on the blockchain
 */
export const TrendingContracts: React.FC<TrendingContractsProps> = ({ chain }) => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'interactions' | 'tvl' | 'change24h'>('interactions');

  useEffect(() => {
    // Mock data - in a real app, this would fetch from a blockchain API
    const mockData: ContractData[] = [
      {
        address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        name: 'UniSwap V3',
        category: 'defi',
        interactions: 14568,
        tvl: 2450000000,
        change24h: 3.2,
        verified: true
      },
      {
        address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        name: 'PancakeSwap',
        category: 'defi',
        interactions: 9872,
        tvl: 1980000000,
        change24h: -1.8,
        verified: true
      },
      {
        address: '0x3d1e5cf3b7df1f3e0c9574dc43bdb775e0ef8fc5',
        name: 'Azuki NFT',
        category: 'nft',
        interactions: 7215,
        tvl: 420000000,
        change24h: 12.5,
        verified: true
      },
      {
        address: '0xbd4a858139b155219e2c8d10135003c1e7d84b0a',
        name: 'Lido Staking',
        category: 'defi',
        interactions: 6542,
        tvl: 8750000000,
        change24h: 0.8,
        verified: true
      },
      {
        address: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
        name: 'Wormhole Bridge',
        category: 'bridge',
        interactions: 5321,
        tvl: 1250000000,
        change24h: -0.5,
        verified: true
      }
    ];

    const timer = setTimeout(() => {
      setContracts(mockData);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [chain]);

  const sortedContracts = [...contracts].sort((a, b) => b[sortBy] - a[sortBy]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'defi':
        return 'var(--color-success)';
      case 'nft':
        return 'var(--color-warning)';
      case 'gaming':
        return 'var(--color-info)';
      case 'dao':
        return 'var(--color-accent-blue)';
      case 'bridge':
        return 'var(--color-purple)';
      default:
        return 'var(--color-gray)';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatTVL = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(1)}K`;
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <span className="mr-2">🔥</span>
          Trending Contracts
          <span className="text-xs ml-2 text-gray-500">({chain.toUpperCase()})</span>
        </h3>

        <div className="flex text-xs space-x-2">
          <button
            className={`px-2 py-1 rounded ${sortBy === 'interactions' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
            onClick={() => setSortBy('interactions')}
          >
            Activity
          </button>
          <button
            className={`px-2 py-1 rounded ${sortBy === 'tvl' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
            onClick={() => setSortBy('tvl')}
          >
            TVL
          </button>
          <button
            className={`px-2 py-1 rounded ${sortBy === 'change24h' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
            onClick={() => setSortBy('change24h')}
          >
            24h Change
          </button>
        </div>
      </div>

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
          {sortedContracts.map((contract) => (
            <div key={contract.address} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{contract.name}</span>
                    {contract.verified && (
                      <span className="ml-1 text-blue-500" title="Verified Contract">✓</span>
                    )}
                    <Badge
                      variant="default"
                      style={{ backgroundColor: getCategoryColor(contract.category) }}
                      className="ml-2 text-xs"
                    >
                      {contract.category.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex items-center">
                    <span className="font-mono">{formatAddress(contract.address)}</span>
                    <a
                      href={`https://${chain === 'ethereum' ? 'etherscan.io' : chain === 'binance-smart-chain' ? 'bscscan.com' : 'explorer.com'}/address/${contract.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-blue-500"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-4 text-sm">
                    <div className="flex items-center" title="24h Interactions">
                      <Users className="h-3 w-3 mr-1 text-gray-500" />
                      <span>{contract.interactions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center" title="Total Value Locked">
                      <DollarSign className="h-3 w-3 mr-1 text-gray-500" />
                      <span>{formatTVL(contract.tvl)}</span>
                    </div>
                    <div className="flex items-center" title="24h Change">
                      <Activity className="h-3 w-3 mr-1 text-gray-500" />
                      <span className={contract.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {contract.change24h >= 0 ? '+' : ''}{contract.change24h}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-center text-gray-500 mt-4">
        Data refreshes every 15 minutes
      </div>
    </Card>
  );
}; 