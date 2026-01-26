/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 TOKEN CONTEXT TYPES - Entity-Driven Enrichment Schema                  ║
 * ║                                                                               ║
 * ║   Standardized schema for token data injection into AI context.               ║
 * ║   Decouples enrichment from intent classification.                            ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, anti-hallucination design               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// CHAIN TYPES
// ============================================================================

export type ChainId = 
  | 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'avalanche'
  | 'solana' | 'unknown';

export type ChainNumericId = 1 | 56 | 137 | 42161 | 8453 | 10 | 43114;

export const CHAIN_ID_MAP: Record<ChainId, ChainNumericId | null> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
  avalanche: 43114,
  solana: null,  // Solana doesn't use numeric chain IDs
  unknown: null,
};

export const CHAIN_NAMES: Record<ChainId, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Smart Chain',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum One',
  base: 'Base',
  optimism: 'Optimism',
  avalanche: 'Avalanche',
  solana: 'Solana',
  unknown: 'Unknown',
};

// ============================================================================
// TOKEN REFERENCE (what the user provided)
// ============================================================================

export type TokenRefType = 
  | 'contract_address'   // Full contract address (0x... or Solana base58)
  | 'ticker'             // $PENGUIN or PENGUIN
  | 'dexscreener_url'    // https://dexscreener.com/...
  | 'pumpfun_url'        // https://pump.fun/...
  | 'pair_address';      // LP pair address

export interface TokenRef {
  type: TokenRefType;
  raw: string;           // Original user input
  normalized: string;    // Cleaned version (uppercase ticker, lowercase address)
  chain?: ChainId;       // If determinable from input
  confidence: number;    // 0-1 confidence this is a valid token ref
}

// ============================================================================
// RESOLVED TOKEN (after resolver stage)
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ResolvedToken {
  address: string;
  chain: ChainId;
  symbol: string;
  name: string;
  pairAddress?: string;
  dexscreenerUrl?: string;
  
  // Resolution metadata
  resolvedFrom: TokenRefType;
  resolvedAt: string;          // ISO timestamp
  resolutionConfidence: number; // 0-1
  
  // Confidence-gated resolution (COINET_TOKEN_RESOLUTION_POLICY)
  confidenceLevel?: ConfidenceLevel;
  confidenceMargin?: number;     // top - runner_up confidence
  shouldAutoResolve?: boolean;   // true if HIGH confidence
  clarificationReason?: string;  // why we're asking for clarification
  
  // Ambiguity info (for multi-match scenarios)
  isAmbiguous: boolean;
  alternatives?: ResolvedTokenCandidate[];
}

export interface ResolvedTokenCandidate {
  address: string;
  chain: ChainId;
  symbol: string;
  name: string;
  liquidity: number;
  volume24h: number;
  confidence: number;
  source: 'dexscreener' | 'coingecko' | 'internal';
}

// ============================================================================
// MODULE DATA STRUCTURES (normalized across sources)
// ============================================================================

export type ModuleStatus = 'success' | 'partial' | 'failed' | 'skipped' | 'not_applicable';

export interface ModuleResult<T> {
  status: ModuleStatus;
  timestamp: string;       // ISO timestamp of fetch
  ttlSeconds: number;      // How long this data is valid
  data: T | null;
  error?: string;
  source: string;          // e.g., 'dexscreener', 'goplus', 'rugcheck'
}

// --- DexScreener Module ---
export interface DexScreenerData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number | null;
  fdv: number | null;
  pairAge: number;         // Hours since pair creation
  pairCreatedAt: string;
  txns24h: {
    buys: number;
    sells: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
}

// --- Security Module (unified GoPlus + RugCheck) ---
export type SecurityRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityFlag {
  code: string;           // e.g., 'HONEYPOT', 'MINTABLE', 'HIGH_TAX'
  severity: 'info' | 'warning' | 'danger';
  description: string;
}

export interface SecurityData {
  riskLevel: SecurityRiskLevel;
  riskScore: number;       // 0-100 (higher = riskier)
  flags: SecurityFlag[];
  
