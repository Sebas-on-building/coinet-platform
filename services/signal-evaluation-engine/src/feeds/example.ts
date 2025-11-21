/**
 * =========================================
 * REAL-TIME SIGNAL PROCESSING BACKEND EXAMPLE
 * =========================================
 * Demonstrates the complete real-time data ingestion
 * system with sub-second latency and fault tolerance
 */

import { FeedManager } from './FeedManager';
import { MarketDataFeedClass } from './MarketDataFeed';
import { BlockchainMonitor } from './BlockchainMonitor';
import type {
  ExchangeConfig,
  BlockchainConfig
} from './types';
import type { FeedManagerConfig } from './FeedManager';

/**
 * Example: Complete Real-Time Signal Processing Backend
 */
export class RealTimeSignalBackend {
  private feedManager: FeedManager;
  private signalProcessor: any; // Signal evaluation engine

  constructor() {
    // Create feed manager configuration
    const config: FeedManagerConfig = {
      marketData: {
        exchanges: [
          {
            name: 'binance',
            wsUrl: 'wss://stream.binance.com:9443/ws',
            restUrl: 'https://api.binance.com',
            rateLimits: {
              requestsPerSecond: 10,
              requestsPerMinute: 1200,
              requestsPerHour: 10000
            },
            retryConfig: {
              maxRetries: 5,
              baseDelay: 1000,
              maxDelay: 30000,
              backoffMultiplier: 2
            },
            heartbeatInterval: 30000,
            supportedFeatures: {
              orderBook: true,
              trades: true,
              quotes: true,
              ticker: true,
              kline: true
            }
          },
          {
            name: 'coinbase',
            wsUrl: 'wss://ws-feed.pro.coinbase.com',
            restUrl: 'https://api.pro.coinbase.com',
            rateLimits: {
              requestsPerSecond: 10,
              requestsPerMinute: 600,
              requestsPerHour: 5000
            },
            retryConfig: {
              maxRetries: 3,
              baseDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2
            },
            heartbeatInterval: 30000,
            supportedFeatures: {
              orderBook: true,
              trades: true,
              quotes: false,
              ticker: true,
              kline: false
            }
          }
        ],
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
        enabledStreams: ['trade', 'depth', 'ticker']
      },
      blockchain: {
        networks: [
          {
            name: 'ethereum',
            rpcUrls: [
              'https://mainnet.infura.io/v3/YOUR_KEY',
              'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'
            ],
            chainId: 1,
            blockTime: 12,
            confirmations: 12,
            rateLimits: {
              requestsPerSecond: 20,
              requestsPerMinute: 1000
            },
            retryConfig: {
              maxRetries: 3,
              baseDelay: 1000,
              maxDelay: 10000
            }
          },
          {
            name: 'polygon',
            rpcUrls: ['https://polygon-rpc.com'],
            chainId: 137,
            blockTime: 2,
            confirmations: 64,
            rateLimits: {
              requestsPerSecond: 40,
              requestsPerMinute: 2000
            },
            retryConfig: {
              maxRetries: 3,
              baseDelay: 500,
              maxDelay: 5000
            }
          }
        ],
        enabledFeatures: ['blocks', 'transactions', 'logs', 'transfers', 'dexTrades']
      },
      socialMedia: {
        platforms: [],
        keywords: ['bitcoin', 'ethereum', 'crypto', 'defi'],
        languages: ['en']
      },
      news: {
        sources: [],
        categories: ['breaking', 'regulation', 'defi']
      },
      defi: {
        protocols: [],
        metrics: ['tvl', 'volume', 'yields']
      },
      normalization: {
        timestampSync: {
          enabled: true,
          maxDrift: 1000,
          syncInterval: 60
        },
        dataValidation: {
          enabled: true,
          strictMode: false,
          allowedAge: 300
        },
        rateLimiting: {
          enabled: true,
          burstLimit: 1000,
          sustainedRate: 100
        }
      },
      healthCheckInterval: 30000,
      maxBufferSize: 10000
    };

    this.feedManager = new FeedManager(config);
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Real-Time Signal Processing Backend...');

    // Initialize feed manager
    await this.feedManager.initialize();

    // Set up signal processing (would integrate with signal evaluation engine)
    this.setupSignalProcessing();

    console.log('✅ Backend initialized successfully');
  }

  async start(): Promise<void> {
    console.log('🔄 Starting all data feeds...');

    // Start feed manager
    await this.feedManager.start();

    // Start monitoring
    this.startMonitoring();

    console.log('✅ All data feeds started successfully');
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping all data feeds...');

    await this.feedManager.stop();

    console.log('✅ All data feeds stopped successfully');
  }

  /**
   * Set up signal processing integration
   */
  private setupSignalProcessing(): void {
    // This would integrate with the signal evaluation engine
    this.signalProcessor = {
      processSignals: (signals: any[]) => {
        console.log(`📊 Processing ${signals.length} signals`);
        // Process signals through evaluation engine
      }
    };

    // Set signal processor in feed manager
    (this.feedManager as any).signalProcessor = this.signalProcessor;
  }

