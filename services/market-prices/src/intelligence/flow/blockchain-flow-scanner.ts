/**
 * Blockchain Flow Scanner
 * 
 * Scans and analyzes token flows post-unlock:
 * - Monitors transactions from known VC wallets
 * - Detects exchange deposits and DeFi interactions
 * - Tracks token distribution patterns
 * - Calculates selling pressure in real-time
 * 
 * Supports: Ethereum, Polygon, Arbitrum, Optimism, Base, Solana
 */

import { EventEmitter } from 'events';
import { ethers, JsonRpcProvider, Contract, Log } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../../utils/logger';
import { getDynamicVCDatabase, VCInfo } from '../vc/dynamic-vc-database';

// ERC20 Transfer event signature
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// ERC20 ABI (minimal for transfers)
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

// Flow types
export type FlowType = 
  | 'to_exchange'
  | 'to_defi'
  | 'to_other_vc'
  | 'to_unknown'
  | 'internal'
  | 'from_exchange'
  | 'from_defi';

// Token flow event
export interface TokenFlow {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  chain: string;
  
  // Token info
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  
  // Transfer details
  from: string;
  to: string;
  amount: bigint;
  amountFormatted: number;
  amountUsd: number;
  
  // Classification
  flowType: FlowType;
  fromLabel?: string;
  toLabel?: string;
  
  // VC tracking
  vcId?: string;
  vcName?: string;
  
  // Exchange info
  exchangeName?: string;
  
  // DeFi info
  protocolName?: string;
  protocolType?: 'swap' | 'lending' | 'staking' | 'bridge';
}

// Flow analysis result
export interface FlowAnalysis {
  token: string;
  chain: string;
  period: { start: Date; end: Date };
  
  // Volume metrics
  totalVolume: bigint;
  totalVolumeUsd: number;
  uniqueAddresses: number;
  
  // Flow breakdown
  toExchanges: { amount: bigint; percentage: number; exchanges: Record<string, bigint> };
  toDefi: { amount: bigint; percentage: number; protocols: Record<string, bigint> };
  toOtherVCs: { amount: bigint; percentage: number };
  toUnknown: { amount: bigint; percentage: number };
  
  // VC flows
  vcFlows: { vcId: string; vcName: string; amount: bigint; percentage: number }[];
  
  // Selling pressure
  sellingPressure: number;
  sellingVelocity: number; // Amount/hour
  
  // Top flows
  topFlows: TokenFlow[];
}

// Scanner configuration
export interface FlowScannerConfig {
  rpcUrls: Partial<Record<string, string>>;
  scanIntervalMs: number;
  maxBlocksPerScan: number;
  minAmountUsd: number;
  enableRealtime: boolean;
}

// Known exchange addresses
const EXCHANGE_ADDRESSES: Map<string, { name: string; chains: string[] }> = new Map([
  // Binance
  ['0x28c6c06298d514db089934071355e5743bf21d60', { name: 'Binance', chains: ['ethereum', 'bsc'] }],
  ['0x21a31ee1afc51d94c2efccaa2092ad1028285549', { name: 'Binance', chains: ['ethereum'] }],
  ['0xdfd5293d8e347dfe59e90efd55b2956a1343963d', { name: 'Binance', chains: ['ethereum'] }],
  
  // Coinbase
  ['0x71660c4005ba85c37ccec55d0c4493e66fe775d3', { name: 'Coinbase', chains: ['ethereum'] }],
  ['0x503828976d22510aad0201ac7ec88293211d23da', { name: 'Coinbase', chains: ['ethereum'] }],
  ['0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', { name: 'Coinbase', chains: ['ethereum'] }],
  
  // Kraken
  ['0x2910543af39aba0cd09dbb2d50200b3e800a63d2', { name: 'Kraken', chains: ['ethereum'] }],
  ['0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13', { name: 'Kraken', chains: ['ethereum'] }],
  
  // OKX
  ['0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', { name: 'OKX', chains: ['ethereum'] }],
  ['0x98ec059dc3adfbdd63429454aeb0c990fba4a128', { name: 'OKX', chains: ['ethereum'] }],
  
  // Bybit
  ['0xf89d7b9c864f589bbf53a82105107622b35eaa40', { name: 'Bybit', chains: ['ethereum'] }],
  
  // Gate.io
  ['0x0d0707963952f2fba59dd06f2b425ace40b492fe', { name: 'Gate.io', chains: ['ethereum'] }],
  
  // KuCoin
  ['0xd6216fc19db775df9774a6e33526131da7d19a2c', { name: 'KuCoin', chains: ['ethereum'] }],
  
  // Huobi
  ['0x46340b20830761efd32f7bc2cf82d8cdf65b2c45', { name: 'Huobi', chains: ['ethereum'] }],
]);

