"use client";

import React, { useState } from "react";
import { useBlockchainData } from "@/hooks/useBlockchainData";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TransactionList } from "./TransactionList";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  BlockchainTransaction,
  GasMetrics,
  NetworkStats,
  WhaleTransaction,
} from "@/services/blockchain";

// Chain configs with symbols
const chainConfigs = {
  ethereum: { symbol: "ETH", name: "Ethereum" },
  "binance-smart-chain": { symbol: "BNB", name: "Binance Smart Chain" },
  polygon: { symbol: "MATIC", name: "Polygon" },
  arbitrum: { symbol: "ARB", name: "Arbitrum" },
  optimism: { symbol: "OP", name: "Optimism" },
  avalanche: { symbol: "AVAX", name: "Avalanche" },
  solana: { symbol: "SOL", name: "Solana" },
};

type ChainType = keyof typeof chainConfigs;

interface BlockchainDataFeedProps {
  defaultChain?: ChainType;
  refreshInterval?: number;
}

export function BlockchainDataFeed({
  defaultChain = "ethereum",
  refreshInterval = 15000,
}: BlockchainDataFeedProps) {
  const [selectedChain, setSelectedChain] = useState<ChainType>(defaultChain);

  // Fetch transaction data
  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refresh: refreshTransactions,
  } = useBlockchainData<BlockchainTransaction[]>(
    "transactions",
    selectedChain,
    10,
    {
      refreshInterval,
    },
  );

  // Fetch gas data
  const {
    data: gasData,
    isLoading: gasLoading,
    error: gasError,
    refresh: refreshGasData,
  } = useBlockchainData<GasMetrics>("gas", selectedChain, 0, {
    refreshInterval,
  });

  // Fetch network stats
  const {
    data: networkStats,
    isLoading: networkStatsLoading,
    error: networkStatsError,
    refresh: refreshNetworkStats,
  } = useBlockchainData<NetworkStats>("stats", selectedChain, 0, {
    refreshInterval,
  });

  // Fetch whale transactions
  const {
    data: whaleTransactions,
    isLoading: whaleTransactionsLoading,
    error: whaleTransactionsError,
    refresh: refreshWhaleTransactions,
  } = useBlockchainData<WhaleTransaction[]>("whales", selectedChain, 5, {
    refreshInterval,
  });

  const handleChainChange = (chain: ChainType) => {
    setSelectedChain(chain);
  };

  const handleManualRefresh = () => {
    refreshTransactions();
    refreshGasData();
    refreshNetworkStats();
    refreshWhaleTransactions();
  };

  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Format time to readable format
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // Render gas price info
  const renderGasInfo = () => {
    if (gasLoading)
      return <p className="text-sm text-gray-500">Loading gas data...</p>;
    if (gasError)
      return <p className="text-sm text-red-500">Error loading gas data</p>;
    if (!gasData) return null;

    return (
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs uppercase text-gray-500">Slow</div>
          <div className="font-medium">{gasData.slow.price} Gwei</div>
          <div className="text-xs text-gray-500">
            ~{Math.ceil(gasData.slow.estimatedSeconds / 60)} min
          </div>
        </div>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs uppercase text-gray-500">Average</div>
          <div className="font-medium">{gasData.average.price} Gwei</div>
          <div className="text-xs text-gray-500">
            ~{Math.ceil(gasData.average.estimatedSeconds / 60)} min
          </div>
        </div>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs uppercase text-gray-500">Fast</div>
          <div className="font-medium">{gasData.fast.price} Gwei</div>
          <div className="text-xs text-gray-500">
            ~{Math.ceil(gasData.fast.estimatedSeconds / 60)} min
          </div>
        </div>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs uppercase text-gray-500">Instant</div>
          <div className="font-medium">{gasData.instant.price} Gwei</div>
          <div className="text-xs text-gray-500">
            ~{Math.ceil(gasData.instant.estimatedSeconds / 60)} min
          </div>
        </div>
      </div>
    );
  };

  // Render network stats
  const renderNetworkStats = () => {
    if (networkStatsLoading)
      return <p className="text-sm text-gray-500">Loading network stats...</p>;
    if (networkStatsError)
      return (
        <p className="text-sm text-red-500">Error loading network stats</p>
      );
    if (!networkStats) return null;

    return (
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-gray-500">Block Height</div>
          <div className="font-medium">
            {formatNumber(networkStats.blockHeight)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Last Block</div>
          <div className="font-medium">
            {formatTime(networkStats.lastBlockTime)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Avg Block Time</div>
          <div className="font-medium">
            {networkStats.avgBlockTime.toFixed(2)}s
          </div>
        </div>
        <div>
          <div className="text-gray-500">Pending Txs</div>
          <div className="font-medium">
            {formatNumber(networkStats.pendingTxCount)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Active Validators</div>
          <div className="font-medium">
            {formatNumber(networkStats.activeValidators)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Hash Rate</div>
          <div className="font-medium">{networkStats.hashRate}</div>
        </div>
      </div>
    );
  };

  // Render whale transactions
  const renderWhaleTransactions = () => {
    if (whaleTransactionsLoading)
      return (
        <p className="text-sm text-gray-500">Loading whale transactions...</p>
      );
    if (whaleTransactionsError)
      return (
        <p className="text-sm text-red-500">Error loading whale transactions</p>
      );
    if (!whaleTransactions || whaleTransactions.length === 0)
      return (
        <p className="text-sm text-gray-500">No whale transactions found</p>
      );

    return (
      <div className="space-y-2">
        {whaleTransactions.map((tx) => (
          <div
            key={tx.hash}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-medium text-sm flex items-center">
                  {tx.isExchange && tx.exchangeName ? (
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs mr-2">
                      {tx.exchangeName}
                    </span>
                  ) : null}
                  {tx.hash.substring(0, 6)}...
                  {tx.hash.substring(tx.hash.length - 4)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {tx.transactionType.charAt(0).toUpperCase() +
                    tx.transactionType.slice(1)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {parseFloat(tx.value).toFixed(4)} {tx.token}
                </div>
                <div className="text-xs text-gray-500">
                  ${tx.usdValue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold dark:text-white">
          Blockchain Data Feed
        </h2>
        <button
          onClick={handleManualRefresh}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Chain selector */}
      <div className="overflow-x-auto pb-2">
        <Tabs
          value={selectedChain}
          onValueChange={(value) => handleChainChange(value as ChainType)}
        >
          <TabsList className="mb-4">
            {(Object.keys(chainConfigs) as ChainType[]).map((chain) => (
              <TabsTrigger key={chain} value={chain}>
                {chainConfigs[chain].name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Current data info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Gas Prices</h3>
          {renderGasInfo()}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-lg">Network Stats</h3>
          {renderNetworkStats()}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-lg">Whale Transactions</h3>
          {renderWhaleTransactions()}
        </div>
      </div>

      {/* Transaction list */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="font-medium text-lg mb-4">Recent Transactions</h3>
        {transactionsError ? (
          <div className="flex items-center text-red-500 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            Error loading transactions
          </div>
        ) : transactionsLoading ? (
          <p className="text-sm text-gray-500">Loading transactions...</p>
        ) : transactions && transactions.length > 0 ? (
          <TransactionList
            transactions={transactions}
            chainSymbol={chainConfigs[selectedChain].symbol}
          />
        ) : (
          <p className="text-sm text-gray-500">No transactions found</p>
        )}
      </div>
    </div>
  );
}
