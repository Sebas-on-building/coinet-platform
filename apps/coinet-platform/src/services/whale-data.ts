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
// FUTURE: Whale Query API (Phase 2)
// ============================================================================

/**
 * Placeholder for future whale transfer queries
 * Will be implemented when alchemy-whales exposes query API
 */
export interface WhaleTransfer {
  chain: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  token: string;
  timestamp: Date;
  isWhale: boolean;
  classification: 'accumulation' | 'distribution' | 'transfer' | 'unknown';
}

/**
 * FUTURE: Query recent whale transfers
 * @planned Phase 2
 */
export async function getRecentWhaleTransfers(_chain: string, _limit: number = 10): Promise<WhaleTransfer[]> {
  // TODO: Implement when alchemy-whales exposes query API
  logger.debug('🐋 Whale transfer query not yet available (planned Phase 2)');
  return [];
}

/**
 * FUTURE: Check if address is known whale
 * @planned Phase 2
 */
export async function isKnownWhale(_address: string): Promise<boolean> {
  // TODO: Implement when alchemy-whales exposes query API
  return false;
}

/**
 * FUTURE: Get whale activity for specific token
 * @planned Phase 2
 */
export async function getWhaleActivityForToken(_symbol: string): Promise<{
  recent24h: number;
  netFlow: 'accumulating' | 'distributing' | 'neutral';
  topWhaleBuys: WhaleTransfer[];
  topWhaleSells: WhaleTransfer[];
} | null> {
  // TODO: Implement when alchemy-whales exposes query API
  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const whaleService = {
  checkHealth: checkWhaleServiceHealth,
  getContext: getWhaleContextForAI,
  formatStatus: formatWhaleStatusForAI,
  isAvailable: isWhaleServiceAvailable,
  // Future
  getRecentTransfers: getRecentWhaleTransfers,
  isKnownWhale,
  getActivityForToken: getWhaleActivityForToken,
};

export default whaleService;