// Known DeFi protocols
const DEFI_ADDRESSES: Map<string, { name: string; type: 'swap' | 'lending' | 'staking' | 'bridge' }> = new Map([
  // Uniswap
  ['0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', { name: 'Uniswap', type: 'swap' }],
  ['0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', { name: 'Uniswap', type: 'swap' }],
  
  // Aave
  ['0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', { name: 'Aave V3', type: 'lending' }],
  ['0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9', { name: 'Aave V2', type: 'lending' }],
  
  // Compound
  ['0xc3d688b66703497daa19211eedff47f25384cdc3', { name: 'Compound', type: 'lending' }],
  
  // Lido
  ['0xae7ab96520de3a18e5e111b5eaab095312d7fe84', { name: 'Lido', type: 'staking' }],
  
  // Curve
  ['0xd51a44d3fae010294c616388b506acda1bfaae46', { name: 'Curve', type: 'swap' }],
  
  // 1inch
  ['0x1111111254eeb25477b68fb85ed929f73a960582', { name: '1inch', type: 'swap' }],
]);

const DEFAULT_CONFIG: FlowScannerConfig = {
  rpcUrls: {
    ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    polygon: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com',
    optimism: process.env.OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com',
    base: process.env.BASE_RPC_URL || 'https://base.llamarpc.com',
  },
  scanIntervalMs: 30000,
  maxBlocksPerScan: 1000,
  minAmountUsd: 1000,
  enableRealtime: false,
};

export class BlockchainFlowScanner extends EventEmitter {
  private config: FlowScannerConfig;
  private providers: Map<string, JsonRpcProvider> = new Map();
  private solanaConnection: Connection | null = null;
  private flowHistory: Map<string, TokenFlow[]> = new Map();
  private lastScannedBlock: Map<string, number> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning: boolean = false;
  private vcDatabase = getDynamicVCDatabase();

  constructor(config: Partial<FlowScannerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeProviders();
  }

  /**
   * Initialize blockchain providers
   */
  private initializeProviders(): void {
    Object.entries(this.config.rpcUrls).forEach(([chain, url]) => {
      if (url) {
        try {
          const provider = new JsonRpcProvider(url);
          this.providers.set(chain, provider);
          logger.debug('Provider initialized', { chain });
        } catch (error: any) {
          logger.warn('Failed to initialize provider', { chain, error: error.message });
        }
      }
    });

    // Initialize Solana
    const solanaUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    try {
      this.solanaConnection = new Connection(solanaUrl);
      logger.debug('Solana connection initialized');
    } catch (error: any) {
      logger.warn('Failed to initialize Solana connection', { error: error.message });
    }

    logger.info('Flow scanner initialized', {
      chains: this.providers.size,
      solana: !!this.solanaConnection,
    });
  }

  /**
   * Start real-time scanning
   */
  startRealtime(): void {
    if (this.scanInterval) return;

    this.scanInterval = setInterval(async () => {
      if (this.isScanning) return;
      
      this.isScanning = true;
      try {
        await this.scanAllChains();
      } catch (error: any) {
        logger.error('Scan error', { error: error.message });
      } finally {
        this.isScanning = false;
      }
    }, this.config.scanIntervalMs);

    logger.info('Real-time scanning started');
    this.emit('started');
  }

  /**
   * Stop real-time scanning
   */
  stopRealtime(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    logger.info('Real-time scanning stopped');
    this.emit('stopped');
  }

  /**
   * Scan all chains for token flows
   */
  async scanAllChains(): Promise<TokenFlow[]> {
    const allFlows: TokenFlow[] = [];

    for (const [chain, provider] of this.providers) {
      try {
        const flows = await this.scanChain(chain, provider);
        allFlows.push(...flows);
      } catch (error: any) {
        logger.warn('Chain scan failed', { chain, error: error.message });
      }
    }

    return allFlows;
  }

