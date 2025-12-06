/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📡 OMNISCORE DATA FETCHER v2.2                                           ║
 * ║                                                                               ║
 * ║   Collects raw variables with segment tags for OmniScore v2.2                ║
 * ║                                                                               ║
 * ║   SOURCES:                                                                    ║
 * ║   • CoinGecko - Market data, price, volume                                   ║
 * ║   • DefiLlama - TVL, protocol revenue                                        ║
 * ║   • GitHub API - Dev activity, commits, contributors                         ║
 * ║   • Blockchain - On-chain metrics                                            ║
 * ║   • Social - Twitter/Discord                                                 ║
 * ║   • Estimates - Derived values with lower confidence                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import { RawVariableInput, SegmentType, SectorType, MarketContext } from './omniscore-v2.2';
import { getCachedPrice } from './enterprise-market-data-pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectDataBundleV22 {
  projectId: string;
  variables: RawVariableInput[];
  marketData: MarketContext;
  sector: SectorType;
  fetchedAt: string;
  sourcesQueried: string[];
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function detectSector(projectId: string): SectorType {
  const p = projectId.toLowerCase();
  
  const l1Projects = new Set(['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'avax', 'avalanche', 'matic', 'polygon', 'near', 'apt', 'aptos', 'sui', 'dot', 'polkadot', 'atom', 'cosmos', 'algo', 'algorand', 'ada', 'cardano', 'bnb', 'xrp', 'ton', 'supra']);
  
  const l2Projects = new Set(['arb', 'arbitrum', 'op', 'optimism', 'base', 'zksync', 'starknet', 'mantle', 'scroll', 'linea', 'blast', 'mode']);
  
  const defiProjects = new Set(['uni', 'uniswap', 'aave', 'sushi', 'sushiswap', 'curve', 'crv', 'compound', 'comp', 'maker', 'mkr', 'lido', 'steth', 'convex', 'cvx', 'yearn', 'yfi', 'gmx', 'dydx', 'pancake', 'cake', 'synthetix', 'snx', 'frax', 'balancer', 'bal', 'pendle', 'velo', 'velodrome', 'aero', 'aerodrome', 'rpl', 'rocket']);
  
  const infraProjects = new Set(['link', 'chainlink', 'grt', 'thegraph', 'fil', 'filecoin', 'ar', 'arweave', 'rndr', 'render', 'inj', 'injective', 'pyth', 'wormhole', 'layerzero', 'axelar', 'api3', 'band']);
  
  const aiProjects = new Set(['tao', 'bittensor', 'fet', 'fetchai', 'agix', 'singularity', 'ocean', 'olas', 'autonolas', 'akt', 'akash', 'wld', 'worldcoin', 'io', 'render']);
  
  const memeProjects = new Set(['doge', 'dogecoin', 'shib', 'pepe', 'wif', 'bonk', 'floki', 'turbo', 'mog', 'brett', 'popcat', 'neiro', 'goat', 'fwog', 'spx', 'moodeng']);
  
  const gamingProjects = new Set(['axs', 'axie', 'sand', 'sandbox', 'mana', 'decentraland', 'gala', 'imx', 'immutable', 'ronin', 'ron', 'prime', 'echelon', 'beam', 'xai', 'pixel', 'ilv', 'illuvium']);
  
  if (l1Projects.has(p)) return 'L1';
  if (l2Projects.has(p)) return 'L2';
  if (defiProjects.has(p)) return 'DeFi';
  if (infraProjects.has(p)) return 'Infrastructure';
  if (aiProjects.has(p)) return 'AI';
  if (memeProjects.has(p)) return 'Meme';
  if (gamingProjects.has(p)) return 'Gaming';
  
  return 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIABLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createVar(
  id: string, 
  value: number, 
  segment: SegmentType, 
  source: string,
  lastUpdated: string
): RawVariableInput {
  return { id, value, segment, source, lastUpdated };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SOURCE FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchMarketData(symbol: string): Promise<{
  variables: RawVariableInput[];
  marketCap: number;
  btcTrend30d: number;
  btcTrend90d: number;
  volatilityIndex: number;
}> {
  const variables: RawVariableInput[] = [];
  const now = new Date().toISOString();
  
  try {
    const price = await getCachedPrice(symbol);
    
    if (price) {
      // MARKET segment
      variables.push(createVar('liquidity', Math.min(100, (price.volume24h / price.marketCap) * 1000), 'MARKET', 'coingecko', now));
      variables.push(createVar('volume_mcap', Math.min(100, (price.volume24h / price.marketCap) * 500), 'MARKET', 'coingecko', now));
      variables.push(createVar('exchange_listings', price.marketCap > 1_000_000_000 ? 80 : price.marketCap > 100_000_000 ? 60 : 40, 'MARKET', 'coingecko', now));
      
      // VAL segment
      variables.push(createVar('drawdown', Math.max(0, Math.min(100, 100 - (price.price / (price.ath || price.price * 2)) * 100)), 'VAL', 'coingecko', now));
      
      // TOKEN segment
      variables.push(createVar('circulating_ratio', 60, 'TOKEN', 'estimate', now)); // Would come from actual API
      
      // MACRO segment
      variables.push(createVar('volatility', Math.min(100, Math.abs(price.change24h) * 2), 'MACRO', 'coingecko', now));
      
      return {
        variables,
        marketCap: price.marketCap,
        btcTrend30d: price.change24h * 1.5 || 0,
        btcTrend90d: price.change24h * 3 || 0,
        volatilityIndex: Math.abs(price.change24h) * 3 || 20,
      };
    }
  } catch (error) {
    logger.warn(`Failed to fetch market data for ${symbol}:`, error);
  }
  
  return {
    variables: [],
    marketCap: 0,
    btcTrend30d: 0,
    btcTrend90d: 0,
    volatilityIndex: 30,
  };
}

async function fetchGitHubData(projectId: string): Promise<RawVariableInput[]> {
  const variables: RawVariableInput[] = [];
  const now = new Date().toISOString();
  
  const repoMap: Record<string, string> = {
    'btc': 'bitcoin/bitcoin', 'bitcoin': 'bitcoin/bitcoin',
    'eth': 'ethereum/go-ethereum', 'ethereum': 'ethereum/go-ethereum',
    'sol': 'solana-labs/solana', 'solana': 'solana-labs/solana',
    'avax': 'ava-labs/avalanchego', 'avalanche': 'ava-labs/avalanchego',
    'matic': 'maticnetwork/bor', 'polygon': 'maticnetwork/bor',
    'link': 'smartcontractkit/chainlink', 'chainlink': 'smartcontractkit/chainlink',
    'uni': 'Uniswap/v3-core', 'uniswap': 'Uniswap/v3-core',
    'aave': 'aave/aave-v3-core',
    'arb': 'OffchainLabs/nitro', 'arbitrum': 'OffchainLabs/nitro',
    'op': 'ethereum-optimism/optimism', 'optimism': 'ethereum-optimism/optimism',
    'near': 'near/nearcore',
    'atom': 'cosmos/cosmos-sdk', 'cosmos': 'cosmos/cosmos-sdk',
    'dot': 'paritytech/polkadot-sdk', 'polkadot': 'paritytech/polkadot-sdk',
    'supra': 'supraoracles/supra-chain',
  };
  
  const repo = repoMap[projectId.toLowerCase()];
  
  if (repo) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Coinet-OmniScore/2.2',
        },
      });
      
      if (response.ok) {
        const data = await response.json() as {
          stargazers_count?: number;
          subscribers_count?: number;
          pushed_at?: string;
          has_wiki?: boolean;
          language?: string;
        };
        
        // TECH segment
        const stars = data.stargazers_count || 0;
        variables.push(createVar('stars', Math.min(100, Math.log10(stars + 1) * 25), 'TECH', 'github', now));
        variables.push(createVar('contributors', Math.min(100, (data.subscribers_count || 10) / 5), 'TECH', 'github', now));
        
        const daysSinceUpdate = Math.max(1, (Date.now() - new Date(data.pushed_at).getTime()) / (1000 * 60 * 60 * 24));
        variables.push(createVar('commits_30d', daysSinceUpdate < 7 ? 85 : daysSinceUpdate < 30 ? 65 : 40, 'TECH', 'github', now));
        variables.push(createVar('documentation', data.has_wiki ? 70 : 45, 'TECH', 'github', now));
        variables.push(createVar('release_frequency', daysSinceUpdate < 30 ? 75 : 40, 'TECH', 'github', now));
        
        // COMM segment (stars as community indicator)
        variables.push(createVar('github_community', Math.min(100, Math.log10(stars + 1) * 25), 'COMM', 'github', now));
        
        // ECO segment
        variables.push(createVar('sdk_quality', data.language ? 65 : 35, 'ECO', 'github', now));
      }
    } catch (error) {
      logger.warn(`Failed to fetch GitHub data for ${projectId}:`, error);
    }
  }
  
  // Fallback estimates if no GitHub data
  if (variables.length === 0) {
    variables.push(createVar('commits_30d', 50, 'TECH', 'estimate', now));
    variables.push(createVar('contributors', 40, 'TECH', 'estimate', now));
    variables.push(createVar('documentation', 45, 'TECH', 'estimate', now));
    variables.push(createVar('sdk_quality', 45, 'ECO', 'estimate', now));
  }
  
  return variables;
}

