import axios from "axios";
import { api } from "./api";
import { WebSocketService } from "./websocket";

// Types
export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  timestamp: number;
  blockNumber: number;
  confirmations: number;
  tokenTransfers?: {
    token: string;
    value: string;
    from: string;
    to: string;
  }[];
}

export interface GasMetrics {
  slow: {
    price: number;
    estimatedSeconds: number;
  };
  average: {
    price: number;
    estimatedSeconds: number;
  };
  fast: {
    price: number;
    estimatedSeconds: number;
  };
  instant: {
    price: number;
    estimatedSeconds: number;
  };
  baseFee: number;
  priorityFee: number;
}

export interface NetworkStats {
  blockHeight: number;
  lastBlockTime: number;
  avgBlockTime: number;
  difficulty: number;
  hashRate: string;
  pendingTxCount: number;
  activeValidators: number;
  totalSupply: string;
  totalStaked: string;
  marketCap: number;
}

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  usdValue: number;
  token: string;
  timestamp: number;
  isExchange: boolean;
  exchangeName?: string;
  transactionType:
    | "transfer"
    | "swap"
    | "mint"
    | "burn"
    | "liquidation"
    | "other";
}

export interface ContractInteraction {
  address: string;
  name: string;
  totalInteractions: number;
  uniqueUsers: number;
  tvl?: number;
  verified: boolean;
  firstSeen: number;
  risk: number;
  lastActivity: number;
}

export interface TokenTransfers {
  token: string;
  symbol: string;
  decimals: number;
  transfers: {
    from: string;
    to: string;
    value: string;
    timestamp: number;
    hash: string;
  }[];
  transferVolume: string;
  uniqueAddresses: number;
}

export interface BlockchainAccountActivity {
  address: string;
  transactions: BlockchainTransaction[];
  tokenBalances: {
    token: string;
    symbol: string;
    balance: string;
    usdValue: number;
  }[];
  totalUsdValue: number;
  firstActivity: number;
  lastActivity: number;
  incomingTxCount: number;
  outgoingTxCount: number;
  contractInteractions: {
    address: string;
    name: string;
    count: number;
  }[];
}

class BlockchainDataService {
  private supportedNetworks = [
    "ethereum",
    "binance-smart-chain",
    "polygon",
    "arbitrum",
    "optimism",
    "avalanche",
    "solana",
  ];

  // Cache to reduce API requests
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheLifetime = 30000; // 30 seconds default

  private useDemoMock =
    process.env.NODE_ENV !== "production" ||
    process.env.VITE_USE_MOCK_DATA === "true";

  private etherscanKey = process.env.ETHERSCAN_API_KEY || "";
  private infuraKey = process.env.INFURA_PROJECT_ID || "";
  private alchemyKey = process.env.ALCHEMY_API_KEY || "";

  // WebSocket instance for real-time data
  private wsService: WebSocketService;
  private wsSubscriptions: Map<string, boolean> = new Map();

  constructor() {
    this.wsService = new WebSocketService();
    this.initWebsockets();
  }

  private initWebsockets() {
    // Initialize WebSocket connections for real-time blockchain data
    this.connectToWebSocket("ethereum");
  }

  /**
   * Connect to blockchain WebSocket for a specific chain
   */
  public connectToWebSocket(chain: string = "ethereum"): boolean {
    if (this.wsSubscriptions.has(chain)) {
      // Already connected
      return true;
    }

    try {
      // Connect to the blockchain via WebSocket
      this.wsService.blockchain.connect(chain);

      // Subscribe to different data types
      this.wsService.blockchain.subscribeToBlocks(chain);
      this.wsService.blockchain.subscribeToTransactions(chain);
      this.wsService.blockchain.subscribeToGasUpdates(chain);
      this.wsService.blockchain.subscribeToWhaleAlerts(chain);
      this.wsService.blockchain.subscribeToDefiActivity(chain);

      // Mark as subscribed
      this.wsSubscriptions.set(chain, true);

      console.log(`Connected to ${chain} blockchain via WebSocket`);
      return true;
    } catch (error) {
      console.error(
        `Failed to connect to ${chain} blockchain via WebSocket:`,
        error,
      );
      return false;
    }
  }

