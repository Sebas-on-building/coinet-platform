#!/bin/bash
# 🚀 COINET MVP - Complete File Creation Script
# Copy this entire script and run in your GitHub Codespace terminal
# Location: /workspaces/coinet-platform

set -e
cd /workspaces/coinet-platform

echo "🏗️  Setting up Signal Intelligence MVP..."

# Create directories
mkdir -p packages/signal-intelligence/src/{onchain-intelligence,social-sentiment,market-microstructure,types,utils}

# Create package.json
cat > packages/signal-intelligence/package.json << 'PKG_EOF'
{
  "name": "@coinet/signal-intelligence",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "jest"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "ws": "^8.14.2",
    "ethers": "^6.9.0",
    "cheerio": "^1.0.0-rc.12",
    "sentiment": "^5.0.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/ws": "^8.5.9",
    "typescript": "^5.3.3"
  }
}
PKG_EOF

# Create tsconfig.json
cat > packages/signal-intelligence/tsconfig.json << 'TS_EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
TS_EOF

# Create CORE TYPES
cat > packages/signal-intelligence/src/types/signal-types.ts << 'TYPE_EOF'
/**
 * Core Signal Intelligence Types
 * Defines all data structures for MVP signals
 */

export type SignalType = 'whale' | 'social' | 'breakout';
export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical';
export type Direction = 'bullish' | 'bearish' | 'neutral';

// ===== WHALE TRACKER TYPES =====

export interface WalletAddress {
  address: string;
  label?: string;  // e.g., "Binance Hot Wallet"
  tags?: string[]; // e.g., ["exchange", "whale"]
}

export interface WhaleTransaction {
  hash: string;
  from: WalletAddress;
  to: WalletAddress;
  asset: string;  // e.g., "ETH", "USDT"
  amount: number;
  amountUSD: number;
  timestamp: Date;
  type: 'deposit' | 'withdrawal' | 'transfer';
  exchange?: string;  // If interacting with exchange
  bridgeProtocol?: string;  // If bridge transaction
}

export interface WhalePattern {
  walletAddress: string;
  pattern: 'accumulation' | 'distribution' | 'neutral';
  confidence: number;  // 0-100
  timeframe: string;   // e.g., "24h", "7d"
  totalVolume: number;
  netFlow: number;  // positive = accumulation, negative = distribution
  transactionCount: number;
}

export interface WhaleAlert {
  id: string;
  signalType: 'whale';
  severity: SignalSeverity;
  direction: Direction;
  transaction: WhaleTransaction;
  pattern?: WhalePattern;
  confidence: number;
  explanation: string;
  suggestedAction: 'buy' | 'sell' | 'watch' | 'exit';
  timestamp: Date;
}

// ===== SOCIAL SENTIMENT TYPES =====

export interface SocialMention {
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord';
  content: string;
  author: string;
  authorFollowers?: number;
  engagement: {
    likes?: number;
    retweets?: number;
    comments?: number;
    upvotes?: number;
  };
  sentiment: number;  // -1 to 1
  timestamp: Date;
  url?: string;
}

export interface ViralTrend {
  asset: string;
  platform: 'twitter' | 'reddit' | 'telegram' | 'multi';
  mentionsVelocity: number;  // mentions per minute
  totalMentions: number;
  avgSentiment: number;  // -1 to 1
  topInfluencers: string[];
  narrative?: string;  // e.g., "AI coins pumping"
  rugpullRisk?: number;  // 0-100
  timeframe: string;
}

export interface SocialAlert {
  id: string;
  signalType: 'social';
  severity: SignalSeverity;
  direction: Direction;
  trend: ViralTrend;
  topMentions: SocialMention[];
  confidence: number;
  explanation: string;
  suggestedAction: 'buy' | 'sell' | 'watch' | 'avoid';
  timestamp: Date;
}

// ===== PRICE BREAKOUT TYPES =====

export interface OrderbookSnapshot {
  exchange: string;
  asset: string;
  timestamp: Date;
  bids: [number, number][];  // [price, volume]
  asks: [number, number][];
  spread: number;
  imbalance: number;  // -1 (all asks) to 1 (all bids)
}

export interface VolumeAnomaly {
  asset: string;
  exchange: string;
  currentVolume: number;
  avgVolume: number;
  zscore: number;  // Standard deviations from mean
  percentChange: number;
  timestamp: Date;
}

export interface BreakoutSignal {
  asset: string;
  exchange: string;
  type: 'support' | 'resistance';
  priceLevel: number;
  currentPrice: number;
  volume: VolumeAnomaly;
  orderbook: OrderbookSnapshot;
  spreadChange: number;  // Percentage change
  multiTimeframeConfirmation: boolean;
  timestamp: Date;
}

