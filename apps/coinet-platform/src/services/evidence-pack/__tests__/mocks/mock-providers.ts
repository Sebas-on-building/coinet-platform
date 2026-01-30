/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎭 MOCK PROVIDERS — Controllable Test Doubles                             ║
 * ║                                                                               ║
 * ║   Simulates all evidence module providers with configurable behavior:         ║
 * ║   - Success/failure scenarios                                                 ║
 * ║   - Latency simulation                                                        ║
 * ║   - Error injection                                                           ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  DexScreenerEvidence,
  SecurityEvidence,
  HoldersEvidence,
  SentimentEvidence,
  NewsEvidence,
  DerivativesEvidence,
  OnchainEvidence,
  MarketSnapshotEvidence,
  TokenCandidate,
} from '../../types';

import {
  createDexScreenerEvidence,
  createSecurityEvidence,
  createHoldersEvidence,
  createSentimentEvidence,
  createNewsEvidence,
  createDerivativesEvidence,
  createOnchainEvidence,
  createMarketSnapshotEvidence,
  DEXSCREENER_OK,
  DEXSCREENER_BTC_OK,
  SECURITY_OK_SAFE,
  HOLDERS_OK_DISTRIBUTED,
  SENTIMENT_OK_BULLISH,
  NEWS_OK_POSITIVE,
  DERIVATIVES_OK_NEUTRAL,
  ONCHAIN_OK_ACCUMULATION,
  MARKET_SNAPSHOT_OK,
  TOKEN_BTC,
  TOKEN_PENGUIN_SOLANA,
  TOKEN_AMBIGUOUS_CANDIDATES,
} from '../fixtures/golden-fixtures';

// ============================================================================
// TYPES
// ============================================================================

export type MockScenario = 'ok' | 'stale' | 'error' | 'missing' | 'timeout';

export interface MockProviderConfig {
  dexscreener?: MockScenario;
  security?: MockScenario;
  holders?: MockScenario;
  sentiment?: MockScenario;
  news?: MockScenario;
  derivatives?: MockScenario;
  onchain?: MockScenario;
  market_snapshot?: MockScenario;
  
  // Resolution scenarios
  resolution?: 'known_btc' | 'known_eth' | 'found_token' | 'ambiguous' | 'not_found';
  
  // Timing
  latencyMs?: number;
  
  // Custom data overrides
  customData?: {
    dexscreener?: any;
    security?: any;
    holders?: any;
    sentiment?: any;
    news?: any;
    derivatives?: any;
    onchain?: any;
    market_snapshot?: any;
  };
}

// ============================================================================
// MOCK PROVIDER REGISTRY
// ============================================================================

let currentConfig: MockProviderConfig = {
  dexscreener: 'ok',
  security: 'ok',
  holders: 'ok',
  sentiment: 'ok',
  news: 'ok',
  derivatives: 'ok',
  onchain: 'ok',
  market_snapshot: 'ok',
  resolution: 'known_btc',
  latencyMs: 0,
};

/**
 * Configure the mock providers for the next test
 */
export function configureMocks(config: Partial<MockProviderConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Reset mocks to default (all OK) state
 */
export function resetMocks(): void {
  currentConfig = {
    dexscreener: 'ok',
    security: 'ok',
    holders: 'ok',
    sentiment: 'ok',
    news: 'ok',
    derivatives: 'ok',
    onchain: 'ok',
    market_snapshot: 'ok',
    resolution: 'known_btc',
    latencyMs: 0,
  };
}

/**
 * Get current mock configuration
 */
export function getMockConfig(): MockProviderConfig {
  return { ...currentConfig };
}

// ============================================================================
// DELAY HELPER
// ============================================================================

async function simulateLatency(): Promise<void> {
  if (currentConfig.latencyMs && currentConfig.latencyMs > 0) {
    await new Promise(resolve => setTimeout(resolve, currentConfig.latencyMs));
  }
}

async function simulateTimeout(): Promise<never> {
  await new Promise(resolve => setTimeout(resolve, 5000));  // Long delay
  throw new Error('Timeout');
}

// ============================================================================
// MOCK DEXSCREENER
// ============================================================================

export async function mockFetchDexScreener(
  address: string | null,
  chain: string,
  symbol: string
): Promise<DexScreenerEvidence> {
  const scenario = currentConfig.dexscreener || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  // Use BTC data for BTC symbol
  const data = symbol === 'BTC' ? DEXSCREENER_BTC_OK : 
               (currentConfig.customData?.dexscreener || DEXSCREENER_OK);
  
  return createDexScreenerEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    data
  ) as DexScreenerEvidence;
}

