export interface WebSocketMessage {
  type: string;
  data: any;
  source?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

/**
 * A completely mocked WebSocket service for development
 * This implementation doesn't attempt to make any real connections
 * but provides the same API surface for components to use
 */
export class WebSocketService {
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private mockDataIntervals: NodeJS.Timeout[] = [];
  private enabled: boolean = true;

  // Public API for market data
  public market = {
    connect: () => {
      console.log("[Mock] Connected to market data");
      return true;
    },
    on: (channel: string, handler: MessageHandler) =>
      this.subscribe("market", channel, handler),
    off: (channel: string, handler: MessageHandler) =>
      this.unsubscribe("market", channel, handler),
    subscribe: (symbol: string) => {
      console.log(`[Mock] Subscribed to ${symbol} market data`);
      this.startMockPriceUpdates(symbol);
      return true;
    },
    unsubscribe: (symbol: string) => {
      console.log(`[Mock] Unsubscribed from ${symbol} market data`);
      return true;
    },
  };

  // Public API for blockchain data
  public blockchain = {
    connect: (chain: string = "ethereum") => {
      console.log(`[Mock] Connected to ${chain} blockchain data`);
      return true;
    },
    on: (event: string, handler: MessageHandler) =>
      this.subscribe("blockchain", event, handler),
    off: (event: string, handler: MessageHandler) =>
      this.unsubscribe("blockchain", event, handler),
    subscribeToBlocks: (chain: string = "ethereum") => {
      console.log(`[Mock] Subscribed to ${chain} blocks`);
      return true;
    },
    subscribeToTransactions: (chain: string = "ethereum", address?: string) => {
      console.log(
        `[Mock] Subscribed to ${chain} transactions${address ? ` for ${address}` : ""}`,
      );
      return true;
    },
    subscribeToGasUpdates: (chain: string = "ethereum") => {
      console.log(`[Mock] Subscribed to ${chain} gas updates`);
      return true;
    },
    subscribeToWhaleAlerts: (
      chain: string = "ethereum",
      minValue: number = 1000000,
    ) => {
      console.log(
        `[Mock] Subscribed to ${chain} whale alerts (min: $${minValue})`,
      );
      return true;
    },
    subscribeToDefiActivity: (
      chain: string = "ethereum",
      protocol?: string,
    ) => {
      console.log(
        `[Mock] Subscribed to ${chain} DeFi activity${protocol ? ` for ${protocol}` : ""}`,
      );
      return true;
    },
    subscribeToMEV: (chain: string = "ethereum") => {
      console.log(`[Mock] Subscribed to ${chain} MEV activity`);
      return true;
    },
    subscribeToSecurityAlerts: (
      chain: string = "ethereum",
      severity: string = "all",
    ) => {
      console.log(
        `[Mock] Subscribed to ${chain} security alerts (severity: ${severity})`,
      );
      return true;
    },
    subscribeToMarketSentiment: (chain: string = "ethereum") => {
      console.log(`[Mock] Subscribed to ${chain} market sentiment data`);
      return true;
    },
    unsubscribe: (chain: string = "ethereum", event: string) => {
      console.log(`[Mock] Unsubscribed from ${chain} ${event}`);
      return true;
    },
  };

  // Standard event methods
  public on(event: string, handler: MessageHandler) {
    return this.subscribe("app", event, handler);
  }

  public off(event: string, handler: MessageHandler) {
    return this.unsubscribe("app", event, handler);
  }

  public addListener(event: string, handler: MessageHandler) {
    return this.subscribe("app", event, handler);
  }

  constructor() {
    this.startMockDataIntervals();
    console.log("[Mock] WebSocket service initialized in development mode");
  }

