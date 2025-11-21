"use client";

import React, { useState, useEffect } from "react";
import { WebSocketService, WebSocketMessage } from "@/services/websocket";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowPathIcon,
  CurrencyDollarIcon,
  CircleStackIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

interface BlockData {
  chain: string;
  blockNumber: number;
  timestamp: number;
  transactions: number;
  gasUsed: number;
  miner: string;
  rewards: string;
}

interface TransactionData {
  chain: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  timestamp: number;
  status: "success" | "failed";
  tokenTransfers?: {
    token: string;
    value: string;
    from: string;
    to: string;
  }[];
  contractInteraction?: {
    name: string;
    method: string;
  };
}

interface GasData {
  chain: string;
  timestamp: number;
  slow: { price: number; estimatedSeconds: number };
  average: { price: number; estimatedSeconds: number };
  fast: { price: number; estimatedSeconds: number };
  instant: { price: number; estimatedSeconds: number };
  baseFee: number;
  priorityFee: number;
}

interface WhaleData {
  chain: string;
  hash: string;
  from: string;
  to: string;
  isFromExchange: boolean;
  isToExchange: boolean;
  value: string;
  usdValue: number;
  token: string;
  timestamp: number;
}

interface DeFiActivityData {
  chain: string;
  protocol: string;
  action: string;
  timestamp: number;
  txHash: string;
  user: string;
  amount: string;
  token: string;
  usdValue: number;
}

interface RealTimeBlockchainFeedProps {
  maxItems?: number;
  defaultChain?: string;
}

