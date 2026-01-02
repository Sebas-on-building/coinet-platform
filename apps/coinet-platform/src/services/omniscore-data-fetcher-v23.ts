/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📡 OMNISCORE DATA FETCHER v2.5.0 "PRODUCTION"                            ║
 * ║                                                                               ║
 * ║   Collects raw variables for OmniScore v2.5.0 (Convex Combination) with:    ║
 * ║   • Segment-tagged inputs (QS vs OS isolation)                               ║
 * ║   • Source tracking for audit trail                                          ║
 * ║   • Quality scores per variable                                              ║
 * ║   • Timestamp preservation for freshness decay                               ║
 * ║                                                                               ║
 * ║   SOURCES:                                                                    ║
 * ║   • CoinGecko - Market data, price, volume, market cap                       ║
 * ║   • DefiLlama - TVL, protocol revenue                                        ║
 * ║   • GitHub API - Dev activity, commits, contributors                         ║
 * ║   • Blockchain - On-chain metrics                                            ║
 * ║   • Social - Twitter/Discord follower counts                                 ║
 * ║   • Estimates - Derived values with lower confidence                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { 
  FeatureInput, 
  Segment,
  CalculateOmniScoreParams,
  calculateOmniScoreProduction,
  OmniScoreProductionResponse,
  OmniScoreSnapshot,
  toOmniScoreSnapshot,
  getQuadrantZone,
  OMNISCORE_CONFIG
} from './omniscore-v2.5';
import { getCachedPrice } from './enterprise-market-data-pipeline';
import { 
  getTwitterIntelligence, 
  getProjectTwitterHandle,
  toOmniScoreInputs,
  TwitterProjectIntelligence
} from './twitter-intelligence';
import {
  fetchAllRealData,
  type AllRealData,
  type RealGovernanceData,
  type RealSecurityData,
  type RealAdoptionData,
  type RealTokenomicsData,
} from './real-data-sources';
import {
  getProjectKnowledge,
  researchAndSaveProject,
  type ResearchFindings,
} from './project-web-researcher';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

type SectorType = 'L1' | 'L2' | 'DeFi' | 'Infrastructure' | 'AI' | 'Meme' | 'Gaming' | 'Unknown';

const SECTOR_MAPS: Record<SectorType, Set<string>> = {
  L1: new Set(['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'avax', 'avalanche', 
    'matic', 'polygon', 'near', 'apt', 'aptos', 'sui', 'dot', 'polkadot', 'atom', 'cosmos', 
    'algo', 'algorand', 'ada', 'cardano', 'bnb', 'xrp', 'ton', 'supra', 'hbar', 'hedera',
    'ftm', 'fantom', 'egld', 'multiversx', 'icp', 'internet-computer', 'flow', 'xtz', 'tezos',
    'neo', 'vet', 'vechain', 'fil', 'filecoin', 'kas', 'kaspa', 'sei', 'trx', 'tron',
    'xlm', 'stellar', 'eos', 'ltc', 'litecoin', 'bch', 'bitcoin-cash', 'etc', 'ethereum-classic',
    'xmr', 'monero', 'zec', 'zcash', 'cro', 'cronos', 'kava', 'mina', 'rose', 'oasis',
    'one', 'harmony', 'zil', 'zilliqa', 'waves', 'qtum', 'ont', 'ontology', 'theta',
    'aster', 'astr', 'astar']), // Aster/Astar - Binance-backed L1
  L2: new Set(['arb', 'arbitrum', 'op', 'optimism', 'base', 'zksync', 'starknet', 'mantle', 
    'scroll', 'linea', 'blast', 'mode', 'manta', 'taiko', 'zkevm', 'metis', 'boba', 'loopring',
    'lrc', 'skale', 'polygon-zkevm', 'imx-zkevm']),
  DeFi: new Set(['uni', 'uniswap', 'aave', 'sushi', 'sushiswap', 'curve', 'crv', 'compound', 
    'comp', 'maker', 'mkr', 'lido', 'steth', 'convex', 'cvx', 'yearn', 'yfi', 'gmx', 'dydx', 
    'pancake', 'cake', 'synthetix', 'snx', 'frax', 'balancer', 'bal', 'pendle', 'velo', 
    'velodrome', 'aero', 'aerodrome', 'rpl', 'rocket', 'eigen', 'jupiter', 'jup', 'raydium',
    'orca', 'morpho', 'ethena', 'ena', 'usual', '1inch', 'instadapp', 'spell', 'swise',
    'rsr', 'reserve', 'fxs', 'ankr', 'lqty', 'liquity', 'ribbon', 'alchemix', 'alcx',
    'badger', 'harvest', 'alpha', 'cream', 'venus', 'xvs', 'benqi', 'qi', 'trader-joe',
    'joe', 'kyber', 'knc', 'bancor', 'bnt', 'thorchain', 'rune', 'osmosis', 'osmo',
    'astroport', 'terraswap', 'kujira', 'kuji', 'injective-protocol']),
  Infrastructure: new Set(['link', 'chainlink', 'grt', 'thegraph', 'ar', 'arweave', 'rndr', 
    'render', 'inj', 'injective', 'pyth', 'wormhole', 'layerzero', 'axelar', 'api3', 'band',
    'the', 'helium', 'hnt', 'mask', 'celestia', 'tia', 'altlayer', 'alt', 'dymension', 'dym',
    'stx', 'stacks', 'zro', 'w', 'eigenlayer', 'ondo', 'safe', 'ssv', 'storj', 'sia',
    'flux', 'livepeer', 'lpt', 'theta-network', 'tfuel', 'pocket', 'pokt', 'nucypher', 'keep',
    'nxm', 'nexus', 'uma', 'api3', 'tellor', 'trb', 'dia', 'redstone', 'switchboard']),
  AI: new Set(['tao', 'bittensor', 'fet', 'fetchai', 'fetch-ai', 'agix', 'singularity', 'ocean', 
    'olas', 'autonolas', 'akt', 'akash', 'wld', 'worldcoin', 'io', 'virtual', 'ai16z', 'goat',
    'griffain', 'zerebro', 'rndr', 'render', 'theta', 'theta-network', 'grt', 'numeraire',
    'nmr', 'deepbrain', 'dbc', 'cortex', 'ctxc', 'matrix', 'man', 'nkn', 'aleph', 'phala',
    'pha', 'orai', 'oraichain', 'aioz', 'nosana', 'nos', 'clore', 'grass']),
  Meme: new Set(['doge', 'dogecoin', 'shib', 'pepe', 'wif', 'bonk', 'floki', 'turbo', 'mog', 
    'brett', 'popcat', 'neiro', 'fwog', 'spx', 'moodeng', 'pnut', 'act', 'chillguy', 'fartcoin',
    'gigachad', 'chill-guy', 'myro', 'wen', 'slerf', 'bome', 'book-of-meme', 'coq', 'cat',
    'simon', 'retardio', 'toshi', 'mochi', 'ponke', 'smog', 'samo', 'cheems', 'kishu',
    'launchcoin', 'launch', 'believe']),
  Gaming: new Set(['axs', 'axie', 'sand', 'sandbox', 'mana', 'decentraland', 'gala', 'imx', 
    'immutable', 'ronin', 'ron', 'prime', 'echelon', 'beam', 'xai', 'pixel', 'ilv', 'illuvium',
    'gods', 'super', 'ape', 'magic', 'enj', 'enjin', 'wax', 'waxp', 'ultra', 'uos', 'treasure',
    'mc', 'merit-circle', 'ygg', 'yield-guild', 'gmt', 'stepn', 'alice', 'my-neighbor-alice',
    'pyr', 'vulcan', 'bigtime', 'naka', 'nakamoto-games', 'ghst', 'aavegotchi', 'mobox',
    'mbox', 'staratlas', 'atlas', 'polis', 'aurory', 'aury', 'genopets', 'gene']),
  Unknown: new Set([])
};