  /**
   * Disconnect from blockchain WebSocket for a specific chain
   */
  public disconnectFromWebSocket(chain: string = "ethereum"): boolean {
    if (!this.wsSubscriptions.has(chain)) {
      // Not connected
      return true;
    }

    try {
      // Unsubscribe from all data types
      this.wsService.blockchain.unsubscribe(chain, "blocks");
      this.wsService.blockchain.unsubscribe(chain, "transactions");
      this.wsService.blockchain.unsubscribe(chain, "gasUpdates");
      this.wsService.blockchain.unsubscribe(chain, "whaleAlerts");
      this.wsService.blockchain.unsubscribe(chain, "defiActivity");

      // Mark as unsubscribed
      this.wsSubscriptions.delete(chain);

      console.log(`Disconnected from ${chain} blockchain WebSocket`);
      return true;
    } catch (error) {
      console.error(
        `Failed to disconnect from ${chain} blockchain WebSocket:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get WebSocket service instance
   */
  public getWebSocketService(): WebSocketService {
    return this.wsService;
  }

  /**
   * Get recent transactions for a given chain
   */
  async getRecentTransactions(
    chain: string = "ethereum",
    count: number = 10,
  ): Promise<BlockchainTransaction[]> {
    const cacheKey = `${chain}_transactions_${count}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return [];
    }

    try {
      const mockTransactions: BlockchainTransaction[] = Array(count)
        .fill(null)
        .map((_, i) => ({
          hash: `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          from: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          to: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          value: (Math.random() * 10).toFixed(8),
          gasPrice: (Math.random() * 100).toFixed(0),
          gasUsed: (Math.random() * 21000 * 5).toFixed(0),
          timestamp:
            Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600),
          blockNumber: 18000000 - i,
          confirmations: Math.floor(Math.random() * 30),
          tokenTransfers:
            Math.random() > 0.5
              ? [
                  {
                    token: "ETH",
                    value: (Math.random() * 10).toFixed(8),
                    from: `0x${Array(40)
                      .fill(0)
                      .map(() => Math.floor(Math.random() * 16).toString(16))
                      .join("")}`,
                    to: `0x${Array(40)
                      .fill(0)
                      .map(() => Math.floor(Math.random() * 16).toString(16))
                      .join("")}`,
                  },
                ]
              : undefined,
        }));

      // Cache the result
      this.addToCache(cacheKey, mockTransactions);

      return mockTransactions;
    } catch (error) {
      console.error(`Error fetching recent transactions for ${chain}:`, error);
      return [];
    }
  }

  /**
   * Get current gas prices for a given chain
   */
  async getGasPrice(chain: string = "ethereum"): Promise<GasMetrics> {
    const cacheKey = `${chain}_gas`;

    // Check cache first - gas data has a shorter lifetime
    const cached = this.getFromCache(cacheKey, 10000);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return {
        slow: { price: 0, estimatedSeconds: 0 },
        average: { price: 0, estimatedSeconds: 0 },
        fast: { price: 0, estimatedSeconds: 0 },
        instant: { price: 0, estimatedSeconds: 0 },
        baseFee: 0,
        priorityFee: 0,
      };
    }

    try {
      const baseFee = Math.floor(15 + Math.random() * 30);
      const priorityFee = Math.floor(1 + Math.random() * 5);

      const gasData: GasMetrics = {
        slow: {
          price: baseFee + 1,
          estimatedSeconds: 120 + Math.floor(Math.random() * 240),
        },
        average: {
          price: baseFee + priorityFee,
          estimatedSeconds: 30 + Math.floor(Math.random() * 60),
        },
        fast: {
          price: baseFee + priorityFee * 2,
          estimatedSeconds: 15 + Math.floor(Math.random() * 15),
        },
        instant: {
          price: baseFee + priorityFee * 3,
          estimatedSeconds: 5 + Math.floor(Math.random() * 10),
        },
        baseFee,
        priorityFee,
      };

      // Cache the result
      this.addToCache(cacheKey, gasData);

      return gasData;
    } catch (error) {
      console.error(`Error fetching gas price for ${chain}:`, error);
      return {
        slow: { price: 0, estimatedSeconds: 0 },
        average: { price: 0, estimatedSeconds: 0 },
        fast: { price: 0, estimatedSeconds: 0 },
        instant: { price: 0, estimatedSeconds: 0 },
        baseFee: 0,
        priorityFee: 0,
      };
    }
  }

  /**
   * Get network statistics for a given chain
   */
  async getNetworkStats(chain: string = "ethereum"): Promise<NetworkStats> {
    const cacheKey = `${chain}_stats`;

    const cached = this.getFromCache(cacheKey, 60000);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return {
        blockHeight: 0,
        lastBlockTime: 0,
        avgBlockTime: 0,
        difficulty: 0,
        hashRate: "0",
        pendingTxCount: 0,
        activeValidators: 0,
        totalSupply: "0",
        totalStaked: "0",
        marketCap: 0,
      };
    }

    try {
      const stats: NetworkStats = {
        blockHeight: 18150000 + Math.floor(Math.random() * 100),
        lastBlockTime: Math.floor(Date.now() / 1000),
        avgBlockTime: 12 + Math.random(),
        difficulty:
          Math.pow(10, 16) + Math.floor(Math.random() * Math.pow(10, 15)),
        hashRate: `${(400 + Math.random() * 100).toFixed(2)} TH/s`,
        pendingTxCount: Math.floor(Math.random() * 2000),
        activeValidators: 950000 + Math.floor(Math.random() * 10000),
        totalSupply: "120,585,332",
        totalStaked: "18,475,203",
        marketCap: 275000000000 + Math.floor(Math.random() * 10000000000),
      };

      // Cache the result
      this.addToCache(cacheKey, stats);

      return stats;
    } catch (error) {
      console.error(`Error fetching network stats for ${chain}:`, error);
      return {
        blockHeight: 0,
        lastBlockTime: 0,
        avgBlockTime: 0,
        difficulty: 0,
        hashRate: "0",
        pendingTxCount: 0,
        activeValidators: 0,
        totalSupply: "0",
        totalStaked: "0",
        marketCap: 0,
      };
    }
  }

  /**
   * Get recent whale transactions for given chain
   */
  async getWhaleTransactions(
    chain: string = "ethereum",
    minValue: number = 1000000,
    count: number = 10,
  ): Promise<WhaleTransaction[]> {
    const cacheKey = `${chain}_whales_${minValue}_${count}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return [];
    }

    try {
      const exchanges = ["binance", "coinbase", "kraken", "ftx", "huobi"];
      const tokens = ["ETH", "USDC", "USDT", "WBTC", "DAI"];

      const whaleTransactions: WhaleTransaction[] = Array(count)
        .fill(null)
        .map((_, i) => {
          const isExchange = Math.random() > 0.7;
          const token = tokens[Math.floor(Math.random() * tokens.length)];
          const value = (1 + Math.random() * 100).toFixed(
            token === "ETH" || token === "WBTC" ? 4 : 2,
          );

          return {
            hash: `0x${Array(64)
              .fill(0)
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join("")}`,
            from: isExchange
              ? `${exchanges[Math.floor(Math.random() * exchanges.length)]}_wallet`
              : `0x${Array(40)
                  .fill(0)
                  .map(() => Math.floor(Math.random() * 16).toString(16))
                  .join("")}`,
            to: `0x${Array(40)
              .fill(0)
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join("")}`,
            value,
            usdValue:
              token === "ETH"
                ? parseFloat(value) * 2000 + Math.random() * 100
                : token === "WBTC"
                  ? parseFloat(value) * 45000 + Math.random() * 1000
                  : parseFloat(value),
            token,
            timestamp:
              Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
            isExchange,
            exchangeName: isExchange
              ? exchanges[Math.floor(Math.random() * exchanges.length)]
              : undefined,
            transactionType: [
              "transfer",
              "swap",
              "mint",
              "burn",
              "liquidation",
              "other",
            ][Math.floor(Math.random() * 6)] as any,
          };
        });

      // Sort by USD value descending
      whaleTransactions.sort((a, b) => b.usdValue - a.usdValue);

      // Cache the result
      this.addToCache(cacheKey, whaleTransactions);

      return whaleTransactions;
    } catch (error) {
      console.error(`Error fetching whale transactions for ${chain}:`, error);
      return [];
    }
  }

  /**
   * Get trending contracts with most activity
   */
  async getTrendingContracts(
    chain: string = "ethereum",
    count: number = 10,
  ): Promise<ContractInteraction[]> {
    const cacheKey = `${chain}_trending_contracts_${count}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey, 300000);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return [];
    }

    try {
      const contractNames = [
        "Uniswap V3",
        "OpenSea",
        "Aave V3",
        "Compound V3",
        "ENS Registry",
        "USDC",
        "USDT",
        "Chainlink Oracle",
        "Curve Finance",
        "Balancer",
        "MakerDAO",
        "SushiSwap",
        "1inch Router",
        "Lido",
        "Rocket Pool",
      ];

      const contracts: ContractInteraction[] = Array(count)
        .fill(null)
        .map((_, i) => {
          return {
            address: `0x${Array(40)
              .fill(0)
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join("")}`,
            name: contractNames[
              Math.floor(Math.random() * contractNames.length)
            ],
            totalInteractions: 50000 + Math.floor(Math.random() * 1000000),
            uniqueUsers: 5000 + Math.floor(Math.random() * 100000),
            tvl:
              Math.random() > 0.3
                ? 1000000 + Math.floor(Math.random() * 10000000)
                : undefined,
            verified: Math.random() > 0.1,
            firstSeen:
              Math.floor(Date.now() / 1000) -
              Math.floor(Math.random() * 31536000),
            risk: Math.floor(Math.random() * 100),
            lastActivity:
              Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600),
          };
        });

      // Sort by total interactions
      contracts.sort((a, b) => b.totalInteractions - a.totalInteractions);

      // Cache the result
      this.addToCache(cacheKey, contracts);

      return contracts;
    } catch (error) {
      console.error(`Error fetching trending contracts for ${chain}:`, error);
      return [];
    }
  }

  /**
   * Get account details and activity
   */
  async getAccountActivity(
    chain: string,
    address: string,
  ): Promise<BlockchainAccountActivity> {
    const cacheKey = `${chain}_account_${address}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return {
        address,
        transactions: [],
        tokenBalances: [],
        totalUsdValue: 0,
        firstActivity: 0,
        lastActivity: 0,
        incomingTxCount: 0,
        outgoingTxCount: 0,
        contractInteractions: [],
      };
    }

    try {
      const txCount = Math.floor(5 + Math.random() * 20);

      const tokens = [
        {
          token: "ETH",
          symbol: "ETH",
          balance: (1 + Math.random() * 10).toFixed(6),
          usdValue: 0,
        },
        {
          token: "USDC",
          symbol: "USDC",
          balance: (100 + Math.random() * 10000).toFixed(2),
          usdValue: 0,
        },
        {
          token: "WBTC",
          symbol: "WBTC",
          balance: (0.01 + Math.random() * 1).toFixed(8),
          usdValue: 0,
        },
      ];

      // Calculate USD values
      tokens[0].usdValue = parseFloat(tokens[0].balance) * 2000;
      tokens[1].usdValue = parseFloat(tokens[1].balance);
      tokens[2].usdValue = parseFloat(tokens[2].balance) * 45000;

      const totalUsdValue = tokens.reduce(
        (sum, token) => sum + token.usdValue,
        0,
      );

      const accountActivity: BlockchainAccountActivity = {
        address,
        transactions: await this.getRecentTransactions(chain, txCount),
        tokenBalances: tokens,
        totalUsdValue,
        firstActivity:
          Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 31536000),
        lastActivity:
          Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
        incomingTxCount: Math.floor(Math.random() * 100),
        outgoingTxCount: Math.floor(Math.random() * 100),
        contractInteractions: Array(Math.floor(3 + Math.random() * 5))
          .fill(null)
          .map(() => ({
            address: `0x${Array(40)
              .fill(0)
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join("")}`,
            name: ["Uniswap", "AAVE", "Compound", "ENS", "OpenSea", "1inch"][
              Math.floor(Math.random() * 6)
            ],
            count: Math.floor(1 + Math.random() * 50),
          })),
      };

      // Cache the result
      this.addToCache(cacheKey, accountActivity);

      return accountActivity;
    } catch (error) {
      console.error(
        `Error fetching account activity for ${address} on ${chain}:`,
        error,
      );
      return {
        address,
        transactions: [],
        tokenBalances: [],
        totalUsdValue: 0,
        firstActivity: 0,
        lastActivity: 0,
        incomingTxCount: 0,
        outgoingTxCount: 0,
        contractInteractions: [],
      };
    }
  }

  /**
   * Get token transfers for a specific token
   */
  async getTokenTransfers(
    chain: string,
    tokenAddress: string,
    count: number = 20,
  ): Promise<TokenTransfers> {
    const cacheKey = `${chain}_token_${tokenAddress}_transfers_${count}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.useDemoMock) {
      return {
        token: tokenAddress,
        symbol: "UNKNOWN",
        decimals: 18,
        transfers: [],
        transferVolume: "0",
        uniqueAddresses: 0,
      };
    }

    try {
      const tokenSymbol = ["USDC", "USDT", "WETH", "LINK", "DAI"][
        Math.floor(Math.random() * 5)
      ];
      const decimals =
        tokenSymbol === "USDC" || tokenSymbol === "USDT" ? 6 : 18;

      const transfers = Array(count)
        .fill(null)
        .map((_, i) => ({
          from: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          to: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          value:
            tokenSymbol === "WETH"
              ? (0.1 + Math.random() * 5).toFixed(6)
              : (100 + Math.random() * 10000).toFixed(2),
          timestamp:
            Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600),
          hash: `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
        }));

