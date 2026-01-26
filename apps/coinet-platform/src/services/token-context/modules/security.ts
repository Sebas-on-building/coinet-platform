/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🛡️ SECURITY MODULE - Unified GoPlus + RugCheck                            ║
 * ║                                                                               ║
 * ║   Chain-aware security scanning:                                              ║
 * ║   • EVM chains → GoPlus Security API (any contract address)                   ║
 * ║   • Solana → RugCheck API                                                     ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, no hardcoded addresses                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import axios from 'axios';
import { logger } from '../../../utils/logger';
import {
  ChainId,
  ChainNumericId,
  CHAIN_ID_MAP,
  ModuleResult,
  SecurityData,
  SecurityFlag,
  SecurityRiskLevel,
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOPLUS_API_URL = 'https://api.gopluslabs.io/api/v1/token_security';
const RUGCHECK_API_URL = 'https://api.rugcheck.xyz/v1';

const TIMEOUT_MS = 10000;

// ============================================================================
// GOPLUS SECURITY (EVM CHAINS)
// ============================================================================

/**
 * Fetch security data from GoPlus for any EVM contract address
 */
async function fetchGoPlus(
  address: string,
  chain: ChainId
): Promise<ModuleResult<SecurityData>> {
  const chainNumericId = CHAIN_ID_MAP[chain];
  
  if (!chainNumericId) {
    return {
      status: 'not_applicable',
      timestamp: new Date().toISOString(),
      ttlSeconds: 0,
      data: null,
      error: `GoPlus does not support chain: ${chain}`,
      source: 'goplus',
    };
  }
  
  try {
    logger.debug('🛡️ Fetching GoPlus security', { 
      address: address.slice(0, 10), 
      chain, 
      chainId: chainNumericId 
    });
    
    const response = await axios.get(
      `${GOPLUS_API_URL}/${chainNumericId}`,
      {
        params: { contract_addresses: address.toLowerCase() },
        timeout: TIMEOUT_MS,
      }
    );
    
    const result = response.data?.result?.[address.toLowerCase()];
    
    if (!result) {
      logger.debug('🛡️ GoPlus: No data returned', { address: address.slice(0, 10) });
      return {
        status: 'failed',
        timestamp: new Date().toISOString(),
        ttlSeconds: 300,
        data: null,
        error: 'Token not found in GoPlus database',
        source: 'goplus',
      };
    }
    
    // Parse GoPlus response
    const securityData = parseGoPlusResponse(result);
    
    logger.info('🛡️ GoPlus security fetched', {
      address: address.slice(0, 10),
      chain,
      riskLevel: securityData.riskLevel,
      riskScore: securityData.riskScore,
      flagCount: securityData.flags.length,
    });
    
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      ttlSeconds: 900, // 15 minutes
      data: securityData,
      source: 'goplus',
    };
    
  } catch (error: any) {
    logger.error('🛡️ GoPlus API error', {
      address: address.slice(0, 10),
      chain,
      error: error.message,
      status: error.response?.status,
    });
    
    return {
      status: 'failed',
      timestamp: new Date().toISOString(),
      ttlSeconds: 60, // Retry sooner on error
      data: null,
      error: error.message,
      source: 'goplus',
    };
  }
}

/**
 * Parse GoPlus response into normalized SecurityData
 */