  private startMockDataIntervals() {
    // Simulate market data (Bitcoin price updates)
    const btcInterval = setInterval(() => {
      if (!this.enabled) return;

      this.emitMockMessage("market", {
        type: "ticker",
        data: {
          symbol: "btcusdt",
          price: 45000 + Math.random() * 1000,
          volume: 1000 + Math.random() * 500,
          timestamp: Date.now(),
        },
      });
    }, 5000);

    // Simulate market data (Ethereum price updates)
    const ethInterval = setInterval(() => {
      if (!this.enabled) return;

      this.emitMockMessage("market", {
        type: "ticker",
        data: {
          symbol: "ethusdt",
          price: 3000 + Math.random() * 100,
          volume: 5000 + Math.random() * 1000,
          timestamp: Date.now(),
        },
      });
    }, 7000);

    // Simulate blockchain data - new blocks
    const blockchainInterval = setInterval(() => {
      if (!this.enabled) return;

      this.emitMockMessage("blockchain", {
        type: "newBlock",
        data: {
          chain: "ethereum",
          blockNumber: Math.floor(17000000 + Math.random() * 1000),
          timestamp: Date.now(),
          transactions: Math.floor(100 + Math.random() * 150),
          gasUsed: Math.floor(12000000 + Math.random() * 3000000),
          miner: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          rewards: (2 + Math.random() * 0.5).toFixed(4),
          // Enhanced data
          size: Math.floor(1000000 + Math.random() * 500000),
          baseFeePerGas: Math.floor(15 + Math.random() * 30),
          difficulty:
            Math.pow(10, 16) + Math.floor(Math.random() * Math.pow(10, 15)),
          totalDifficulty: "58750003716598352816469",
          uncles: Math.floor(Math.random() * 3),
          stateRoot: `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
        },
      });
    }, 12000);

    // Simulate blockchain data - transactions
    const txInterval = setInterval(() => {
      if (!this.enabled) return;

      // Generate a random transaction
      const isFailed = Math.random() < 0.05; // 5% chance of failure
      const isToken = Math.random() < 0.6; // 60% chance of token transfer
      const isContract = Math.random() < 0.4; // 40% chance of contract interaction

      this.emitMockMessage("blockchain", {
        type: "transaction",
        data: {
          chain: "ethereum",
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
          value: isToken ? "0" : (Math.random() * 5).toFixed(6),
          gasPrice: (Math.random() * 50 + 10).toFixed(0),
          gasUsed: (Math.random() * 100000 + 21000).toFixed(0),
          timestamp: Date.now(),
          status: isFailed ? "failed" : "success",
          tokenTransfers: isToken
            ? [
                {
                  token: ["USDT", "USDC", "DAI", "LINK", "UNI"][
                    Math.floor(Math.random() * 5)
                  ],
                  value: (Math.random() * 1000 + 100).toFixed(2),
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
          contractInteraction: isContract
            ? {
                name: ["Uniswap V3", "Aave V3", "Compound", "1inch", "Lido"][
                  Math.floor(Math.random() * 5)
                ],
                method: ["swap", "deposit", "withdraw", "stake", "claim"][
                  Math.floor(Math.random() * 5)
                ],
              }
            : undefined,
        },
      });
    }, 3000);

    // Simulate gas price updates
    const gasInterval = setInterval(() => {
      if (!this.enabled) return;

      const baseFee = Math.floor(15 + Math.random() * 30);
      const priorityFee = Math.floor(1 + Math.random() * 5);

      this.emitMockMessage("blockchain", {
        type: "gasUpdate",
        data: {
          chain: "ethereum",
          timestamp: Date.now(),
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
        },
      });
    }, 15000);

    // Simulate "whale" transactions (large value movements)
    const whaleInterval = setInterval(() => {
      if (!this.enabled) return;

      const exchangeNames = ["Binance", "Coinbase", "Kraken", "FTX", "Gemini"];
      const isFromExchange = Math.random() < 0.4;
      const isToExchange = Math.random() < 0.3;
      const exchangeIndex = Math.floor(Math.random() * exchangeNames.length);

      this.emitMockMessage("blockchain", {
        type: "whaleTransaction",
        data: {
          chain: "ethereum",
          hash: `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          from: isFromExchange
            ? `${exchangeNames[exchangeIndex]}_${Math.floor(Math.random() * 5) + 1}`
            : `0x${Array(40)
                .fill(0)
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join("")}`,
          to: isToExchange
            ? `${exchangeNames[(exchangeIndex + 1) % exchangeNames.length]}_${Math.floor(Math.random() * 5) + 1}`
            : `0x${Array(40)
                .fill(0)
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join("")}`,
          isFromExchange,
          isToExchange,
          value: (Math.random() * 1000 + 100).toFixed(2),
          usdValue: Math.floor(Math.random() * 5000000 + 1000000),
          token:
            Math.random() < 0.7
              ? "ETH"
              : ["USDT", "USDC", "BTC", "LINK"][Math.floor(Math.random() * 4)],
          timestamp: Date.now(),
        },
      });
    }, 20000);

    // Simulate DeFi protocol activity
    const defiInterval = setInterval(() => {
      if (!this.enabled) return;

      const protocols = ["Uniswap", "Aave", "Compound", "Curve", "MakerDAO"];
      const actions = [
        "deposit",
        "withdraw",
        "borrow",
        "repay",
        "swap",
        "stake",
        "unstake",
        "liquidation",
      ];
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];

      this.emitMockMessage("blockchain", {
        type: "defiActivity",
        data: {
          chain: "ethereum",
          protocol,
          action,
          timestamp: Date.now(),
          txHash: `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          user: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          amount: (Math.random() * 100 + 1).toFixed(4),
          token: ["ETH", "USDT", "USDC", "DAI", "WBTC"][
            Math.floor(Math.random() * 5)
          ],
          usdValue: Math.floor(Math.random() * 500000 + 1000),
        },
      });
    }, 17000);

    // Add MEV transaction tracking
    const mevInterval = setInterval(() => {
      if (!this.enabled) return;

      const mevTypes = [
        "frontrunning",
        "backrunning",
        "sandwich",
        "arbitrage",
        "liquidation",
      ];
      const mevType = mevTypes[Math.floor(Math.random() * mevTypes.length)];
      const protocols = ["Uniswap", "SushiSwap", "Curve", "Balancer", "dYdX"];
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];

      this.emitMockMessage("blockchain", {
        type: "mevTransaction",
        data: {
          chain: "ethereum",
          hash: `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          timestamp: Date.now(),
          blockNumber: Math.floor(17000000 + Math.random() * 1000),
          mevType,
          protocol,
          profitUSD: Math.floor(1000 + Math.random() * 50000),
          profitETH: (0.5 + Math.random() * 20).toFixed(4),
          bundleId: `0x${Array(16)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          from: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
        },
      });
    }, 25000);

    // Add smart contract security alerts
    const securityInterval = setInterval(() => {
      if (!this.enabled) return;

      const alertTypes = [
        "vulnerabilityDetected",
        "exploitAttempt",
        "contractUpgraded",
        "ownershipTransferred",
        "pauseStatus",
      ];
      const alertType =
        alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severities = ["low", "medium", "high", "critical"];
      const severity =
        severities[Math.floor(Math.random() * severities.length)];

      this.emitMockMessage("blockchain", {
        type: "securityAlert",
        data: {
          chain: "ethereum",
          timestamp: Date.now(),
          contractAddress: `0x${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`,
          contractName: ["USDC", "Aave", "Compound", "Uniswap", "MakerDAO"][
            Math.floor(Math.random() * 5)
          ],
          alertType,
          severity,
          description: `Potential ${alertType} detected in smart contract`,
          transactionHash:
            alertType !== "vulnerabilityDetected"
              ? `0x${Array(64)
                  .fill(0)
                  .map(() => Math.floor(Math.random() * 16).toString(16))
                  .join("")}`
              : undefined,
          impactedFunds:
            severity === "critical" || severity === "high"
              ? `$${(Math.random() * 10000000 + 100000).toLocaleString()}`
              : undefined,
        },
      });
    }, 45000);

    // Add market sentiment data based on blockchain activity
    const sentimentInterval = setInterval(() => {
      if (!this.enabled) return;

      this.emitMockMessage("blockchain", {
        type: "marketSentiment",
        data: {
          chain: "ethereum",
          timestamp: Date.now(),
          sentimentScore: Math.random() * 100,
          bullishSignals: {
            whaleAccumulation: Math.random() > 0.5,
            exchangeOutflows: Math.floor(Math.random() * 10000 + 1000),
            stakingIncrease: Math.random() > 0.6,
            decreasedSellingPressure: Math.random() > 0.7,
          },
          bearishSignals: {
            whaleDistribution: Math.random() > 0.7,
            exchangeInflows: Math.floor(Math.random() * 8000 + 500),
            stakingDecrease: Math.random() > 0.8,
            increasedSellingPressure: Math.random() > 0.6,
          },
          topTokensActivity: [
            { token: "ETH", netFlow: (Math.random() * 2 - 1) * 10000 },
            { token: "USDC", netFlow: (Math.random() * 2 - 1) * 50000 },
            { token: "USDT", netFlow: (Math.random() * 2 - 1) * 40000 },
          ],
        },
      });
    }, 30000);

    this.mockDataIntervals.push(
      btcInterval,
      ethInterval,
      blockchainInterval,
      txInterval,
      gasInterval,
      whaleInterval,
      defiInterval,
      mevInterval,
      securityInterval,
      sentimentInterval,
    );
  }

  private startMockPriceUpdates(symbol: string) {
    // Only start if not already running
    const symbolLower = symbol.toLowerCase();
    if (symbolLower === "btcusdt" || symbolLower === "ethusdt") {
      return; // Already covered by default intervals
    }

    const interval = setInterval(() => {
      if (!this.enabled) return;

      this.emitMockMessage("market", {
        type: "ticker",
        data: {
          symbol: symbolLower,
          price: 100 + Math.random() * 10,
          volume: 1000 + Math.random() * 500,
          timestamp: Date.now(),
        },
      });
    }, 8000);

    this.mockDataIntervals.push(interval);
  }

  private emitMockMessage(source: string, message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(source);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(
            `[Mock] Error in message handler for ${source}:`,
            error,
          );
        }
      });
    }
  }

  // Subscribe to a data source and channel
  subscribe(source: string, channel: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(source)) {
      this.messageHandlers.set(source, new Set());
    }

    const handlers = this.messageHandlers.get(source);
    if (handlers) {
      handlers.add(handler);
    }

    return this;
  }

  // Unsubscribe from a data source and channel
  unsubscribe(source: string, channel: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(source);
    if (handlers) {
      handlers.delete(handler);
    }
    return this;
  }

  // Clean up all mock intervals
  close() {
    this.enabled = false;
    this.mockDataIntervals.forEach((interval) => clearInterval(interval));
    this.mockDataIntervals = [];
    this.messageHandlers.clear();
    console.log("[Mock] WebSocket service closed");
  }

  // Add missing methods to fix errors
  public connectToSource(source: string) {
    console.log(`[Mock] Connected to ${source} data source`);
    return true;
  }

  public disconnectFromSource(source: string) {
    console.log(`[Mock] Disconnected from ${source} data source`);
    return true;
  }

  public send(message: any) {
    console.log(`[Mock] Sending message: ${JSON.stringify(message)}`);
    // In mock mode, we can simulate a response if needed
    if (message.type === "placeOrder" && this.messageHandlers.has("trading")) {
      const handlers = this.messageHandlers.get("trading");
      if (handlers) {
        setTimeout(() => {
          handlers.forEach((handler) => {
            try {
              handler({
                type: "execution",
                data: {
                  type: "execution",
                  payload: {
                    orderId: message.data.id,
                    symbol: message.data.symbol,
                    side: message.data.side,
                    price: message.data.price || 45000,
                    quantity: message.data.quantity * 0.5,
                    timestamp: Date.now(),
                    fee: message.data.quantity * 0.001,
                    tradeId: Math.random().toString(36).substr(2, 9),
                    feeAsset: message.data.symbol.split("/")[1] || "USDT",
                  },
                },
                source: "trading",
              });
            } catch (error) {
              console.error(`[Mock] Error in trading message handler:`, error);
            }
          });
        }, 500);
      }
    }
    return true;
  }
}