      const tokenData: TokenTransfers = {
        token: tokenAddress,
        symbol: tokenSymbol,
        decimals,
        transfers,
        transferVolume:
          tokenSymbol === "WETH"
            ? (10 + Math.random() * 100).toFixed(2)
            : (100000 + Math.random() * 1000000).toFixed(2),
        uniqueAddresses: 100 + Math.floor(Math.random() * 1000),
      };

      // Cache the result
      this.addToCache(cacheKey, tokenData);

      return tokenData;
    } catch (error) {
      console.error(
        `Error fetching token transfers for ${tokenAddress} on ${chain}:`,
        error,
      );
      return {
        token: tokenAddress,
        symbol: "UNKNOWN",
        decimals: 18,
        transfers: [],
        transferVolume: "0",
        uniqueAddresses: 0,
      };
    }
  }

  /**
   * Utility to add data to cache
   */
  private addToCache(key: string, data: any, ttl: number = this.cacheLifetime) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  /**
   * Utility to get data from cache if not expired
   */
  private getFromCache(key: string, customTtl?: number): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const ttl = customTtl || this.cacheLifetime;

    if (cached.timestamp > Date.now()) {
      return cached.data;
    }

    // Expired
    this.cache.delete(key);
    return null;
  }

  /**
   * Cleanup resources when service is no longer needed
   */
  public destroy() {
    // Disconnect all WebSocket connections
    Array.from(this.wsSubscriptions.keys()).forEach((chain) => {
      this.disconnectFromWebSocket(chain);
    });

    // Clear cache
    this.cache.clear();

    console.log("BlockchainDataService destroyed");
  }
}

// Create singleton instance
export const blockchainService = new BlockchainDataService();