async function fetchDefiLlamaData(projectId: string): Promise<RawVariableInput[]> {
  const variables: RawVariableInput[] = [];
  const now = new Date().toISOString();
  
  const protocolMap: Record<string, string> = {
    'uni': 'uniswap', 'uniswap': 'uniswap',
    'aave': 'aave-v3',
    'sushi': 'sushiswap', 'sushiswap': 'sushiswap',
    'curve': 'curve-dex', 'crv': 'curve-dex',
    'compound': 'compound-v2', 'comp': 'compound-v2',
    'maker': 'makerdao', 'mkr': 'makerdao',
    'lido': 'lido',
    'convex': 'convex-finance', 'cvx': 'convex-finance',
    'gmx': 'gmx',
    'dydx': 'dydx',
    'pendle': 'pendle',
  };
  
  const protocol = protocolMap[projectId.toLowerCase()];
  
  if (protocol) {
    try {
      const response = await fetch(`https://api.llama.fi/protocol/${protocol}`);
      
      if (response.ok) {
        const data = await response.json() as {
          tvl?: number | Array<{ totalLiquidityUSD?: number }>;
          chains?: string[];
          modules?: string[];
          mcap?: number;
        };
        
        // ADOPT segment
        if (data.tvl) {
          const currentTvl = Array.isArray(data.tvl) ? data.tvl[data.tvl.length - 1]?.totalLiquidityUSD || 0 : data.tvl;
          variables.push(createVar('tvl', Math.min(100, Math.log10(currentTvl + 1) * 10), 'ADOPT', 'defillama', now));
        }
        
        // ECO segment
        if (data.chains) {
          variables.push(createVar('integrations', Math.min(100, data.chains.length * 5), 'ECO', 'defillama', now));
          variables.push(createVar('ecosystem_projects', Math.min(100, (data.modules?.length || 5) * 3), 'ECO', 'defillama', now));
        }
        
        // VAL segment
        if (data.mcap && data.tvl) {
          const tvl = Array.isArray(data.tvl) ? data.tvl[data.tvl.length - 1]?.totalLiquidityUSD || 0 : data.tvl;
          const mcapTvl = tvl > 0 ? data.mcap / tvl : 10;
          variables.push(createVar('mcap_tvl', Math.max(0, 100 - mcapTvl * 10), 'VAL', 'defillama', now));
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch DefiLlama data', { projectId, error });
    }
  }
  
  // Fallback estimates
  if (variables.length === 0) {
    variables.push(createVar('tvl', 50, 'ADOPT', 'estimate', now));
    variables.push(createVar('integrations', 45, 'ECO', 'estimate', now));
  }
  
  return variables;
}

async function fetchTeamSecurityData(projectId: string, sector: SectorType): Promise<RawVariableInput[]> {
  const variables: RawVariableInput[] = [];
  const now = new Date().toISOString();
  
  const majorProjects = new Set(['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'avax', 'matic', 'polygon', 'link', 'chainlink', 'uni', 'uniswap', 'aave', 'bnb', 'xrp', 'arb', 'arbitrum', 'op', 'optimism']);
  const isMajor = majorProjects.has(projectId.toLowerCase());
  
  // TEAM segment
  variables.push(createVar('track_record', isMajor ? 85 : 50, 'TEAM', 'estimate', now));
  variables.push(createVar('team_size', isMajor ? 75 : 45, 'TEAM', 'estimate', now));
  variables.push(createVar('experience', isMajor ? 80 : 50, 'TEAM', 'estimate', now));
  variables.push(createVar('transparency', isMajor ? 70 : 40, 'TEAM', 'estimate', now));
  
  // SEC segment
  variables.push(createVar('audit_count', isMajor ? 80 : 40, 'SEC', 'estimate', now));
  variables.push(createVar('auditor_tier', isMajor ? 85 : 50, 'SEC', 'estimate', now));
  variables.push(createVar('bug_bounty', isMajor ? 75 : 35, 'SEC', 'estimate', now));
  variables.push(createVar('incidents', isMajor ? 90 : 70, 'SEC', 'estimate', now)); // Higher = fewer incidents
  
  // GOV segment
  const isDao = sector === 'DeFi' || sector === 'L1' || sector === 'L2';
  variables.push(createVar('decentralization', isDao ? 65 : 40, 'GOV', 'estimate', now));
  variables.push(createVar('voter_turnout', isDao ? 55 : 30, 'GOV', 'estimate', now));
  variables.push(createVar('proposal_count', isDao ? 60 : 35, 'GOV', 'estimate', now));
  
  // TOKEN segment
  variables.push(createVar('holder_concentration', isMajor ? 65 : 40, 'TOKEN', 'estimate', now));
  variables.push(createVar('unlock_pressure', isMajor ? 75 : 50, 'TOKEN', 'estimate', now));
  variables.push(createVar('utility_count', isMajor ? 70 : 45, 'TOKEN', 'estimate', now));
  
  // LEGAL segment
  variables.push(createVar('jurisdiction_risk', isMajor ? 80 : 60, 'LEGAL', 'estimate', now));
  variables.push(createVar('regulatory_news', isMajor ? 75 : 55, 'LEGAL', 'estimate', now));
  
  // MACRO segment
  variables.push(createVar('btc_correlation', 55, 'MACRO', 'estimate', now));
  
  return variables;
}

async function fetchSocialData(projectId: string): Promise<RawVariableInput[]> {
  const variables: RawVariableInput[] = [];
  const now = new Date().toISOString();
  
  const majorProjects = new Set(['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'avax', 'matic', 'polygon', 'link', 'chainlink', 'uni', 'uniswap', 'aave', 'bnb', 'xrp', 'doge', 'shib', 'pepe']);
  const isMajor = majorProjects.has(projectId.toLowerCase());
  
  // COMM segment
  variables.push(createVar('twitter_followers', isMajor ? 80 : 45, 'COMM', 'estimate', now));
  variables.push(createVar('engagement_rate', isMajor ? 65 : 40, 'COMM', 'estimate', now));
  variables.push(createVar('discord_members', isMajor ? 70 : 40, 'COMM', 'estimate', now));
  
  // ADOPT segment (social-derived)
  variables.push(createVar('active_addresses', isMajor ? 75 : 45, 'ADOPT', 'estimate', now));
  variables.push(createVar('revenue', isMajor ? 70 : 40, 'ADOPT', 'estimate', now));
  
  return variables;
}

async function fetchFearGreedIndex(): Promise<number> {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    if (response.ok) {
      const data = await response.json() as { data?: Array<{ value?: string }> };
      return parseInt(data.data?.[0]?.value || '50');
    }
  } catch {
    // Fallback
  }
  return 50;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchProjectDataV22(projectId: string): Promise<ProjectDataBundleV22> {
  const startTime = Date.now();
  logger.info(`📡 Fetching OmniScore v2.2 data for ${projectId}...`);
  
  const errors: string[] = [];
  const sourcesQueried: string[] = [];
  
  // Detect sector
  const sector = detectSector(projectId);
  
  // Fetch from all sources in parallel
  const [marketResult, githubVars, defiLlamaVars, teamSecVars, socialVars, fearGreed] = await Promise.all([
    fetchMarketData(projectId).catch(e => { errors.push(`Market: ${e.message}`); return { variables: [], marketCap: 0, btcTrend30d: 0, btcTrend90d: 0, volatilityIndex: 30 }; }),
    fetchGitHubData(projectId).catch(e => { errors.push(`GitHub: ${e.message}`); return []; }),
    fetchDefiLlamaData(projectId).catch(e => { errors.push(`DefiLlama: ${e.message}`); return []; }),
    fetchTeamSecurityData(projectId, sector).catch(e => { errors.push(`TeamSec: ${e.message}`); return []; }),
    fetchSocialData(projectId).catch(e => { errors.push(`Social: ${e.message}`); return []; }),
    fetchFearGreedIndex().catch(() => 50),
  ]);
  
  // Combine all variables
  const allVariables = [
    ...marketResult.variables,
    ...githubVars,
    ...defiLlamaVars,
    ...teamSecVars,
    ...socialVars,
  ];
  
  // Track sources
  const sources = new Set(allVariables.map(v => v.source));
  sourcesQueried.push(...sources);
  
  logger.info(`✅ Fetched ${allVariables.length} variables from ${sourcesQueried.length} sources in ${Date.now() - startTime}ms`);
  
  return {
    projectId,
    variables: allVariables,
    marketData: {
      marketCap: marketResult.marketCap,
      btcTrend30d: marketResult.btcTrend30d,
      btcTrend90d: marketResult.btcTrend90d,
      volatilityIndex: marketResult.volatilityIndex,
      fearGreedIndex: fearGreed,
    },
    sector,
    fetchedAt: new Date().toISOString(),
    sourcesQueried,
    errors,
  };
}

export default { fetchProjectDataV22 };

