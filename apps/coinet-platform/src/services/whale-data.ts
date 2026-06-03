/**
 * 🐋 Whale Data Service - Smart Integration
 * 
 * Connects to the alchemy-whales service for whale intelligence.
 * 
 * CURRENT CAPABILITIES:
 * - Monitor alchemy-whales health status
 * - Report monitored chains (ETH, Polygon, Arbitrum, Optimism, Base)
 * - Provide whale monitoring context for AI
 * - Solana new token monitoring status
 * - Fraud detection status
 * 
 * FUTURE (Phase 2):
 * - Real-time whale transfer queries
 * - Whale wallet tracking
 * - Historical whale activity analysis
 * 
 * NOTE: alchemy-whales is primarily a background monitoring service
 * that sends Telegram/Discord alerts. Direct query API is planned.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  ALCHEMY_WHALES_URL: process.env.ALCHEMY_WHALES_URL || 'https://alchemy-whales-production.up.railway.app',
  HEALTH_CACHE_TTL: 60000, // 60 seconds
  REQUEST_TIMEOUT: 5000,
};

// ============================================================================
// TYPES
// ============================================================================

export interface WhaleServiceHealth {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  uptime: number;
  chains: {
    ethereum: boolean;
    polygon: boolean;
    arbitrum: boolean;
    optimism: boolean;
    base: boolean;
  };
  features: {
    database: boolean;
    cache: boolean;
    webhook: boolean;
    solanaMonitoring: boolean;
    fraudDetection: boolean;
    alertNotifications: boolean;
  };
  lastChecked: string;
}

export interface WhaleContext {
  isAvailable: boolean;
  monitoredChains: string[];
  capabilities: string[];
  limitations: string[];
  contextForAI: string;
}

// ============================================================================
// CACHE
// ============================================================================

interface HealthCache {
  data: WhaleServiceHealth | null;
  timestamp: number;
}

let healthCache: HealthCache = {
  data: null,
  timestamp: 0,
};

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * 🏥 Check alchemy-whales service health
 */
