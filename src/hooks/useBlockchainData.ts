import { useState, useEffect, useCallback, useRef } from "react";
import {
  BlockchainTransaction,
  GasMetrics,
  NetworkStats,
  WhaleTransaction,
  ContractInteraction,
  blockchainService,
} from "@/services/blockchain";
import { WebSocketService, WebSocketMessage } from "@/services/websocket";

type BlockchainDataType =
  | "transactions"
  | "gas"
  | "stats"
  | "whales"
  | "trending";
type ChainType =
  | "ethereum"
  | "binance-smart-chain"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "avalanche"
  | "solana";
type BlockchainEventType =
  | "newBlock"
  | "transaction"
  | "gasUpdate"
  | "whaleTransaction"
  | "defiActivity";

interface UseBlockchainDataOptions {
  refreshInterval?: number;
  initialLoad?: boolean;
  streaming?: boolean;
}

// Singleton websocket instance
const wsService = new WebSocketService();

export function useBlockchainData<T>(
  dataType: BlockchainDataType,
  chain: ChainType = "ethereum",
  count: number = 10,
  options: UseBlockchainDataOptions = {},
) {
  const {
    refreshInterval = 10000,
    initialLoad = true,
    streaming = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [streamingData, setStreamingData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(initialLoad);
  const [error, setError] = useState<Error | null>(null);
  const isInitializedRef = useRef(false);

  // Function to map data types to blockchain event types
  const getEventTypeForDataType = (
    type: BlockchainDataType,
  ): BlockchainEventType[] => {
    switch (type) {
      case "transactions":
        return ["transaction"];
      case "gas":
        return ["gasUpdate"];
      case "stats":
        return ["newBlock"];
      case "whales":
        return ["whaleTransaction"];
      case "trending":
        return ["transaction", "defiActivity"];
      default:
        return ["transaction"];
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let result;

      switch (dataType) {
        case "transactions":
          result = await blockchainService.getRecentTransactions(chain, count);
          break;
        case "gas":
          result = await blockchainService.getGasPrice(chain);
          break;
        case "stats":
          result = await blockchainService.getNetworkStats(chain);
          break;
        case "whales":
          result = await blockchainService.getWhaleTransactions(
            chain,
            1000000,
            count,
          );
          break;
        case "trending":
          result = await blockchainService.getTrendingContracts(chain, count);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      setData(result as T);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [chain, count, dataType]);

  // Setup WebSocket streaming
  useEffect(() => {
    if (!streaming) return;

    const eventTypes = getEventTypeForDataType(dataType);
    const handlers: ((message: WebSocketMessage) => void)[] = [];

    eventTypes.forEach((eventType) => {
      const handler = (message: WebSocketMessage) => {
        if (
          message.type === eventType &&
          (!message.data.chain || message.data.chain === chain)
        ) {
          setStreamingData((prev) => {
            // Keep the array at a reasonable size
            const newData = [message.data, ...prev.slice(0, 49)];
            return newData;
          });
        }
      };

      handlers.push(handler);
      wsService.blockchain.on(eventType, handler);
    });

    // Subscribe to the specific data type
    switch (dataType) {
      case "transactions":
        wsService.blockchain.subscribeToTransactions(chain);
        break;
      case "gas":
        wsService.blockchain.subscribeToGasUpdates(chain);
        break;
      case "stats":
        wsService.blockchain.subscribeToBlocks(chain);
        break;
      case "whales":
        wsService.blockchain.subscribeToWhaleAlerts(chain);
        break;
      case "trending":
        wsService.blockchain.subscribeToTransactions(chain);
        wsService.blockchain.subscribeToDefiActivity(chain);
        break;
    }

    // Cleanup function
    return () => {
      handlers.forEach((handler, index) => {
        wsService.blockchain.off(eventTypes[index], handler);
      });
    };
  }, [chain, dataType, streaming]);

  // Initial data load and refresh interval
  useEffect(() => {
    if (initialLoad && !isInitializedRef.current) {
      fetchData();
      isInitializedRef.current = true;
    }

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, initialLoad, refreshInterval]);

  // Combine fetched data with streaming data if appropriate
  const combinedData = useCallback(() => {
    if (!data) return null;

    // Only combine for certain data types
    switch (dataType) {
      case "transactions":
      case "whales":
        // Create a combined array with streaming data first, then fetched data
        const combinedArray = [...streamingData, ...(data as any[])];
        // Remove duplicates by a unique identifier (hash/id)
        const uniqueMap = new Map();
        combinedArray.forEach((item) => {
          const key = item.hash || item.id;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        });
        // Convert back to array and limit to count
        return Array.from(uniqueMap.values()).slice(0, count) as T;

      case "gas":
        // For gas data, just use the latest streaming data if available
        return streamingData.length > 0 ? streamingData[0] : data;

      default:
        return data;
    }
  }, [data, streamingData, dataType, count]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: combinedData() || data,
    streamingData,
    isLoading,
    error,
    refresh,
  };
}
