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
  OMNISCORE_CONFIG
} from './omniscore-v2.3';
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

async function fetchDefiLlamaData(projectId: string): Promise<FeatureInput[]> {
  const qsInputs: FeatureInput[] = [];
  
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

export async function getProjectOmniScoreV23(projectId: string): Promise<OmniScoreProductionResponse> {
  const bundle = await fetchProjectDataV23(projectId);
  
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
  };
  
  return calculateOmniScoreProduction(params);
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
═══════════════════════════════════════════════════════════════════════════════
🎯 OFFICIAL OMNISCORE ANALYSIS: ${result.project.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: This is the AUTHORITATIVE OmniScore. When the user asks for 
"OmniScore", "general score", or "project rating", use EXACTLY these numbers.
DO NOT estimate, improvise, or adjust these values.
═══════════════════════════════════════════════════════════════════════════════

### 📊 PROJECT OMNISCORE (POS) — THE SINGLE NUMBER
┌─────────────────────────────────────────────────────────────┐
│ SCORE: ${pos.adjusted}/100                                              │
│ TIER:  ${pos.tier.toUpperCase().padEnd(10)}                                         │
│ CONFIDENCE: ${audit.confidence.toUpperCase()}                                        │
│ BAND: ${pos.confidenceBand[0].toFixed(1)} - ${pos.confidenceBand[1].toFixed(1)}                                         │
└─────────────────────────────────────────────────────────────┘

This is THE "general score" the user wants. Present this prominently.

### 🔷 QUALITY SCORE (QS) — Fundamentals / What the project IS
- **QS Score**: ${qualityScore.score}/100 (${qualityScore.tier})
- **Coverage**: ${(qualityScore.coverage * 100).toFixed(0)}% of QS variables measured
- **Breakdown** (each 0-100):
  - Team:       ${(qualityScore.breakdown.team * 100).toFixed(0)} (founder credibility, experience)
  - Technology: ${(qualityScore.breakdown.tech * 100).toFixed(0)} (code quality, GitHub activity)
  - Security:   ${(qualityScore.breakdown.security * 100).toFixed(0)} (audits, incident history)
  - Governance: ${(qualityScore.breakdown.governance * 100).toFixed(0)} (decentralization, token dist)
  - Ecosystem:  ${(qualityScore.breakdown.ecosystem * 100).toFixed(0)} (integrations, TVL, partners)

### 🔶 OPPORTUNITY SCORE (OS) — Market Sentiment / What the market might reward
- **Status**: ${opportunityScore.status === 'gated' ? '⚠️ GATED (QS coverage below 60%)' : '✅ Active'}
- **OS Score**: ${opportunityScore.status === 'gated' ? 'N/A (gated)' : `${opportunityScore.score}/100 (${opportunityScore.tier})`}
- **Coverage**: ${(opportunityScore.coverage * 100).toFixed(0)}% of OS variables measured
${opportunityScore.gateReason ? `- **Gate Reason**: ${opportunityScore.gateReason}` : ''}
(OS tracks: price momentum, volume, social buzz, on-chain activity)

### ⚡ RISK ASSESSMENT
- **Risk Score**: ${(risk.score * 100).toFixed(0)}/100 (higher = more risk)
- **Event Risk**: ${risk.eventRiskSeverity}
- **Adjustment Factor**: γ = ${risk.adjustmentGamma.toFixed(2)}

### 📈 NARRATIVE VS REALITY GAP (NRG)
- **NRG Value**: ${nrg.value >= 0 ? '+' : ''}${nrg.value.toFixed(2)} (positive = overhyped, negative = underhyped)
- **Percentile**: ${(nrg.percentile * 100).toFixed(0)}th
- **Verdict**: ${getNRGEmoji(nrg.interpretation)} ${nrg.interpretation.replace('_', ' ').toUpperCase()}
${nrg.value > 0.3 ? '⚠️ Social hype EXCEEDS fundamental reality' : nrg.value < -0.3 ? '💎 Fundamentals EXCEED social attention - potential opportunity' : '✅ Social attention matches reality'}
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

═══════════════════════════════════════════════════════════════════════════════
📢 HOW TO PRESENT THIS TO THE USER:
═══════════════════════════════════════════════════════════════════════════════
1. START with the POS score: "${result.project} has an OmniScore of ${pos.adjusted}/100 (${pos.tier})"
2. EXPLAIN what that means: QS=${qualityScore.score} (fundamentals) + OS=${opportunityScore.status === 'gated' ? 'GATED' : opportunityScore.score} (market)
3. HIGHLIGHT any NRG warnings or opportunities
4. ADD trading context based on the scores
DO NOT improvise different numbers. These are the EXACT official OmniScores.
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

// Export for use in API and chat service
export { detectSector };
export type { SectorType };