export interface BreakoutAlert {
  id: string;
  signalType: 'breakout';
  severity: SignalSeverity;
  direction: Direction;
  signal: BreakoutSignal;
  confidence: number;
  explanation: string;
  suggestedAction: 'buy' | 'sell' | 'watch';
  targetPrice?: number;
  stopLoss?: number;
  timestamp: Date;
}

// ===== UNIFIED SIGNAL =====

export type Signal = WhaleAlert | SocialAlert | BreakoutAlert;

export interface SignalConfig {
  enabled: boolean;
  thresholds: {
    minConfidence: number;
    minSeverity: SignalSeverity;
  };
  notifications: {
    telegram: boolean;
    email: boolean;
    push: boolean;
  };
}

export interface SignalIntelligenceConfig {
  whale: SignalConfig;
  social: SignalConfig;
  breakout: SignalConfig;
  apiKeys: {
    etherscan?: string;
    twitter?: string;
    reddit?: string;
    binance?: string;
  };
}
TYPE_EOF

echo "✅ Core types created!"

# Create WHALE TRACKER implementation
cat > packages/signal-intelligence/src/onchain-intelligence/whale-tracker.ts << 'WHALE_EOF'
/**
 * Whale Tracker
 * Real-time monitoring of large wallet movements
 * MVP Implementation - Focuses on ETH/USDT whales
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import {
  WhaleTransaction,
  WhalePattern,
  WhaleAlert,
  WalletAddress,
  SignalSeverity,
  Direction
} from '../types/signal-types';

export interface WhaleTrackerConfig {
  apiKey: string;  // Etherscan API key
  minTransactionUSD: number;  // Minimum transaction size to track
  whaleThresholdUSD: number;  // Defines "whale" size
  trackAssets: string[];  // Assets to monitor
  checkInterval: number;  // Polling interval in ms
}

export class WhaleTracker extends EventEmitter {
  private config: WhaleTrackerConfig;
  private knownWhales: Map<string, WhalePattern>;
  private transactionHistory: Map<string, WhaleTransaction[]>;
  private lastCheckBlock: number;
  private exchangeAddresses: Set<string>;

  constructor(config: WhaleTrackerConfig) {
    super();
    this.config = config;
    this.knownWhales = new Map();
    this.transactionHistory = new Map();
    this.lastCheckBlock = 0;
    this.exchangeAddresses = new Set([
      '0x28c6c06298d514db089934071355e5743bf21d60',  // Binance 14
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549',  // Binance 15
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',  // Binance 16
      '0x56eddb7aa87536c09ccc2793473599fd21a8b17f',  // Binance Hot Wallet
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',  // Binance
      '0xd551234ae421e3bcba99a0da6d736074f22192ff',  // Binance
      '0x564286362092d8e7936f0549571a803b203aaced',  // Binance
      '0x0681d8db095565fe8a346fa0277bffde9c0edbbf',  // Binance
      '0xfe9e8709d3215310075d67e3ed32a380ccf451c8',  // Binance
      '0xa090e606e30bd747d4e6245a1517ebe430f0057e',  // Coinbase 1
      '0x503828976d22510aad0201ac7ec88293211d23da',  // Coinbase 2
      '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740',  // Coinbase 3
      '0x71660c4005ba85c37ccec55d0c4493e66fe775d3',  // Coinbase 4
      '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0',  // Kraken
    ]);
  }

  /**
   * Start monitoring whale transactions
   */
  async start(): Promise<void> {
    console.log('🐋 Whale Tracker started...');
    
    // Get latest block
    this.lastCheckBlock = await this.getLatestBlock();
    
    // Start polling loop
    this.poll();
  }

  private async poll(): Promise<void> {
    try {
      await this.checkNewTransactions();
    } catch (error) {
      console.error('Error in whale tracker poll:', error);
    }
    
    // Schedule next poll
    setTimeout(() => this.poll(), this.config.checkInterval);
  }

  /**
   * Fetch latest Ethereum block number
   */
  private async getLatestBlock(): Promise<number> {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${this.config.apiKey}`
    );
    return parseInt(response.data.result, 16);
  }

  /**
   * Check for new large transactions since last block
   */
  private async checkNewTransactions(): Promise<void> {
    const currentBlock = await this.getLatestBlock();
    
    if (currentBlock <= this.lastCheckBlock) {
      return;  // No new blocks
    }

    // Fetch transactions from recent blocks
    // Note: In production, use WebSocket for real-time data
    for (let block = this.lastCheckBlock + 1; block <= currentBlock; block++) {
      const transactions = await this.getBlockTransactions(block);
      
      for (const tx of transactions) {
        await this.processTransaction(tx);
      }
    }

    this.lastCheckBlock = currentBlock;
  }

  /**
   * Fetch transactions from a specific block
   * MVP: Simplified implementation
   */
  private async getBlockTransactions(blockNumber: number): Promise<WhaleTransaction[]> {
    try {
      // In production, parse full block data
      // For MVP, we'll use Etherscan's txlist API to get recent large transfers
      
      // This is a simplified approach - in production you'd stream blocks
      const response = await axios.get(
        `https://api.etherscan.io/api?module=account&action=txlist&startblock=${blockNumber}&endblock=${blockNumber}&sort=desc&apikey=${this.config.apiKey}`
      );

      if (response.data.status !== '1') {
        return [];
      }

      return response.data.result
        .filter((tx: any) => {
          const valueETH = parseInt(tx.value) / 1e18;
          const valueUSD = valueETH * 2000;  // Simplified ETH price
          return valueUSD >= this.config.minTransactionUSD;
        })
        .map((tx: any) => this.parseTransaction(tx));
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error);
      return [];
    }
  }

  /**
   * Parse raw transaction into WhaleTransaction
   */
  private parseTransaction(rawTx: any): WhaleTransaction {
    const valueETH = parseInt(rawTx.value) / 1e18;
    const valueUSD = valueETH * 2000;  // In production, fetch real ETH price

    const from: WalletAddress = {
      address: rawTx.from.toLowerCase(),
      tags: this.getAddressTags(rawTx.from.toLowerCase())
    };

    const to: WalletAddress = {
      address: rawTx.to.toLowerCase(),
      tags: this.getAddressTags(rawTx.to.toLowerCase())
    };

    const type = this.classifyTransactionType(from, to);

    return {
      hash: rawTx.hash,
      from,
      to,
      asset: 'ETH',
      amount: valueETH,
      amountUSD: valueUSD,
      timestamp: new Date(parseInt(rawTx.timeStamp) * 1000),
      type,
      exchange: this.getExchangeName(to.address) || this.getExchangeName(from.address)
    };
  }

  /**
   * Get tags for a wallet address
   */
  private getAddressTags(address: string): string[] {
    const tags: string[] = [];
    
    if (this.exchangeAddresses.has(address)) {
      tags.push('exchange');
    }
    
    if (this.knownWhales.has(address)) {
      tags.push('whale');
    }
    
    return tags;
  }

  /**
   * Classify transaction type
   */
  private classifyTransactionType(
    from: WalletAddress,
    to: WalletAddress
  ): 'deposit' | 'withdrawal' | 'transfer' {
    const fromIsExchange = from.tags?.includes('exchange');
    const toIsExchange = to.tags?.includes('exchange');

    if (!fromIsExchange && toIsExchange) {
      return 'deposit';
    } else if (fromIsExchange && !toIsExchange) {
      return 'withdrawal';
    } else {
      return 'transfer';
    }
  }

  /**
   * Get exchange name from address
   */
  private getExchangeName(address: string): string | undefined {
    // Simplified mapping - in production, use comprehensive database
    if (address.startsWith('0x28c6c06') || address.startsWith('0x21a31e')) {
      return 'Binance';
    } else if (address.startsWith('0xa090e6') || address.startsWith('0x503828')) {
      return 'Coinbase';
    } else if (address.startsWith('0x267be1')) {
      return 'Kraken';
    }
    return undefined;
  }

  /**
   * Process a transaction and generate alerts
   */
  private async processTransaction(tx: WhaleTransaction): Promise<void> {
    // Update transaction history
    this.updateHistory(tx);

    // Analyze for patterns
    const pattern = this.analyzePattern(tx.from.address);

    // Generate alert if significant
    if (tx.amountUSD >= this.config.whaleThresholdUSD) {
      const alert = this.generateAlert(tx, pattern);
      this.emit('alert', alert);
    }
  }

  /**
   * Update transaction history for a wallet
   */
  private updateHistory(tx: WhaleTransaction): void {
    const address = tx.from.address;
    
    if (!this.transactionHistory.has(address)) {
      this.transactionHistory.set(address, []);
    }
    
    const history = this.transactionHistory.get(address)!;
    history.push(tx);
    
    // Keep only last 100 transactions
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Analyze transaction pattern for a wallet
   */
  private analyzePattern(address: string): WhalePattern | undefined {
    const history = this.transactionHistory.get(address);
    
    if (!history || history.length < 5) {
      return undefined;  // Not enough data
    }

    // Analyze last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTxs = history.filter(tx => tx.timestamp.getTime() > oneDayAgo);

    if (recentTxs.length === 0) {
      return undefined;
    }

    // Calculate net flow
    let netFlow = 0;
    let totalVolume = 0;
    
    for (const tx of recentTxs) {
      totalVolume += tx.amountUSD;
      
      if (tx.type === 'withdrawal') {
        netFlow += tx.amountUSD;  // Withdrawing from exchange = accumulation
      } else if (tx.type === 'deposit') {
        netFlow -= tx.amountUSD;  // Depositing to exchange = distribution
      }
    }

    // Determine pattern
    let pattern: 'accumulation' | 'distribution' | 'neutral';
    if (netFlow > totalVolume * 0.3) {
      pattern = 'accumulation';
    } else if (netFlow < -totalVolume * 0.3) {
      pattern = 'distribution';
    } else {
      pattern = 'neutral';
    }

    const confidence = Math.min(100, (recentTxs.length / 10) * 100);

    const whalePattern: WhalePattern = {
      walletAddress: address,
      pattern,
      confidence,
      timeframe: '24h',
      totalVolume,
      netFlow,
      transactionCount: recentTxs.length
    };

    this.knownWhales.set(address, whalePattern);
    return whalePattern;
  }

  /**
   * Generate a whale alert
   */
  private generateAlert(tx: WhaleTransaction, pattern?: WhalePattern): WhaleAlert {
    // Determine severity
    let severity: SignalSeverity;
    if (tx.amountUSD > 10000000) {
      severity = 'critical';
    } else if (tx.amountUSD > 5000000) {
      severity = 'high';
    } else if (tx.amountUSD > 1000000) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    // Determine direction
    let direction: Direction = 'neutral';
    if (pattern) {
      if (pattern.pattern === 'accumulation') {
        direction = 'bullish';
      } else if (pattern.pattern === 'distribution') {
        direction = 'bearish';
      }
    } else {
      // Single transaction analysis
      if (tx.type === 'withdrawal') {
        direction = 'bullish';
      } else if (tx.type === 'deposit') {
        direction = 'bearish';
      }
    }

    // Calculate confidence
    let confidence = 60;  // Base confidence
    if (pattern) {
      confidence = Math.max(confidence, pattern.confidence);
    }
    if (tx.exchange) {
      confidence += 10;  // Higher confidence when exchange involved
    }

    // Generate explanation
    const explanation = this.generateExplanation(tx, pattern, direction);

    // Suggested action
    let suggestedAction: 'buy' | 'sell' | 'watch' | 'exit';
    if (direction === 'bullish' && confidence > 70) {
      suggestedAction = 'buy';
    } else if (direction === 'bearish' && confidence > 70) {
      suggestedAction = 'sell';
    } else if (direction === 'bearish' && severity === 'critical') {
      suggestedAction = 'exit';
    } else {
      suggestedAction = 'watch';
    }

    return {
      id: `whale-${tx.hash}`,
      signalType: 'whale',
      severity,
      direction,
      transaction: tx,
      pattern,
      confidence,
      explanation,
      suggestedAction,
      timestamp: new Date()
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    tx: WhaleTransaction,
    pattern: WhalePattern | undefined,
    direction: Direction
  ): string {
    const parts: string[] = [];

    // Transaction details
    parts.push(`Whale ${tx.type}: ${tx.amount.toFixed(2)} ${tx.asset} ($${(tx.amountUSD / 1e6).toFixed(2)}M)`);

    // Exchange involvement
    if (tx.exchange) {
      parts.push(`${tx.type === 'deposit' ? 'to' : 'from'} ${tx.exchange}`);
    }

    // Pattern insight
    if (pattern) {
      parts.push(`| Pattern: ${pattern.pattern} (${pattern.transactionCount} txs in 24h)`);
    }

    // Direction insight
    if (direction === 'bullish') {
      parts.push('| Bullish signal: Whale accumulating');
    } else if (direction === 'bearish') {
      parts.push('| Bearish signal: Whale distributing');
    }

    return parts.join(' ');
  }

  /**
   * Get current whale patterns
   */
  getWhalePatterns(): WhalePattern[] {
    return Array.from(this.knownWhales.values());
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    console.log('🐋 Whale Tracker stopped');
  }
}
WHALE_EOF

echo "🐋 Whale Tracker implementation created!"

# Create index.ts
cat > packages/signal-intelligence/src/index.ts << 'INDEX_EOF'
/**
 * Signal Intelligence Layer
 * MVP Exports
 */

// Types
export * from './types/signal-types';

// Whale Tracker
export { WhaleTracker, WhaleTrackerConfig } from './onchain-intelligence/whale-tracker';

// TODO: Add exports for viral-trend-detector and breakout-detector
INDEX_EOF

echo "✅ Signal Intelligence MVP structure complete!"
echo ""
echo "📦 Next steps:"
echo "1. Run: pnpm install (install dependencies)"
echo "2. Add to pnpm-workspace.yaml: 'packages/signal-intelligence'"
echo "3. Build: pnpm -w run build"
echo "4. Test whale tracker with: node -e \"const {WhaleTracker} = require('./packages/signal-intelligence/dist'); console.log('Loaded!');\""
echo ""
echo "🚀 Ready to implement viral-trend-detector and breakout-detector next!"