  /**
   * Scan a specific chain for token flows
   */
  private async scanChain(chain: string, provider: JsonRpcProvider): Promise<TokenFlow[]> {
    const currentBlock = await provider.getBlockNumber();
    const lastBlock = this.lastScannedBlock.get(chain) || currentBlock - 100;
    const fromBlock = Math.max(lastBlock + 1, currentBlock - this.config.maxBlocksPerScan);

    if (fromBlock >= currentBlock) {
      return [];
    }

    logger.debug('Scanning chain', { chain, fromBlock, toBlock: currentBlock });

    // Get all VC wallet addresses to monitor
    const vcWallets = this.getVCWalletsForChain(chain);
    
    const flows: TokenFlow[] = [];

    // Scan for transfers from/to VC wallets
    for (const { vcId, address } of vcWallets) {
      try {
        const vcFlows = await this.scanWalletTransfers(
          chain,
          provider,
          address,
          fromBlock,
          currentBlock,
          vcId
        );
        flows.push(...vcFlows);
      } catch (error: any) {
        logger.debug('Wallet scan failed', { chain, address, error: error.message });
      }
    }

    this.lastScannedBlock.set(chain, currentBlock);

    // Store flows
    flows.forEach(flow => this.storeFlow(flow));

    // Emit significant flows
    flows
      .filter(f => f.amountUsd >= this.config.minAmountUsd)
      .forEach(flow => this.emit('flow', flow));

    return flows;
  }

  /**
   * Get VC wallets for a chain
   */
  private getVCWalletsForChain(chain: string): { vcId: string; address: string }[] {
    const wallets: { vcId: string; address: string }[] = [];
    
    const allVCs = this.vcDatabase.queryVCs({ hasWalletOnChain: chain });
    allVCs.forEach(vc => {
      vc.wallets
        .filter(w => w.chain === chain)
        .forEach(w => wallets.push({ vcId: vc.id, address: w.address }));
    });

    return wallets;
  }

  /**
   * Scan transfers for a specific wallet
   */
  private async scanWalletTransfers(
    chain: string,
    provider: JsonRpcProvider,
    walletAddress: string,
    fromBlock: number,
    toBlock: number,
    vcId: string
  ): Promise<TokenFlow[]> {
    const flows: TokenFlow[] = [];

    // Get outgoing transfers (from this wallet)
    const outgoingFilter = {
      topics: [
        TRANSFER_TOPIC,
        ethers.zeroPadValue(walletAddress, 32), // from
        null, // to (any)
      ],
      fromBlock,
      toBlock,
    };

    try {
      const outgoingLogs = await provider.getLogs(outgoingFilter);
      
      for (const log of outgoingLogs) {
        const flow = await this.parseTransferLog(chain, provider, log, vcId, 'outgoing');
        if (flow) flows.push(flow);
      }
    } catch (error: any) {
      logger.debug('Failed to get outgoing logs', { error: error.message });
    }

    return flows;
  }

  /**
   * Parse a transfer log into a TokenFlow
   */
  private async parseTransferLog(
    chain: string,
    provider: JsonRpcProvider,
    log: Log,
    vcId: string,
    direction: 'outgoing' | 'incoming'
  ): Promise<TokenFlow | null> {
    try {
      // Decode log data
      const from = ethers.getAddress('0x' + log.topics[1].slice(26));
      const to = ethers.getAddress('0x' + log.topics[2].slice(26));
      const amount = BigInt(log.data);

      // Get token info
      const tokenContract = new Contract(log.address, ERC20_ABI, provider);
      let symbol = 'UNKNOWN';
      let decimals = 18;

      try {
        [symbol, decimals] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
        ]);
      } catch {
        // Some tokens don't have these methods
      }

      // Get block timestamp
      const block = await provider.getBlock(log.blockNumber);
      const timestamp = block ? new Date(block.timestamp * 1000) : new Date();

      // Classify flow
      const flowType = this.classifyFlow(chain, from, to);
      const vc = this.vcDatabase.getVC(vcId);

      // Calculate USD value (simplified - would use price oracle)
      const amountFormatted = Number(amount) / Math.pow(10, decimals);
      const amountUsd = amountFormatted * 1; // Placeholder - would fetch actual price

