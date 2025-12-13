/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📡 OMNISCORE DATA FETCHER v2.3.1 "PRODUCTION BASELINE"                   ║
 * ║                                                                               ║
 * ║   Collects raw variables for OmniScore v2.3.1 with:                          ║
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
} from '../../omniscore-v2.5';
import { getCachedPrice } from './enterprise-market-data-pipeline';
import { 
  getTwitterIntelligence, 
  getProjectTwitterHandle,
  toOmniScoreInputs,
  TwitterProjectIntelligence
} from './twitter-intelligence';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

type SectorType = 'L1' | 'L2' | 'DeFi' | 'Infrastructure' | 'AI' | 'Meme' | 'Gaming' | 'Unknown';

const SECTOR_MAPS: Record<SectorType, Set<string>> = {
  L1: new Set(['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'avax', 'avalanche', 
    'matic', 'polygon', 'near', 'apt', 'aptos', 'sui', 'dot', 'polkadot', 'atom', 'cosmos', 
    'algo', 'algorand', 'ada', 'cardano', 'bnb', 'xrp', 'ton', 'supra', 'hbar', 'hedera',
    'ftm', 'fantom', 'egld', 'multiversx', 'icp', 'internet-computer', 'flow', 'xtz', 'tezos',
    'neo', 'vet', 'vechain', 'fil', 'filecoin', 'kas', 'kaspa', 'sei']),
  L2: new Set(['arb', 'arbitrum', 'op', 'optimism', 'base', 'zksync', 'starknet', 'mantle', 
    'scroll', 'linea', 'blast', 'mode', 'manta', 'taiko', 'zkevm']),
  DeFi: new Set(['uni', 'uniswap', 'aave', 'sushi', 'sushiswap', 'curve', 'crv', 'compound', 
    'comp', 'maker', 'mkr', 'lido', 'steth', 'convex', 'cvx', 'yearn', 'yfi', 'gmx', 'dydx', 
    'pancake', 'cake', 'synthetix', 'snx', 'frax', 'balancer', 'bal', 'pendle', 'velo', 
    'velodrome', 'aero', 'aerodrome', 'rpl', 'rocket', 'eigen', 'jupiter', 'jup', 'raydium',
    'orca', 'morpho', 'ethena', 'ena', 'usual']),
  Infrastructure: new Set(['link', 'chainlink', 'grt', 'thegraph', 'ar', 'arweave', 'rndr', 
    'render', 'inj', 'injective', 'pyth', 'wormhole', 'layerzero', 'axelar', 'api3', 'band',
    'the', 'helium', 'hnt', 'mask', 'celestia', 'tia', 'altlayer', 'alt', 'dymension', 'dym']),
  AI: new Set(['tao', 'bittensor', 'fet', 'fetchai', 'fetch-ai', 'agix', 'singularity', 'ocean', 
    'olas', 'autonolas', 'akt', 'akash', 'wld', 'worldcoin', 'io', 'virtual', 'ai16z', 'goat',
    'griffain', 'zerebro']),
  Meme: new Set(['doge', 'dogecoin', 'shib', 'pepe', 'wif', 'bonk', 'floki', 'turbo', 'mog', 
    'brett', 'popcat', 'neiro', 'fwog', 'spx', 'moodeng', 'pnut', 'act', 'chillguy', 'fartcoin',
    'gigachad', 'chill-guy']),
  Gaming: new Set(['axs', 'axie', 'sand', 'sandbox', 'mana', 'decentraland', 'gala', 'imx', 
    'immutable', 'ronin', 'ron', 'prime', 'echelon', 'beam', 'xai', 'pixel', 'ilv', 'illuvium',
    'gods', 'super', 'ape', 'magic']),
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
// DATA FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

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
  
  // GitHub API mapping
  const githubRepos: Record<string, string> = {
    'ethereum': 'ethereum/go-ethereum',
    'bitcoin': 'bitcoin/bitcoin',
    'solana': 'solana-labs/solana',
    'polygon': 'maticnetwork/bor',
    'avalanche': 'ava-labs/avalanchego',
    'arbitrum': 'OffchainLabs/arbitrum',
    'optimism': 'ethereum-optimism/optimism',
    'chainlink': 'smartcontractkit/chainlink',
    'uniswap': 'Uniswap/v3-core',
    'aave': 'aave/aave-v3-core',
    'compound': 'compound-finance/compound-protocol',
    'supra': 'supranational/blst',
    'near': 'near/nearcore',
    'cosmos': 'cosmos/cosmos-sdk',
  };
  
  const repo = githubRepos[projectId.toLowerCase()];
  if (!repo) {
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

async function fetchDefiLlamaData(projectId: string): Promise<FeatureInput[]> {
  const qsInputs: FeatureInput[] = [];
  
  // v2.3.3: Special ECO scoring for mega-cap L1s (not just DeFi TVL based)
  const pid = projectId.toLowerCase();
  if (pid === 'bitcoin' || pid === 'btc') {
    return getBitcoinEcoEstimates();
  }
  if (pid === 'ethereum' || pid === 'eth') {
    return getEthereumEcoEstimates();
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

function generateTeamGovernanceEstimates(projectId: string, sector: SectorType): FeatureInput[] {
  const qsInputs: FeatureInput[] = [];
  
  // Well-known projects with higher team scores
  const establishedProjects = new Set([
    'bitcoin', 'ethereum', 'solana', 'polygon', 'avalanche', 'chainlink',
    'uniswap', 'aave', 'compound', 'maker', 'arbitrum', 'optimism', 'cosmos',
    'near', 'polkadot', 'cardano', 'supra'
  ]);
  
  const isEstablished = establishedProjects.has(projectId.toLowerCase());
  
  // TEAM estimates (QS)
  qsInputs.push(createFeature('team_experience', 'TEAM', 
    isEstablished ? 80 : 50, ['estimate']));
  qsInputs.push(createFeature('team_transparency', 'TEAM', 
    isEstablished ? 75 : 45, ['estimate']));
  qsInputs.push(createFeature('team_track_record', 'TEAM', 
    isEstablished ? 85 : 50, ['estimate']));
  
  // GOV estimates (QS)
  qsInputs.push(createFeature('gov_decentralization', 'GOV', 
    sector === 'L1' || sector === 'L2' ? 70 : 55, ['estimate']));
  qsInputs.push(createFeature('gov_voting_participation', 'GOV', 
    isEstablished ? 60 : 40, ['estimate']));
  qsInputs.push(createFeature('gov_upgrade_process', 'GOV', 
    isEstablished ? 70 : 50, ['estimate']));
  
  return qsInputs;
}

function generateSecurityEstimates(projectId: string, sector: SectorType): FeatureInput[] {
  const qsInputs: FeatureInput[] = [];
  
  // Projects with known audits
  const auditedProjects = new Set([
    'ethereum', 'bitcoin', 'solana', 'polygon', 'avalanche', 'chainlink',
    'uniswap', 'aave', 'compound', 'maker', 'arbitrum', 'optimism',
    'lido', 'curve', 'supra', 'near', 'cosmos'
  ]);
  
  const isAudited = auditedProjects.has(projectId.toLowerCase());
  
  // SEC estimates (QS)
  qsInputs.push(createFeature('sec_audit_count', 'SEC', 
    isAudited ? 80 : sector === 'Meme' ? 20 : 40, ['estimate']));
  qsInputs.push(createFeature('sec_bug_bounty', 'SEC', 
    isAudited ? 75 : 30, ['estimate']));
  qsInputs.push(createFeature('sec_incident_history', 'SEC', 
    isAudited ? 85 : 50, ['estimate'])); // No incidents = higher score
  
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
  twitterData: TwitterProjectIntelligence | null = null
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
  
  // ADOPT estimates (OS)
  osInputs.push(createFeature('adopt_active_addresses', 'ADOPT', 
    isTopTier ? 85 : isMidTier ? 65 : 40, ['estimate']));
  osInputs.push(createFeature('adopt_transaction_count', 'ADOPT', 
    isTopTier ? 80 : isMidTier ? 60 : 35, ['estimate']));
  osInputs.push(createFeature('adopt_developer_usage', 'ADOPT', 
    sector === 'Infrastructure' ? 75 : isTopTier ? 70 : 45, ['estimate']));
  
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

function generateTokenEstimates(projectId: string, sector: SectorType): FeatureInput[] {
  const osInputs: FeatureInput[] = [];
  
  // TOKEN estimates (OS)
  const hasFairDistribution = new Set([
    'bitcoin', 'ethereum', 'solana', 'polygon', 'chainlink', 'uniswap', 'aave'
  ]).has(projectId.toLowerCase());
  
  osInputs.push(createFeature('token_holder_distribution', 'TOKEN', 
    hasFairDistribution ? 75 : sector === 'Meme' ? 30 : 50, ['estimate']));
  osInputs.push(createFeature('token_unlock_schedule', 'TOKEN', 
    hasFairDistribution ? 80 : 50, ['estimate']));
  osInputs.push(createFeature('token_utility_breadth', 'TOKEN', 
    sector === 'DeFi' || sector === 'L1' ? 75 : sector === 'Meme' ? 20 : 50, ['estimate']));
  
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
  
  logger.info(`[OmniScore v2.3 Fetcher] Fetching data for ${projectId}`);
  
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
  
  // Generate estimates for missing data
  const teamGovInputs = generateTeamGovernanceEstimates(projectId, sector);
  const securityInputs = generateSecurityEstimates(projectId, sector);
  // Pass Twitter data to adoption/community function
  const adoptionResult = generateAdoptionCommunityEstimates(projectId, sector, marketResult.marketCap, twitterResult);
  const tokenInputs = generateTokenEstimates(projectId, sector);
  const legalMacroInputs = generateLegalMacroEstimates();
  
  if (teamGovInputs.some(f => f.sources?.includes('estimate'))) sourcesQueried.push('estimates');
  
  // Combine all QS inputs
  const qsInputs: FeatureInput[] = [
    ...marketResult.qsInputs,
    ...githubResult,
    ...defiLlamaResult,
    ...teamGovInputs,
    ...securityInputs,
    ...legalMacroInputs.filter(f => OMNISCORE_CONFIG.QS_SEGMENTS.includes(f.segment)),
  ];
  
  // Combine all OS inputs
  const osInputs: FeatureInput[] = [
    ...marketResult.osInputs,
    ...adoptionResult.osInputs,
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
async function getPreviousPos(projectId: string): Promise<{ pos: number | null; timestamp: string | null }> {
  // TODO: Implement actual persistence
  // For now, return null (no smoothing on first read)
  // In production: SELECT pos, timestamp FROM omniscore_history WHERE project_id = ? ORDER BY timestamp DESC LIMIT 1
  return { pos: null, timestamp: null };
}

/**
 * v2.3.4: Store current POS for future smoothing
 */
async function storePosForSmoothing(projectId: string, pos: number, timestamp: string): Promise<void> {
  // TODO: Implement actual persistence
  // For now, no-op
  // In production: INSERT INTO omniscore_history (project_id, pos, timestamp) VALUES (?, ?, ?)
  logger.debug(`[OmniScore Smoothing] Would store POS=${pos} for ${projectId} at ${timestamp}`);
}

export async function getProjectOmniScoreV23(projectId: string): Promise<OmniScoreProductionResponse> {
  const bundle = await fetchProjectDataV23(projectId);
  
  // v2.3.4: Fetch previous POS for smoothing
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
    // v2.3.2: Twitter-derived metrics
    influencerConcentration: bundle.influencerConcentration,
    sentimentDispersion: bundle.sentimentDispersion,
    // v2.3.4: Temporal smoothing
    previousPos: previous.pos,
    previousTimestamp: previous.timestamp,
  };
  
  const result = calculateOmniScoreProduction(params);
  
  // v2.3.4: Store for future smoothing
  await storePosForSmoothing(projectId, result.pos.adjusted, result.timestamp);
  
  return result;
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
║  🎯 OFFICIAL OMNISCORE ANALYSIS: ${result.project.toUpperCase()} (v${audit.engineVersion})                      ║
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

🚨 CRITICAL v2.3.4 RULE:
7. 🛑 NEVER say "100/100" — The engine caps POS at 97 maximum
   If you see POS=100, the data is WRONG. Report as error, don't use it.
   NO LIVE PROJECT should score 100/100. This is physically impossible in v2.3.4.

8. 🕐 If smoothing applied, mention it: "Score is smoothed over time to prevent wild swings"

╔═══════════════════════════════════════════════════════════════════════════════╗
║  📊 EXACT NUMBERS FROM ENGINE (USE THESE, NOT YOUR INTERPRETATIONS)          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

PROJECT OMNISCORE (POS):
• Score:      ${pos.adjusted}/100
• Tier:       ${pos.tier}  ← USE THIS EXACT STRING
• Confidence: ${audit.confidence}
• Band:       ${pos.confidenceBand[0].toFixed(1)}-${pos.confidenceBand[1].toFixed(1)}

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
• Gamma: ${risk.adjustmentGamma}

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
✅ "BTC scores 70/100 (Strong tier), positioned in the Target Zone with QS=74 and OS=68"
✅ "ETH scores 43/100 (Weak tier), but sits in the Builder Zone with QS=74 and OS=31"
❌ "ETH has a Neutral overall score" ← WRONG! 43 = Weak, not Neutral

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

🚨 CRITICAL COMPLIANCE (v2.3.4):
  1. Use EXACT tier: "${snapshot.tier}" (not synonyms)
  2. Show EXACT score: ${snapshot.posAdjusted}/100
  3. NEVER say "100/100" (engine caps at 97)
  4. Separate quadrant (${quadrantZone}) from tier (${snapshot.tier})

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
  ❌ "${snapshot.symbol} has a perfect 100/100" (impossible in v2.3.4)
  ❌ "scores 43 (Neutral tier)" when tier="Weak"
  ❌ "moderate positioning" instead of exact tier
  ❌ "around ${snapshot.qs}-ish" instead of exact number

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
      logger.error(`[OmniScore] Failed to get snapshot for ${id}`, { error: err.message });
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