// ============================================================================
// MOCK SECURITY
// ============================================================================

export async function mockFetchSecurity(
  address: string | null,
  chain: string
): Promise<SecurityEvidence> {
  const scenario = currentConfig.security || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  // No security data for major tokens without addresses
  if (!address) {
    return createSecurityEvidence('missing') as SecurityEvidence;
  }
  
  return createSecurityEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.security || SECURITY_OK_SAFE
  ) as SecurityEvidence;
}

// ============================================================================
// MOCK HOLDERS
// ============================================================================

export async function mockFetchHolders(
  address: string | null,
  chain: string
): Promise<HoldersEvidence> {
  const scenario = currentConfig.holders || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  if (!address) {
    return createHoldersEvidence('missing') as HoldersEvidence;
  }
  
  return createHoldersEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.holders || HOLDERS_OK_DISTRIBUTED
  ) as HoldersEvidence;
}

// ============================================================================
// MOCK SENTIMENT
// ============================================================================

export async function mockFetchSentiment(
  symbol: string
): Promise<SentimentEvidence> {
  const scenario = currentConfig.sentiment || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  return createSentimentEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.sentiment || SENTIMENT_OK_BULLISH
  ) as SentimentEvidence;
}

// ============================================================================
// MOCK NEWS
// ============================================================================

export async function mockFetchNews(
  symbol: string
): Promise<NewsEvidence> {
  const scenario = currentConfig.news || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  return createNewsEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.news || NEWS_OK_POSITIVE
  ) as NewsEvidence;
}

// ============================================================================
// MOCK DERIVATIVES
// ============================================================================

export async function mockFetchDerivatives(
  symbol: string
): Promise<DerivativesEvidence> {
  const scenario = currentConfig.derivatives || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  return createDerivativesEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.derivatives || DERIVATIVES_OK_NEUTRAL
  ) as DerivativesEvidence;
}

// ============================================================================
// MOCK ONCHAIN
// ============================================================================

export async function mockFetchOnchain(
  address: string | null,
  chain: string,
  symbol: string
): Promise<OnchainEvidence> {
  const scenario = currentConfig.onchain || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  return createOnchainEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.onchain || ONCHAIN_OK_ACCUMULATION
  ) as OnchainEvidence;
}

// ============================================================================
// MOCK MARKET SNAPSHOT
// ============================================================================

export async function mockFetchMarketSnapshot(): Promise<MarketSnapshotEvidence> {
  const scenario = currentConfig.market_snapshot || 'ok';
  
  if (scenario === 'timeout') {
    await simulateTimeout();
  }
  
  await simulateLatency();
  
  return createMarketSnapshotEvidence(
    scenario === 'timeout' ? 'error' : scenario,
    currentConfig.customData?.market_snapshot || MARKET_SNAPSHOT_OK
  ) as MarketSnapshotEvidence;
}

// ============================================================================
// MOCK TOKEN RESOLUTION
// ============================================================================