      return {
        id: `${log.transactionHash}-${log.index}`,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        chain,
        tokenAddress: log.address,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        from,
        to,
        amount,
        amountFormatted,
        amountUsd,
        flowType: flowType.type,
        fromLabel: direction === 'outgoing' ? vc?.name : flowType.fromLabel,
        toLabel: flowType.toLabel,
        vcId: direction === 'outgoing' ? vcId : undefined,
        vcName: direction === 'outgoing' ? vc?.name : undefined,
        exchangeName: flowType.exchangeName,
        protocolName: flowType.protocolName,
        protocolType: flowType.protocolType,
      };
    } catch (error: any) {
      logger.debug('Failed to parse transfer log', { error: error.message });
      return null;
    }
  }

  /**
   * Classify a token flow
   */
  private classifyFlow(
    chain: string,
    from: string,
    to: string
  ): {
    type: FlowType;
    toLabel?: string;
    fromLabel?: string;
    exchangeName?: string;
    protocolName?: string;
    protocolType?: 'swap' | 'lending' | 'staking' | 'bridge';
  } {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    // Check if to is an exchange
    const toExchange = EXCHANGE_ADDRESSES.get(toLower);
    if (toExchange && (toExchange.chains.includes(chain) || toExchange.chains.includes('*'))) {
      return {
        type: 'to_exchange',
        toLabel: toExchange.name,
        exchangeName: toExchange.name,
      };
    }

    // Check if from is an exchange
    const fromExchange = EXCHANGE_ADDRESSES.get(fromLower);
    if (fromExchange && (fromExchange.chains.includes(chain) || fromExchange.chains.includes('*'))) {
      return {
        type: 'from_exchange',
        fromLabel: fromExchange.name,
        exchangeName: fromExchange.name,
      };
    }

    // Check if to is a DeFi protocol
    const toDefi = DEFI_ADDRESSES.get(toLower);
    if (toDefi) {
      return {
        type: 'to_defi',
        toLabel: toDefi.name,
        protocolName: toDefi.name,
        protocolType: toDefi.type,
      };
    }

    // Check if from is a DeFi protocol
    const fromDefi = DEFI_ADDRESSES.get(fromLower);
    if (fromDefi) {
      return {
        type: 'from_defi',
        fromLabel: fromDefi.name,
        protocolName: fromDefi.name,
        protocolType: fromDefi.type,
      };
    }

    // Check if to is another VC
    const toVC = this.vcDatabase.getVCByWallet(chain, to);
    if (toVC) {
      return {
        type: 'to_other_vc',
        toLabel: toVC.name,
      };
    }

    // Unknown destination
    return {
      type: 'to_unknown',
    };
  }

  /**
   * Store flow in history
   */
  private storeFlow(flow: TokenFlow): void {
    const key = `${flow.chain}:${flow.tokenAddress}`;
    const flows = this.flowHistory.get(key) || [];
    flows.push(flow);
    
    // Keep last 1000 flows per token
    if (flows.length > 1000) {
      flows.shift();
    }
    
    this.flowHistory.set(key, flows);
  }

  /**
   * Analyze token flows for a period
   */
  analyzeFlows(
    chain: string,
    tokenAddress: string,
    period: { start: Date; end: Date }
  ): FlowAnalysis {
    const key = `${chain}:${tokenAddress.toLowerCase()}`;
    const allFlows = this.flowHistory.get(key) || [];
    
    // Filter by period
    const flows = allFlows.filter(f => 
      f.timestamp >= period.start && f.timestamp <= period.end
    );

    // Calculate totals
    let totalVolume = BigInt(0);
    let totalVolumeUsd = 0;
    const uniqueAddresses = new Set<string>();
    
    const exchangeVolumes: Record<string, bigint> = {};
    const protocolVolumes: Record<string, bigint> = {};
    const vcVolumes: Record<string, { name: string; amount: bigint }> = {};
    
    let toExchangeTotal = BigInt(0);
    let toDefiTotal = BigInt(0);
    let toOtherVCTotal = BigInt(0);
    let toUnknownTotal = BigInt(0);

    flows.forEach(flow => {
      totalVolume += flow.amount;
      totalVolumeUsd += flow.amountUsd;
      uniqueAddresses.add(flow.from);
      uniqueAddresses.add(flow.to);

      switch (flow.flowType) {
        case 'to_exchange':
          toExchangeTotal += flow.amount;
          if (flow.exchangeName) {
            exchangeVolumes[flow.exchangeName] = 
              (exchangeVolumes[flow.exchangeName] || BigInt(0)) + flow.amount;
          }
          break;
        case 'to_defi':
          toDefiTotal += flow.amount;
          if (flow.protocolName) {
            protocolVolumes[flow.protocolName] = 
              (protocolVolumes[flow.protocolName] || BigInt(0)) + flow.amount;
          }
          break;
        case 'to_other_vc':
          toOtherVCTotal += flow.amount;
          break;
        case 'to_unknown':
          toUnknownTotal += flow.amount;
          break;
      }

      if (flow.vcId && flow.vcName) {
        if (!vcVolumes[flow.vcId]) {
          vcVolumes[flow.vcId] = { name: flow.vcName, amount: BigInt(0) };
        }
        vcVolumes[flow.vcId].amount += flow.amount;
      }
    });

    const totalNum = Number(totalVolume) || 1;

    // Calculate selling pressure and velocity
    const periodHours = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60);
    const sellingVelocity = Number(toExchangeTotal) / Math.max(periodHours, 1);
    const sellingPressure = Number(toExchangeTotal) / totalNum * 100;

    // Top flows
    const topFlows = [...flows]
      .sort((a, b) => Number(b.amount - a.amount))
      .slice(0, 10);

    return {
      token: tokenAddress,
      chain,
      period,
      totalVolume,
      totalVolumeUsd,
      uniqueAddresses: uniqueAddresses.size,
      toExchanges: {
        amount: toExchangeTotal,
        percentage: Number(toExchangeTotal) / totalNum * 100,
        exchanges: exchangeVolumes,
      },
      toDefi: {
        amount: toDefiTotal,
        percentage: Number(toDefiTotal) / totalNum * 100,
        protocols: protocolVolumes,
      },
      toOtherVCs: {
        amount: toOtherVCTotal,
        percentage: Number(toOtherVCTotal) / totalNum * 100,
      },
      toUnknown: {
        amount: toUnknownTotal,
        percentage: Number(toUnknownTotal) / totalNum * 100,
      },
      vcFlows: Object.entries(vcVolumes).map(([vcId, data]) => ({
        vcId,
        vcName: data.name,
        amount: data.amount,
        percentage: Number(data.amount) / totalNum * 100,
      })),
      sellingPressure,
      sellingVelocity,
      topFlows,
    };
  }

  /**
   * Scan specific token for a wallet
   */
  async scanTokenForWallet(
    chain: string,
    tokenAddress: string,
    walletAddress: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<TokenFlow[]> {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`No provider for chain: ${chain}`);
    }

    const currentBlock = await provider.getBlockNumber();
    const from = fromBlock || currentBlock - 10000;
    const to = toBlock || currentBlock;

    const flows: TokenFlow[] = [];

    // Get transfers from wallet
    const filter = {
      address: tokenAddress,
      topics: [
        TRANSFER_TOPIC,
        ethers.zeroPadValue(walletAddress, 32),
        null,
      ],
      fromBlock: from,
      toBlock: to,
    };

    const logs = await provider.getLogs(filter);

    for (const log of logs) {
      const flow = await this.parseTransferLog(chain, provider, log, '', 'outgoing');
      if (flow) flows.push(flow);
    }

    return flows;
  }

  /**
   * Get real-time balance for a wallet
   */
  async getWalletBalance(
    chain: string,
    walletAddress: string,
    tokenAddress: string
  ): Promise<{ balance: bigint; formatted: number }> {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`No provider for chain: ${chain}`);
    }

    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals().catch(() => 18),
    ]);

    return {
      balance,
      formatted: Number(balance) / Math.pow(10, decimals),
    };
  }

  /**
   * Get flow history for a token
   */
  getFlowHistory(chain: string, tokenAddress: string): TokenFlow[] {
    const key = `${chain}:${tokenAddress.toLowerCase()}`;
    return this.flowHistory.get(key) || [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    chains: number;
    totalFlows: number;
    lastScanBlocks: Record<string, number>;
    isScanning: boolean;
  } {
    let totalFlows = 0;
    this.flowHistory.forEach(flows => totalFlows += flows.length);

    return {
      chains: this.providers.size,
      totalFlows,
      lastScanBlocks: Object.fromEntries(this.lastScannedBlock),
      isScanning: this.isScanning,
    };
  }
}

// Singleton
let instance: BlockchainFlowScanner | null = null;

export function getBlockchainFlowScanner(): BlockchainFlowScanner {
  if (!instance) {
    instance = new BlockchainFlowScanner();
  }
  return instance;
}

export function resetBlockchainFlowScanner(): void {
  if (instance) {
    instance.stopRealtime();
  }
  instance = null;
}

export default BlockchainFlowScanner;

