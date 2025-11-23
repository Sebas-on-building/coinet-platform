/**
 * Wallet Monitor
 * Real-time monitoring of on-chain wallet activity and unusual patterns
 */

import { DataPoint, DataSource, MonitoringConfig } from '../core/types';
import { EventEmitter } from 'events';

export interface WalletTransaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  token?: string;
  chain: string;
  timestamp: Date;
  gasUsed?: number;
  gasPrice?: number;
  type: 'transfer' | 'swap' | 'liquidity' | 'stake' | 'other';
}

export interface WalletActivity {
  address: string;
  chain: string;
  transactionCount: number;
  totalValue: number;
  uniqueInteractions: number;
  averageTransactionSize: number;
  timestamp: Date;
}

export interface SuspiciousActivity {
  address: string;
  chain: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  transactions: WalletTransaction[];
  timestamp: Date;
}

export class WalletMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private walletCache: Map<string, WalletTransaction[]> = new Map();
  private knownWallets: Map<string, { type: string; reputation: number }> = new Map();
  private readonly activityWindow = 3600000; // 1 hour
  private readonly whaleThreshold = 1000000; // $1M
  private readonly rapidTxThreshold = 10; // 10 transactions in short time

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }

  /**
   * Process incoming wallet transaction
   */
  async processTransaction(tx: WalletTransaction): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];

    // Add to cache
    this.addToCache(tx);

    // Monitor wallet activity
    const activityPoint = await this.monitorWalletActivity(tx);
    if (activityPoint) dataPoints.push(activityPoint);

    // Monitor network fees
    if (tx.gasPrice !== undefined && tx.gasUsed !== undefined) {
      const feePoint = await this.monitorNetworkFees(tx);
      if (feePoint) dataPoints.push(feePoint);
    }

    // Monitor on-chain metrics
    const metricsPoint = await this.monitorOnChainMetrics(tx);
    if (metricsPoint) dataPoints.push(metricsPoint);

    // Check for suspicious activity
    const suspicious = await this.detectSuspiciousActivity(tx);
    if (suspicious) {
      this.emit('suspicious_activity', suspicious);
    }

    return dataPoints;
  }

  /**
   * Monitor wallet activity levels
   */
  private async monitorWalletActivity(tx: WalletTransaction): Promise<DataPoint | null> {
    const activities = this.getWalletActivities(tx.chain);
    const totalActivity = activities.reduce((sum, a) => sum + a.transactionCount, 0);

    return {
      timestamp: tx.timestamp,
      source: DataSource.WALLET_ACTIVITY,
      value: totalActivity,
      metadata: {
        chain: tx.chain,
        uniqueWallets: this.getUniqueWallets(tx.chain).length,
        topWallets: this.getTopWallets(tx.chain, 5),
        activityType: tx.type
      },
      chain: tx.chain
    };
  }

  /**
   * Monitor network fees for unusual spikes
   */
  private async monitorNetworkFees(tx: WalletTransaction): Promise<DataPoint | null> {
    const fee = (tx.gasPrice! * tx.gasUsed!) / 1e18; // Convert to ETH/native token

    return {
      timestamp: tx.timestamp,
      source: DataSource.NETWORK_FEES,
      value: fee,
      metadata: {
        chain: tx.chain,
        gasPrice: tx.gasPrice,
        gasUsed: tx.gasUsed,
        transactionType: tx.type
      },
      chain: tx.chain
    };
  }

  /**
   * Monitor general on-chain metrics
   */
  private async monitorOnChainMetrics(tx: WalletTransaction): Promise<DataPoint | null> {
    const chainMetrics = this.calculateChainMetrics(tx.chain);

    return {
      timestamp: tx.timestamp,
      source: DataSource.ON_CHAIN_METRICS,
      value: chainMetrics.totalValue,
      metadata: {
        chain: tx.chain,
        transactionCount: chainMetrics.transactionCount,
        uniqueAddresses: chainMetrics.uniqueAddresses,
        averageTransactionValue: chainMetrics.averageValue,
        whaleActivity: chainMetrics.whaleTransactions
      },
      chain: tx.chain
    };
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(
    tx: WalletTransaction
  ): Promise<SuspiciousActivity | null> {
    const suspiciousPatterns: Array<{
      condition: boolean;
      reason: string;
      severity: SuspiciousActivity['severity'];
    }> = [
      // Whale movement
      {
        condition: tx.value > this.whaleThreshold,
        reason: `Large transaction: $${(tx.value / 1e6).toFixed(2)}M`,
        severity: 'high'
      },
      // Rapid transactions from same address
      {
        condition: this.isRapidTransaction(tx.from),
        reason: 'Rapid transaction pattern detected',
        severity: 'medium'
      },
      // New wallet with large first transaction
      {
        condition: this.isNewWalletLargeTransaction(tx),
        reason: 'New wallet with unusually large first transaction',
        severity: 'high'
      },
      // Unusual gas price (potential front-running)
      {
        condition: this.isUnusualGasPrice(tx),
        reason: 'Abnormally high gas price (potential front-running)',
        severity: 'medium'
      },
      // Smart contract interaction from known malicious address
      {
        condition: this.isKnownMaliciousWallet(tx.from),
        reason: 'Transaction from known malicious wallet',
        severity: 'critical'
      },
      // Circular transaction pattern
      {
        condition: this.isCircularTransaction(tx),
        reason: 'Potential wash trading or circular transaction',
        severity: 'medium'
      }
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.condition) {
        const relatedTransactions = this.getRelatedTransactions(tx);
        
        return {
          address: tx.from,
          chain: tx.chain,
          reason: pattern.reason,
          severity: pattern.severity,
          transactions: relatedTransactions,
          timestamp: tx.timestamp
        };
      }
    }

    return null;
  }

  /**
   * Add transaction to cache
   */
  private addToCache(tx: WalletTransaction): void {
    const key = `${tx.chain}:${tx.from}`;
    
    if (!this.walletCache.has(key)) {
      this.walletCache.set(key, []);
    }

    const cache = this.walletCache.get(key)!;
    cache.push(tx);

    // Remove old transactions
    const cutoff = Date.now() - this.activityWindow;
    this.walletCache.set(
      key,
      cache.filter(t => t.timestamp.getTime() > cutoff)
    );
  }

  /**
   * Get wallet activities for chain
   */
  private getWalletActivities(chain: string): WalletActivity[] {
    const activities: WalletActivity[] = [];
    
    for (const [key, transactions] of this.walletCache) {
      if (!key.startsWith(`${chain}:`)) continue;

      const address = key.split(':')[1];
      const uniqueInteractions = new Set(
        transactions.map(tx => tx.to)
      ).size;

      activities.push({
        address,
        chain,
        transactionCount: transactions.length,
        totalValue: transactions.reduce((sum, tx) => sum + tx.value, 0),
        uniqueInteractions,
        averageTransactionSize: transactions.reduce((sum, tx) => sum + tx.value, 0) / transactions.length,
        timestamp: new Date()
      });
    }

    return activities;
  }

  /**
   * Get unique wallets for chain
   */
  private getUniqueWallets(chain: string): string[] {
    const wallets = new Set<string>();
    
    for (const [key] of this.walletCache) {
      if (key.startsWith(`${chain}:`)) {
        wallets.add(key.split(':')[1]);
      }
    }

    return Array.from(wallets);
  }

  /**
   * Get top active wallets
   */
  private getTopWallets(chain: string, limit: number): Array<{
    address: string;
    transactionCount: number;
    totalValue: number;
  }> {
    const activities = this.getWalletActivities(chain);
    
    return activities
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, limit)
      .map(a => ({
        address: a.address,
        transactionCount: a.transactionCount,
        totalValue: a.totalValue
      }));
  }

  /**
   * Calculate chain metrics
   */
  private calculateChainMetrics(chain: string): {
    transactionCount: number;
    totalValue: number;
    uniqueAddresses: number;
    averageValue: number;
    whaleTransactions: number;
  } {
    let transactionCount = 0;
    let totalValue = 0;
    let whaleTransactions = 0;
    const addresses = new Set<string>();

    for (const [key, transactions] of this.walletCache) {
      if (!key.startsWith(`${chain}:`)) continue;

      for (const tx of transactions) {
        transactionCount++;
        totalValue += tx.value;
        addresses.add(tx.from);
        addresses.add(tx.to);
        
        if (tx.value > this.whaleThreshold) {
          whaleTransactions++;
        }
      }
    }

    return {
      transactionCount,
      totalValue,
      uniqueAddresses: addresses.size,
      averageValue: transactionCount > 0 ? totalValue / transactionCount : 0,
      whaleTransactions
    };
  }

  /**
   * Check if wallet is making rapid transactions
   */
  private isRapidTransaction(address: string): boolean {
    const recentTransactions: WalletTransaction[] = [];
    
    for (const [key, transactions] of this.walletCache) {
      if (key.includes(address)) {
        recentTransactions.push(...transactions);
      }
    }

    const last5Min = Date.now() - 300000; // 5 minutes
    const rapidTxs = recentTransactions.filter(
      tx => tx.timestamp.getTime() > last5Min
    );

    return rapidTxs.length >= this.rapidTxThreshold;
  }

  /**
   * Check if new wallet with large first transaction
   */
  private isNewWalletLargeTransaction(tx: WalletTransaction): boolean {
    const key = `${tx.chain}:${tx.from}`;
    const transactions = this.walletCache.get(key) || [];
    
    // If this is first transaction and it's large
    return transactions.length === 1 && tx.value > this.whaleThreshold * 0.1;
  }

  /**
   * Check for unusual gas price
   */
  private isUnusualGasPrice(tx: WalletTransaction): boolean {
    if (!tx.gasPrice) return false;

    // Get average gas price for chain
    const chainTransactions: WalletTransaction[] = [];
    for (const [key, transactions] of this.walletCache) {
      if (key.startsWith(`${tx.chain}:`)) {
        chainTransactions.push(...transactions);
      }
    }

    const validGasPrices = chainTransactions
      .map(t => t.gasPrice)
      .filter((price): price is number => price !== undefined);

    if (validGasPrices.length === 0) return false;

    const avgGasPrice = validGasPrices.reduce((sum, p) => sum + p, 0) / validGasPrices.length;
    
    // Flag if gas price is >5x average (potential front-running)
    return tx.gasPrice > avgGasPrice * 5;
  }

  /**
   * Check if wallet is known to be malicious
   */
  private isKnownMaliciousWallet(address: string): boolean {
    const walletInfo = this.knownWallets.get(address.toLowerCase());
    return walletInfo?.type === 'malicious' || (walletInfo?.reputation || 1) < 0.3;
  }

  /**
   * Check for circular transaction patterns
   */
  private isCircularTransaction(tx: WalletTransaction): boolean {
    const key = `${tx.chain}:${tx.from}`;
    const transactions = this.walletCache.get(key) || [];

    // Look for A -> B -> C -> A patterns
    const recentTargets = transactions.slice(-5).map(t => t.to);
    return recentTargets.includes(tx.from);
  }

  /**
   * Get related transactions for address
   */
  private getRelatedTransactions(tx: WalletTransaction): WalletTransaction[] {
    const key = `${tx.chain}:${tx.from}`;
    return this.walletCache.get(key) || [];
  }

  /**
   * Add known wallet to database
   */
  addKnownWallet(
    address: string,
    type: 'exchange' | 'whale' | 'smart-money' | 'malicious' | 'contract',
    reputation: number = 0.5
  ): void {
    this.knownWallets.set(address.toLowerCase(), { type, reputation });
  }

  /**
   * Get wallet summary
   */
  getWalletSummary(address: string, chain: string): {
    transactionCount: number;
    totalValue: number;
    averageValue: number;
    lastTransaction: Date | null;
    type?: string;
    reputation?: number;
  } | null {
    const key = `${chain}:${address}`;
    const transactions = this.walletCache.get(key);
    
    if (!transactions || transactions.length === 0) return null;

    const walletInfo = this.knownWallets.get(address.toLowerCase());
    const totalValue = transactions.reduce((sum, tx) => sum + tx.value, 0);

    return {
      transactionCount: transactions.length,
      totalValue,
      averageValue: totalValue / transactions.length,
      lastTransaction: transactions[transactions.length - 1].timestamp,
      type: walletInfo?.type,
      reputation: walletInfo?.reputation
    };
  }

  /**
   * Clear cache
   */
  clearCache(chain?: string): void {
    if (chain) {
      for (const key of this.walletCache.keys()) {
        if (key.startsWith(`${chain}:`)) {
          this.walletCache.delete(key);
        }
      }
    } else {
      this.walletCache.clear();
    }
  }
}

