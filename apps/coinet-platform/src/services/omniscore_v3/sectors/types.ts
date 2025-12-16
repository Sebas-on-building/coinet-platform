/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 SECTOR SEGMENTATION                                                    ║
 * ║                                                                               ║
 * ║   "Comparing payment tokens to DeFi protocols and L1s in a single list       ║
 * ║    can distort results. Compute a global POS and also a within-sector        ║
 * ║    percentile. XRP can be 'Neutral overall' but 'top-tier in the payments    ║
 * ║    sector,' which is intuitive."                                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asset sectors for meaningful comparison
 */
export type Sector = 
  | 'L1'           // Layer 1 blockchains (BTC, ETH, SOL, AVAX)
  | 'L2'           // Layer 2 scaling (ARB, OP, MATIC)
  | 'DeFi'         // DeFi protocols (UNI, AAVE, MKR)
  | 'Payment'      // Payment tokens (XRP, XLM, ALGO)
  | 'Exchange'     // Exchange tokens (BNB, CRO, FTT)
  | 'Memecoin'     // Memecoins (DOGE, SHIB, PEPE)
  | 'Stablecoin'   // Stablecoins (USDT, USDC, DAI)
  | 'Gaming'       // Gaming/Metaverse (AXS, SAND, MANA)
  | 'Infrastructure' // Infrastructure (LINK, GRT, FIL)
  | 'Privacy'      // Privacy coins (XMR, ZEC)
  | 'Unknown';     // Unclassified

/**
 * Sector metadata
 */
export interface SectorInfo {
  id: Sector;
  name: string;
  description: string;
  
  /** Which QS features are most relevant */
  relevantQsFeatures: string[];
  
  /** Which QS features are NOT applicable */
  notApplicableQsFeatures: string[];
  
  /** Expected score range for healthy assets in this sector */
  expectedScoreRange: {
    qs: { min: number; max: number };
    os: { min: number; max: number };
    risk: { min: number; max: number };
  };
  