export function RealTimeBlockchainFeed({
  maxItems = 10,
  defaultChain = "ethereum",
}: RealTimeBlockchainFeedProps) {
  const [wsInstance] = useState(() => new WebSocketService());
  const [selectedChain, setSelectedChain] = useState(defaultChain);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [gasData, setGasData] = useState<GasData | null>(null);
  const [whaleTransactions, setWhaleTransactions] = useState<WhaleData[]>([]);
  const [defiActivity, setDefiActivity] = useState<DeFiActivityData[]>([]);
  const [activeTab, setActiveTab] = useState("transactions");

  useEffect(() => {
    // Reset data when chain changes
    setBlocks([]);
    setTransactions([]);
    setGasData(null);
    setWhaleTransactions([]);
    setDefiActivity([]);

    // Subscribe to block data
    const blockHandler = (message: WebSocketMessage) => {
      if (message.type === "newBlock" && message.data.chain === selectedChain) {
        setBlocks((prev) => [message.data, ...prev.slice(0, maxItems - 1)]);
      }
    };

    // Subscribe to transaction data
    const txHandler = (message: WebSocketMessage) => {
      if (
        message.type === "transaction" &&
        message.data.chain === selectedChain
      ) {
        setTransactions((prev) => [
          message.data,
          ...prev.slice(0, maxItems - 1),
        ]);
      }
    };

    // Subscribe to gas updates
    const gasHandler = (message: WebSocketMessage) => {
      if (
        message.type === "gasUpdate" &&
        message.data.chain === selectedChain
      ) {
        setGasData(message.data);
      }
    };

    // Subscribe to whale transactions
    const whaleHandler = (message: WebSocketMessage) => {
      if (
        message.type === "whaleTransaction" &&
        message.data.chain === selectedChain
      ) {
        setWhaleTransactions((prev) => [
          message.data,
          ...prev.slice(0, maxItems - 1),
        ]);
      }
    };

    // Subscribe to DeFi activity
    const defiHandler = (message: WebSocketMessage) => {
      if (
        message.type === "defiActivity" &&
        message.data.chain === selectedChain
      ) {
        setDefiActivity((prev) => [
          message.data,
          ...prev.slice(0, maxItems - 1),
        ]);
      }
    };

    // Register handlers
    wsInstance.blockchain.on("newBlock", blockHandler);
    wsInstance.blockchain.on("transaction", txHandler);
    wsInstance.blockchain.on("gasUpdate", gasHandler);
    wsInstance.blockchain.on("whaleTransaction", whaleHandler);
    wsInstance.blockchain.on("defiActivity", defiHandler);

    // Subscribe to all data types
    wsInstance.blockchain.subscribeToBlocks(selectedChain);
    wsInstance.blockchain.subscribeToTransactions(selectedChain);
    wsInstance.blockchain.subscribeToGasUpdates(selectedChain);
    wsInstance.blockchain.subscribeToWhaleAlerts(selectedChain);
    wsInstance.blockchain.subscribeToDefiActivity(selectedChain);

    // Cleanup
    return () => {
      wsInstance.blockchain.off("newBlock", blockHandler);
      wsInstance.blockchain.off("transaction", txHandler);
      wsInstance.blockchain.off("gasUpdate", gasHandler);
      wsInstance.blockchain.off("whaleTransaction", whaleHandler);
      wsInstance.blockchain.off("defiActivity", defiHandler);

      // Unsubscribe
      wsInstance.blockchain.unsubscribe(selectedChain, "blocks");
      wsInstance.blockchain.unsubscribe(selectedChain, "transactions");
      wsInstance.blockchain.unsubscribe(selectedChain, "gasUpdates");
      wsInstance.blockchain.unsubscribe(selectedChain, "whaleAlerts");
      wsInstance.blockchain.unsubscribe(selectedChain, "defiActivity");
    };
  }, [selectedChain, maxItems, wsInstance]);

  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Format time to readable format
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Format address to truncated form
  const formatAddress = (address: string): string => {
    if (!address) return "";
    if (address.includes("_")) return address; // Exchange address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Render recent blocks
  const renderBlocks = () => {
    if (blocks.length === 0) {
      return (
        <p className="text-gray-500 text-center py-4">
          Waiting for new blocks...
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {blocks.map((block, index) => (
          <Card
            key={`${block.blockNumber}-${index}`}
            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <CircleStackIcon className="h-4 w-4 text-gray-500" />
                  <span>Block #{formatNumber(block.blockNumber)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(block.timestamp)} • {block.transactions} txs •{" "}
                  {Math.round(block.gasUsed / 1000000)} M gas
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs">
                  Miner: {formatAddress(block.miner)}
                </div>
                <div className="text-xs font-medium text-emerald-600">
                  {block.rewards} ETH
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render transactions
  const renderTransactions = () => {
    if (transactions.length === 0) {
      return (
        <p className="text-gray-500 text-center py-4">
          Waiting for new transactions...
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {transactions.map((tx, index) => (
          <Card
            key={`${tx.hash}-${index}`}
            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <ArrowsRightLeftIcon className="h-4 w-4 text-gray-500" />
                  <span>{formatAddress(tx.hash)}</span>
                  {tx.status === "failed" && (
                    <Badge variant="danger" className="text-xs py-0.5">
                      Failed
                    </Badge>
                  )}
                  {tx.contractInteraction && (
                    <Badge variant="default" className="text-xs py-0.5">
                      {tx.contractInteraction.name}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(tx.timestamp)} • From: {formatAddress(tx.from)} •
                  To: {formatAddress(tx.to)}
                </div>
                {tx.tokenTransfers && tx.tokenTransfers.length > 0 && (
                  <div className="text-xs mt-1 font-medium">
                    Token Transfer: {tx.tokenTransfers[0].value}{" "}
                    {tx.tokenTransfers[0].token}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {tx.value === "0" ? "—" : `${tx.value} ETH`}
                </div>
                <div className="text-xs text-gray-500">
                  Gas: {Math.round(parseInt(tx.gasUsed) / 1000)} K
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render gas prices
  const renderGasPrices = () => {
    if (!gasData) {
      return (
        <p className="text-gray-500 text-center py-4">
          Waiting for gas data...
        </p>
      );
    }

    return (
      <div>
        <Card className="p-4 mb-4">
          <div className="text-sm font-medium mb-2">
            Current Gas Prices (Gwei)
          </div>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-2xl font-bold">{gasData.slow.price}</div>
              <div className="text-xs text-gray-500">Slow</div>
              <div className="text-xs text-gray-500">
                {Math.ceil(gasData.slow.estimatedSeconds / 60)} min
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{gasData.average.price}</div>
              <div className="text-xs text-gray-500">Average</div>
              <div className="text-xs text-gray-500">
                {Math.ceil(gasData.average.estimatedSeconds / 60)} min
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{gasData.fast.price}</div>
              <div className="text-xs text-gray-500">Fast</div>
              <div className="text-xs text-gray-500">
                {Math.ceil(gasData.fast.estimatedSeconds / 60)} min
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{gasData.instant.price}</div>
              <div className="text-xs text-gray-500">Instant</div>
              <div className="text-xs text-gray-500">
                {Math.ceil(gasData.instant.estimatedSeconds / 60)} min
              </div>
            </div>
          </div>
        </Card>
        <div className="text-xs text-gray-500 flex justify-between">
          <div>Base Fee: {gasData.baseFee} Gwei</div>
          <div>Priority Fee: {gasData.priorityFee} Gwei</div>
          <div>Last Update: {formatTime(gasData.timestamp)}</div>
        </div>
      </div>
    );
  };

  // Render whale transactions
  const renderWhaleTransactions = () => {
    if (whaleTransactions.length === 0) {
      return (
        <p className="text-gray-500 text-center py-4">
          Waiting for whale movements...
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {whaleTransactions.map((tx, index) => (
          <Card
            key={`${tx.hash}-${index}`}
            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-500" />
                  <span>{formatAddress(tx.hash)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(tx.timestamp)}
                </div>
                <div className="text-xs mt-1">
                  <span className="font-medium">
                    {tx.isFromExchange ? tx.from : formatAddress(tx.from)}
                  </span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="font-medium">
                    {tx.isToExchange ? tx.to : formatAddress(tx.to)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {tx.value} {tx.token}
                </div>
                <div className="text-xs font-medium text-emerald-600">
                  ${tx.usdValue.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render DeFi activity
  const renderDefiActivity = () => {
    if (defiActivity.length === 0) {
      return (
        <p className="text-gray-500 text-center py-4">
          Waiting for DeFi activity...
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {defiActivity.map((activity, index) => (
          <Card
            key={`${activity.txHash}-${index}`}
            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <Badge variant="secondary">{activity.protocol}</Badge>
                  <span className="text-sm capitalize">{activity.action}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(activity.timestamp)} • User:{" "}
                  {formatAddress(activity.user)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {activity.amount} {activity.token}
                </div>
                <div className="text-xs text-gray-500">
                  ${activity.usdValue.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Real-Time Blockchain Data</h2>
        <div className="flex space-x-2">
          <select
            className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
          >
            <option value="ethereum">Ethereum</option>
            <option value="binance-smart-chain">Binance Smart Chain</option>
            <option value="polygon">Polygon</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
          </select>
          <button
            onClick={() => wsInstance.connectToSource(selectedChain)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="gas">Gas Prices</TabsTrigger>
          <TabsTrigger value="whales">Whale Movements</TabsTrigger>
          <TabsTrigger value="defi">DeFi Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          {renderTransactions()}
        </TabsContent>
        <TabsContent value="blocks" className="mt-4">
          {renderBlocks()}
        </TabsContent>
        <TabsContent value="gas" className="mt-4">
          {renderGasPrices()}
        </TabsContent>
        <TabsContent value="whales" className="mt-4">
          {renderWhaleTransactions()}
        </TabsContent>
        <TabsContent value="defi" className="mt-4">
          {renderDefiActivity()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