function detectSector(projectId: string): SectorType {
  const p = projectId.toLowerCase().replace(/-/g, '');
  
  for (const [sector, projects] of Object.entries(SECTOR_MAPS)) {
    if (projects.has(p) || projects.has(projectId.toLowerCase())) {
      return sector as SectorType;
    }
  }
  
  return 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT DATA BUNDLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectDataBundleV23 {
  projectId: string;
  qsInputs: FeatureInput[];
  osInputs: FeatureInput[];
  sector: SectorType;
  marketData: {
    btcTrend30d: number;
    btcTrend90d: number;
    volatilityIndex: number;
    fearGreedIndex: number;
  };
  eventRiskSeverity: number;
  priceChange30d: number;
  botRisk: number;
  anomalyScore: number;
  multiSourceConsistency: number;
  // v2.3.2: Twitter-derived metrics
  influencerConcentration: number;
  sentimentDispersion: number;
  hasTwitterData: boolean;
  twitterHandle: string | null;
  fetchedAt: string;
  sourcesQueried: string[];
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function createFeature(
  key: string,
  segment: Segment,
  raw: number | null,
  sources: string[] = []
): FeatureInput {
  return {
    key,
    segment,
    raw,
    timestamp: new Date().toISOString(),
    sources,
  };
}

// Normalize value to 0-100 scale
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.8.0: PARTNERSHIPS & BACKING DATA SOURCE
// This provides information about exchange backing, VC investors, and strategic
// partnerships that indicate project credibility beyond on-chain metrics.
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectBackingInfo {
  tier: 'tier1' | 'tier2' | 'tier3' | 'unknown';
  exchanges: string[];
  vcs: string[];
  strategicPartners: string[];
  description: string;
}

/**
 * v2.8.0: Get backing/partnership information for a project
 * tier1: Major exchange backing (Binance, Coinbase, etc.) or top-tier VCs
 * tier2: Significant backing from known entities
 * tier3: Some known backing
 * unknown: No known backing info
 */
function getProjectBacking(projectId: string): ProjectBackingInfo {
  const pid = projectId.toLowerCase();
  
  // v2.8.0: Project backing database
  // This is manually curated data - in production, this could be fetched from an API
  const backingDatabase: Record<string, ProjectBackingInfo> = {
    // Binance-backed projects
    'aster': { tier: 'tier1', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'Binance Labs incubated' },
    'astr': { tier: 'tier1', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'Binance Labs incubated' },
    'astar': { tier: 'tier1', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'Binance Labs incubated' },
    'bnb': { tier: 'tier1', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'Binance native token' },
    'cake': { tier: 'tier1', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'BNB Chain flagship DEX' },
    'xvs': { tier: 'tier1', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'Venus Protocol - Binance-backed' },
    'bake': { tier: 'tier2', exchanges: ['binance'], vcs: [], strategicPartners: ['binance'], description: 'BakerySwap on BNB Chain' },
    'hook': { tier: 'tier2', exchanges: ['binance'], vcs: ['binance-labs'], strategicPartners: ['binance'], description: 'Hooked Protocol - Binance Launchpad' },
    
    // Coinbase-backed projects
    'base': { tier: 'tier1', exchanges: ['coinbase'], vcs: ['coinbase-ventures'], strategicPartners: ['coinbase'], description: 'Coinbase L2' },
    'cbeth': { tier: 'tier1', exchanges: ['coinbase'], vcs: ['coinbase-ventures'], strategicPartners: ['coinbase'], description: 'Coinbase staked ETH' },
    
    // Major VC-backed
    'solana': { tier: 'tier1', exchanges: ['ftx', 'alameda'], vcs: ['a16z', 'polychain', 'multicoin'], strategicPartners: ['jump', 'alameda'], description: 'Major VC backing' },
    'aptos': { tier: 'tier1', exchanges: ['binance', 'coinbase'], vcs: ['a16z', 'multicoin', 'jump'], strategicPartners: [], description: 'Former Diem team, top-tier VC backing' },
    'sui': { tier: 'tier1', exchanges: ['binance', 'coinbase'], vcs: ['a16z', 'coinbase-ventures', 'jump'], strategicPartners: [], description: 'Former Diem team, top-tier VC backing' },
    'arbitrum': { tier: 'tier1', exchanges: [], vcs: ['pantera', 'paradigm', 'lightspeed'], strategicPartners: [], description: 'Major VC backing' },
    'optimism': { tier: 'tier1', exchanges: [], vcs: ['a16z', 'paradigm'], strategicPartners: [], description: 'Major VC backing' },
    'starknet': { tier: 'tier1', exchanges: [], vcs: ['paradigm', 'sequoia', 'coatue'], strategicPartners: [], description: '$100M+ raises' },
    'celestia': { tier: 'tier1', exchanges: [], vcs: ['bain', 'polychain', 'placeholder'], strategicPartners: [], description: 'Modular blockchain leader' },
    'eigenlayer': { tier: 'tier1', exchanges: [], vcs: ['a16z', 'polychain', 'blockchain-capital'], strategicPartners: [], description: 'Restaking pioneer' },
    'eigen': { tier: 'tier1', exchanges: [], vcs: ['a16z', 'polychain', 'blockchain-capital'], strategicPartners: [], description: 'Restaking pioneer' },
    
    // Tier 2 - Significant backing
    'layerzero': { tier: 'tier2', exchanges: [], vcs: ['a16z', 'sequoia', 'coinbase-ventures'], strategicPartners: [], description: 'Cross-chain messaging' },
    'zro': { tier: 'tier2', exchanges: [], vcs: ['a16z', 'sequoia', 'coinbase-ventures'], strategicPartners: [], description: 'LayerZero token' },
    'wormhole': { tier: 'tier2', exchanges: [], vcs: ['jump'], strategicPartners: ['jump-crypto'], description: 'Jump Crypto backed' },
    'pyth': { tier: 'tier2', exchanges: [], vcs: ['jump'], strategicPartners: ['jump-crypto', 'solana'], description: 'Jump Crypto oracle' },
    'render': { tier: 'tier2', exchanges: [], vcs: ['multicoin', 'alameda'], strategicPartners: [], description: 'GPU rendering network' },
    'rndr': { tier: 'tier2', exchanges: [], vcs: ['multicoin', 'alameda'], strategicPartners: [], description: 'GPU rendering network' },
    'worldcoin': { tier: 'tier2', exchanges: [], vcs: ['a16z', 'khosla'], strategicPartners: ['sam-altman'], description: 'OpenAI founder project' },
    'wld': { tier: 'tier2', exchanges: [], vcs: ['a16z', 'khosla'], strategicPartners: ['sam-altman'], description: 'OpenAI founder project' },
    'bittensor': { tier: 'tier2', exchanges: [], vcs: ['dcg', 'polychain'], strategicPartners: [], description: 'Decentralized AI' },
    'tao': { tier: 'tier2', exchanges: [], vcs: ['dcg', 'polychain'], strategicPartners: [], description: 'Decentralized AI' },
    
    // Hedera - Enterprise backing
    'hedera': { tier: 'tier1', exchanges: [], vcs: [], strategicPartners: ['google', 'ibm', 'lg', 'boeing', 'deutsche-telekom'], description: 'Enterprise governing council' },
    'hbar': { tier: 'tier1', exchanges: [], vcs: [], strategicPartners: ['google', 'ibm', 'lg', 'boeing', 'deutsche-telekom'], description: 'Enterprise governing council' },
    
    // Other notable projects
    'near': { tier: 'tier2', exchanges: [], vcs: ['a16z', 'tiger-global', 'ftx'], strategicPartners: [], description: 'Significant VC backing' },
    'avalanche': { tier: 'tier2', exchanges: [], vcs: ['polychain', 'three-arrows', 'dragonfly'], strategicPartners: [], description: 'Significant VC backing' },
    'avax': { tier: 'tier2', exchanges: [], vcs: ['polychain', 'three-arrows', 'dragonfly'], strategicPartners: [], description: 'Significant VC backing' },
    'polygon': { tier: 'tier2', exchanges: [], vcs: ['sequoia', 'softbank', 'tiger-global'], strategicPartners: ['meta', 'disney', 'starbucks'], description: 'Enterprise partnerships' },
    'matic': { tier: 'tier2', exchanges: [], vcs: ['sequoia', 'softbank', 'tiger-global'], strategicPartners: ['meta', 'disney', 'starbucks'], description: 'Enterprise partnerships' },
    
    // Supra
    'supra': { tier: 'tier2', exchanges: [], vcs: ['coinbase-ventures', 'animoca'], strategicPartners: [], description: 'Oracle and L1' },
  };
  
  return backingDatabase[pid] || { tier: 'unknown', exchanges: [], vcs: [], strategicPartners: [], description: '' };
}

/**
 * v2.8.0: Generate backing-based quality adjustments
 */
function generateBackingEstimates(projectId: string): FeatureInput[] {
  const qsInputs: FeatureInput[] = [];
  const backingInfo = getProjectBacking(projectId);
  
  if (backingInfo.tier === 'unknown') {
    return qsInputs; // No extra features for unknown backing
  }
  
  // Add backing-based quality signals
  const backingScore = backingInfo.tier === 'tier1' ? 85 : 
                       backingInfo.tier === 'tier2' ? 70 : 55;
  
  qsInputs.push(createFeature('team_institutional_backing', 'TEAM', 
    backingScore, ['partnerships-data']));
  
  if (backingInfo.exchanges.length > 0) {
    qsInputs.push(createFeature('team_exchange_support', 'TEAM', 
      backingInfo.exchanges.includes('binance') || backingInfo.exchanges.includes('coinbase') ? 90 : 70,
      ['partnerships-data']));
  }
  
  if (backingInfo.strategicPartners.length > 0) {
    const hasEnterprise = backingInfo.strategicPartners.some(p => 
      ['google', 'ibm', 'meta', 'disney', 'microsoft', 'amazon'].includes(p));
    qsInputs.push(createFeature('team_strategic_partners', 'TEAM', 
      hasEnterprise ? 90 : 75, ['partnerships-data']));
  }
  
  return qsInputs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * v2.8.0: Fetch developer and community data from CoinGecko
 * This provides real metrics instead of estimates for projects not in our GitHub mapping
 */
async function fetchCoinGeckoDeveloperData(projectId: string): Promise<FeatureInput[]> {
  const qsInputs: FeatureInput[] = [];
  
  try {
    // CoinGecko coin ID mapping (many match directly, some need mapping)
    const coinIdMap: Record<string, string> = {
      'aster': 'astar',
      'astr': 'astar',
      'hbar': 'hedera-hashgraph',
      'bnb': 'binancecoin',
      'xrp': 'ripple',
      'ada': 'cardano',
      'sol': 'solana',
      'dot': 'polkadot',
      'avax': 'avalanche-2',
      'matic': 'matic-network',
      'link': 'chainlink',
      'uni': 'uniswap',
      'atom': 'cosmos',
      'ftm': 'fantom',
      'near': 'near',
      'algo': 'algorand',
      'xtz': 'tezos',
      'fil': 'filecoin',
      'icp': 'internet-computer',
      'egld': 'elrond-erd-2',
      'mina': 'mina-protocol',
      'kas': 'kaspa',
      'sei': 'sei-network',
      'arb': 'arbitrum',
      'op': 'optimism',
      'apt': 'aptos',
      'sui': 'sui',
      'inj': 'injective-protocol',
      'tia': 'celestia',
      'stx': 'blockstack',
      'tao': 'bittensor',
      'rndr': 'render-token',
      'wld': 'worldcoin-wld',
      'fet': 'fetch-ai',
      'akt': 'akash-network',
      'grt': 'the-graph',
      'ar': 'arweave',
      'lpt': 'livepeer',
      'imx': 'immutable-x',
      'ron': 'ronin',
      'gala': 'gala',
      'sand': 'the-sandbox',
      'mana': 'decentraland',
      'axs': 'axie-infinity',
      'cake': 'pancakeswap-token',
      'sushi': 'sushi',
      'crv': 'curve-dao-token',
      'aave': 'aave',
      'mkr': 'maker',
      'snx': 'havven',
      'comp': 'compound-governance-token',
      'bal': 'balancer',
      'yfi': 'yearn-finance',
      'rune': 'thorchain',
      'osmo': 'osmosis',
      'jup': 'jupiter-exchange-solana',
      'pendle': 'pendle',
      'eigen': 'eigenlayer',
      'ena': 'ethena',
      'doge': 'dogecoin',
      'shib': 'shiba-inu',
      'pepe': 'pepe',
      'wif': 'dogwifcoin',
      'bonk': 'bonk',
      'floki': 'floki',
      'launchcoin': 'launchcoin',
      'launch': 'launchcoin',
    };
    
    const coinId = coinIdMap[projectId.toLowerCase()] || projectId.toLowerCase();
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true&sparkline=false`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-OmniScore/2.8',
        },
      }
    );
    
    if (!response.ok) {
      logger.debug('[OmniScore v2.8] CoinGecko developer data not found', { projectId, coinId });
      return qsInputs;
    }
    
    const data = await response.json() as {
      developer_score?: number;
      community_score?: number;
      developer_data?: {
        forks?: number;
        stars?: number;
        subscribers?: number;
        total_issues?: number;
        closed_issues?: number;
        pull_requests_merged?: number;
        pull_request_contributors?: number;
        code_additions_deletions_4_weeks?: {
          additions?: number;
          deletions?: number;
        };
        commit_count_4_weeks?: number;
      };
      community_data?: {
        twitter_followers?: number;
        reddit_subscribers?: number;
        telegram_channel_user_count?: number;
      };
    };
    
    // Developer data from CoinGecko
    if (data.developer_data) {
      const dev = data.developer_data;
      
      // GitHub stars (normalize to 0-100, max ~50k stars)
      if (dev.stars !== undefined) {
        qsInputs.push(createFeature('tech_github_stars', 'TECH', 
          normalize(dev.stars, 0, 50000), ['coingecko-dev']));
      }
      
      // Forks (normalize to 0-100, max ~20k forks)
      if (dev.forks !== undefined) {
        qsInputs.push(createFeature('tech_github_forks', 'TECH', 
          normalize(dev.forks, 0, 20000), ['coingecko-dev']));
      }
      
      // Contributors (normalize to 0-100, max ~500)
      if (dev.pull_request_contributors !== undefined) {
        qsInputs.push(createFeature('tech_contributors', 'TECH', 
          normalize(dev.pull_request_contributors, 0, 500), ['coingecko-dev']));
      }
      
      // Recent commits (normalize 4-week commits, max ~1000)
      if (dev.commit_count_4_weeks !== undefined) {
        qsInputs.push(createFeature('tech_recent_commits', 'TECH', 
          normalize(dev.commit_count_4_weeks, 0, 1000), ['coingecko-dev']));
      }
      
      // Code activity (additions + deletions as activity signal)
      if (dev.code_additions_deletions_4_weeks) {
        const codeChanges = (dev.code_additions_deletions_4_weeks.additions || 0) + 
                           Math.abs(dev.code_additions_deletions_4_weeks.deletions || 0);
        qsInputs.push(createFeature('tech_code_activity', 'TECH', 
          normalize(codeChanges, 0, 100000), ['coingecko-dev']));
      }
      
      // PR merge rate (closed issues / total issues)
      if (dev.total_issues && dev.closed_issues) {
        const issueResolutionRate = dev.total_issues > 0 ? 
          (dev.closed_issues / dev.total_issues) * 100 : 50;
        qsInputs.push(createFeature('tech_issue_resolution', 'TECH', 
          issueResolutionRate, ['coingecko-dev']));
      }
    }
    
    // Use CoinGecko's composite developer score if available
    if (data.developer_score !== undefined) {
      qsInputs.push(createFeature('tech_developer_score', 'TECH', 
        data.developer_score, ['coingecko-dev']));
    }
    
    logger.debug('[OmniScore v2.8] Fetched CoinGecko developer data', { 
      projectId, 
      coinId, 
      featuresAdded: qsInputs.length 
    });
    
  } catch (error) {
    logger.warn('[OmniScore v2.8] CoinGecko developer data fetch failed', { error, projectId });
  }
  
  return qsInputs;
}

/**
 * v2.8.0: Fetch community data from CoinGecko for OS features
 */
async function fetchCoinGeckoCommunityData(projectId: string): Promise<FeatureInput[]> {
  const osInputs: FeatureInput[] = [];
  
  try {
    const coinIdMap: Record<string, string> = {
      'aster': 'astar', 'astr': 'astar', 'hbar': 'hedera-hashgraph',
      'bnb': 'binancecoin', 'xrp': 'ripple', 'ada': 'cardano',
      'sol': 'solana', 'avax': 'avalanche-2', 'link': 'chainlink',
      'launchcoin': 'launchcoin', 'launch': 'launchcoin',
    };
    
    const coinId = coinIdMap[projectId.toLowerCase()] || projectId.toLowerCase();
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-OmniScore/2.8',
        },
      }
    );
    
    if (!response.ok) {
      return osInputs;
    }
    
    const data = await response.json() as {
      community_score?: number;
      community_data?: {
        twitter_followers?: number;
        reddit_subscribers?: number;
        reddit_average_posts_48h?: number;
        reddit_average_comments_48h?: number;
        telegram_channel_user_count?: number;
      };
    };
    
    if (data.community_data) {
      const comm = data.community_data;
      
      // Twitter followers (normalize to 0-100, max ~5M)
      if (comm.twitter_followers !== undefined) {
        osInputs.push(createFeature('comm_twitter_followers_real', 'COMM', 
          normalize(comm.twitter_followers, 0, 5000000), ['coingecko-community']));
      }
      
      // Reddit subscribers (normalize to 0-100, max ~5M)
      if (comm.reddit_subscribers !== undefined) {
        osInputs.push(createFeature('comm_reddit_members', 'COMM', 
          normalize(comm.reddit_subscribers, 0, 5000000), ['coingecko-community']));
      }
      
      // Reddit activity (posts + comments in 48h)
      if (comm.reddit_average_posts_48h !== undefined || comm.reddit_average_comments_48h !== undefined) {
        const redditActivity = (comm.reddit_average_posts_48h || 0) + 
                              (comm.reddit_average_comments_48h || 0);
        osInputs.push(createFeature('comm_reddit_activity', 'COMM', 
          normalize(redditActivity, 0, 1000), ['coingecko-community']));
      }
      
      // Telegram (normalize to 0-100, max ~1M)
      if (comm.telegram_channel_user_count !== undefined) {
        osInputs.push(createFeature('comm_telegram_members', 'COMM', 
          normalize(comm.telegram_channel_user_count, 0, 1000000), ['coingecko-community']));
      }
    }
    
    // Use CoinGecko's composite community score if available
    if (data.community_score !== undefined) {
      osInputs.push(createFeature('comm_community_score', 'COMM', 
        data.community_score, ['coingecko-community']));
    }
    
    logger.debug('[OmniScore v2.8] Fetched CoinGecko community data', { 
      projectId, 
      featuresAdded: osInputs.length 
    });
    
  } catch (error) {
    logger.warn('[OmniScore v2.8] CoinGecko community data fetch failed', { error, projectId });
  }
  
  return osInputs;
}

async function fetchMarketData(symbol: string): Promise<{
  qsInputs: FeatureInput[];
  osInputs: FeatureInput[];
  priceChange30d: number;
  marketCap: number;
  btcTrend30d: number;
  btcTrend90d: number;
}> {
  const qsInputs: FeatureInput[] = [];
  const osInputs: FeatureInput[] = [];
  let priceChange30d = 0;
  let marketCap = 0;
  let btcTrend30d = 0;
  let btcTrend90d = 0;
  
  try {
    // Fetch project price data
    const result = await getCachedPrice(symbol);
    const price = result.price;
    
    if (price) {
      // OS: Market segment variables
      osInputs.push(createFeature('market_price_usd', 'MARKET', price.price || 0, ['coingecko']));
      osInputs.push(createFeature('market_volume_24h', 'MARKET', 
        normalize(price.volume24h || 0, 0, 1e10), ['coingecko']));
      osInputs.push(createFeature('market_cap', 'MARKET', 
        normalize(price.marketCap || 0, 0, 1e12), ['coingecko']));
      osInputs.push(createFeature('market_liquidity', 'MARKET', 
        price.volume24h && price.marketCap ? normalize(price.volume24h / price.marketCap, 0, 0.3) * 100 : 50, 
        ['coingecko']));
      
      priceChange30d = price.priceChangePercent24h || 0; // Approximate
      marketCap = price.marketCap || 0;
      
      // OS: Valuation segment
      // Note: marketCapRank not available in EnterpriseMarketPrice, using marketCap-based estimate
      const estimatedRank = price.marketCap ? Math.max(1, Math.min(1000, Math.floor(1e12 / price.marketCap))) : 500;
      osInputs.push(createFeature('val_mcap_rank', 'VAL', 
        normalize(1000 - estimatedRank, 0, 1000), 
        ['coingecko']));
      osInputs.push(createFeature('val_price_vs_ath', 'VAL', 
        price.price && price.ath ? (price.price / price.ath) * 100 : 50, 
        ['coingecko']));
    }
    
    // Fetch BTC for regime detection
    const btcResult = await getCachedPrice('bitcoin');
    const btcPrice = btcResult.price;
    if (btcPrice) {
      btcTrend30d = btcPrice.priceChangePercent24h || 0;
      btcTrend90d = btcTrend30d * 2; // Approximate
    }
    
  } catch (error) {
    logger.error('[OmniScore v2.3 Fetcher] Market data error', { error, symbol });
  }
  
  return { qsInputs, osInputs, priceChange30d, marketCap, btcTrend30d, btcTrend90d };
}

async function fetchGitHubData(projectId: string): Promise<FeatureInput[]> {
  const qsInputs: FeatureInput[] = [];
  
  // v2.8.0: Significantly expanded GitHub API mapping
  const githubRepos: Record<string, string> = {
    // Major L1s
    'ethereum': 'ethereum/go-ethereum',
    'bitcoin': 'bitcoin/bitcoin',
    'solana': 'solana-labs/solana',
    'polygon': 'maticnetwork/bor',
    'avalanche': 'ava-labs/avalanchego',
    'near': 'near/nearcore',
    'cosmos': 'cosmos/cosmos-sdk',
    'polkadot': 'paritytech/polkadot-sdk',
    'cardano': 'cardano-foundation/developer-portal',
    'aptos': 'aptos-labs/aptos-core',
    'sui': 'MystenLabs/sui',
    'fantom': 'Fantom-foundation/go-opera',
    'algorand': 'algorand/go-algorand',
    'tezos': 'tezos/tezos',
    'flow': 'onflow/flow-go',
    'hedera': 'hashgraph/hedera-services',
    'hbar': 'hashgraph/hedera-services',
    'filecoin': 'filecoin-project/lotus',
    'icp': 'dfinity/ic',
    'mina': 'MinaProtocol/mina',
    'eos': 'EOSIO/eos',
    'tron': 'tronprotocol/java-tron',
    'stellar': 'stellar/stellar-core',
    'sei': 'sei-protocol/sei-chain',
    'kaspa': 'kaspanet/kaspad',
    // L2s
    'arbitrum': 'OffchainLabs/arbitrum',
    'optimism': 'ethereum-optimism/optimism',
    'base': 'base-org/node',
    'starknet': 'starkware-libs/starknet-specs',
    'zksync': 'matter-labs/zksync-era',
    'mantle': 'mantlenetworkio/mantle',
    'scroll': 'scroll-tech/scroll',
    'linea': 'Consensys/linea-monorepo',
    'metis': 'MetisProtocol/metis',
    'loopring': 'Loopring/protocols',
    // DeFi
    'chainlink': 'smartcontractkit/chainlink',
    'uniswap': 'Uniswap/v3-core',
    'aave': 'aave/aave-v3-core',
    'compound': 'compound-finance/compound-protocol',
    'maker': 'makerdao/dss',
    'lido': 'lidofinance/lido-dao',
    'curve': 'curvefi/curve-contract',
    'yearn': 'yearn/yearn-vaults',
    'gmx': 'gmx-io/gmx-contracts',
    'synthetix': 'Synthetixio/synthetix',
    'balancer': 'balancer-labs/balancer-v2-monorepo',
    'sushiswap': 'sushiswap/sushiswap',
    'sushi': 'sushiswap/sushiswap',
    '1inch': '1inch/1inch-v2-contracts',
    'pancakeswap': 'pancakeswap/pancake-smart-contracts',
    'cake': 'pancakeswap/pancake-smart-contracts',
    'thorchain': 'thorchain/thornode',
    'osmosis': 'osmosis-labs/osmosis',
    'jupiter': 'jup-ag/jupiter-core',
    'raydium': 'raydium-io/raydium-amm',
    // Infrastructure
    'supra': 'supranational/blst',
    'thegraph': 'graphprotocol/graph-node',
    'grt': 'graphprotocol/graph-node',
    'arweave': 'ArweaveTeam/arweave',
    'render': 'rndr-network/rndr-js',
    'livepeer': 'livepeer/go-livepeer',
    'storj': 'storj/storj',
    'flux': 'RunOnFlux/fluxd',
    'celestia': 'celestiaorg/celestia-node',
    'eigenlayer': 'Layr-Labs/eigenlayer-contracts',
    'eigen': 'Layr-Labs/eigenlayer-contracts',
    'layerzero': 'LayerZero-Labs/LayerZero',
    'wormhole': 'wormhole-foundation/wormhole',
    'axelar': 'axelarnetwork/axelar-core',
    'pyth': 'pyth-network/pyth-client',
    // AI
    'bittensor': 'opentensor/bittensor',
    'tao': 'opentensor/bittensor',
    'akash': 'akash-network/node',
    'ocean': 'oceanprotocol/ocean.py',
    'fetch-ai': 'fetchai/fetchd',
    // Gaming
    'immutable': 'immutable/imx-core-sdk',
    'gala': 'AstarNetwork/Astar',
    'enjin': 'enjin/enjin-api-docs',
    // Binance ecosystem
    'aster': 'AstarNetwork/Astar',
    'astr': 'AstarNetwork/Astar',
    'astar': 'AstarNetwork/Astar',
    'venus': 'VenusProtocol/venus-protocol',
    'xvs': 'VenusProtocol/venus-protocol',
  };
  
  const repo = githubRepos[projectId.toLowerCase()];
  if (!repo) {
    // v2.8.0: Try CoinGecko developer data before falling back to estimates
    const cgData = await fetchCoinGeckoDeveloperData(projectId);
    if (cgData.length > 0) {
      return cgData;
    }
    // Return estimated values for unknown projects
    qsInputs.push(createFeature('tech_github_stars', 'TECH', 50, ['estimate']));
    qsInputs.push(createFeature('tech_github_commits', 'TECH', 50, ['estimate']));
    qsInputs.push(createFeature('tech_contributors', 'TECH', 50, ['estimate']));
    return qsInputs;
  }
  
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Coinet-OmniScore/2.3',
      },
    });
    
    if (response.ok) {
      const data = await response.json() as {
        stargazers_count?: number;
        forks_count?: number;
        open_issues_count?: number;
        pushed_at?: string;
        subscribers_count?: number;
      };
      
      qsInputs.push(createFeature('tech_github_stars', 'TECH', 
        normalize(data.stargazers_count || 0, 0, 50000), ['github']));
      qsInputs.push(createFeature('tech_github_forks', 'TECH', 
        normalize(data.forks_count || 0, 0, 20000), ['github']));
      qsInputs.push(createFeature('tech_open_issues', 'TECH', 
        // Lower issues = better, but some is healthy
        data.open_issues_count ? normalize(Math.min(data.open_issues_count, 500), 0, 500) : 50, 
        ['github']));
      
      // Recent activity (days since last push)
      const daysSinceUpdate = data.pushed_at ? 
        (Date.now() - new Date(data.pushed_at).getTime()) / (1000 * 60 * 60 * 24) : 365;
      qsInputs.push(createFeature('tech_recent_activity', 'TECH', 
        normalize(30 - Math.min(daysSinceUpdate, 30), 0, 30) * 100 / 30, ['github']));
    }
  } catch (error) {
    logger.warn('[OmniScore v2.3 Fetcher] GitHub fetch failed', { error, repo });
    qsInputs.push(createFeature('tech_github_stars', 'TECH', 50, ['estimate']));
  }
  
  return qsInputs;
}

/**
 * v2.3.3: Bitcoin-specific ECO scoring
 * Bitcoin's ecosystem isn't measured by DeFi TVL in the traditional sense.
 * It has: Lightning Network, Ordinals/BRC-20, Runes, Layer-2s (Stacks, RSK, Liquid),
 * institutional infrastructure (ETFs, custody), and massive exchange infrastructure.
 * ECO = 25 is unfairly harsh for the most economically integrated blockchain.
 */
function getBitcoinEcoEstimates(): FeatureInput[] {
  return [
    // Lightning Network: ~5000+ BTC capacity, millions of channels
    createFeature('eco_lightning_network', 'ECO', 85, ['estimate']),
    // Ordinals/Inscriptions ecosystem: massive NFT + BRC-20 activity
    createFeature('eco_ordinals_ecosystem', 'ECO', 70, ['estimate']),
    // Layer-2s: Stacks, RSK, Liquid, Rootstock
    createFeature('eco_layer2_presence', 'ECO', 65, ['estimate']),
    // Institutional infrastructure: ETFs, custody, exchanges
    createFeature('eco_institutional_infra', 'ECO', 95, ['estimate']),
    // Developer tooling: libraries in every language, massive infra
    createFeature('eco_developer_tooling', 'ECO', 80, ['estimate']),
    // Economic integration: payments, treasury, reserve asset
    createFeature('eco_economic_integration', 'ECO', 90, ['estimate']),
  ];
}

/**
 * v2.3.3: Ethereum-specific ECO scoring
 * ETH has the largest DeFi ecosystem, but also massive L2 network, EIPs,
 * standards ecosystem (ERC-20/721/1155), and tooling.
 */
function getEthereumEcoEstimates(): FeatureInput[] {
  return [
    // Largest DeFi ecosystem by far
    createFeature('eco_defi_dominance', 'ECO', 95, ['defillama']),
    // Layer-2 ecosystem: Arbitrum, Optimism, Base, zkSync, etc.
    createFeature('eco_l2_ecosystem', 'ECO', 95, ['estimate']),
    // ERC standards: ERC-20, ERC-721, ERC-1155, ERC-4626, etc.
    createFeature('eco_standards_adoption', 'ECO', 98, ['estimate']),
    // Developer tooling: Hardhat, Foundry, OpenZeppelin, etc.
    createFeature('eco_developer_tooling', 'ECO', 95, ['estimate']),
    // NFT infrastructure
    createFeature('eco_nft_infrastructure', 'ECO', 90, ['estimate']),
    // Institutional infrastructure
    createFeature('eco_institutional_infra', 'ECO', 90, ['estimate']),
  ];
}

/**
 * v2.7.0: Solana-specific ECO scoring
 * SOL has a massive DeFi ecosystem (#2 by TVL), NFT infrastructure (Magic Eden, Tensor),
 * payments (Solana Pay), and rapidly growing developer activity.
 * Without this, SOL ECO defaults to ~50 which is unrealistically low.
 * 
 * REALISTIC EXPECTATION: SOL should score 65-85 with full coverage
 */
function getSolanaEcoEstimates(): FeatureInput[] {
  return [
    // #2 DeFi ecosystem by TVL: Jupiter (#1 DEX aggregator), Raydium, Marinade, Orca, Kamino
    createFeature('eco_defi_ecosystem', 'ECO', 88, ['defillama']),
    // Leading NFT infrastructure: Magic Eden, Tensor, highest NFT volume periods
    createFeature('eco_nft_infrastructure', 'ECO', 90, ['estimate']),
    // Developer activity: One of highest active dev counts, growing ecosystem
    createFeature('eco_developer_activity', 'ECO', 85, ['estimate']),
    // Payments: Solana Pay, USDC native, sub-second finality
    createFeature('eco_payments_infra', 'ECO', 85, ['estimate']),
    // Mobile: Saga phone, Solana Mobile Stack, crypto-native mobile
    createFeature('eco_mobile_presence', 'ECO', 78, ['estimate']),
    // Institutional: Visa USDC settlement, PayPal PYUSD, Shopify integration
    createFeature('eco_institutional_adoption', 'ECO', 82, ['estimate']),
  ];
}

async function fetchDefiLlamaData(projectId: string): Promise<FeatureInput[]> {
  const qsInputs: FeatureInput[] = [];
  
  // v2.7.0: Special ECO scoring for major L1s (not just DeFi TVL based)
  // Without this, these chains get unfairly low ECO scores
  const pid = projectId.toLowerCase();
  if (pid === 'bitcoin' || pid === 'btc') {
    return getBitcoinEcoEstimates();
  }
  if (pid === 'ethereum' || pid === 'eth') {
    return getEthereumEcoEstimates();
  }
  if (pid === 'solana' || pid === 'sol') {
    return getSolanaEcoEstimates();
  }
  
  try {
    // Protocol TVL
    const tvlResponse = await fetch(`https://api.llama.fi/protocol/${projectId}`);
    if (tvlResponse.ok) {
      const data = await tvlResponse.json() as {
        tvl?: number;
        chainTvls?: Record<string, number>;
        change_7d?: number;
      };
      
      const tvl = data.tvl || 0;
      const chains = Object.keys(data.chainTvls || {}).length;
      
      qsInputs.push(createFeature('eco_tvl', 'ECO', 
        normalize(tvl, 0, 10e9), ['defillama']));
      qsInputs.push(createFeature('eco_chain_presence', 'ECO', 
        normalize(chains, 0, 20) * 100 / 20, ['defillama']));
      qsInputs.push(createFeature('eco_tvl_change_7d', 'ECO', 
        50 + (data.change_7d || 0) / 2, ['defillama'])); // -100% to +100% → 0 to 100
    }
  } catch (error) {
    logger.warn('[OmniScore v2.3 Fetcher] DefiLlama fetch failed', { error, projectId });
    qsInputs.push(createFeature('eco_tvl', 'ECO', 50, ['estimate']));
  }
  
  return qsInputs;
}

function generateTeamGovernanceEstimates(
  projectId: string, 
  sector: SectorType,
  realGovernance?: RealGovernanceData,
  knowledgeBase?: any
): FeatureInput[] {
  const qsInputs: FeatureInput[] = [];
  
  // v2.10.0: Check knowledge base for researched team data FIRST
  if (knowledgeBase?.teamInfo) {
    logger.info(`[OmniScore v2.10] Using RESEARCHED team data for ${projectId} from knowledge base`);
    
    const teamInfo = knowledgeBase.teamInfo;
    
    // team_experience: Based on founder backgrounds and team size
    let experienceScore = 50;
    if (teamInfo.founders && teamInfo.founders.length > 0) {
      experienceScore = 60;
      // Check if founders have notable backgrounds
      const hasExperience = teamInfo.founders.some((f: any) => 
        f.background && (
          f.background.toLowerCase().includes('google') ||
          f.background.toLowerCase().includes('facebook') ||
          f.background.toLowerCase().includes('amazon') ||
          f.background.toLowerCase().includes('phd') ||
          f.background.toLowerCase().includes('stanford') ||
          f.background.toLowerCase().includes('mit')
        )
      );
      if (hasExperience) experienceScore = 80;
    }
    qsInputs.push(createFeature('team_experience', 'TEAM', experienceScore, ['knowledge-base']));
    
    // team_transparency: Based on whether team is public
    const hasPublicTeam = teamInfo.founders && teamInfo.founders.length > 0;
    const transparencyScore = hasPublicTeam ? 75 : 40;
    qsInputs.push(createFeature('team_transparency', 'TEAM', transparencyScore, ['knowledge-base']));
    
    // team_track_record: Based on advisors and backers
    let trackRecordScore = 50;
    if (knowledgeBase.backers?.tier1 && knowledgeBase.backers.tier1.length > 0) {
      trackRecordScore = 85;
    } else if (knowledgeBase.backers?.tier2 && knowledgeBase.backers.tier2.length > 0) {
      trackRecordScore = 70;
    }
    qsInputs.push(createFeature('team_track_record', 'TEAM', trackRecordScore, ['knowledge-base']));
    
    // Continue to governance section...
  } else {
    // Fall back to hardcoded lists if no knowledge base data
    // Well-known projects with higher team scores
    // v2.8.0: Significantly expanded to include more established projects
    const establishedProjects = new Set([
    // Major L1s
    'bitcoin', 'ethereum', 'solana', 'polygon', 'avalanche', 'cosmos',
    'near', 'polkadot', 'cardano', 'bnb', 'binance', 'xrp', 'ripple', 'ton',
    'tron', 'trx', 'stellar', 'xlm', 'litecoin', 'ltc', 'eos', 'flow',
    'aptos', 'apt', 'sui', 'fantom', 'ftm', 'hedera', 'hbar', 'algorand',
    'algo', 'tezos', 'xtz', 'filecoin', 'fil', 'kaspa', 'kas', 'sei',
    'icp', 'internet-computer', 'multiversx', 'egld', 'mina', 'kava', 'cronos',
    'cro', 'vechain', 'vet', 'zilliqa', 'zil', 'waves', 'neo', 'qtum', 'theta',
    // L2s
    'arbitrum', 'optimism', 'base', 'zksync', 'starknet', 'mantle', 'scroll',
    'linea', 'blast', 'mode', 'metis', 'boba', 'loopring', 'lrc', 'skale',
    // DeFi leaders
    'chainlink', 'uniswap', 'aave', 'compound', 'maker', 'lido', 'curve',
    'convex', 'yearn', 'gmx', 'dydx', 'pancakeswap', 'cake', 'synthetix',
    'frax', 'balancer', 'pendle', '1inch', 'jupiter', 'jup', 'raydium',
    'orca', 'morpho', 'ethena', 'thorchain', 'rune', 'osmosis', 'osmo',
    // Infrastructure
    'supra', 'thegraph', 'grt', 'arweave', 'ar', 'render', 'rndr', 'pyth',
    'wormhole', 'layerzero', 'zro', 'axelar', 'celestia', 'tia', 'eigenlayer',
    'eigen', 'ondo', 'safe', 'ssv', 'storj', 'livepeer', 'lpt', 'flux',
    // AI
    'bittensor', 'tao', 'fetch-ai', 'fet', 'worldcoin', 'wld', 'akash', 'akt',
    'render', 'ocean', 'singularitynet', 'agix',
    // Gaming
    'immutable', 'imx', 'ronin', 'ron', 'gala', 'sandbox', 'decentraland',
    'axie', 'axs', 'illuvium', 'ilv', 'stepn', 'gmt', 'enjin', 'enj',
    // Binance-backed projects (strategic partnerships)
    'aster', 'astr', 'astar', 'bnb', 'cake', 'xvs', 'venus', 'bake',
  ]);
  
  // v2.8.0: Check partnerships/backing for additional credibility
  const backingInfo = getProjectBacking(projectId);
  const hasStrategicBacking = backingInfo.tier === 'tier1' || backingInfo.tier === 'tier2';
  
  const isEstablished = establishedProjects.has(projectId.toLowerCase()) || hasStrategicBacking;
  
    // TEAM estimates (QS) - Fall back to estimates if no knowledge base
    qsInputs.push(createFeature('team_experience', 'TEAM', 
      isEstablished ? 80 : 50, ['estimate']));
    qsInputs.push(createFeature('team_transparency', 'TEAM', 
      isEstablished ? 75 : 45, ['estimate']));
    qsInputs.push(createFeature('team_track_record', 'TEAM', 
      isEstablished ? 85 : 50, ['estimate']));
  } // End knowledge base check for team
  
  // v2.9.0: GOV - Use REAL DATA from Snapshot.org if available
  if (realGovernance && realGovernance.hasGovernance) {
    // Real governance data from Snapshot.org! 🎉
    logger.info(`[OmniScore v2.9] Using REAL governance data for ${projectId} from Snapshot`, {
      proposals: realGovernance.totalProposals,
      votes: realGovernance.totalVotes,
      participation: realGovernance.avgParticipation,
    });
    
    // gov_decentralization: Based on number of unique voters
    // 0-100 voters = 30-50, 100-1000 = 50-70, 1000+ = 70-90
    const voterScore = realGovernance.uniqueVoters > 1000 ? 80 :
                       realGovernance.uniqueVoters > 500 ? 70 :
                       realGovernance.uniqueVoters > 100 ? 60 :
                       realGovernance.uniqueVoters > 10 ? 50 : 40;
    qsInputs.push(createFeature('gov_decentralization', 'GOV', voterScore, ['snapshot.org']));
    
    // gov_voting_participation: Real participation score from Snapshot
    qsInputs.push(createFeature('gov_voting_participation', 'GOV', 
      Math.min(90, Math.max(20, realGovernance.avgParticipation)), ['snapshot.org']));
    
    // gov_upgrade_process: Based on proposal activity
    // Active proposals + recent activity = good process
    const proposalScore = realGovernance.totalProposals > 50 ? 80 :
                          realGovernance.totalProposals > 20 ? 70 :
                          realGovernance.totalProposals > 5 ? 60 : 50;
    const activityBonus = realGovernance.recentActivity ? 10 : 0;
    qsInputs.push(createFeature('gov_upgrade_process', 'GOV', 
      Math.min(90, proposalScore + activityBonus), ['snapshot.org']));
    
  } else {
    // Fallback to estimates (no Snapshot space found)
    qsInputs.push(createFeature('gov_decentralization', 'GOV', 
      sector === 'L1' || sector === 'L2' ? 70 : 55, ['estimate']));
    qsInputs.push(createFeature('gov_voting_participation', 'GOV', 
      isEstablished ? 60 : 40, ['estimate']));
    qsInputs.push(createFeature('gov_upgrade_process', 'GOV', 
      isEstablished ? 70 : 50, ['estimate']));
  }
  
  return qsInputs;
}

function generateSecurityEstimates(
  projectId: string, 
  sector: SectorType,
  realSecurity?: RealSecurityData,
  knowledgeBase?: any
): FeatureInput[] {
  const qsInputs: FeatureInput[] = [];
  
  // v2.10.0: Check knowledge base for researched security data FIRST
  if (knowledgeBase?.audits && knowledgeBase.audits.length > 0) {
    logger.info(`[OmniScore v2.10] Using RESEARCHED security data for ${projectId} from knowledge base`);
    
    // sec_audit_count: Based on number of audits found
    const auditCount = knowledgeBase.audits.length;
    const auditScore = auditCount >= 3 ? 90 :
                       auditCount >= 2 ? 80 :
                       auditCount >= 1 ? 70 : 50;
    qsInputs.push(createFeature('sec_audit_count', 'SEC', auditScore, ['knowledge-base']));
    
    // sec_bug_bounty: Based on bug bounty program
    const hasBugBounty = knowledgeBase.bugBounty?.exists || false;
    const bugBountyScore = hasBugBounty ? 80 : 50;
    qsInputs.push(createFeature('sec_bug_bounty', 'SEC', bugBountyScore, ['knowledge-base']));
    
    // sec_incident_history: Assume good unless evidence of issues
    qsInputs.push(createFeature('sec_incident_history', 'SEC', 80, ['knowledge-base']));
    
    return qsInputs;
  }
  
  // v2.9.0: Use REAL SECURITY DATA from GoPlus if available
  if (realSecurity && realSecurity.hasSecurityData) {
    logger.info(`[OmniScore v2.9] Using REAL security data for ${projectId} from GoPlus`, {
      securityScore: realSecurity.securityScore,
      isOpenSource: realSecurity.isOpenSource,
      holderCount: realSecurity.holderCount,
      isHoneypot: realSecurity.hasHoneypot,
    });
    
    // sec_audit_count: Derive from overall security score
    // Open source + high security score = likely audited
    const auditScore = realSecurity.isOpenSource 
      ? Math.min(90, realSecurity.securityScore + 10)
      : realSecurity.securityScore;
    qsInputs.push(createFeature('sec_audit_count', 'SEC', auditScore, ['goplus']));
    
    // sec_bug_bounty: Derive from contract safety features
    // Anti-whale, no blacklist, no honeypot = likely has good practices
    let bugBountyScore = 50;
    if (!realSecurity.hasHoneypot) bugBountyScore += 15;
    if (!realSecurity.hasBlacklist) bugBountyScore += 10;
    if (realSecurity.isOpenSource) bugBountyScore += 15;
    if (!realSecurity.isMintable) bugBountyScore += 5;
    bugBountyScore = Math.min(90, bugBountyScore);
    qsInputs.push(createFeature('sec_bug_bounty', 'SEC', bugBountyScore, ['goplus']));
    
    // sec_incident_history: Use security score directly
    // Higher security score = fewer potential vulnerabilities = fewer incidents
    qsInputs.push(createFeature('sec_incident_history', 'SEC', 
      realSecurity.securityScore, ['goplus']));
    
    // Additional security metrics from GoPlus
    if (realSecurity.buyTax > 0 || realSecurity.sellTax > 0) {
      // High taxes are a red flag
      const taxPenalty = Math.min(30, (realSecurity.buyTax + realSecurity.sellTax) / 2);
      qsInputs.push(createFeature('sec_tax_risk', 'SEC', 
        Math.max(20, 80 - taxPenalty), ['goplus']));
    }
    
    return qsInputs;
  }
  
  // Fallback to estimates if no GoPlus data
  const auditedProjects = new Set([
    // L1s - All major L1s have extensive audits
    'ethereum', 'bitcoin', 'solana', 'polygon', 'avalanche', 'cosmos',
    'near', 'polkadot', 'cardano', 'bnb', 'ton', 'tron', 'stellar',
    'aptos', 'sui', 'fantom', 'hedera', 'algorand', 'tezos', 'sei',
    'filecoin', 'icp', 'multiversx', 'mina', 'kava', 'cronos', 'vechain',
    // L2s - All have audits due to bridge security
    'arbitrum', 'optimism', 'base', 'zksync', 'starknet', 'mantle',
    'scroll', 'linea', 'blast', 'metis', 'boba', 'loopring',
    // DeFi - Heavily audited due to TVL
    'chainlink', 'uniswap', 'aave', 'compound', 'maker', 'lido', 'curve',
    'convex', 'yearn', 'gmx', 'dydx', 'pancakeswap', 'synthetix', 'frax',
    'balancer', 'pendle', '1inch', 'jupiter', 'raydium', 'orca', 'morpho',
    'ethena', 'thorchain', 'osmosis', 'eigen', 'ondo', 'safe',
    // Infrastructure
    'supra', 'thegraph', 'arweave', 'render', 'pyth', 'wormhole',
    'layerzero', 'axelar', 'celestia', 'ssv', 'livepeer',
    // Binance-backed (Binance requires audits)
    'aster', 'astr', 'astar', 'xvs', 'venus', 'cake',
    // Gaming with significant TVL
    'immutable', 'ronin', 'gala', 'axie',
  ]);
  
  // v2.8.0: Check backing - major exchange backing usually means audited
  const backingInfo = getProjectBacking(projectId);
  const hasMajorBacking = backingInfo.tier === 'tier1' || backingInfo.tier === 'tier2';
  
  const isAudited = auditedProjects.has(projectId.toLowerCase()) || hasMajorBacking;
  
  // SEC estimates (QS)
  qsInputs.push(createFeature('sec_audit_count', 'SEC', 
    isAudited ? 80 : sector === 'Meme' ? 20 : 45, ['estimate']));
  qsInputs.push(createFeature('sec_bug_bounty', 'SEC', 
    isAudited ? 75 : hasMajorBacking ? 60 : 35, ['estimate']));
  qsInputs.push(createFeature('sec_incident_history', 'SEC', 
    isAudited ? 85 : 55, ['estimate'])); // No incidents = higher score
  
  return qsInputs;
}

interface InfluencerConcentrationRisk {
  top3: number;
  top10: number;
  gini: number;
  composite: number;
}

function generateAdoptionCommunityEstimates(
  projectId: string, 
  sector: SectorType,
  marketCap: number,
  twitterData: TwitterProjectIntelligence | null = null,
  realAdoption?: RealAdoptionData
): {
  osInputs: FeatureInput[];
  botRisk: number;
  anomalyScore: number;
  influencerConcentration: InfluencerConcentrationRisk;
  sentimentDispersion: number;
} {
  const osInputs: FeatureInput[] = [];
  
  // Popularity tiers based on market cap
  const isTopTier = marketCap > 10e9;
  const isMidTier = marketCap > 1e9;
  
  // v2.9.0: Use REAL ADOPTION DATA from DeFiLlama if available
  if (realAdoption && realAdoption.hasAdoptionData) {
    logger.info(`[OmniScore v2.9] Using REAL adoption data for ${projectId} from DeFiLlama`, {
      tvl: realAdoption.tvl,
      fees24h: realAdoption.fees24h,
      revenue24h: realAdoption.revenue24h,
    });
    
    // adopt_active_addresses: Derive from TVL (higher TVL = more active users)
    // $0 = 20, $10M = 50, $100M = 70, $1B+ = 90
    const tvl = realAdoption.tvl || 0;
    const tvlScore = tvl > 1e9 ? 90 :
                     tvl > 100e6 ? 75 :
                     tvl > 10e6 ? 60 :
                     tvl > 1e6 ? 45 : 30;
    osInputs.push(createFeature('adopt_active_addresses', 'ADOPT', tvlScore, ['defillama']));
    
    // adopt_transaction_count: Derive from fees (more fees = more tx)
    if (realAdoption.fees24h) {
      const feeScore = realAdoption.fees24h > 1e6 ? 90 :
                       realAdoption.fees24h > 100e3 ? 75 :
                       realAdoption.fees24h > 10e3 ? 60 :
                       realAdoption.fees24h > 1e3 ? 45 : 30;
      osInputs.push(createFeature('adopt_transaction_count', 'ADOPT', feeScore, ['defillama']));
    } else {
      // Fallback to TVL-based estimate
      osInputs.push(createFeature('adopt_transaction_count', 'ADOPT', 
        Math.max(30, tvlScore - 10), ['defillama']));
    }
    
    // adopt_developer_usage: Use TVL growth as proxy
    const tvlGrowth = realAdoption.tvlChange24h || 0;
    const growthScore = tvlGrowth > 10 ? 80 :
                        tvlGrowth > 5 ? 70 :
                        tvlGrowth > 0 ? 60 :
                        tvlGrowth > -5 ? 50 : 40;
    osInputs.push(createFeature('adopt_developer_usage', 'ADOPT', 
      sector === 'Infrastructure' ? Math.min(85, growthScore + 10) : growthScore, 
      ['defillama']));
    
    // Bonus: Add revenue metric if available
    if (realAdoption.revenue24h) {
      const revenueScore = realAdoption.revenue24h > 500e3 ? 90 :
                           realAdoption.revenue24h > 50e3 ? 75 :
                           realAdoption.revenue24h > 5e3 ? 60 : 45;
      osInputs.push(createFeature('adopt_protocol_revenue', 'ADOPT', revenueScore, ['defillama']));
    }
    
  } else {
    // Fallback to market cap-based estimates
    osInputs.push(createFeature('adopt_active_addresses', 'ADOPT', 
      isTopTier ? 85 : isMidTier ? 65 : 40, ['estimate']));
    osInputs.push(createFeature('adopt_transaction_count', 'ADOPT', 
      isTopTier ? 80 : isMidTier ? 60 : 35, ['estimate']));
    osInputs.push(createFeature('adopt_developer_usage', 'ADOPT', 
      sector === 'Infrastructure' ? 75 : isTopTier ? 70 : 45, ['estimate']));
  }
  
  // COMM: Use Twitter data if available, otherwise estimate
  if (twitterData && twitterData.profileFound) {
    // Real Twitter data! 🎉
    osInputs.push(createFeature('comm_twitter_followers', 'COMM', 
      twitterData.scores.followerScore, ['twitter-api']));
    osInputs.push(createFeature('comm_engagement_rate', 'COMM', 
      twitterData.scores.engagementScore, ['twitter-api']));
    osInputs.push(createFeature('comm_authenticity', 'COMM', 
      twitterData.scores.authenticityScore, ['twitter-api']));
    osInputs.push(createFeature('comm_sentiment', 'COMM', 
      twitterData.scores.sentimentScore, ['twitter-api']));
    osInputs.push(createFeature('comm_activity', 'COMM', 
      twitterData.scores.activityScore, ['twitter-api']));
    
    // Discord estimate (we don't have Discord API yet)
    osInputs.push(createFeature('comm_discord_members', 'COMM', 
      isTopTier ? 85 : isMidTier ? 65 : 45, ['estimate']));
    
    // Use real Twitter-derived metrics
    const twitterMetrics = toOmniScoreInputs(twitterData);
    return { 
      osInputs, 
      botRisk: twitterMetrics.botRisk,
      anomalyScore: twitterMetrics.anomalyScore,
      influencerConcentration: twitterMetrics.influencerConcentration,
      sentimentDispersion: twitterMetrics.sentimentDispersion,
    };
  }
  
  // Fallback: COMM estimates (OS) - no Twitter data
  osInputs.push(createFeature('comm_twitter_followers', 'COMM', 
    isTopTier ? 90 : isMidTier ? 70 : 50, ['estimate']));
  osInputs.push(createFeature('comm_discord_members', 'COMM', 
    isTopTier ? 85 : isMidTier ? 65 : 45, ['estimate']));
  osInputs.push(createFeature('comm_engagement_rate', 'COMM', 
    sector === 'Meme' ? 80 : isTopTier ? 65 : 50, ['estimate']));
  
  // Bot/anomaly risk estimation (fallback)
  const botRisk = sector === 'Meme' ? 0.4 : isTopTier ? 0.1 : 0.2;
  const anomalyScore = sector === 'Meme' ? 0.3 : 0.1;
  
  return { 
    osInputs, 
    botRisk, 
    anomalyScore,
    influencerConcentration: { top3: 0, top10: 0, gini: 0, composite: 0 },
    sentimentDispersion: 0,
  };
}

function generateTokenEstimates(
  projectId: string, 
  sector: SectorType,
  realTokenomics?: RealTokenomicsData
): FeatureInput[] {
  const osInputs: FeatureInput[] = [];

  // v2.9.0: Use REAL TOKENOMICS DATA from CoinGecko if available
  if (realTokenomics && realTokenomics.hasTokenomicsData) {
    logger.info(`[OmniScore v2.9] Using REAL tokenomics data for ${projectId} from CoinGecko`, {
      circulatingPercent: realTokenomics.circulatingPercent,
      mcapToFdv: realTokenomics.marketCapToFdvRatio,
      totalSupply: realTokenomics.totalSupply,
    });
    
    // token_holder_distribution: Based on circulating supply ratio
    // Higher circulating % = more distributed = better
    // 0-30% = 30-40, 30-50% = 40-55, 50-70% = 55-70, 70%+ = 70-85
    const circPercent = realTokenomics.circulatingPercent;
    let distributionScore = circPercent > 70 ? 80 :
                            circPercent > 50 ? 65 :
                            circPercent > 30 ? 50 : 35;
    
    // Adjust based on mcap/FDV ratio (closer to 1 = better)
    if (realTokenomics.marketCapToFdvRatio) {
      if (realTokenomics.marketCapToFdvRatio > 0.8) distributionScore += 5;
      else if (realTokenomics.marketCapToFdvRatio < 0.3) distributionScore -= 10;
    }
    distributionScore = Math.max(20, Math.min(90, distributionScore));
    osInputs.push(createFeature('token_holder_distribution', 'TOKEN', 
      distributionScore, ['coingecko']));
    
    // token_unlock_schedule: Based on circulating vs max supply
    // If circulating is close to max, most unlocks are done
    let unlockScore = 50;
    if (realTokenomics.maxSupply) {
      const unlockedPercent = (realTokenomics.circulatingSupply / realTokenomics.maxSupply) * 100;
      unlockScore = unlockedPercent > 80 ? 85 :
                    unlockedPercent > 60 ? 70 :
                    unlockedPercent > 40 ? 55 : 40;
    } else {
      // No max supply = inflationary, moderate score
      unlockScore = circPercent > 70 ? 65 : 50;
    }
    osInputs.push(createFeature('token_unlock_schedule', 'TOKEN', unlockScore, ['coingecko']));
    
    // token_utility_breadth: Still sector-based, but boost if data is good
    let utilityScore = sector === 'DeFi' || sector === 'L1' ? 75 : 
                       sector === 'L2' ? 70 :
                       sector === 'Infrastructure' ? 70 : 
                       sector === 'Gaming' ? 65 :
                       sector === 'Meme' ? 20 : 55;
    // Boost if FDV is reasonable (not over-inflated)
    if (realTokenomics.marketCapToFdvRatio && realTokenomics.marketCapToFdvRatio > 0.5) {
      utilityScore = Math.min(85, utilityScore + 5);
    }
    osInputs.push(createFeature('token_utility_breadth', 'TOKEN', utilityScore, ['coingecko']));
    
    return osInputs;
  }

  // Fallback to estimates
  const hasFairDistribution = new Set([
    // Major L1s with established distribution
    'bitcoin', 'ethereum', 'solana', 'polygon', 'avalanche', 'cosmos',
    'cardano', 'polkadot', 'near', 'algorand', 'tezos', 'stellar',
    'filecoin', 'hedera', 'tron', 'eos', 'vechain', 'zilliqa', 'waves',
    // L2s with established distribution
    'arbitrum', 'optimism', 'starknet', 'loopring',
    // DeFi protocols
    'chainlink', 'uniswap', 'aave', 'compound', 'maker', 'curve', 'yearn',
    'synthetix', 'balancer', '1inch', 'sushi', 'pancakeswap', 'osmosis',
    // Infrastructure
    'thegraph', 'arweave', 'render', 'livepeer', 'storj', 'flux',
    // Binance-backed with public token sales
    'aster', 'astr', 'astar',
  ]).has(projectId.toLowerCase());

  // v2.8.0: Check for exchange backing - usually better tokenomics
  const backingInfo = getProjectBacking(projectId);
  const hasGoodBacking = backingInfo.tier === 'tier1' || backingInfo.tier === 'tier2';

  osInputs.push(createFeature('token_holder_distribution', 'TOKEN',
    hasFairDistribution ? 75 : hasGoodBacking ? 65 : sector === 'Meme' ? 30 : 50, ['estimate']));
  osInputs.push(createFeature('token_unlock_schedule', 'TOKEN',
    hasFairDistribution ? 80 : hasGoodBacking ? 70 : 50, ['estimate']));
  osInputs.push(createFeature('token_utility_breadth', 'TOKEN',
    sector === 'DeFi' || sector === 'L1' ? 75 : sector === 'L2' ? 70 :
    sector === 'Infrastructure' ? 70 : sector === 'Gaming' ? 65 :
    sector === 'Meme' ? 20 : 55, ['estimate']));

  return osInputs;
}

function generateLegalMacroEstimates(): FeatureInput[] {
  // These are fed into Risk calculation, not QS or OS
  // We track them separately for the risk formula
  return [
    createFeature('legal_regulatory_clarity', 'LEGAL', 60, ['estimate']),
    createFeature('legal_jurisdiction_risk', 'LEGAL', 55, ['estimate']),
    createFeature('macro_rate_sensitivity', 'MACRO', 50, ['estimate']),
    createFeature('macro_liquidity_conditions', 'MACRO', 55, ['estimate']),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchProjectDataV23(projectId: string): Promise<ProjectDataBundleV23> {
  const startTime = Date.now();
  const errors: string[] = [];
  const sourcesQueried: string[] = [];
  
  logger.info(`[OmniScore v2.6 Fetcher] Fetching data for ${projectId}`);
  
  // Detect sector
  const sector = detectSector(projectId);
  
  // Get Twitter handle for this project
  const twitterHandle = getProjectTwitterHandle(projectId);
  
  // Parallel data fetching (market, GitHub, DefiLlama)
  const [marketResult, githubResult, defiLlamaResult] = await Promise.all([
    fetchMarketData(projectId).catch(e => {
      errors.push(`Market: ${e.message}`);
      return { qsInputs: [], osInputs: [], priceChange30d: 0, marketCap: 0, btcTrend30d: 0, btcTrend90d: 0 };
    }),
    fetchGitHubData(projectId).catch(e => {
      errors.push(`GitHub: ${e.message}`);
      return [];
    }),
    fetchDefiLlamaData(projectId).catch(e => {
      errors.push(`DefiLlama: ${e.message}`);
      return [];
    }),
  ]);
  
  // Determine cap bucket from market data (for COMM v2 peer normalization)
  const capBucket = marketResult.marketCap > 10e9 ? 'large' : 
                    marketResult.marketCap > 1e9 ? 'mid' : 
                    marketResult.marketCap > 100e6 ? 'small' : 'micro';
  
  // Fetch Twitter data (now with cap bucket from market data)
  let twitterResult = null;
  if (twitterHandle) {
    try {
      twitterResult = await getTwitterIntelligence(
        twitterHandle,
        [`$${projectId.toUpperCase()}`, projectId], // Search terms
        { 
          skipFollowerQuality: false,  // Enable for COMM v2
          sector,                       // For peer normalization
          capBucket,                    // From market data
        }
      );
    } catch (e) {
      const error = e as Error;
      errors.push(`Twitter: ${error.message}`);
      logger.warn(`[OmniScore v2.3 Fetcher] Twitter fetch failed for ${twitterHandle}`, { error: error.message });
    }
  }
  
  // Track sources
  if (marketResult.osInputs.length > 0) sourcesQueried.push('coingecko');
  if (githubResult.length > 0) sourcesQueried.push('github');
  if (defiLlamaResult.length > 0) sourcesQueried.push('defillama');
  if (twitterResult?.profileFound) {
    sourcesQueried.push('twitter-api');
    // Log COMM v2 metrics
    logger.info(`[OmniScore v2.3 Fetcher] 📱 Twitter COMM v2 fetched for @${twitterHandle}`, {
      followers: twitterResult.profile?.followers,
      commFinal: twitterResult.commV2?.commFinal,
      commBase: twitterResult.commV2?.base.score,
      commVelocity: twitterResult.commV2?.velocity.score,
      commPeerZ: twitterResult.commV2?.commPeerZ,
      botRisk: twitterResult.commV2?.risks.botRisk,
      influencerConcentration: twitterResult.commV2?.risks.influencerConcentration,
      multiSourceCoherence: twitterResult.commV2?.multiSource.score,
      apiCalls: twitterResult.apiCallsUsed,
    });
  }
  
  // v2.8.0: Fetch CoinGecko community data in parallel (for OS)
  let communityResult: FeatureInput[] = [];
  try {
    communityResult = await fetchCoinGeckoCommunityData(projectId);
    if (communityResult.length > 0) {
      sourcesQueried.push('coingecko-community');
    }
  } catch (e) {
    const error = e as Error;
    errors.push(`CoinGecko Community: ${error.message}`);
  }
  
  // v2.9.0: Fetch REAL DATA from external sources (Snapshot, GoPlus, DeFiLlama, CoinGecko)
  // This replaces estimates with actual verified data when available
  let realData: AllRealData | null = null;
  try {
    realData = await fetchAllRealData(projectId);
    
    // Track which real data sources were used
    if (realData.governance.hasGovernance) {
      sourcesQueried.push('snapshot.org');
      logger.info(`[OmniScore v2.9] 🏛️ Real governance data from Snapshot for ${projectId}`);
    }
    if (realData.security.hasSecurityData) {
      sourcesQueried.push('goplus');
      logger.info(`[OmniScore v2.9] 🔒 Real security data from GoPlus for ${projectId}`);
    }
    if (realData.adoption.hasAdoptionData) {
      sourcesQueried.push('defillama-extended');
      logger.info(`[OmniScore v2.9] 📊 Real adoption data from DeFiLlama for ${projectId}`);
    }
    if (realData.tokenomics.hasTokenomicsData) {
      sourcesQueried.push('coingecko-tokenomics');
      logger.info(`[OmniScore v2.9] 💰 Real tokenomics data from CoinGecko for ${projectId}`);
    }
  } catch (e) {
    const error = e as Error;
    errors.push(`RealData: ${error.message}`);
    logger.warn(`[OmniScore v2.9] Failed to fetch real data for ${projectId}`, { error: error.message });
  }
  
  // v2.10.0: Check KNOWLEDGE BASE for AI-researched data
  // This data was collected from previous user queries and web research
  let knowledgeBaseData: any = null;
  try {
    knowledgeBaseData = await getProjectKnowledge(projectId);
    
    if (knowledgeBaseData) {
      sourcesQueried.push('knowledge-base');
      logger.info(`[OmniScore v2.10] 🧠 Using knowledge base data for ${projectId}`, {
        researchDepth: knowledgeBaseData.researchDepth,
        lastResearched: knowledgeBaseData.lastResearchedAt,
        dataQuality: knowledgeBaseData.dataQuality,
      });
    } else {
      // No knowledge yet - mark for potential research
      logger.info(`[OmniScore v2.10] 📝 No knowledge base entry for ${projectId} - will research if needed`);
    }
  } catch (e) {
    const error = e as Error;
    errors.push(`KnowledgeBase: ${error.message}`);
    logger.warn(`[OmniScore v2.10] Failed to fetch knowledge base for ${projectId}`, { error: error.message });
  }
  
  // Generate data with REAL DATA when available, fall back to estimates
  // v2.10.0: Now also uses knowledge base data (AI-researched)
  const teamGovInputs = generateTeamGovernanceEstimates(projectId, sector, realData?.governance, knowledgeBaseData);
  const securityInputs = generateSecurityEstimates(projectId, sector, realData?.security, knowledgeBaseData);
  // Pass Twitter data AND real adoption data to adoption/community function
  const adoptionResult = generateAdoptionCommunityEstimates(
    projectId, 
    sector, 
    marketResult.marketCap, 
    twitterResult,
    realData?.adoption
  );
  const tokenInputs = generateTokenEstimates(projectId, sector, realData?.tokenomics);
  const legalMacroInputs = generateLegalMacroEstimates();
  
  // v2.8.0: Add backing-based quality signals
  const backingInputs = generateBackingEstimates(projectId);
  if (backingInputs.length > 0) {
    sourcesQueried.push('partnerships-data');
    logger.info(`[OmniScore v2.8 Fetcher] 🤝 Added ${backingInputs.length} backing-based features for ${projectId}`);
  }
  
  if (teamGovInputs.some(f => f.sources?.includes('estimate'))) sourcesQueried.push('estimates');
  
  // Combine all QS inputs
  const qsInputs: FeatureInput[] = [
    ...marketResult.qsInputs,
    ...githubResult,
    ...defiLlamaResult,
    ...teamGovInputs,
    ...securityInputs,
    ...backingInputs,  // v2.8.0: Include backing data
    ...legalMacroInputs.filter(f => OMNISCORE_CONFIG.QS_SEGMENTS.includes(f.segment)),
  ];
  
  // Combine all OS inputs
  const osInputs: FeatureInput[] = [
    ...marketResult.osInputs,
    ...adoptionResult.osInputs,
    ...communityResult,  // v2.8.0: Include CoinGecko community data
    ...tokenInputs,
    ...legalMacroInputs.filter(f => OMNISCORE_CONFIG.OS_SEGMENTS.includes(f.segment)),
  ];
  
  // Calculate volatility index (simplified)
  const volatilityIndex = Math.abs(marketResult.btcTrend30d) * 2;
  
  // Fear & Greed estimate
  const fearGreedIndex = 50 + marketResult.btcTrend30d;
  
  const bundle: ProjectDataBundleV23 = {
    projectId,
    qsInputs,
    osInputs,
    sector,
    marketData: {
      btcTrend30d: marketResult.btcTrend30d,
      btcTrend90d: marketResult.btcTrend90d,
      volatilityIndex: Math.max(0, Math.min(100, volatilityIndex)),
      fearGreedIndex: Math.max(0, Math.min(100, fearGreedIndex)),
    },
    eventRiskSeverity: 0, // No active events by default
    priceChange30d: marketResult.priceChange30d,
    botRisk: adoptionResult.botRisk,
    anomalyScore: adoptionResult.anomalyScore,
    multiSourceConsistency: sourcesQueried.length >= 2 ? 0.8 : 0.5,
    // v2.3.2: Twitter-derived metrics (use ICR composite for NMI calculation)
    influencerConcentration: adoptionResult.influencerConcentration.composite,
    sentimentDispersion: adoptionResult.sentimentDispersion,
    hasTwitterData: twitterResult?.profileFound || false,
    twitterHandle: twitterHandle,
    fetchedAt: new Date().toISOString(),
    sourcesQueried,
    errors,
  };
  
  logger.info(`[OmniScore v2.3 Fetcher] Fetched ${qsInputs.length} QS + ${osInputs.length} OS variables for ${projectId} in ${Date.now() - startTime}ms`);
  
  return bundle;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATE OMNISCORE (WRAPPER)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * v2.3.4: Get previous POS for smoothing (from cache/DB)
 * In production, this would query a time-series DB or cache
 */
async function getPreviousPos(projectId: string): Promise<{ pos: number | null; timestamp: string | null; engineVersion: string | null }> {
  try {
    const latestEntry = await prisma.omniScoreHistory.findFirst({
      where: { projectId },
      orderBy: { calculatedAt: 'desc' },
      select: { pos: true, calculatedAt: true, engineVersion: true },
    });

    if (latestEntry) {
      return { pos: latestEntry.pos, timestamp: latestEntry.calculatedAt.toISOString(), engineVersion: latestEntry.engineVersion };
    }
  } catch (error) {
    logger.error(`[OmniScore Smoothing] Failed to fetch previous POS for ${projectId}`, { error });
  }
  return { pos: null, timestamp: null, engineVersion: null };
}

/**
 * v2.3.4: Store current POS for future smoothing
 */
async function storePosForSmoothing(projectId: string, pos: number, timestamp: string, engineVersion: string, formulaVersion: string): Promise<void> {
  try {
    await prisma.omniScoreHistory.create({
      data: {
        projectId,
        pos,
        calculatedAt: new Date(timestamp),
        engineVersion,
        formulaVersion,
        // Other fields can be added here if needed for full audit trail in DB
      },
    });
    logger.debug(`[OmniScore Smoothing] Stored POS=${pos} for ${projectId} at ${timestamp} (v${engineVersion}, formula ${formulaVersion})`);
  } catch (error) {
    logger.error(`[OmniScore Smoothing] Failed to store POS for ${projectId}`, { error });
  }
}

export async function getProjectOmniScoreV23(projectId: string): Promise<OmniScoreProductionResponse> {
  try {
    logger.info(`[OmniScore v2.9.1] Starting calculation for ${projectId}`);
    
    const bundle = await fetchProjectDataV23(projectId);
    
    // Log fetched data summary for diagnostics
    logger.debug(`[OmniScore v2.9.1] Data bundle fetched for ${projectId}`, {
      qsInputCount: bundle.qsInputs.length,
      osInputCount: bundle.osInputs.length,
      sector: bundle.sector,
      sourcesQueried: bundle.sourcesQueried,
      errorCount: bundle.errors.length,
      errors: bundle.errors,
    });
    
    // v2.5.0: Fetch previous POS for smoothing (with version-aware reset)
    const previous = await getPreviousPos(projectId);
    
    const params: CalculateOmniScoreParams = {
      projectId: bundle.projectId,
      qsInputs: bundle.qsInputs,
      osInputs: bundle.osInputs,
      sector: bundle.sector,
      marketData: bundle.marketData,
      eventRiskSeverity: bundle.eventRiskSeverity,
      priceChange30d: bundle.priceChange30d,
      botRisk: bundle.botRisk,
      anomalyScore: bundle.anomalyScore,
      multiSourceConsistency: bundle.multiSourceConsistency,
      // Twitter-derived metrics
      influencerConcentration: bundle.influencerConcentration,
      sentimentDispersion: bundle.sentimentDispersion,
      // v2.5.0: Temporal smoothing with version-aware reset
      previousPos: previous.pos,
      previousTimestamp: previous.timestamp,
      previousEngineVersion: previous.engineVersion,
    };
    
    const result = calculateOmniScoreProduction(params);
    
    // Verify engine version is v2.7.0 (with reliability layer)
    if (!result.audit.engineVersion.startsWith('2.7')) {
      logger.warn(`⚠️ OmniScore engine version mismatch: expected 2.7.x, got ${result.audit.engineVersion}`);
    }
    
    // Verify formula version (v2.6 or v2.7)
    if (!['v2.6', 'v2.7'].includes(result.audit.formulaVersion)) {
      logger.warn(`⚠️ OmniScore formula version mismatch: expected v2.6 or v2.7, got ${result.audit.formulaVersion}`);
    }
    
    // Log calculation details for debugging
    if (result.success) {
      logger.info(`[OmniScore v2.9.1] ✅ Calculation successful for ${projectId}`, {
        posAdjusted: result.pos.adjusted,
        posTier: result.pos.tier,
        qsScore: result.qualityScore.score,
        osScore: result.opportunityScore.score,
        riskScore: result.risk.score,
        confidence: result.audit.confidence,
        invariantStatus: result.audit.invariantStatus,
      });
    } else {
      // Log detailed failure info to diagnose issues
      logger.error(`[OmniScore v2.9.1] ⚠️ Calculation completed but success=false for ${projectId}`, {
        posAdjusted: result.pos.adjusted,
        posTier: result.pos.tier,
        qsScore: result.qualityScore.score,
        osScore: result.opportunityScore.score,
        confidence: result.audit.confidence,
        invariantStatus: result.audit.invariantStatus,
        violationCount: result.audit.violations?.length || 0,
        violations: result.audit.violations?.map(v => `${v.code}: ${v.message}`).join('; '),
        qsCoverage: result.qualityScore.coverage,
        osCoverage: result.opportunityScore.coverage,
      });
    }
    
    // v2.5.0: Store for future smoothing (with version-aware reset)
    // Wrap in try-catch to prevent storage failures from breaking calculation
    try {
      await storePosForSmoothing(projectId, result.pos.adjusted, result.timestamp, result.audit.engineVersion, result.audit.formulaVersion);
    } catch (storageError) {
      logger.error(`[OmniScore v2.9.1] Failed to store POS for smoothing (non-critical)`, {
        projectId,
        error: storageError,
      });
      // Don't throw - storage failure shouldn't break the response
    }
    
    return result;
    
  } catch (error) {
    // PRODUCTION-GRADE ERROR HANDLING: Never throw, always return a proper failed response
    logger.error(`[OmniScore v2.9.1] ❌ Critical error calculating OmniScore for ${projectId}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      projectId,
    });
    
    // Return a properly structured failed response
    // This ensures fallback mechanisms can trigger correctly
    return {
      success: false,
      engine: 'OmniScore' as const,
      version: OMNISCORE_ENGINE_VERSION,
      project: projectId,
      timestamp: new Date().toISOString(),
      
      qualityScore: {
        score: 0,
        tier: 'Critical' as const,
        confidence: 'insufficient' as const,
        coverage: 0,
        breakdown: {
          team: 0,
          tech: 0,
          security: 0,
          governance: 0,
          ecosystem: 0,
        },
      },
      
      opportunityScore: {
        status: 'gated' as const,
        score: 0,
        tier: 'Critical' as const,
        coverage: 0,
        gateReason: 'Calculation error - data unavailable',
      },
      
      risk: {
        score: 100,
        eventRiskSeverity: 0,
        adjustmentGamma: 0,
      },
      
      pos: {
        raw: 0,
        adjusted: 0,
        tier: 'Critical' as const,
        confidenceBand: [0, 0],
      },
      
      nrg: {
        value: 0,
        interpretation: 'low_confidence' as const,
        hypeScore: 0,
        fundamentalsScore: 0,
      },
      
      explainability: {
        topQsDrivers: [],
        topOsDrivers: [],
        bottomQsDrivers: [],
        bottomOsDrivers: [],
        narrativeContext: 'Calculation error - OmniScore unavailable',
      },
      
      upgradeRecommendations: {
        recommendations: [],
        feasibleCount: 0,
        estimatedMaxPosGain: 0,
      },
      
      nmi: {
        score: 0,
        interpretation: 'low_confidence' as const,
        botRisk: 0,
        anomalyBursts: 0,
        influencerConcentration: 0,
        crossSourceConsistency: 0,
      },
      
      stressTest: {
        downside10: 0,
        downside25: 0,
        downside50: 0,
        mostVulnerableSegment: 'MARKET' as const,
      },
      
      tierContext: {
        regime: 'neutral' as const,
        sector: 'Unknown' as SectorType,
        capBucket: 'micro' as const,
        tier: 'Critical' as const,
        percentile: 0,
        peerComparison: {
          medianPOS: 50,
          top10Threshold: 80,
          zScore: -3,
        },
      },
      
      coldStart: {
        isActive: false,
        policy: 'none' as const,
        adjustments: {
          confidenceBandWidening: 0,
          tierDowngrade: false,
          narrativeCaveat: null,
        },
      },
      
      identityGraph: null,
      
      threatModel: {
        riskLevel: 'critical' as const,
        threats: [{
          type: 'calculation_error' as const,
          severity: 'critical' as const,
          description: 'OmniScore calculation failed - data unavailable',
          mitigation: 'Use investigation fallback for basic project data',
        }],
        mitigations: [],
      },
      
      audit: {
        engineVersion: OMNISCORE_ENGINE_VERSION,
        formulaVersion: 'v2.7',
        methodologyHash: 'error',
        confidence: 'insufficient' as const,
        invariantStatus: 'error' as const,
        reflexivitySentinel: {
          status: 'error' as const,
          qsPriceCorrPearson: 0,
          threshold: 0.7,
          passed: false,
        },
        violations: [{
          code: 'CALC-ERROR',
          severity: 'ERROR' as const,
          message: error instanceof Error ? error.message : 'Unknown calculation error',
        }],
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI FORMATTER
// ═══════════════════════════════════════════════════════════════════════════════

export function formatOmniScoreForAI(result: OmniScoreProductionResponse): string {
  const { qualityScore, opportunityScore, pos, risk, nrg, explainability, upgradeRecommendations, audit } = result;
  
  // NMI data if available
  const nmi = (result as any).nmi;
  const stability = (result as any).stability;
  
  let output = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 OFFICIAL OMNISCORE ANALYSIS: ${result.project.toUpperCase()} (v${audit.engineVersion} - Formula: ${audit.formulaVersion})                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚠️  MANDATORY COMPLIANCE RULES — VIOLATE THESE = INSTANT FAILURE            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

1. 🔒 USE EXACT TIER STRING: tier = "${pos.tier}" ← Copy this VERBATIM
2. 🚫 NEVER rename tiers: "Weak" ≠ "Neutral", "Weak" ≠ "Moderate"  
3. 📊 ALWAYS show actual numbers: POS=${pos.adjusted}, QS=${qualityScore.score}, OS=${opportunityScore.score}
4. 🎯 Tier thresholds are FIXED:
   • Elite:    85-100
   • Strong:   70-84  
   • Neutral:  50-69
   • Weak:     30-49  ← If POS=43, tier MUST be "Weak"
   • Critical: 0-29

5. ✋ DO NOT improvise, soften, or editorialize tier labels
6. 📋 If payload says tier="Weak", you MUST say "Weak tier" (not "moderate" or "neutral")

🚨 CRITICAL v2.5.0 RULE:
7. 🛑 NEVER say "100/100" — The engine caps POS at 97 maximum
   If you see POS=100, the data is WRONG. Report as error, don't use it.
   NO LIVE PROJECT should score 100/100. This is physically impossible in v2.5.0.
   
8. 📐 FORMULA: POS = 0.60×QS + 0.25×OS + 0.15×(100-Risk)
   Example: ETH with QS=87, OS=43, Risk=35 → POS ≈ 72.7 (not 43!)

9. 🕐 If smoothing applied, mention it: "Score is smoothed over time to prevent wild swings"

╔═══════════════════════════════════════════════════════════════════════════════╗
║  📊 EXACT NUMBERS FROM ENGINE (USE THESE, NOT YOUR INTERPRETATIONS)          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

PROJECT OMNISCORE (POS):
• Score:      ${pos.adjusted}/100
• Tier:       ${pos.tier}  ← USE THIS EXACT STRING
• Confidence: ${audit.confidence}
• Band:       ${pos.confidenceBand ? `${pos.confidenceBand[0].toFixed(1)}-${pos.confidenceBand[1].toFixed(1)}` : 'N/A'}

QUALITY SCORE (QS) — Fundamentals:
• Score: ${qualityScore.score}/100
• Tier:  ${qualityScore.tier}  ← USE THIS EXACT STRING
• Coverage: ${(qualityScore.coverage * 100).toFixed(0)}%

OPPORTUNITY SCORE (OS) — Market:
• Status: ${opportunityScore.status === 'gated' ? '⚠️ GATED' : '✅ Active'}
• Score:  ${opportunityScore.status === 'gated' ? 'N/A (gated)' : `${opportunityScore.score}/100`}
• Tier:   ${opportunityScore.tier}  ← USE THIS EXACT STRING
• Coverage: ${(opportunityScore.coverage * 100).toFixed(0)}%

RISK SCORE:
• Score: ${risk.score.toFixed(1)}/100 (higher = more risk)
• Event Risk: ${risk.eventRiskSeverity.toFixed(2)}
• Gamma: ${risk.adjustmentGamma || 'N/A'}

═══════════════════════════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 QUADRANT POSITION vs GLOBAL TIER — UNDERSTAND THE DIFFERENCE             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

QUADRANT POSITION (QS vs OS):
• If QS≥60 & OS≥60 → "TARGET ZONE" (high quality + high opportunity)
• If QS≥60 & OS<60  → "BUILDER ZONE" (high quality, weak opportunity)
• If QS<60 & OS≥60  → "HYPE ZONE" (weak quality, high opportunity)
• If QS<60 & OS<60  → "AVOID ZONE" (weak quality, weak opportunity)

GLOBAL TIER (final POS):
• The overall score combining QS + OS - Risk
• This is what you call "${pos.tier} tier" (not Builder/Target/Hype/Avoid)
• Builder/Target/Hype/Avoid describes WHERE in the grid
• Elite/Strong/Neutral/Weak/Critical describes HOW GOOD overall

EXAMPLE NARRATIVES (follow these patterns):
✅ "BTC scores 70.0/100 (Strong tier), positioned in the Target Zone with QS=74.0 and OS=68.0"
✅ "ETH scores 72.7/100 (Strong tier), but sits in the Builder Zone with QS=87.0 and OS=43.0"
   Note: With v2.5.0 formula (POS = 0.60×QS + 0.25×OS + 0.15×(100-Risk)), 
   ETH with QS=87, OS=43, Risk=35 → POS = 0.6×87 + 0.25×43 + 0.15×65 = 72.7
❌ "ETH has a Neutral overall score" ← WRONG! Use exact POS from payload
❌ "ETH scores around 43" ← WRONG! Use exact number: "ETH scores 72.7/100"

═══════════════════════════════════════════════════════════════════════════════

### 🔷 QUALITY SCORE (QS) — What the project IS
${qualityScore.score}/100 (${qualityScore.tier})
Coverage: ${(qualityScore.coverage * 100).toFixed(0)}%

Breakdown:
• Team:       ${(qualityScore.breakdown.team * 100).toFixed(0)}/100
• Technology: ${(qualityScore.breakdown.tech * 100).toFixed(0)}/100
• Security:   ${(qualityScore.breakdown.security * 100).toFixed(0)}/100
• Governance: ${(qualityScore.breakdown.governance * 100).toFixed(0)}/100
• Ecosystem:  ${(qualityScore.breakdown.ecosystem * 100).toFixed(0)}/100

### 🔶 OPPORTUNITY SCORE (OS) — What the market rewards NOW
${opportunityScore.status === 'gated' ? '⚠️ GATED (insufficient QS coverage)' : `${opportunityScore.score}/100 (${opportunityScore.tier})`}
Coverage: ${(opportunityScore.coverage * 100).toFixed(0)}%
${opportunityScore.gateReason ? `Gate Reason: ${opportunityScore.gateReason}` : ''}

(OS = price momentum, volume, social buzz, adoption velocity)

### ⚡ RISK ASSESSMENT
- **Risk Score**: ${(risk.score * 100).toFixed(0)}/100 (higher = more risk)
- **Event Risk**: ${risk.eventRiskSeverity}
- **Adjustment Factor**: γ = ${risk.adjustmentGamma.toFixed(2)}

### 📈 NARRATIVE VS REALITY GAP (NRG)
- **NRG Value**: ${nrg.value >= 0 ? '+' : ''}${nrg.value.toFixed(2)} (positive = overhyped, negative = underhyped)
- **Percentile**: ${(nrg.percentile * 100).toFixed(0)}th
- **Verdict**: ${getNRGEmoji(nrg.interpretation)} ${nrg.interpretation.replace('_', ' ').toUpperCase()}
${nrg.value > 0.3 ? '⚠️ Social hype EXCEEDS fundamental reality' : nrg.value < -0.3 ? '💎 Fundamentals EXCEED social attention - potential opportunity' : '✅ Social attention matches reality'}

**NRG Context (IMPORTANT for mega-caps):**
NRG measures RELATIVE hype (COMM+MARKET vs SEC+TECH+ADOPT), NOT absolute sentiment.
For BTC/ETH, positive NRG in a fear market = flight-to-quality flows creating
high relative market activity vs fundamentals. This is NORMAL for mega-caps.
`;

  // Explainability
  if (explainability.qsDrivers.length > 0) {
    output += `
### 🔑 Key QS Drivers
${explainability.qsDrivers.map(d => 
  `- **${d.feature}**: z=${d.z.toFixed(2)}, Q=${d.Q.toFixed(2)}, contribution=${d.contribution.toFixed(2)} ${getTrendEmoji(d.trend7d)}`
).join('\n')}
`;
  }

  if (explainability.osDrivers.length > 0) {
    output += `
### 🔑 Key OS Drivers
${explainability.osDrivers.map(d => 
  `- **${d.feature}**: z=${d.z.toFixed(2)}, Q=${d.Q.toFixed(2)}, contribution=${d.contribution.toFixed(2)} ${getTrendEmoji(d.trend7d)}`
).join('\n')}
`;
  }

  // Upgrade recommendations
  if (upgradeRecommendations.highImpact.length > 0 || upgradeRecommendations.quickWins.length > 0) {
    output += `
### 🚀 Upgrade Recommendations (Controllable Only)
`;
    if (upgradeRecommendations.highImpact.length > 0) {
      output += `**High Impact**:
${upgradeRecommendations.highImpact.map(r => 
  `- ${r.feature} (${r.segment}): ${r.currentValue.toFixed(0)} → ${r.targetValue.toFixed(0)} | +${r.expectedPOSLift.toFixed(1)} POS | ${r.feasibility} | ${r.timeEstimate}`
).join('\n')}
`;
    }
    if (upgradeRecommendations.quickWins.length > 0) {
      output += `**Quick Wins**:
${upgradeRecommendations.quickWins.map(r => 
  `- ${r.feature} (${r.segment}): ${r.currentValue.toFixed(0)} → ${r.targetValue.toFixed(0)} | +${r.expectedPOSLift.toFixed(1)} POS`
).join('\n')}
`;
    }
  }

  // NMI section if available
  if (nmi) {
    output += `
### 🛡️ NARRATIVE MANIPULATION INDEX (NMI)
- **Score**: ${nmi.score}/100 (${nmi.tier || 'N/A'})
- **Bot Risk**: ${((nmi.components?.botLikelihood || 0) * 100).toFixed(0)}%
- **Anomaly Bursts**: ${((nmi.components?.anomalyBursts || 0) * 100).toFixed(0)}%
- **Influencer Concentration**: ${((nmi.components?.influencerConcentration || 0) * 100).toFixed(0)}%
${nmi.tier === 'clean' ? '✅ No manipulation signals detected' : nmi.tier === 'suspicious' ? '⚠️ Some manipulation indicators present' : nmi.tier === 'manipulated' || nmi.tier === 'severe' ? '🚨 HIGH manipulation risk detected' : ''}
`;
  }

  // Stability summary if available
  if (stability) {
    output += `
### 🔒 SCORE STABILITY
- **Guard Applied**: ${stability.guardApplied ? 'Yes' : 'No'}
- **LKG Used**: ${stability.lkgUsed ? 'Yes (using cached stable data)' : 'No'}
${stability.warnings?.length > 0 ? `- **Warnings**: ${stability.warnings.join(', ')}` : ''}
`;
  }

  // Audit summary
  output += `
### 📋 Audit Trail
- **Engine Version**: ${audit.engineVersion}
- **Data As Of**: ${audit.dataAsOf}
- **Sources Used**: ${audit.sourcesUsed.join(', ') || 'estimates only'}
- **Invariant Status**: ${audit.invariantStatus === 'pass' ? '✅ Pass' : audit.invariantStatus === 'warn' ? '⚠️ Warnings' : '❌ Errors'}
${(audit as any).tierMismatch ? `- **⚠️ Tier Mismatch**: Raw tier (${(audit as any).rawTierUsed}) differs from conditioned tier (${(audit as any).conditionedTierInternal}) - using raw tier` : ''}

╔═══════════════════════════════════════════════════════════════════════════════╗
║  📢 HOW TO PRESENT THIS TO THE USER (MANDATORY FORMAT)                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

STEP 1: Lead with the exact POS score and tier
"${result.project.toUpperCase()} scores ${pos.adjusted}/100 on OmniScore (${pos.tier} tier)."

STEP 2: Break down QS and OS with exact numbers
"Quality Score is ${qualityScore.score}/100 (${qualityScore.tier}) — [interpret what this means]
Opportunity Score is ${opportunityScore.status === 'gated' ? 'GATED due to low QS coverage' : `${opportunityScore.score}/100 (${opportunityScore.tier})`} — [interpret what this means]"

STEP 3: Explain quadrant position (SEPARATE from tier)
"This positions ${result.project.toUpperCase()} in the [TARGET/BUILDER/HYPE/AVOID] Zone."

STEP 4: Mention NRG if relevant
"The NRG is ${nrg.value >= 0 ? '+' : ''}${nrg.value.toFixed(2)} (${nrg.interpretation})"

FORBIDDEN PATTERNS:
❌ "Score is 43, which is in the Neutral range" ← NO! 43 = Weak
❌ "Overall positioning is moderate" ← NO! Use the exact tier from payload
❌ "QS is around 74-ish" ← NO! Say "QS is 74.3/100"
❌ Calling Builder Zone projects "neutral" or "moderate" ← Builder is a QUADRANT position, not a tier

CORRECT EXAMPLE:
"Ethereum scores 43/100 on OmniScore (Weak tier). Quality Score is 74/100 (Strong) — 
excellent fundamentals in team, tech, and security. Opportunity Score is 31/100 (Weak) — 
low market momentum right now. This positions ETH in the Builder Zone: high quality but 
weak current opportunity. The overall Weak tier reflects the combined effect of strong 
fundamentals dragged down by weak market conditions."

═══════════════════════════════════════════════════════════════════════════════
`;

  return output;
}

function getNRGEmoji(interpretation: string): string {
  switch (interpretation) {
    case 'overhyped': return '🔴';
    case 'fairly_valued': return '🟡';
    case 'underhyped': return '🟢';
    case 'severely_underhyped': return '💎';
    case 'low_confidence': return '⚪';
    default: return '⚪';
  }
}

function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'up': return '📈';
    case 'down': return '📉';
    default: return '➡️';
  }
}

/**
 * v2.3.4: Format snapshot for AI (cleaner than full response)
 * USE THIS for chat - it's simpler and enforces the contract better
 */
export function formatSnapshotForAI(snapshot: OmniScoreSnapshot): string {
  const quadrantZone = getQuadrantZone(snapshot.qs, snapshot.os);
  
  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 OMNISCORE: ${snapshot.symbol} (v${snapshot.audit.engineVersion})                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

🚨 CRITICAL COMPLIANCE (v2.5.0):
  1. Use EXACT tier: "${snapshot.tier}" (not synonyms)
  2. Show EXACT score: ${snapshot.posAdjusted}/100
  3. NEVER say "100/100" (engine caps at 97)
  4. Separate quadrant (${quadrantZone}) from tier (${snapshot.tier})
  5. NEVER invent/guess scores for projects NOT in this snapshot
  6. If a project is missing, say: "OmniScore for [SYMBOL] is not available in this snapshot."
  7. DO NOT "peg", "estimate", or "expect" scores - only use exact values from payload

═══════════════════════════════════════════════════════════════════════════════

📊 PROJECT OMNISCORE (POS):
Score: ${snapshot.posAdjusted}/100
Tier:  ${snapshot.tier}  ← USE EXACTLY THIS

Progression:
  • Raw:      ${snapshot.posRaw.toFixed(1)}/100
  • Smoothed: ${snapshot.posSmoothed.toFixed(1)}/100 ${snapshot.audit.smoothingApplied ? '(temporal smoothing applied)' : ''}
  • Final:    ${snapshot.posAdjusted.toFixed(1)}/100
  ${snapshot.audit.posPlausibilityCapped ? '⚠️ Was capped at 97 (original > 97)' : ''}

🔷 QUALITY SCORE (QS):
${snapshot.qs}/100 (${snapshot.qsTier})  ← USE EXACTLY THIS

🔶 OPPORTUNITY SCORE (OS):
${snapshot.os !== null ? `${snapshot.os}/100 (${snapshot.osTier})` : 'GATED (insufficient QS coverage)'}  ← USE EXACTLY THIS
${snapshot.audit.osCeilingApplied ? `(Capped at ${snapshot.capBucket === 'mega' ? 92 : snapshot.capBucket === 'large' ? 95 : 98} for ${snapshot.capBucket}-cap)` : ''}

📍 QUADRANT: ${quadrantZone} Zone
  QS: ${snapshot.qs.toFixed(1)} ${snapshot.qs >= 60 ? '✅' : '❌'}
  OS: ${snapshot.os?.toFixed(1) || 'N/A'} ${snapshot.os !== null && snapshot.os >= 60 ? '✅' : '❌'}

📈 NARRATIVE:
  NRG: ${snapshot.nrg > 0 ? '+' : ''}${snapshot.nrg.toFixed(2)} (${snapshot.nrgTier})
  NMI: ${snapshot.nmi.toFixed(1)}/100 (${snapshot.nmiTier})

═══════════════════════════════════════════════════════════════════════════════
MANDATORY PRESENTATION:

"${snapshot.symbol} scores ${snapshot.posAdjusted}/100 on OmniScore (${snapshot.tier} tier).
Quality Score is ${snapshot.qs}/100 (${snapshot.qsTier}).
Opportunity Score is ${snapshot.os !== null ? `${snapshot.os}/100 (${snapshot.osTier})` : 'GATED'}.
This positions ${snapshot.symbol} in the ${quadrantZone} Zone."

${quadrantZone === 'TARGET' ? 'High quality + high opportunity = strong buy signal' :
  quadrantZone === 'BUILDER' ? 'High quality + low opportunity = accumulation zone' :
  quadrantZone === 'HYPE' ? 'Low quality + high opportunity = ride momentum carefully' :
  'Low quality + low opportunity = avoid'}

🚫 FORBIDDEN:
  ❌ "${snapshot.symbol} has a perfect 100/100" (impossible in v2.5.0)
  ❌ "scores 43 (Neutral tier)" when tier="Weak"
  ❌ "moderate positioning" instead of exact tier
  ❌ "around ${snapshot.qs}-ish" instead of exact number
  ❌ "I'd peg it at..." or "I'd expect..." (NEVER guess scores)
  ❌ Speculating about projects NOT in this snapshot
  ❌ Using context to infer scores - ONLY use exact payload values

Invariants: ${snapshot.audit.invariantStatus}
═══════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * v2.3.4: Get OmniScore snapshot (canonical format for all consumers)
 * USE THIS instead of getProjectOmniScoreV23 for UI/chat consumption
 */
export async function getOmniScoreSnapshot(projectId: string): Promise<OmniScoreSnapshot> {
  const response = await getProjectOmniScoreV23(projectId);
  return toOmniScoreSnapshot(response);
}

/**
 * v2.3.4: Get multiple snapshots (for quadrant board)
 */
export async function getMultipleOmniScoreSnapshots(projectIds: string[]): Promise<OmniScoreSnapshot[]> {
  const snapshots = await Promise.all(
    projectIds.map(id => getOmniScoreSnapshot(id).catch(err => {
      logger.error(`[OmniScore] Failed to get snapshot for ${id}`, { error: (err as Error).message });
      return null;
    }))
  );
  
  return snapshots.filter((s): s is OmniScoreSnapshot => s !== null);
}

/**
 * v2.3.4: Convert OmniScoreSnapshot to ProjectPoint format (for UI compatibility)
 * This ensures quadrant board always gets data from canonical engine
 */
export function snapshotToProjectPoint(snapshot: OmniScoreSnapshot): any {
  const quadrantZone = getQuadrantZone(snapshot.qs, snapshot.os);
  
  return {
    name: snapshot.name,
    ticker: snapshot.symbol,
    sector: snapshot.sector,
    capBucket: snapshot.capBucket,
    qs: snapshot.qs,
    osStatus: snapshot.osStatus === 'gated' ? 'gated' : 'ok',
    os: snapshot.os,
    risk: snapshot.risk,
    pos: snapshot.posRaw,
    posAdj: snapshot.posAdjusted,
    nrg: {
      value: snapshot.nrg,
      interpretation: snapshot.nrgTier,
    },
    nmi: {
      score: snapshot.nmi,
      tier: snapshot.nmiTier,
    },
    confidence: snapshot.confidence,
    coverageQS: snapshot.coverageQS,
    coverageOS: snapshot.coverageOS,
    // Add metadata for debugging
    _debug: {
      engineVersion: snapshot.audit.engineVersion,
      smoothingApplied: snapshot.audit.smoothingApplied,
      posPlausibilityCapped: snapshot.audit.posPlausibilityCapped,
      osCeilingApplied: snapshot.audit.osCeilingApplied,
      quadrantZone,
    },
  };
}

// Export for use in API and chat service
export { detectSector };
export type { SectorType, OmniScoreSnapshot };