  /** Benchmark assets for this sector */
  benchmarkAssets: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const SECTOR_INFO: Record<Sector, SectorInfo> = {
  L1: {
    id: 'L1',
    name: 'Layer 1 Blockchains',
    description: 'Native blockchain platforms with their own consensus',
    relevantQsFeatures: ['qs_decentralization', 'qs_security_posture', 'qs_adoption', 'qs_dev_delivery'],
    notApplicableQsFeatures: [],
    expectedScoreRange: {
      qs: { min: 60, max: 98 },
      os: { min: 40, max: 90 },
      risk: { min: 10, max: 50 },
    },
    benchmarkAssets: ['bitcoin', 'ethereum', 'solana', 'avalanche-2', 'cardano'],
  },
  
  L2: {
    id: 'L2',
    name: 'Layer 2 Scaling',
    description: 'Scaling solutions built on top of L1s',
    relevantQsFeatures: ['qs_dev_delivery', 'qs_adoption', 'qs_ecosystem_depth'],
    notApplicableQsFeatures: ['qs_decentralization'], // Most L2s are not fully decentralized yet
    expectedScoreRange: {
      qs: { min: 50, max: 85 },
      os: { min: 40, max: 85 },
      risk: { min: 25, max: 60 },
    },
    benchmarkAssets: ['arbitrum', 'optimism', 'matic-network'],
  },
  
  DeFi: {
    id: 'DeFi',
    name: 'DeFi Protocols',
    description: 'Decentralized finance applications',
    relevantQsFeatures: ['qs_security_posture', 'qs_ecosystem_depth', 'qs_sustainability'],
    notApplicableQsFeatures: ['qs_decentralization'],
    expectedScoreRange: {
      qs: { min: 45, max: 85 },
      os: { min: 30, max: 80 },
      risk: { min: 30, max: 70 },
    },
    benchmarkAssets: ['uniswap', 'aave', 'maker', 'lido-dao'],
  },
  
  Payment: {
    id: 'Payment',
    name: 'Payment Tokens',
    description: 'Tokens designed for payments and remittances',
    relevantQsFeatures: ['qs_adoption', 'qs_security_posture'],
    notApplicableQsFeatures: ['qs_dev_delivery', 'qs_ecosystem_depth', 'qs_sustainability'],
    expectedScoreRange: {
      qs: { min: 40, max: 75 },
      os: { min: 35, max: 75 },
      risk: { min: 35, max: 60 },
    },
    benchmarkAssets: ['ripple', 'stellar', 'algorand'],
  },
  
  Exchange: {
    id: 'Exchange',
    name: 'Exchange Tokens',
    description: 'Native tokens of centralized exchanges',
    relevantQsFeatures: ['qs_adoption', 'qs_ecosystem_depth'],
    notApplicableQsFeatures: ['qs_decentralization', 'qs_dev_delivery'],
    expectedScoreRange: {
      qs: { min: 40, max: 80 },
      os: { min: 40, max: 80 },
      risk: { min: 40, max: 70 },
    },
    benchmarkAssets: ['binancecoin', 'crypto-com-chain', 'okb'],
  },
  
  Memecoin: {
    id: 'Memecoin',
    name: 'Memecoins',
    description: 'Community-driven tokens with cultural significance',
    relevantQsFeatures: ['qs_adoption'],
    notApplicableQsFeatures: ['qs_security_posture', 'qs_dev_delivery', 'qs_ecosystem_depth', 'qs_sustainability', 'qs_decentralization'],
    expectedScoreRange: {
      qs: { min: 15, max: 50 },
      os: { min: 20, max: 90 }, // High volatility = high opportunity variance
      risk: { min: 60, max: 95 },
    },
    benchmarkAssets: ['dogecoin', 'shiba-inu', 'pepe'],
  },
  
  Stablecoin: {
    id: 'Stablecoin',
    name: 'Stablecoins',
    description: 'Tokens pegged to fiat or other stable assets',
    relevantQsFeatures: ['qs_security_posture', 'qs_adoption'],
    notApplicableQsFeatures: ['qs_dev_delivery', 'qs_ecosystem_depth', 'qs_sustainability', 'qs_decentralization'],
    expectedScoreRange: {
      qs: { min: 50, max: 90 }, // Quality = peg stability
      os: { min: 0, max: 20 },   // No opportunity (by design)
      risk: { min: 20, max: 60 },
    },
    benchmarkAssets: ['tether', 'usd-coin', 'dai'],
  },
  
  Gaming: {
    id: 'Gaming',
    name: 'Gaming & Metaverse',
    description: 'Gaming and metaverse tokens',
    relevantQsFeatures: ['qs_adoption', 'qs_dev_delivery', 'qs_ecosystem_depth'],
    notApplicableQsFeatures: ['qs_decentralization'],
    expectedScoreRange: {
      qs: { min: 30, max: 70 },
      os: { min: 30, max: 85 },
      risk: { min: 40, max: 75 },
    },
    benchmarkAssets: ['axie-infinity', 'the-sandbox', 'decentraland'],
  },
  
  Infrastructure: {
    id: 'Infrastructure',
    name: 'Infrastructure',
    description: 'Infrastructure and oracle tokens',
    relevantQsFeatures: ['qs_adoption', 'qs_dev_delivery', 'qs_ecosystem_depth', 'qs_security_posture'],
    notApplicableQsFeatures: [],
    expectedScoreRange: {
      qs: { min: 50, max: 85 },
      os: { min: 35, max: 75 },
      risk: { min: 30, max: 55 },
    },
    benchmarkAssets: ['chainlink', 'the-graph', 'filecoin'],
  },
  
  Privacy: {
    id: 'Privacy',
    name: 'Privacy Coins',
    description: 'Privacy-focused cryptocurrencies',
    relevantQsFeatures: ['qs_security_posture', 'qs_dev_delivery', 'qs_decentralization'],
    notApplicableQsFeatures: ['qs_ecosystem_depth'],
    expectedScoreRange: {
      qs: { min: 45, max: 75 },
      os: { min: 30, max: 70 },
      risk: { min: 40, max: 70 },
    },
    benchmarkAssets: ['monero', 'zcash'],
  },
  
  Unknown: {
    id: 'Unknown',
    name: 'Unclassified',
    description: 'Assets not yet classified into a sector',
    relevantQsFeatures: [],
    notApplicableQsFeatures: [],
    expectedScoreRange: {
      qs: { min: 0, max: 100 },
      os: { min: 0, max: 100 },
      risk: { min: 0, max: 100 },
    },
    benchmarkAssets: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// WELL-KNOWN SECTOR ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-defined sector assignments for well-known assets
 */
export const ASSET_SECTORS: Record<string, Sector> = {
  // L1
  'bitcoin': 'L1',
  'ethereum': 'L1',
  'solana': 'L1',
  'cardano': 'L1',
  'avalanche-2': 'L1',
  'polkadot': 'L1',
  'near': 'L1',
  'cosmos': 'L1',
  'aptos': 'L1',
  'sui': 'L1',
  'toncoin': 'L1',
  
  // L2
  'arbitrum': 'L2',
  'optimism': 'L2',
  'matic-network': 'L2',
  'immutable-x': 'L2',
  'starknet': 'L2',
  'base': 'L2',
  
  // DeFi
  'uniswap': 'DeFi',
  'aave': 'DeFi',
  'maker': 'DeFi',
  'lido-dao': 'DeFi',
  'curve-dao-token': 'DeFi',
  'compound-governance-token': 'DeFi',
  'synthetix-network-token': 'DeFi',
  'pancakeswap-token': 'DeFi',
  'jupiter': 'DeFi',
  'raydium': 'DeFi',
  
  // Payment
  'ripple': 'Payment',
  'stellar': 'Payment',
  'algorand': 'Payment',
  'hedera-hashgraph': 'Payment',
  
  // Exchange
  'binancecoin': 'Exchange',
  'crypto-com-chain': 'Exchange',
  'okb': 'Exchange',
  'kucoin-shares': 'Exchange',
  'leo-token': 'Exchange',
  
  // Memecoin
  'dogecoin': 'Memecoin',
  'shiba-inu': 'Memecoin',
  'pepe': 'Memecoin',
  'floki': 'Memecoin',
  'bonk': 'Memecoin',
  'dogwifcoin': 'Memecoin',
  
  // Stablecoin
  'tether': 'Stablecoin',
  'usd-coin': 'Stablecoin',
  'dai': 'Stablecoin',
  'true-usd': 'Stablecoin',
  'frax': 'Stablecoin',
  
  // Gaming
  'axie-infinity': 'Gaming',
  'the-sandbox': 'Gaming',
  'decentraland': 'Gaming',
  'gala': 'Gaming',
  'illuvium': 'Gaming',
  
  // Infrastructure
  'chainlink': 'Infrastructure',
  'the-graph': 'Infrastructure',
  'filecoin': 'Infrastructure',
  'render-token': 'Infrastructure',
  'arweave': 'Infrastructure',
  
  // Privacy
  'monero': 'Privacy',
  'zcash': 'Privacy',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR RANKING RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SectorRanking {
  /** Asset ID */
  assetId: string;
  
  /** Asset symbol */
  symbol: string;
  
  /** Asset's sector */
  sector: Sector;
  
  /** Global POS */
  globalPOS: number | null;
  
  /** Global tier */
  globalTier: string | null;
  
  /** Global rank (1 = best) */
  globalRank: number | null;
  
  /** Global percentile (0-100, 100 = best) */
  globalPercentile: number | null;
  
  /** Within-sector POS */
  sectorPOS: number | null;
  
  /** Within-sector tier */
  sectorTier: string | null;
  
  /** Within-sector rank */
  sectorRank: number;
  
  /** Within-sector percentile */
  sectorPercentile: number;
  
  /** Sector peer count */
  sectorPeerCount: number;
  
  /** Summary */
  summary: string;
}