function parseGoPlusResponse(result: any): SecurityData {
  const flags: SecurityFlag[] = [];
  const notes: string[] = [];
  
  // Parse boolean fields
  const isHoneypot = result.is_honeypot === '1';
  const isMintable = result.is_mintable === '1';
  const isProxy = result.is_proxy === '1';
  const isOpenSource = result.is_open_source === '1';
  const canTakeBackOwnership = result.can_take_back_ownership === '1';
  const hasBlacklist = result.is_blacklisted === '1' || result.is_in_dex === '0';
  const hasTradingCooldown = result.trading_cooldown === '1';
  
  // Parse taxes
  const buyTax = parseFloat(result.buy_tax || '0') * 100;
  const sellTax = parseFloat(result.sell_tax || '0') * 100;
  
  // Build flags based on findings
  if (isHoneypot) {
    flags.push({
      code: 'HONEYPOT',
      severity: 'danger',
      description: 'Token cannot be sold (honeypot detected)',
    });
  }
  
  if (isMintable) {
    flags.push({
      code: 'MINTABLE',
      severity: 'warning',
      description: 'Contract owner can mint new tokens',
    });
  }
  
  if (canTakeBackOwnership) {
    flags.push({
      code: 'OWNERSHIP_TAKEBACK',
      severity: 'danger',
      description: 'Owner can reclaim ownership after renouncing',
    });
  }
  
  if (hasBlacklist) {
    flags.push({
      code: 'BLACKLIST',
      severity: 'warning',
      description: 'Contract has blacklist functionality',
    });
  }
  
  if (hasTradingCooldown) {
    flags.push({
      code: 'TRADING_COOLDOWN',
      severity: 'info',
      description: 'Trading has cooldown period',
    });
  }
  
  if (isProxy) {
    flags.push({
      code: 'PROXY_CONTRACT',
      severity: 'info',
      description: 'Token uses proxy pattern (upgradeable)',
    });
  }
  
  if (!isOpenSource) {
    flags.push({
      code: 'NOT_OPEN_SOURCE',
      severity: 'warning',
      description: 'Contract source code not verified',
    });
  }
  
  if (buyTax > 5) {
    flags.push({
      code: 'HIGH_BUY_TAX',
      severity: buyTax > 10 ? 'danger' : 'warning',
      description: `Buy tax is ${buyTax.toFixed(1)}%`,
    });
  }
  
  if (sellTax > 5) {
    flags.push({
      code: 'HIGH_SELL_TAX',
      severity: sellTax > 10 ? 'danger' : 'warning',
      description: `Sell tax is ${sellTax.toFixed(1)}%`,
    });
  }
  
  // Calculate risk score (0-100, higher = riskier)
  let riskScore = 0;
  if (isHoneypot) riskScore += 50;
  if (isMintable) riskScore += 10;
  if (canTakeBackOwnership) riskScore += 15;
  if (hasBlacklist) riskScore += 10;
  if (!isOpenSource) riskScore += 15;
  if (isProxy) riskScore += 5;
  if (hasTradingCooldown) riskScore += 5;
  if (buyTax > 5) riskScore += Math.min(15, buyTax);
  if (sellTax > 5) riskScore += Math.min(15, sellTax);
  
  riskScore = Math.min(100, riskScore);
  
  // Determine risk level
  let riskLevel: SecurityRiskLevel = 'safe';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';
  else if (riskScore >= 10) riskLevel = 'low';
  
  return {
    riskLevel,
    riskScore,
    flags,
    isHoneypot,
    isMintable,
    isProxy,
    isOpenSource,
    canTakeBackOwnership,
    hasBlacklist,
    hasTradingCooldown,
    buyTax,
    sellTax,
    isFreezeAuthority: null,  // EVM-only
    isMintAuthority: null,    // EVM-only
    notes,
  };
}

// ============================================================================
// RUGCHECK (SOLANA)
// ============================================================================

/**
 * Fetch security data from RugCheck for Solana tokens
 */
async function fetchRugCheck(address: string): Promise<ModuleResult<SecurityData>> {
  try {
    logger.debug('🛡️ Fetching RugCheck security', { address: address.slice(0, 10) });
    
    const response = await axios.get(
      `${RUGCHECK_API_URL}/tokens/${address}/report`,
      { timeout: TIMEOUT_MS }
    );
    
    const result = response.data;
    
    if (!result) {
      return {
        status: 'failed',
        timestamp: new Date().toISOString(),
        ttlSeconds: 300,
        data: null,
        error: 'Token not found in RugCheck',
        source: 'rugcheck',
      };
    }
    
    // Parse RugCheck response
    const securityData = parseRugCheckResponse(result);
    
    logger.info('🛡️ RugCheck security fetched', {
      address: address.slice(0, 10),
      riskLevel: securityData.riskLevel,
      riskScore: securityData.riskScore,
      flagCount: securityData.flags.length,
    });
    
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      ttlSeconds: 900, // 15 minutes
      data: securityData,
      source: 'rugcheck',
    };
    
  } catch (error: any) {
    logger.error('🛡️ RugCheck API error', {
      address: address.slice(0, 10),
      error: error.message,
      status: error.response?.status,
    });
    
    return {
      status: 'failed',
      timestamp: new Date().toISOString(),
      ttlSeconds: 60,
      data: null,
      error: error.message,
      source: 'rugcheck',
    };
  }
}

/**
 * Parse RugCheck response into normalized SecurityData
 */