  // Specific checks
  isHoneypot: boolean | null;
  isMintable: boolean | null;
  isProxy: boolean | null;
  isOpenSource: boolean | null;
  canTakeBackOwnership: boolean | null;
  hasBlacklist: boolean | null;
  hasTradingCooldown: boolean | null;
  buyTax: number | null;   // Percentage
  sellTax: number | null;  // Percentage
  
  // Solana-specific (from RugCheck)
  isFreezeAuthority: boolean | null;
  isMintAuthority: boolean | null;
  
  notes: string[];
}

// --- Holders Module ---
export interface HoldersData {
  totalHolders: number;
  top10Concentration: number;  // Percentage held by top 10
  top20Concentration: number;  // Percentage held by top 20
  
  topHolders: Array<{
    address: string;
    percentage: number;
    label?: string;          // e.g., 'Creator', 'LP', 'Exchange'
  }>;
  
  // Distribution analysis
  whaleCount: number;        // Holders with >1% supply
  retailCount: number;       // Holders with <0.01% supply
  distributionScore: number; // 0-100 (higher = better distributed)
}

// --- pump.fun Module ---
export interface PumpFunData {
  bondingCurveProgress: number;  // 0-100%
  isGraduated: boolean;
  raydiumPool: string | null;
  
  creator: string;
  createdAt: string;
  ageMinutes: number;
  
  replyCount: number;
  isKingOfTheHill: boolean;
  
  virtualSolReserves: number;
  virtualTokenReserves: number;
  
  // Recent trades analysis
  recentBuys: number;
  recentSells: number;
  isCreatorSelling: boolean;
  creatorSellPercent: number;
}

// --- Smart Money Module ---
export interface SmartMoneyData {
  smartMoneyHolders: number;
  smartMoneyPercentage: number;
  
  recentSmartMoneyActivity: Array<{
    wallet: string;
    action: 'buy' | 'sell';
    amount: number;
    timestamp: string;
  }>;
  
  signalStrength: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

// ============================================================================
// TOKEN CONTEXT (the complete payload)
// ============================================================================

export type BudgetTier = 'minimal' | 'standard' | 'full';

export interface TokenContextRequest {
  tokenRef: TokenRef;
  userIntent: string;        // What the user is asking (for budget selection)
  budgetTier?: BudgetTier;   // Override automatic budget selection
  forceRefresh?: boolean;    // Bypass cache
}

export interface TokenContext {
  // Identification
  resolved: ResolvedToken | null;
  isResolved: boolean;
  needsClarification: boolean;
  clarificationQuestion?: string;
  
  // Timestamps
  builtAt: string;
  expiresAt: string;
  
  // Module results
  dexscreener: ModuleResult<DexScreenerData> | null;
  security: ModuleResult<SecurityData> | null;
  holders: ModuleResult<HoldersData> | null;
  pumpfun: ModuleResult<PumpFunData> | null;
  smartMoney: ModuleResult<SmartMoneyData> | null;
  
  // Coverage tracking (for FACT_GATE)
  coverage: {
    available: string[];     // Modules that returned data
    missing: string[];       // Modules that failed or were skipped
    notApplicable: string[]; // Modules that don't apply (e.g., pumpfun for ETH)
  };
  
  // Budget used
  budgetTier: BudgetTier;
  modulesRequested: string[];
  modulesFetched: string[];
  
  // For AI injection
  factGate: string;          // The exact guardrail text
  rawContext: string;        // Pre-formatted context for AI
}

// ============================================================================
// ENTITY DETECTION (what triggers enrichment)
// ============================================================================

export interface DetectedTokenEntity {
  ref: TokenRef;
  position: { start: number; end: number };
  matchedPattern: string;
}

export interface EntityDetectionResult {
  hasTokenEntity: boolean;
  entities: DetectedTokenEntity[];
  primaryEntity: DetectedTokenEntity | null;
  needsResolution: boolean;  // True if we have ticker but no address
}
