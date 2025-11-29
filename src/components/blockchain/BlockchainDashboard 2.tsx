"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart,
  TrendingUp,
  Clock,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import {
  blockchainService,
  NetworkStats,
  GasMetrics,
  BlockchainTransaction,
} from "@/services/blockchain";
import { TransactionList } from "./TransactionList";
import { GasTracker } from "./GasTracker";
import { NetworkStatistics } from "./NetworkStatistics";
import { WhaleWatchList } from "./WhaleWatchList";
import { TrendingContracts } from "./TrendingContracts";

interface BlockchainDashboardProps {
  defaultChain?: string;
}

export function BlockchainDashboard({
  defaultChain = "ethereum",
}: BlockchainDashboardProps) {
  const [selectedChain, setSelectedChain] = useState(defaultChain);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [gasData, setGasData] = useState<GasMetrics | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const supportedChains = [
    { id: "ethereum", name: "Ethereum", symbol: "ETH", logo: "🔷" },
    { id: "binance-smart-chain", name: "BNB Chain", symbol: "BNB", logo: "🟡" },
    { id: "polygon", name: "Polygon", symbol: "MATIC", logo: "🟣" },
    { id: "arbitrum", name: "Arbitrum", symbol: "ARB", logo: "🔵" },
    { id: "optimism", name: "Optimism", symbol: "OP", logo: "🔴" },
    { id: "avalanche", name: "Avalanche", symbol: "AVAX", logo: "❄️" },
    { id: "solana", name: "Solana", symbol: "SOL", logo: "🟩" },
  ];

  useEffect(() => {
    async function fetchBlockchainData() {
      setLoading(true);
      try {
        const [txData, gasInfo, stats] = await Promise.all([
          blockchainService.getRecentTransactions(selectedChain, 10),
          blockchainService.getGasPrice(selectedChain),
          blockchainService.getNetworkStats(selectedChain),
        ]);

        setTransactions(txData);
        setGasData(gasInfo);
        setNetworkStats(stats);
      } catch (error) {
        console.error("Error fetching blockchain data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBlockchainData();

    // Set up a refresh interval
    const interval = setInterval(fetchBlockchainData, 15000);

    return () => clearInterval(interval);
  }, [selectedChain]);

  const toggleExpandSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  const getChainDetails = (chainId: string) => {
    return (
      supportedChains.find((chain) => chain.id === chainId) ||
      supportedChains[0]
    );
  };

  const currentChain = getChainDetails(selectedChain);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <span className="mr-2">{currentChain.logo}</span>
            {currentChain.name} Blockchain Data
          </h2>
          <p className="text-gray-500 mt-1">
            Real-time blockchain activity, transactions, and network statistics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain.id)}
              className={`px-3 py-1 rounded-full text-sm flex items-center ${selectedChain === chain.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              <span className="mr-1">{chain.logo}</span>
              {chain.symbol}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array(3)
            .fill(null)
            .map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700/50 rounded w-1/4 mb-4"></div>
                  <div className="h-8 bg-gray-700/50 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                </div>
              </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {gasData && (
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-500" />
                  Gas Prices
                </h3>
                <Badge variant="default">{currentChain.symbol}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Base Fee</div>
                  <div className="text-2xl font-bold">
                    {gasData.baseFee} Gwei
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Priority Fee</div>
                  <div className="text-2xl font-bold">
                    {gasData.priorityFee} Gwei
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                    style={{ width: "100%" }}
                  ></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Slow</div>
                    <div className="font-medium">{gasData.slow.price} Gwei</div>
                    <div className="text-xs text-gray-500">
                      ~{Math.ceil(gasData.slow.estimatedSeconds / 60)}m
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Average</div>
                    <div className="font-medium">
                      {gasData.average.price} Gwei
                    </div>
                    <div className="text-xs text-gray-500">
                      ~{Math.ceil(gasData.average.estimatedSeconds / 60)}m
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Fast</div>
                    <div className="font-medium">{gasData.fast.price} Gwei</div>
                    <div className="text-xs text-gray-500">
                      ~{Math.ceil(gasData.fast.estimatedSeconds / 60)}m
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="w-full mt-4 text-blue-500 text-sm flex items-center justify-center"
                onClick={() => toggleExpandSection("gas")}
              >
                {expandedSection === "gas" ? (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Show More
                  </>
                )}
              </button>

              {expandedSection === "gas" && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <GasTracker
                    gasData={gasData}
                    chainSymbol={currentChain.symbol}
                  />
                </div>
              )}
            </Card>
          )}

          {networkStats && (
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium flex items-center">
                  <Layers className="h-5 w-5 mr-2 text-purple-500" />
                  Network Stats
                </h3>
                <Badge variant="default">
                  Block #{networkStats.blockHeight.toLocaleString()}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">TPS</div>
                  <div className="text-2xl font-bold">
                    {Math.round(1000 / (networkStats.avgBlockTime * 1000))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Pending</div>
                  <div className="text-2xl font-bold">
                    {networkStats.pendingTxCount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    <span>Last Block</span>
                  </div>
                  <span>
                    {Math.floor(Date.now() / 1000 - networkStats.lastBlockTime)}
                    s ago
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <BarChart className="h-4 w-4 mr-1 text-gray-500" />
                    <span>Validators</span>
                  </div>
                  <span>{networkStats.activeValidators.toLocaleString()}</span>
                </div>
              </div>

              <button
                className="w-full mt-4 text-blue-500 text-sm flex items-center justify-center"
                onClick={() => toggleExpandSection("network")}
              >
                {expandedSection === "network" ? (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Show More
                  </>
                )}
              </button>

              {expandedSection === "network" && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <NetworkStatistics
                    stats={networkStats}
                    chainSymbol={currentChain.symbol}
                  />
                </div>
              )}
            </Card>
          )}

          <Card className="p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Latest Transactions
              </h3>
              <a
                href={`https://etherscan.io/txs`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 flex items-center"
              >
                Explorer <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>

            <div className="mt-4">
              {transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.slice(0, 3).map((tx, index) => (
                    <div
                      key={tx.hash}
                      className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <div className="flex justify-between">
                        <div className="font-medium text-blue-500 truncate w-32">
                          {tx.hash.substring(0, 10)}...
                          {tx.hash.substring(tx.hash.length - 4)}
                        </div>
                        <div>
                          {parseFloat(tx.value).toFixed(6)}{" "}
                          {currentChain.symbol}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <div className="truncate w-40">
                          From: {tx.from.substring(0, 6)}...
                          {tx.from.substring(tx.from.length - 4)}
                        </div>
                        <div className="text-gray-400">
                          {tx.confirmations} confirms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  No transactions available
                </div>
              )}
            </div>

            <button
              className="w-full mt-4 text-blue-500 text-sm flex items-center justify-center"
              onClick={() => toggleExpandSection("transactions")}
            >
              {expandedSection === "transactions" ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Show More
                </>
              )}
            </button>

            {expandedSection === "transactions" && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <TransactionList
                  transactions={transactions}
                  chainSymbol={currentChain.symbol}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      <Tabs defaultValue="whale-activity" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="whale-activity">Whale Activity</TabsTrigger>
          <TabsTrigger value="trending-contracts">
            Trending Contracts
          </TabsTrigger>
          <TabsTrigger value="account-lookup">Account Lookup</TabsTrigger>
        </TabsList>

        <TabsContent value="whale-activity" className="space-y-6">
          <WhaleWatchList chain={selectedChain} />
        </TabsContent>

        <TabsContent value="trending-contracts" className="space-y-6">
          <TrendingContracts chain={selectedChain} />
        </TabsContent>

        <TabsContent value="account-lookup" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Account Lookup</h3>
            <div className="flex">
              <input
                type="text"
                placeholder="Enter wallet address (0x...)"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Search
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Enter an address to view its transactions, token balances, and
              contract interactions.
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