  /**
   * Start monitoring and health checks
   */
  private startMonitoring(): void {
    // Monitor feed health every 30 seconds
    setInterval(() => {
      const health = this.feedManager.getFeedHealthSummary();
      const metrics = this.feedManager.getFeedMetrics();

      console.log('📊 Feed Health Summary:', {
        healthy: health.overall.healthy,
        degraded: health.overall.degraded,
        unhealthy: health.overall.unhealthy,
        offline: health.overall.offline,
        totalThroughput: metrics.totalThroughput,
        avgLatency: metrics.avgLatency,
        errorRate: metrics.errorRate
      });

      // Check latency requirements
      const latencyRequirements = {
        marketData: 100, // < 100ms
        onChain: 2000,   // < 2s
        socialSignals: 5000, // < 5s
        newsFeeds: 10000,    // < 10s
        defiMetrics: 5000    // < 5s
      };

      const meetsRequirements = this.feedManager.meetsLatencyRequirements(latencyRequirements);

      if (!meetsRequirements) {
        console.warn('⚠️ Latency requirements not met');
      }

    }, 30000);

    // Monitor specific feed types
    this.feedManager.on('healthUpdate', (metrics: any) => {
      console.log('🔍 Feed Metrics Update:', metrics);
    });
  }

  /**
   * Demonstrate market data feed
   */
  async demonstrateMarketDataFeed(): Promise<void> {
    console.log('🎯 Demonstrating Market Data Feed...');

    const binanceConfig: ExchangeConfig = {
      name: 'binance',
      wsUrl: 'wss://stream.binance.com:9443/ws',
      restUrl: 'https://api.binance.com',
      rateLimits: {
        requestsPerSecond: 5,
        requestsPerMinute: 600,
        requestsPerHour: 5000
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      heartbeatInterval: 30000,
      supportedFeatures: {
        orderBook: true,
        trades: true,
        quotes: true,
        ticker: true,
        kline: true
      }
    };

    const marketFeed = new MarketDataFeedClass(binanceConfig);
    await marketFeed.initialize();

    // Set up event handlers
    marketFeed.on('trade', (tradeData: any) => {
      console.log('💹 Trade Update:', {
        symbol: tradeData.symbol,
        price: tradeData.price,
        quantity: tradeData.quantity,
        side: tradeData.side,
        timestamp: tradeData.timestamp
      });
    });

    marketFeed.on('orderbook', (orderBookData: any) => {
      console.log('📊 Order Book Update:', {
        symbol: orderBookData.symbol,
        bestBid: orderBookData.bids[0]?.price,
        bestAsk: orderBookData.asks[0]?.price,
        spread: ((orderBookData.asks[0]?.price - orderBookData.bids[0]?.price) / orderBookData.bids[0]?.price * 100).toFixed(2) + '%'
      });
    });

    await marketFeed.start();

    // Subscribe to streams
    marketFeed.subscribe([
      'btcusdt@trade',
      'btcusdt@depth'
    ]);

    // Monitor for 30 seconds
    setTimeout(async () => {
      await marketFeed.stop();
      console.log('✅ Market data feed demonstration completed');
    }, 30000);
  }

  /**
   * Demonstrate blockchain monitoring
   */
  async demonstrateBlockchainMonitoring(): Promise<void> {
    console.log('⛓️ Demonstrating Blockchain Monitoring...');

    const ethereumConfig: BlockchainConfig = {
      name: 'ethereum',
      rpcUrls: ['https://mainnet.infura.io/v3/YOUR_KEY'],
      chainId: 1,
      blockTime: 12,
      confirmations: 12,
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 500
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      }
    };

    const blockchainMonitor = new BlockchainMonitor(ethereumConfig);
    await blockchainMonitor.initialize();

    // Set up event handlers
    blockchainMonitor.on('block', (blockData: any) => {
      console.log('🧱 New Block:', {
        number: blockData.blockNumber,
        transactions: blockData.transactions,
        gasUsed: blockData.gasUsed,
        timestamp: blockData.timestamp
      });
    });

    blockchainMonitor.on('transaction', (txData: any) => {
      if (parseInt(txData.value, 16) > 0) {
        console.log('💸 Large Transaction:', {
          hash: txData.hash,
          value: (parseInt(txData.value, 16) / 1e18).toFixed(4) + ' ETH',
          from: txData.from.slice(0, 10) + '...',
          to: txData.to?.slice(0, 10) + '...'
        });
      }
    });

    blockchainMonitor.on('tokenTransfer', (transferData: any) => {
      console.log('🪙 Token Transfer:', {
        token: transferData.tokenSymbol,
        amount: (parseInt(transferData.amount, 16) / Math.pow(10, transferData.decimals)).toFixed(4),
        from: transferData.from.slice(0, 10) + '...',
        to: transferData.to.slice(0, 10) + '...'
      });
    });

    await blockchainMonitor.start();

    // Monitor for 60 seconds
    setTimeout(async () => {
      await blockchainMonitor.stop();
      console.log('✅ Blockchain monitoring demonstration completed');
    }, 60000);
  }

  /**
   * Get backend status
   */
  getStatus(): any {
    return {
      feedManager: this.feedManager.getStatus(),
      metrics: this.feedManager.getFeedMetrics(),
      health: this.feedManager.getFeedHealthSummary()
    };
  }
}

/**
 * Example Usage
 */
export async function runBackendExample(): Promise<void> {
  const backend = new RealTimeSignalBackend();

  try {
    // Initialize backend
    await backend.initialize();

    // Start all feeds
    await backend.start();

    // Demonstrate individual components
    await backend.demonstrateMarketDataFeed();
    await backend.demonstrateBlockchainMonitoring();

    // Show final status
    const status = backend.getStatus();
    console.log('\n📊 Final Backend Status:', status);

  } catch (error) {
    console.error('❌ Backend example failed:', error);
  } finally {
    await backend.stop();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runBackendExample().catch(console.error);
}