function parseRugCheckResponse(result: any): SecurityData {
  const flags: SecurityFlag[] = [];
  const notes: string[] = [];
  
  // Parse RugCheck-specific fields
  const risks = result.risks || [];
  const tokenMeta = result.tokenMeta || {};
  
  // Check for freeze authority
  const isFreezeAuthority = !!tokenMeta.freezeAuthority;
  const isMintAuthority = !!tokenMeta.mintAuthority;
  
  if (isFreezeAuthority) {
    flags.push({
      code: 'FREEZE_AUTHORITY',
      severity: 'danger',
      description: 'Token has active freeze authority (can freeze your tokens)',
    });
  }
  
  if (isMintAuthority) {
    flags.push({
      code: 'MINT_AUTHORITY',
      severity: 'warning',
      description: 'Token has active mint authority (can mint new tokens)',
    });
  }
  
  // Parse risk array from RugCheck
  for (const risk of risks) {
    const severity = risk.level === 'danger' ? 'danger' : 
                     risk.level === 'warn' ? 'warning' : 'info';
    
    flags.push({
      code: risk.name?.toUpperCase()?.replace(/\s+/g, '_') || 'UNKNOWN_RISK',
      severity,
      description: risk.description || risk.name || 'Unknown risk',
    });
    
    if (risk.description) {
      notes.push(risk.description);
    }
  }
  
  // Calculate risk score from RugCheck score
  // RugCheck scores: 0 = bad, 100 = good
  // We want: 0 = good, 100 = bad
  const rugcheckScore = result.score ?? 50;
  const riskScore = Math.max(0, Math.min(100, 100 - rugcheckScore));
  
  // Determine risk level
  let riskLevel: SecurityRiskLevel = 'safe';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';
  else if (riskScore >= 10) riskLevel = 'low';
  
  return {
    riskLevel,
    riskScore,
    flags,
    isHoneypot: null,         // Solana doesn't have traditional honeypots
    isMintable: isMintAuthority,
    isProxy: null,            // Not applicable to Solana
    isOpenSource: true,       // Solana programs are typically verifiable
    canTakeBackOwnership: null,
    hasBlacklist: isFreezeAuthority,
    hasTradingCooldown: null,
    buyTax: null,             // Solana SPL tokens don't have built-in taxes
    sellTax: null,
    isFreezeAuthority,
    isMintAuthority,
    notes,
  };
}

// ============================================================================
// UNIFIED SECURITY FETCH
// ============================================================================

/**
 * Fetch security data using the appropriate source based on chain
 */
export async function fetchSecurityData(
  address: string,
  chain: ChainId
): Promise<ModuleResult<SecurityData>> {
  // Route to appropriate security scanner based on chain
  if (chain === 'solana') {
    return fetchRugCheck(address);
  }
  
  // For all EVM chains, use GoPlus
  const evmChains: ChainId[] = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche'];
  if (evmChains.includes(chain)) {
    return fetchGoPlus(address, chain);
  }
  
  // Unknown chain
  return {
    status: 'not_applicable',
    timestamp: new Date().toISOString(),
    ttlSeconds: 0,
    data: null,
    error: `Security scanning not available for chain: ${chain}`,
    source: 'none',
  };
}

/**
 * Format security data for human-readable output
 */
export function formatSecurityForDisplay(data: SecurityData): string {
  const lines: string[] = [];
  
  // Risk level header
  const riskEmoji = {
    safe: '✅',
    low: '🟡',
    medium: '🟠',
    high: '🔴',
    critical: '⛔',
  }[data.riskLevel];
  
  lines.push(`${riskEmoji} Security: ${data.riskLevel.toUpperCase()} (Score: ${data.riskScore}/100)`);
  
  // Flags
  if (data.flags.length > 0) {
    lines.push('');
    lines.push('Flags:');
    for (const flag of data.flags.slice(0, 5)) {
      const emoji = flag.severity === 'danger' ? '⚠️' : 
                    flag.severity === 'warning' ? '⚡' : 'ℹ️';
      lines.push(`  ${emoji} ${flag.description}`);
    }
  }
  
  // Key metrics
  if (data.buyTax !== null && data.buyTax > 0) {
    lines.push(`  Buy Tax: ${data.buyTax.toFixed(1)}%`);
  }
  if (data.sellTax !== null && data.sellTax > 0) {
    lines.push(`  Sell Tax: ${data.sellTax.toFixed(1)}%`);
  }
  
  return lines.join('\n');
}