export async function checkWhaleServiceHealth(): Promise<WhaleServiceHealth> {
  // Check cache first
  if (healthCache.data && Date.now() - healthCache.timestamp < CONFIG.HEALTH_CACHE_TTL) {
    return healthCache.data;
  }

  try {
    const response = await axios.get(`${CONFIG.ALCHEMY_WHALES_URL}/api/health`, {
      timeout: CONFIG.REQUEST_TIMEOUT,
    });

    const data = response.data;

    const health: WhaleServiceHealth = {
      status: data.status === 'healthy' ? 'healthy' : 
              data.status === 'degraded' ? 'degraded' : 'down',
      uptime: data.uptime || 0,
      chains: {
        ethereum: data.components?.alchemy?.details?.ethereum?.circuitBreakerState === 'closed',
        polygon: data.components?.alchemy?.details?.polygon?.circuitBreakerState === 'closed',
        arbitrum: data.components?.alchemy?.details?.arbitrum?.circuitBreakerState === 'closed',
        optimism: data.components?.alchemy?.details?.optimism?.circuitBreakerState === 'closed',
        base: data.components?.alchemy?.details?.base?.circuitBreakerState === 'closed',
      },
      features: {
        database: data.components?.database?.status === 'up',
        cache: data.components?.cache?.status === 'up',
        webhook: data.components?.webhook?.status === 'up',
        solanaMonitoring: true, // Always available via QuickNode
        fraudDetection: true,   // Ultimate Fraud Detector
        alertNotifications: true, // Telegram/Discord alerts
      },
      lastChecked: new Date().toISOString(),
    };

    // Update cache
    healthCache = { data: health, timestamp: Date.now() };

    logger.debug('🐋 Whale service health checked', { 
      status: health.status,
      chainsUp: Object.values(health.chains).filter(Boolean).length,
    });

    return health;
  } catch (error: any) {
    logger.warn('🐋 Whale service unreachable', { error: error.message });
    
    return {
      status: 'unknown',
      uptime: 0,
      chains: {
        ethereum: false,
        polygon: false,
        arbitrum: false,
        optimism: false,
        base: false,
      },
      features: {
        database: false,
        cache: false,
        webhook: false,
        solanaMonitoring: false,
        fraudDetection: false,
        alertNotifications: false,
      },
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * 🎯 Get whale context for AI
 */
export async function getWhaleContextForAI(): Promise<WhaleContext> {
  const health = await checkWhaleServiceHealth();

  const monitoredChains: string[] = [];
  if (health.chains.ethereum) monitoredChains.push('Ethereum');
  if (health.chains.polygon) monitoredChains.push('Polygon');
  if (health.chains.arbitrum) monitoredChains.push('Arbitrum');
  if (health.chains.optimism) monitoredChains.push('Optimism');
  if (health.chains.base) monitoredChains.push('Base');

  const capabilities: string[] = [];
  if (health.features.webhook) capabilities.push('Real-time transfer monitoring');
  if (health.features.fraudDetection) capabilities.push('AI fraud detection');
  if (health.features.solanaMonitoring) capabilities.push('Solana new token tracking');
  if (health.features.alertNotifications) capabilities.push('Telegram/Discord alerts');
  if (monitoredChains.length > 0) capabilities.push(`${monitoredChains.length} EVM chains monitored`);

  const limitations: string[] = [];
  if (!health.features.database) limitations.push('Historical data unavailable');
  if (!health.features.cache) limitations.push('Query caching disabled');
  if (health.status === 'degraded') limitations.push('Service running in degraded mode');

  const isAvailable = health.status === 'healthy' || health.status === 'degraded';

  // Build AI context string
  let contextForAI = '';
  
  if (isAvailable && monitoredChains.length > 0) {
    contextForAI = `\n[WHALE MONITORING ACTIVE]\n`;
    contextForAI += `Chains: ${monitoredChains.join(', ')}\n`;
    
    if (health.features.fraudDetection) {
      contextForAI += `Features: Real-time whale tracking, AI fraud detection, Solana token monitoring\n`;
    }
    
    if (limitations.length > 0) {
      contextForAI += `Note: ${limitations.join('; ')}\n`;
    }
  } else {
    contextForAI = '\n[WHALE MONITORING: Currently unavailable]\n';
  }

  return {
    isAvailable,
    monitoredChains,
    capabilities,
    limitations,
    contextForAI,
  };
}

/**
 * 📊 Get formatted whale status for AI
 */
export function formatWhaleStatusForAI(health: WhaleServiceHealth): string {
  const chainsUp = Object.entries(health.chains)
    .filter(([_, up]) => up)
    .map(([chain, _]) => chain.charAt(0).toUpperCase() + chain.slice(1));

  if (chainsUp.length === 0) {
    return '';
  }

  let status = `\n[🐋 WHALE INTELLIGENCE]\n`;
  status += `Monitoring: ${chainsUp.join(', ')}\n`;
  
  if (health.features.fraudDetection) {
    status += `Active: AI Fraud Detection, Real-time Transfer Monitoring\n`;
  }

  if (health.features.solanaMonitoring) {
    status += `Solana: New token detection & pump.fun tracking\n`;
  }

  return status;
}

/**
 * 🔄 Get simple availability check
 */
export async function isWhaleServiceAvailable(): Promise<boolean> {
  try {
    const response = await axios.get(`${CONFIG.ALCHEMY_WHALES_URL}/health/live`, {
      timeout: 2000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

// ============================================================================
// WHALE QUERY API (Phase 4 - Now Live!)
// ============================================================================

/**
 * Whale transfer data from alchemy-whales service
 */
export interface WhaleTransfer {
  chain: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  valueUSD: number;
  token: string;
  tokenSymbol: string;
  timestamp: Date;
  isWhale: boolean;
  category: string;
}

/**
 * Get recent whale transfers
 */
export async function getRecentWhaleTransfers(
  chain?: string, 
  limit: number = 20
): Promise<WhaleTransfer[]> {
  try {
    let url = `${CONFIG.ALCHEMY_WHALES_URL}/api/whales/recent?limit=${limit}`;
    if (chain) url += `&chain=${chain}`;
    
    const response = await axios.get(url, { timeout: CONFIG.REQUEST_TIMEOUT });
    
    if (response.data?.success && response.data?.data) {
      return response.data.data.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp),
      }));
    }
    return [];
  } catch (error: any) {
    logger.debug('🐋 Recent whale transfers unavailable', { error: error.message });
    return [];
  }
}

/**
 * Check if address is known whale
 */
export async function isKnownWhale(address: string): Promise<{
  isWhale: boolean;
  confidence: number;
  totalVolumeUSD: number;
}> {
  try {
    const response = await axios.get(
      `${CONFIG.ALCHEMY_WHALES_URL}/api/whales/address/${address}`,
      { timeout: CONFIG.REQUEST_TIMEOUT }
    );
    
    if (response.data?.success && response.data?.data) {
      return {
        isWhale: response.data.data.isWhale,
        confidence: response.data.data.confidence,
        totalVolumeUSD: response.data.data.totalVolumeUSD,
      };
    }
    return { isWhale: false, confidence: 0, totalVolumeUSD: 0 };
  } catch (error: any) {
    logger.debug('🐋 Whale address check failed', { error: error.message });
    return { isWhale: false, confidence: 0, totalVolumeUSD: 0 };
  }
}

/**
 * Get whale activity for specific token
 */
export async function getWhaleActivityForToken(symbol: string): Promise<{
  transfers24h: number;
  volumeUSD24h: number;
  netFlow: 'accumulating' | 'distributing' | 'neutral';
  topBuyers: string[];
  topSellers: string[];
} | null> {
  try {
    const response = await axios.get(
      `${CONFIG.ALCHEMY_WHALES_URL}/api/whales/token/${symbol}`,
      { timeout: CONFIG.REQUEST_TIMEOUT }
    );
    
    if (response.data?.success && response.data?.data) {
      return {
        transfers24h: response.data.data.transfers24h,
        volumeUSD24h: response.data.data.volumeUSD24h,
        netFlow: response.data.data.netFlow,
        topBuyers: response.data.data.topBuyers,
        topSellers: response.data.data.topSellers,
      };
    }
    return null;
  } catch (error: any) {
    logger.debug('🐋 Token whale activity unavailable', { symbol, error: error.message });
    return null;
  }
}

/**
 * Derive a signed 24h whale net-flow in USD from token whale activity.
 *
 * Positive = net accumulation (whales net-buying), negative = net distribution
 * (whales net-selling), 0 = neutral or no data. `volumeUSD24h` is the 24h whale
 * volume and `netFlow` is the directional classification from alchemy-whales.
 *
 * NOTE (honesty): this is the ONLY on-chain flow value alchemy-whales exposes
 * per token. Exchange inflow/outflow and active-address counts are NOT
 * available from this source and must not be fabricated by callers.
 */
export function deriveWhaleNetFlowUSD(
  activity: { netFlow?: 'accumulating' | 'distributing' | 'neutral'; volumeUSD24h?: number } | null | undefined,
): number {
  if (!activity) return 0;
  const volume =
    typeof activity.volumeUSD24h === 'number' && activity.volumeUSD24h > 0
      ? activity.volumeUSD24h
      : 0;
  if (volume === 0) return 0;
  if (activity.netFlow === 'accumulating') return volume;
  if (activity.netFlow === 'distributing') return -volume;
  return 0;
}

/**
 * Get overall whale activity summary
 */
export async function getWhaleSummary(): Promise<{
  totalTransfers: number;
  totalVolumeUSD: number;
  activeChains: string[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  topTokens: { symbol: string; volume: number }[];
} | null> {
  try {
    const response = await axios.get(
      `${CONFIG.ALCHEMY_WHALES_URL}/api/whales/summary`,
      { timeout: CONFIG.REQUEST_TIMEOUT }
    );
    
    if (response.data?.success && response.data?.data) {
      return {
        totalTransfers: response.data.data.totalTransfers,
        totalVolumeUSD: response.data.data.totalVolumeUSD,
        activeChains: response.data.data.activeChains,
        marketSentiment: response.data.data.marketSentiment,
        topTokens: response.data.data.topTokens?.slice(0, 5) || [],
      };
    }
    return null;
  } catch (error: any) {
    logger.debug('🐋 Whale summary unavailable', { error: error.message });
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const whaleService = {
  // Health operations
  checkHealth: checkWhaleServiceHealth,
  getContext: getWhaleContextForAI,
  formatStatus: formatWhaleStatusForAI,
  isAvailable: isWhaleServiceAvailable,
  // Whale Query API (Phase 4 - Live!)
  getRecentTransfers: getRecentWhaleTransfers,
  isKnownWhale,
  getActivityForToken: getWhaleActivityForToken,
  getSummary: getWhaleSummary,
};

export default whaleService;