export async function mockResolveToken(
  entities: string[]
): Promise<{ candidates: TokenCandidate[]; confidence: number; margin: number }> {
  await simulateLatency();
  
  const resolution = currentConfig.resolution || 'known_btc';
  
  switch (resolution) {
    case 'known_btc':
      return {
        candidates: TOKEN_BTC.candidates,
        confidence: 1.0,
        margin: 1.0,
      };
    
    case 'known_eth':
      return {
        candidates: [{ symbol: 'ETH', name: 'Ethereum', chain: 'ethereum', address: null, confidence: 1.0 }],
        confidence: 1.0,
        margin: 1.0,
      };
    
    case 'found_token':
      return {
        candidates: TOKEN_PENGUIN_SOLANA.candidates,
        confidence: 0.92,
        margin: 0.25,
      };
    
    case 'ambiguous':
      return {
        candidates: TOKEN_AMBIGUOUS_CANDIDATES,
        confidence: 0.75,
        margin: 0.03,  // Below threshold
      };
    
    case 'not_found':
      return {
        candidates: [],
        confidence: 0,
        margin: 0,
      };
    
    default:
      return {
        candidates: TOKEN_BTC.candidates,
        confidence: 1.0,
        margin: 1.0,
      };
  }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * All modules working perfectly
 */
export const PRESET_ALL_OK: MockProviderConfig = {
  dexscreener: 'ok',
  security: 'ok',
  holders: 'ok',
  sentiment: 'ok',
  news: 'ok',
  derivatives: 'ok',
  onchain: 'ok',
  market_snapshot: 'ok',
  resolution: 'known_btc',
};

/**
 * Some modules stale (testing freshness)
 */
export const PRESET_PARTIAL_STALE: MockProviderConfig = {
  dexscreener: 'ok',
  security: 'stale',
  holders: 'ok',
  sentiment: 'stale',
  news: 'stale',
  derivatives: 'ok',
  onchain: 'ok',
  market_snapshot: 'ok',
  resolution: 'found_token',
};

/**
 * Provider errors
 */
export const PRESET_PARTIAL_ERROR: MockProviderConfig = {
  dexscreener: 'ok',
  security: 'error',
  holders: 'error',
  sentiment: 'ok',
  news: 'ok',
  derivatives: 'missing',
  onchain: 'missing',
  market_snapshot: 'ok',
  resolution: 'found_token',
};

/**
 * Everything failing
 */
export const PRESET_CATASTROPHIC: MockProviderConfig = {
  dexscreener: 'error',
  security: 'error',
  holders: 'error',
  sentiment: 'error',
  news: 'error',
  derivatives: 'error',
  onchain: 'error',
  market_snapshot: 'error',
  resolution: 'not_found',
};

/**
 * Ambiguous token resolution (needs clarifier)
 */
export const PRESET_AMBIGUOUS_TOKEN: MockProviderConfig = {
  dexscreener: 'ok',
  security: 'ok',
  holders: 'ok',
  sentiment: 'ok',
  news: 'ok',
  derivatives: 'missing',
  onchain: 'missing',
  market_snapshot: 'ok',
  resolution: 'ambiguous',
};

/**
 * Market-only query (no token)
 */
export const PRESET_MARKET_ONLY: MockProviderConfig = {
  dexscreener: 'missing',
  security: 'missing',
  holders: 'missing',
  sentiment: 'ok',
  news: 'ok',
  derivatives: 'ok',
  onchain: 'missing',
  market_snapshot: 'ok',
  resolution: 'not_found',
};

// ============================================================================
// MOCK INJECTION HELPER
// ============================================================================

/**
 * Create a mock builder that uses mock providers
 */
export function createMockBuilder() {
  return {
    fetchDexScreener: mockFetchDexScreener,
    fetchSecurity: mockFetchSecurity,
    fetchHolders: mockFetchHolders,
    fetchSentiment: mockFetchSentiment,
    fetchNews: mockFetchNews,
    fetchDerivatives: mockFetchDerivatives,
    fetchOnchain: mockFetchOnchain,
    fetchMarketSnapshot: mockFetchMarketSnapshot,
    resolveToken: mockResolveToken,
  };
}
