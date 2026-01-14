/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 REAL DATA SOURCES v1.0                                                 ║
 * ║                                                                               ║
 * ║   Replaces ESTIMATES with REAL DATA for OmniScore segments                   ║
 * ║                                                                               ║
 * ║   Sources Integrated:                                                         ║
 * ║   • Snapshot.org - Governance voting data (FREE)                             ║
 * ║   • DeFiLlama - Extended protocol metrics (FREE)                             ║
 * ║   • CoinGecko - Extended data fields (FREE)                                  ║
 * ║   • GoPlus Security - Token security scanning (FREE)                         ║
 * ║                                                                               ║
 * ║   Segments Improved:                                                          ║
 * ║   • GOV (Governance) - Real voting participation from Snapshot               ║
 * ║   • SEC (Security) - Real security scores from GoPlus                        ║
 * ║   • ADOPT (Adoption) - Real on-chain metrics from DeFiLlama                  ║
 * ║   • TOKEN (Tokenomics) - Real supply data from CoinGecko                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RealGovernanceData {
  hasGovernance: boolean;
  snapshotSpace?: string;
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  uniqueVoters: number;
  avgParticipation: number; // 0-100
  recentActivity: boolean;
  lastProposalDate?: string;
  sources: string[];
}

export interface RealSecurityData {
  hasSecurityData: boolean;
  securityScore: number; // 0-100
  isOpenSource: boolean;
  isProxy: boolean;
  isMintable: boolean;
  canTakeBackOwnership: boolean;
  hasHoneypot: boolean;
  hasBlacklist: boolean;
  hasTradingCooldown: boolean;
  buyTax: number;
  sellTax: number;
  holderCount: number;
  lpHolderCount: number;
  isAntiWhale: boolean;
  auditInfo?: {
    hasAudit: boolean;
    auditor?: string;
  };
  sources: string[];
}

export interface RealAdoptionData {
  hasAdoptionData: boolean;
  activeUsers24h?: number;
  activeUsers7d?: number;
  transactions24h?: number;
  transactions7d?: number;
  tvl?: number;
  tvlChange24h?: number;
  fees24h?: number;
  fees7d?: number;
  revenue24h?: number;
  revenue7d?: number;
  dexVolume24h?: number;
  sources: string[];
}

export interface RealTokenomicsData {
  hasTokenomicsData: boolean;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  circulatingPercent: number; // 0-100
  fullyDilutedValuation?: number;
  marketCapToFdvRatio?: number; // 0-1
  // Holder distribution
  top10HoldersPercent?: number;
  top50HoldersPercent?: number;
  // Inflation
  inflationRate?: number;
  sources: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT.ORG - GOVERNANCE DATA (FREE GraphQL API)
// ═══════════════════════════════════════════════════════════════════════════════

const SNAPSHOT_SPACES: Record<string, string> = {
  // Major DAOs with Snapshot spaces
  'uniswap': 'uniswap',
  'aave': 'aave.eth',
  'compound': 'comp-vote.eth',
  'maker': 'makerdao',
  'curve': 'curve.eth',
  'yearn': 'yearn',
  'sushi': 'sushigov.eth',
  'balancer': 'balancer.eth',
  'synthetix': 'snxgov.eth',
  '1inch': '1inch.eth',
  'ens': 'ens.eth',
  'gitcoin': 'gitcoin.eth',
  'arbitrum': 'arbitrumfoundation.eth',
  'optimism': 'opcollective.eth',
  'lido': 'lido-snapshot.eth',
  'frax': 'frax.eth',
  'convex': 'cvx.eth',
  'stargate': 'stgdao.eth',
  'gmx': 'gmx.eth',
  'radiant': 'radiantcapital.eth',
  'pendle': 'pendle.eth',
  'velodrome': 'velodrome.eth',
  'aura': 'aurafinance.eth',
  'pancakeswap': 'cakevote.eth',
  'cake': 'cakevote.eth',
  'hop': 'hop.eth',
  'gnosis': 'gnosis.eth',
  'safe': 'safe.eth',
  'apecoin': 'apecoin.eth',
  'ape': 'apecoin.eth',
  'shapeshift': 'shapeshiftdao.eth',
  'badger': 'badgerdao.eth',
  'bancor': 'bancornetwork.eth',
  'paraswap': 'paraswap-dao.eth',
  'ribbon': 'ribbonfinance.eth',
  'perpetual': 'perp.eth',
  'dydx': 'dydxgov.eth',
  'radicle': 'radicle.eth',
  'pooltogether': 'pooltogether.eth',
  'euler': 'eulerfinance.eth',
  'morpho': 'morpho.eth',
  // L1/L2
  'polygon': 'polygonvalidators.eth',
  'matic': 'polygonvalidators.eth',
  'cosmos': 'cosmoshub.eth',
  'atom': 'cosmoshub.eth',
  'osmosis': 'osmosiszone.eth',
  'osmo': 'osmosiszone.eth',
  'starknet': 'starknet.eth',
  'zksync': 'zksync.eth',
};

/**
 * Fetch real governance data from Snapshot.org
 */
export async function fetchSnapshotGovernance(projectId: string): Promise<RealGovernanceData> {
  const spaceId = SNAPSHOT_SPACES[projectId.toLowerCase()];
  
  if (!spaceId) {
    return {
      hasGovernance: false,
      totalProposals: 0,
      activeProposals: 0,
      totalVotes: 0,
      uniqueVoters: 0,
      avgParticipation: 0,
      recentActivity: false,
      sources: [],
    };
  }
  
  try {
    const query = `
      query {
        space(id: "${spaceId}") {
          id
          name
          proposalsCount
          votesCount
          followersCount
        }
        proposals(
          first: 20,
          skip: 0,
          where: {
            space_in: ["${spaceId}"],
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          state
          votes
          scores_total
          created
          end
        }
      }
    `;
    
    const response = await axios.post(
      'https://hub.snapshot.org/graphql',
      { query },
      { 
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const data = response.data?.data;
    if (!data?.space) {
      return {
        hasGovernance: false,
        totalProposals: 0,
        activeProposals: 0,
        totalVotes: 0,
        uniqueVoters: 0,
        avgParticipation: 0,
        recentActivity: false,
        sources: [],
      };
    }
    
    const space = data.space;
    const proposals = data.proposals || [];
    
    // Calculate metrics
    const activeProposals = proposals.filter((p: any) => p.state === 'active').length;
    const totalVotesFromProposals = proposals.reduce((sum: number, p: any) => sum + (p.votes || 0), 0);
    
    // Check for recent activity (last 30 days)
    const thirtyDaysAgo = Date.now() / 1000 - 30 * 24 * 60 * 60;
    const recentProposals = proposals.filter((p: any) => p.created > thirtyDaysAgo);
    
    // Calculate average participation (votes per proposal)
    const avgVotesPerProposal = proposals.length > 0 
      ? totalVotesFromProposals / proposals.length 
      : 0;
    
    // Normalize to 0-100 scale (assuming 1000+ votes is excellent)
    const avgParticipation = Math.min(100, (avgVotesPerProposal / 500) * 100);
    
    logger.info(`[RealData] Snapshot governance fetched for ${projectId}`, {
      space: spaceId,
      proposals: space.proposalsCount,
      votes: space.votesCount,
      followers: space.followersCount,
    });
    
    return {
      hasGovernance: true,
      snapshotSpace: spaceId,
      totalProposals: space.proposalsCount || 0,
      activeProposals,
      totalVotes: space.votesCount || 0,
      uniqueVoters: space.followersCount || 0, // Followers as proxy for potential voters
      avgParticipation: Math.round(avgParticipation),
      recentActivity: recentProposals.length > 0,
      lastProposalDate: proposals[0]?.created 
        ? new Date(proposals[0].created * 1000).toISOString() 
        : undefined,
      sources: ['snapshot.org'],
    };
    
  } catch (error) {
    logger.warn(`[RealData] Snapshot fetch failed for ${projectId}:`, error);
    return {
      hasGovernance: false,
      totalProposals: 0,
      activeProposals: 0,
      totalVotes: 0,
      uniqueVoters: 0,
      avgParticipation: 0,
      recentActivity: false,
      sources: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOPLUS SECURITY API (FREE)
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_IDS: Record<string, string> = {
  'ethereum': '1',
  'eth': '1',
  'bsc': '56',
  'bnb': '56',
  'polygon': '137',
  'matic': '137',
  'arbitrum': '42161',
  'arb': '42161',
  'optimism': '10',
  'op': '10',
  'avalanche': '43114',
  'avax': '43114',
  'fantom': '250',
  'ftm': '250',
  'base': '8453',
  'linea': '59144',
  'scroll': '534352',
  'zksync': '324',
  'solana': 'solana',
  'sol': 'solana',
};

// Contract addresses for major tokens
const TOKEN_CONTRACTS: Record<string, { chain: string; address: string }> = {
  'uniswap': { chain: '1', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' },
  'uni': { chain: '1', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' },
  'aave': { chain: '1', address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9' },
  'link': { chain: '1', address: '0x514910771af9ca656af840dff83e8264ecf986ca' },
  'chainlink': { chain: '1', address: '0x514910771af9ca656af840dff83e8264ecf986ca' },
  'maker': { chain: '1', address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2' },
  'mkr': { chain: '1', address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2' },
  'compound': { chain: '1', address: '0xc00e94cb662c3520282e6f5717214004a7f26888' },
  'comp': { chain: '1', address: '0xc00e94cb662c3520282e6f5717214004a7f26888' },
  'curve': { chain: '1', address: '0xd533a949740bb3306d119cc777fa900ba034cd52' },
  'crv': { chain: '1', address: '0xd533a949740bb3306d119cc777fa900ba034cd52' },
  'lido': { chain: '1', address: '0x5a98fcbea516cf06857215779fd812ca3bef1b32' },
  'ldo': { chain: '1', address: '0x5a98fcbea516cf06857215779fd812ca3bef1b32' },
  'shib': { chain: '1', address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce' },
  'pepe': { chain: '1', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933' },
  'ape': { chain: '1', address: '0x4d224452801aced8b2f0aebe155379bb5d594381' },
  'grt': { chain: '1', address: '0xc944e90c64b2c07662a292be6244bdf05cda44a7' },
  'ens': { chain: '1', address: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72' },
  'snx': { chain: '1', address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f' },
  'sushi': { chain: '1', address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2' },
  'bal': { chain: '1', address: '0xba100000625a3754423978a60c9317c58a424e3d' },
  'yfi': { chain: '1', address: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e' },
  '1inch': { chain: '1', address: '0x111111111117dc0aa78b770fa6a738034120c302' },
  'cake': { chain: '56', address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' },
  'pancakeswap': { chain: '56', address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' },
};

/**
 * Fetch real security data from GoPlus Security API
 */
export async function fetchGoPlusSecurity(projectId: string): Promise<RealSecurityData> {
  const tokenInfo = TOKEN_CONTRACTS[projectId.toLowerCase()];
  
  if (!tokenInfo) {
    // Can't check security without contract address
    return {
      hasSecurityData: false,
      securityScore: 0,
      isOpenSource: false,
      isProxy: false,
      isMintable: false,
      canTakeBackOwnership: false,
      hasHoneypot: false,
      hasBlacklist: false,
      hasTradingCooldown: false,
      buyTax: 0,
      sellTax: 0,
      holderCount: 0,
      lpHolderCount: 0,
      isAntiWhale: false,
      sources: [],
    };
  }
  
  try {
    const response = await axios.get(
      `https://api.gopluslabs.io/api/v1/token_security/${tokenInfo.chain}`,
      {
        params: { contract_addresses: tokenInfo.address },
        timeout: 10000,
      }
    );
    
    const result = response.data?.result?.[tokenInfo.address.toLowerCase()];
    
    if (!result) {
      return {
        hasSecurityData: false,
        securityScore: 0,
        isOpenSource: false,
        isProxy: false,
        isMintable: false,
        canTakeBackOwnership: false,
        hasHoneypot: false,
        hasBlacklist: false,
        hasTradingCooldown: false,
        buyTax: 0,
        sellTax: 0,
        holderCount: 0,
        lpHolderCount: 0,
        isAntiWhale: false,
        sources: [],
      };
    }
    
    // Calculate security score based on risk factors
    let score = 100;
    if (result.is_honeypot === '1') score -= 50;
    if (result.is_mintable === '1') score -= 10;
    if (result.can_take_back_ownership === '1') score -= 15;
    if (result.is_blacklisted === '1') score -= 10;
    if (result.is_proxy === '1') score -= 5;
    if (result.trading_cooldown === '1') score -= 5;
    if (parseFloat(result.buy_tax || '0') > 5) score -= 10;
    if (parseFloat(result.sell_tax || '0') > 5) score -= 10;
    if (result.is_open_source !== '1') score -= 15;
    
    score = Math.max(0, score);
    
    logger.info(`[RealData] GoPlus security fetched for ${projectId}`, {
      securityScore: score,
      isHoneypot: result.is_honeypot,
      isMintable: result.is_mintable,
      holderCount: result.holder_count,
    });
    
    return {
      hasSecurityData: true,
      securityScore: score,
      isOpenSource: result.is_open_source === '1',
      isProxy: result.is_proxy === '1',
      isMintable: result.is_mintable === '1',
      canTakeBackOwnership: result.can_take_back_ownership === '1',
      hasHoneypot: result.is_honeypot === '1',
      hasBlacklist: result.is_blacklisted === '1',
      hasTradingCooldown: result.trading_cooldown === '1',
      buyTax: parseFloat(result.buy_tax || '0') * 100,
      sellTax: parseFloat(result.sell_tax || '0') * 100,
      holderCount: parseInt(result.holder_count || '0', 10),
      lpHolderCount: parseInt(result.lp_holder_count || '0', 10),
      isAntiWhale: result.is_anti_whale === '1',
      sources: ['goplus'],
    };
    
  } catch (error) {
    logger.warn(`[RealData] GoPlus fetch failed for ${projectId}:`, error);
    return {
      hasSecurityData: false,
      securityScore: 0,
      isOpenSource: false,
      isProxy: false,
      isMintable: false,
      canTakeBackOwnership: false,
      hasHoneypot: false,
      hasBlacklist: false,
      hasTradingCooldown: false,
      buyTax: 0,
      sellTax: 0,
      holderCount: 0,
      lpHolderCount: 0,
      isAntiWhale: false,
      sources: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFILLAMA EXTENDED - PROTOCOL METRICS (FREE)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFILLAMA_SLUGS: Record<string, string> = {
  'uniswap': 'uniswap',
  'uni': 'uniswap',
  'aave': 'aave',
  'compound': 'compound-finance',
  'comp': 'compound-finance',
  'curve': 'curve-dex',
  'crv': 'curve-dex',
  'lido': 'lido',
  'ldo': 'lido',
  'maker': 'makerdao',
  'mkr': 'makerdao',
  'convex': 'convex-finance',
  'cvx': 'convex-finance',
  'yearn': 'yearn-finance',
  'yfi': 'yearn-finance',
  'gmx': 'gmx',
  'dydx': 'dydx',
  'pancakeswap': 'pancakeswap',
  'cake': 'pancakeswap',
  'synthetix': 'synthetix',
  'snx': 'synthetix',
  'balancer': 'balancer-v2',
  'bal': 'balancer-v2',
  'frax': 'frax',
  'pendle': 'pendle',
  'velodrome': 'velodrome',
  'aerodrome': 'aerodrome',
  'sushi': 'sushi',
  'sushiswap': 'sushi',
  'jupiter': 'jupiter',
  'jup': 'jupiter',
  'raydium': 'raydium',
  'orca': 'orca',
  'morpho': 'morpho',
  'ethena': 'ethena',
  'eigen': 'eigenlayer',
  'eigenlayer': 'eigenlayer',
  'thorchain': 'thorchain',
  'rune': 'thorchain',
  'osmosis': 'osmosis-dex',
  'osmo': 'osmosis-dex',
  'instadapp': 'instadapp',
  'liquity': 'liquity',
  'lqty': 'liquity',
  'ribbon': 'ribbon-finance',
  'benqi': 'benqi-lending',
  'qi': 'benqi-lending',
  'trader-joe': 'trader-joe',
  'joe': 'trader-joe',
};

/**
 * Fetch real adoption metrics from DeFiLlama
 */
export async function fetchDeFiLlamaAdoption(projectId: string): Promise<RealAdoptionData> {
  const slug = DEFILLAMA_SLUGS[projectId.toLowerCase()];
  
  if (!slug) {
    return {
      hasAdoptionData: false,
      sources: [],
    };
  }
  
  try {
    // Fetch protocol details
    const [protocolResponse, feesResponse] = await Promise.all([
      axios.get(`https://api.llama.fi/protocol/${slug}`, { timeout: 10000 }),
      axios.get(`https://api.llama.fi/summary/fees/${slug}`, { timeout: 10000 }).catch(() => null),
    ]);
    
    const protocol = protocolResponse.data;
    const fees = feesResponse?.data;
    
    // Calculate TVL change
    const tvlHistory = protocol.tvl || [];
    const currentTvl = tvlHistory.length > 0 ? tvlHistory[tvlHistory.length - 1]?.totalLiquidityUSD : protocol.tvl;
    const tvl24hAgo = tvlHistory.length > 1 ? tvlHistory[tvlHistory.length - 2]?.totalLiquidityUSD : currentTvl;
    const tvlChange24h = tvl24hAgo > 0 ? ((currentTvl - tvl24hAgo) / tvl24hAgo) * 100 : 0;
    
    logger.info(`[RealData] DeFiLlama adoption fetched for ${projectId}`, {
      tvl: currentTvl,
      tvlChange24h,
      hasFees: !!fees,
    });
    
    return {
      hasAdoptionData: true,
      tvl: typeof protocol.tvl === 'number' ? protocol.tvl : currentTvl,
      tvlChange24h,
      fees24h: fees?.total24h,
      fees7d: fees?.total7d,
      revenue24h: fees?.totalRevenue24h,
      revenue7d: fees?.totalRevenue7d,
      sources: ['defillama'],
    };
    
  } catch (error) {
    logger.warn(`[RealData] DeFiLlama adoption fetch failed for ${projectId}:`, error);
    return {
      hasAdoptionData: false,
      sources: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COINGECKO EXTENDED - TOKENOMICS (FREE)
// ═══════════════════════════════════════════════════════════════════════════════

const COINGECKO_IDS: Record<string, string> = {
  'btc': 'bitcoin',
  'bitcoin': 'bitcoin',
  'eth': 'ethereum',
  'ethereum': 'ethereum',
  'sol': 'solana',
  'solana': 'solana',
  'bnb': 'binancecoin',
  'xrp': 'ripple',
  'ada': 'cardano',
  'doge': 'dogecoin',
  'avax': 'avalanche-2',
  'dot': 'polkadot',
  'matic': 'matic-network',
  'link': 'chainlink',
  'uni': 'uniswap',
  'atom': 'cosmos',
  'ltc': 'litecoin',
  'near': 'near',
  'apt': 'aptos',
  'sui': 'sui',
  'arb': 'arbitrum',
  'op': 'optimism',
  'hbar': 'hedera-hashgraph',
  'inj': 'injective-protocol',
  'fil': 'filecoin',
  'aster': 'astar',
  'astr': 'astar',
  'astar': 'astar',
  'render': 'render-token',
  'rndr': 'render-token',
  'tao': 'bittensor',
  'wld': 'worldcoin-wld',
  'grt': 'the-graph',
  'aave': 'aave',
  'mkr': 'maker',
  'snx': 'havven',
  'crv': 'curve-dao-token',
  'ldo': 'lido-dao',
  'comp': 'compound-governance-token',
  'yfi': 'yearn-finance',
  'sushi': 'sushi',
  'bal': 'balancer',
  '1inch': '1inch',
  'cake': 'pancakeswap-token',
  'pendle': 'pendle',
  'gmx': 'gmx',
  'dydx': 'dydx',
  'rune': 'thorchain',
  'osmo': 'osmosis',
  'jup': 'jupiter-exchange-solana',
  'ena': 'ethena',
  'eigen': 'eigenlayer',
  'pepe': 'pepe',
  'shib': 'shiba-inu',
  'wif': 'dogwifcoin',
  'bonk': 'bonk',
  'floki': 'floki',
};

// Cache for tokenomics data to reduce API calls
const tokenomicsCache: Map<string, { data: RealTokenomicsData; timestamp: number }> = new Map();
const TOKENOMICS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting for CoinGecko API
let lastCoinGeckoRequest = 0;
const COINGECKO_MIN_INTERVAL_MS = 2000; // 2 seconds between requests (conservative)

/**
 * Fetch real tokenomics data from CoinGecko with caching and rate limiting
 */
export async function fetchCoinGeckoTokenomics(projectId: string): Promise<RealTokenomicsData> {
  const coinId = COINGECKO_IDS[projectId.toLowerCase()] || projectId.toLowerCase();
  
  // Check cache first
  const cached = tokenomicsCache.get(coinId);
  if (cached && Date.now() - cached.timestamp < TOKENOMICS_CACHE_TTL_MS) {
    logger.debug(`[RealData] Using cached tokenomics for ${projectId}`);
    return cached.data;
  }
  
  // Rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastCoinGeckoRequest;
  if (timeSinceLastRequest < COINGECKO_MIN_INTERVAL_MS) {
    const waitTime = COINGECKO_MIN_INTERVAL_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastCoinGeckoRequest = Date.now();
  
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-RealData/1.0',
        },
      }
    );
    
    // Handle rate limit response (429)
    if (response.status === 429) {
      logger.warn(`[RealData] CoinGecko rate limited for ${projectId}, using cache or fallback`);
      // Return cached data if available (even if stale)
      if (cached) {
        return cached.data;
      }
      return {
        hasTokenomicsData: false,
        circulatingSupply: 0,
        totalSupply: 0,
        circulatingPercent: 0,
        sources: [],
      };
    }
    
    const data = response.data;
    const marketData = data.market_data;
    
    if (!marketData) {
      const emptyResult: RealTokenomicsData = {
        hasTokenomicsData: false,
        circulatingSupply: 0,
        totalSupply: 0,
        circulatingPercent: 0,
        sources: [],
      };
      tokenomicsCache.set(coinId, { data: emptyResult, timestamp: Date.now() });
      return emptyResult;
    }
    
    const circulatingSupply = marketData.circulating_supply || 0;
    const totalSupply = marketData.total_supply || circulatingSupply;
    const maxSupply = marketData.max_supply;
    
    // Calculate circulating percent (how much is in circulation)
    const supplyBase = maxSupply || totalSupply;
    const circulatingPercent = supplyBase > 0 
      ? (circulatingSupply / supplyBase) * 100 
      : 100;
    
    // Market cap to FDV ratio
    const marketCap = marketData.market_cap?.usd || 0;
    const fdv = marketData.fully_diluted_valuation?.usd;
    const mcapToFdv = fdv && fdv > 0 ? marketCap / fdv : undefined;
    
    logger.debug(`[RealData] CoinGecko tokenomics fetched for ${projectId}`, {
      circulatingSupply,
      totalSupply,
      circulatingPercent,
    });
    
    const result: RealTokenomicsData = {
      hasTokenomicsData: true,
      circulatingSupply,
      totalSupply,
      maxSupply: maxSupply || undefined,
      circulatingPercent: Math.round(circulatingPercent * 10) / 10,
      fullyDilutedValuation: fdv,
      marketCapToFdvRatio: mcapToFdv ? Math.round(mcapToFdv * 100) / 100 : undefined,
      sources: ['coingecko'],
    };
    
    // Cache the result
    tokenomicsCache.set(coinId, { data: result, timestamp: Date.now() });
    
    return result;
    
  } catch (error: any) {
    // Log with less noise if it's a rate limit or common error
    const isRateLimit = error.response?.status === 429;
    if (isRateLimit) {
      logger.debug(`[RealData] CoinGecko rate limited for ${projectId}`);
    } else {
      logger.warn(`[RealData] CoinGecko tokenomics fetch failed for ${projectId}:`, error.message);
    }
    
    // Return cached data if available (even if stale)
    if (cached) {
      return cached.data;
    }
    
    return {
      hasTokenomicsData: false,
      circulatingSupply: 0,
      totalSupply: 0,
      circulatingPercent: 0,
      sources: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AGGREGATOR - FETCH ALL REAL DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface AllRealData {
  governance: RealGovernanceData;
  security: RealSecurityData;
  adoption: RealAdoptionData;
  tokenomics: RealTokenomicsData;
  fetchedAt: string;
  allSources: string[];
}

/**
 * Fetch all real data sources for a project
 */
export async function fetchAllRealData(projectId: string): Promise<AllRealData> {
  const startTime = Date.now();
  
  // Fetch all data sources in parallel
  const [governance, security, adoption, tokenomics] = await Promise.all([
    fetchSnapshotGovernance(projectId),
    fetchGoPlusSecurity(projectId),
    fetchDeFiLlamaAdoption(projectId),
    fetchCoinGeckoTokenomics(projectId),
  ]);
  
  // Aggregate all sources
  const allSources = [
    ...governance.sources,
    ...security.sources,
    ...adoption.sources,
    ...tokenomics.sources,
  ];
  
  logger.info(`[RealData] All real data fetched for ${projectId} in ${Date.now() - startTime}ms`, {
    hasGovernance: governance.hasGovernance,
    hasSecurity: security.hasSecurityData,
    hasAdoption: adoption.hasAdoptionData,
    hasTokenomics: tokenomics.hasTokenomicsData,
    sources: allSources,
  });
  
  return {
    governance,
    security,
    adoption,
    tokenomics,
    fetchedAt: new Date().toISOString(),
    allSources,
  };
}

export default {
  fetchSnapshotGovernance,
  fetchGoPlusSecurity,
  fetchDeFiLlamaAdoption,
  fetchCoinGeckoTokenomics,
  fetchAllRealData,
};
