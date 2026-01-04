/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 PROJECT INVESTIGATION SERVICE v1.0                                     ║
 * ║                                                                               ║
 * ║   Dynamic project research for Coinet AI                                      ║
 * ║   - Fetches comprehensive data from CoinGecko                                 ║
 * ║   - Searches web for team, partnerships, news                                 ║
 * ║   - Aggregates findings with sources                                          ║
 * ║                                                                               ║
 * ║   Use this when the AI encounters an unknown project                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectInvestigation {
  hasData: boolean; // v2.9.1: Always indicates if real data was found
  projectId: string;
  symbol: string;
  name: string;
  
  // Basic Info
  description: string;
  category: string;
  categories: string[];
  launchDate?: string;
  
  // Links & Social
  links: {
    website?: string;
    whitepaper?: string;
    github?: string[];
    twitter?: string;
    telegram?: string;
    discord?: string;
    reddit?: string;
    facebook?: string;
    medium?: string;
    youtube?: string;
    announcement?: string;
  };
  
  // Market Data (VERIFIED - from CoinGecko)
  marketData: {
    currentPrice: number;
    marketCap: number;
    marketCapRank?: number;
    fullyDilutedValuation?: number;
    volume24h: number;
    volumeMarketCapRatio: number;
    priceChange24h: number;
    priceChange7d: number;
    priceChange30d: number;
    priceChange1y?: number;
    ath: number;
    athDate: string;
    athChangePercent: number;
    atl: number;
    atlDate: string;
    atlChangePercent: number;
    high24h: number;
    low24h: number;
  };
  
  // Supply Info
  supply: {
    circulating?: number;
    total?: number;
    max?: number;
  };
  
  // Developer Data (from CoinGecko)
  developerData: {
    forks: number;
    stars: number;
    subscribers: number;
    totalIssues: number;
    closedIssues: number;
    pullRequestsMerged: number;
    pullRequestContributors: number;
    codeAdditions4Weeks: number;
    codeDeletions4Weeks: number;
    commitCount4Weeks: number;
    developerScore: number;
  };
  
  // Community Data (from CoinGecko)
  communityData: {
    twitterFollowers: number;
    redditSubscribers: number;
    redditActiveAccounts?: number;
    telegramMembers: number;
    facebookLikes?: number;
    communityScore: number;
  };
  
  // Scores from CoinGecko
  scores: {
    coinGeckoScore: number;
    developerScore: number;
    communityScore: number;
    liquidityScore: number;
    publicInterestScore: number;
  };
  
  // Platform & Contracts
  platforms: Record<string, string>; // chain -> contract address
  
  // Sentiment
  sentiment: {
    upVotes: number;
    downVotes: number;
    upVotesPercentage: number;
    downVotesPercentage: number;
  };
  
  // Watchlist (popularity indicator)
  watchlistPortfolioUsers?: number;
  
  // Tickers (exchange listings)
  exchangeListings: {
    exchange: string;
    pair: string;
    volume24h: number;
    trustScore?: string;
  }[];
  
  // Additional Research (from web search)
  researchFindings?: {
    teamInfo?: string;
    partnerships?: string[];
    recentNews?: string[];
    investorsBackers?: string[];
    audits?: string[];
    uniqueFeatures?: string[];
  };
  
  // Meta
  investigatedAt: string;
  dataQuality: 'high' | 'medium' | 'low';
  sources: string[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COINGECKO COMPREHENSIVE FETCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch comprehensive project data from CoinGecko
 * This is the PRIMARY data source for investigation
 */
async function fetchCoinGeckoComprehensive(coinId: string): Promise<Partial<ProjectInvestigation> | null> {
  try {
    // CoinGecko coin detail endpoint - gets EVERYTHING
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}`,
      {
        params: {
          localization: false,
          tickers: true,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: false,
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-AI-Investigation/1.0',
        },
      }
    );
    
    const data = response.data;
    
    // Build comprehensive investigation result
    const result: Partial<ProjectInvestigation> = {
      projectId: data.id,
      symbol: data.symbol?.toUpperCase(),
      name: data.name,
      description: data.description?.en || '',
      category: data.categories?.[0] || 'Unknown',
      categories: data.categories || [],
      launchDate: data.genesis_date,
      
      links: {
        website: data.links?.homepage?.[0] || undefined,
        whitepaper: data.links?.whitepaper || undefined,
        github: data.links?.repos_url?.github?.filter((url: string) => url) || [],
        twitter: data.links?.twitter_screen_name 
          ? `https://twitter.com/${data.links.twitter_screen_name}` 
          : undefined,
        telegram: data.links?.telegram_channel_identifier 
          ? `https://t.me/${data.links.telegram_channel_identifier}` 
          : undefined,
        discord: data.links?.chat_url?.find((url: string) => url?.includes('discord')),
        reddit: data.links?.subreddit_url || undefined,
        facebook: data.links?.facebook_username 
          ? `https://facebook.com/${data.links.facebook_username}` 
          : undefined,
        medium: data.links?.official_forum_url?.find((url: string) => url?.includes('medium')),
        youtube: data.links?.official_forum_url?.find((url: string) => url?.includes('youtube')),
        announcement: data.links?.announcement_url?.[0],
      },
      
      marketData: {
        currentPrice: data.market_data?.current_price?.usd || 0,
        marketCap: data.market_data?.market_cap?.usd || 0,
        marketCapRank: data.market_cap_rank,
        fullyDilutedValuation: data.market_data?.fully_diluted_valuation?.usd,
        volume24h: data.market_data?.total_volume?.usd || 0,
        volumeMarketCapRatio: data.market_data?.market_cap?.usd 
          ? (data.market_data?.total_volume?.usd || 0) / data.market_data.market_cap.usd 
          : 0,
        priceChange24h: data.market_data?.price_change_percentage_24h || 0,
        priceChange7d: data.market_data?.price_change_percentage_7d || 0,
        priceChange30d: data.market_data?.price_change_percentage_30d || 0,
        priceChange1y: data.market_data?.price_change_percentage_1y,
        ath: data.market_data?.ath?.usd || 0,
        athDate: data.market_data?.ath_date?.usd || '',
        athChangePercent: data.market_data?.ath_change_percentage?.usd || 0,
        atl: data.market_data?.atl?.usd || 0,
        atlDate: data.market_data?.atl_date?.usd || '',
        atlChangePercent: data.market_data?.atl_change_percentage?.usd || 0,
        high24h: data.market_data?.high_24h?.usd || 0,
        low24h: data.market_data?.low_24h?.usd || 0,
      },
      
      supply: {
        circulating: data.market_data?.circulating_supply,
        total: data.market_data?.total_supply,
        max: data.market_data?.max_supply,
      },
      
      developerData: {
        forks: data.developer_data?.forks || 0,
        stars: data.developer_data?.stars || 0,
        subscribers: data.developer_data?.subscribers || 0,
        totalIssues: data.developer_data?.total_issues || 0,
        closedIssues: data.developer_data?.closed_issues || 0,
        pullRequestsMerged: data.developer_data?.pull_requests_merged || 0,
        pullRequestContributors: data.developer_data?.pull_request_contributors || 0,
        codeAdditions4Weeks: data.developer_data?.code_additions_deletions_4_weeks?.additions || 0,
        codeDeletions4Weeks: Math.abs(data.developer_data?.code_additions_deletions_4_weeks?.deletions || 0),
        commitCount4Weeks: data.developer_data?.commit_count_4_weeks || 0,
        developerScore: data.developer_score || 0,
      },
      
      communityData: {
        twitterFollowers: data.community_data?.twitter_followers || 0,
        redditSubscribers: data.community_data?.reddit_subscribers || 0,
        redditActiveAccounts: data.community_data?.reddit_accounts_active_48h,
        telegramMembers: data.community_data?.telegram_channel_user_count || 0,
        facebookLikes: data.community_data?.facebook_likes,
        communityScore: data.community_score || 0,
      },
      
      scores: {
        coinGeckoScore: data.coingecko_score || 0,
        developerScore: data.developer_score || 0,
        communityScore: data.community_score || 0,
        liquidityScore: data.liquidity_score || 0,
        publicInterestScore: data.public_interest_score || 0,
      },
      
      platforms: data.platforms || {},
      
      sentiment: {
        upVotes: data.sentiment_votes_up_percentage ? Math.round(data.sentiment_votes_up_percentage) : 0,
        downVotes: data.sentiment_votes_down_percentage ? Math.round(data.sentiment_votes_down_percentage) : 0,
        upVotesPercentage: data.sentiment_votes_up_percentage || 0,
        downVotesPercentage: data.sentiment_votes_down_percentage || 0,
      },
      
      watchlistPortfolioUsers: data.watchlist_portfolio_users,
      
      // Top 5 exchange listings by volume
      exchangeListings: (data.tickers || [])
        .filter((t: any) => t.market?.identifier)
        .sort((a: any, b: any) => (b.converted_volume?.usd || 0) - (a.converted_volume?.usd || 0))
        .slice(0, 10)
        .map((t: any) => ({
          exchange: t.market?.name || t.market?.identifier,
          pair: `${t.base}/${t.target}`,
          volume24h: t.converted_volume?.usd || 0,
          trustScore: t.trust_score,
        })),
      
      sources: ['coingecko'],
    };
    
    logger.info(`[Investigation] Fetched comprehensive CoinGecko data for ${coinId}`);
    return result;
    
  } catch (error) {
    const axiosError = error as any;
    if (axiosError.response?.status === 404) {
      logger.warn(`[Investigation] Project ${coinId} not found on CoinGecko`);
    } else {
      logger.error(`[Investigation] CoinGecko fetch error for ${coinId}:`, error);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COIN ID RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Try to resolve a symbol/name to a CoinGecko ID
 */
async function resolveCoinGeckoId(query: string): Promise<string | null> {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Common mappings
  const commonMappings: Record<string, string> = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'sol': 'solana',
    'bnb': 'binancecoin',
    'xrp': 'ripple',
    'ada': 'cardano',
    'doge': 'dogecoin',
    'dot': 'polkadot',
    'avax': 'avalanche-2',
    'matic': 'matic-network',
    'link': 'chainlink',
    'uni': 'uniswap',
    'atom': 'cosmos',
    'ltc': 'litecoin',
    'etc': 'ethereum-classic',
    'xlm': 'stellar',
    'near': 'near',
    'algo': 'algorand',
    'apt': 'aptos',
    'sui': 'sui',
    'arb': 'arbitrum',
    'op': 'optimism',
    'hbar': 'hedera-hashgraph',
    'inj': 'injective-protocol',
    'fil': 'filecoin',
    'tia': 'celestia',
    'sei': 'sei-network',
    'stx': 'blockstack',
    'aster': 'astar',
    'astr': 'astar',
    'astar': 'astar',
    'render': 'render-token',
    'rndr': 'render-token',
    'tao': 'bittensor',
    'wld': 'worldcoin-wld',
    'fet': 'fetch-ai',
    'grt': 'the-graph',
    'ar': 'arweave',
    'imx': 'immutable-x',
    'mana': 'decentraland',
    'sand': 'the-sandbox',
    'axs': 'axie-infinity',
    'gala': 'gala',
    'pepe': 'pepe',
    'shib': 'shiba-inu',
    'wif': 'dogwifcoin',
    'bonk': 'bonk',
    'floki': 'floki',
    'launchcoin': 'believe-in-something',
    'launch': 'believe-in-something',
  };
  
  // Check common mappings first
  if (commonMappings[normalizedQuery]) {
    return commonMappings[normalizedQuery];
  }
  
  // Try the query directly (many CoinGecko IDs match the name)
  try {
    const testResponse = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${normalizedQuery}`,
      { timeout: 5000 }
    );
    if (testResponse.status === 200) {
      return normalizedQuery;
    }
  } catch {
    // Not a direct match, continue
  }
  
  // Search CoinGecko
  try {
    const searchResponse = await axios.get(
      'https://api.coingecko.com/api/v3/search',
      {
        params: { query },
        timeout: 10000,
      }
    );
    
    const coins = searchResponse.data?.coins || [];
    if (coins.length > 0) {
      // Return best match
      const exactMatch = coins.find((c: any) => 
        c.symbol?.toLowerCase() === normalizedQuery ||
        c.name?.toLowerCase() === normalizedQuery ||
        c.id === normalizedQuery
      );
      return exactMatch?.id || coins[0]?.id;
    }
  } catch (error) {
    logger.warn(`[Investigation] CoinGecko search failed for ${query}:`, error);
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INVESTIGATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Investigate a project - get all available data
 */
export async function investigateProject(
  projectQuery: string,
  options: {
    includeExchangeListings?: boolean;
    searchWeb?: boolean;
  } = {}
): Promise<ProjectInvestigation> {
  const startTime = Date.now();
  logger.info(`[Investigation v2.9.1] Starting investigation for: ${projectQuery}`);

  try {
    // Resolve to CoinGecko ID
    const coinId = await resolveCoinGeckoId(projectQuery);

    if (!coinId) {
      logger.warn(`[Investigation v2.9.1] Could not resolve ${projectQuery} to a CoinGecko ID`);
      
      // Return minimal investigation with hasData: false
      return {
        hasData: false,
        projectId: projectQuery.toLowerCase(),
        symbol: projectQuery.toUpperCase(),
        name: projectQuery,
        description: '',
        category: 'Unknown',
        categories: [],
        links: {},
        marketData: {
          currentPrice: 0, marketCap: 0, volume24h: 0, volumeMarketCapRatio: 0,
          priceChange24h: 0, priceChange7d: 0, priceChange30d: 0,
          ath: 0, athDate: '', athChangePercent: 0,
          atl: 0, atlDate: '', atlChangePercent: 0,
          high24h: 0, low24h: 0,
        },
        supply: {},
        developerData: {
          forks: 0, stars: 0, subscribers: 0, totalIssues: 0, closedIssues: 0,
          pullRequestsMerged: 0, pullRequestContributors: 0,
          codeAdditions4Weeks: 0, codeDeletions4Weeks: 0, commitCount4Weeks: 0,
          developerScore: 0,
        },
        communityData: {
          twitterFollowers: 0, redditSubscribers: 0, telegramMembers: 0, communityScore: 0,
        },
        scores: {
          coinGeckoScore: 0, developerScore: 0, communityScore: 0, liquidityScore: 0, publicInterestScore: 0,
        },
        platforms: {},
        sentiment: { upVotes: 0, downVotes: 0, upVotesPercentage: 0, downVotesPercentage: 0 },
        exchangeListings: [],
        investigatedAt: new Date().toISOString(),
        dataQuality: 'low',
        sources: [],
        warnings: [
          'Could not resolve project to CoinGecko ID',
          'No data available - project may not exist or may be too new',
        ],
      };
    }

    logger.info(`[Investigation v2.9.1] Resolved ${projectQuery} to CoinGecko ID: ${coinId}`);

    // Fetch comprehensive data
    const cgData = await fetchCoinGeckoComprehensive(coinId);

    if (!cgData) {
      logger.warn(`[Investigation v2.9.1] No CoinGecko data found for ${coinId}`);
      
      // Return minimal investigation with hasData: false but correct IDs
      return {
        hasData: false,
        projectId: coinId,
        symbol: projectQuery.toUpperCase(),
        name: projectQuery,
        description: '',
        category: 'Unknown',
        categories: [],
        links: {},
        marketData: {
          currentPrice: 0, marketCap: 0, volume24h: 0, volumeMarketCapRatio: 0,
          priceChange24h: 0, priceChange7d: 0, priceChange30d: 0,
          ath: 0, athDate: '', athChangePercent: 0,
          atl: 0, atlDate: '', atlChangePercent: 0,
          high24h: 0, low24h: 0,
        },
        supply: {},
        developerData: {
          forks: 0, stars: 0, subscribers: 0, totalIssues: 0, closedIssues: 0,
          pullRequestsMerged: 0, pullRequestContributors: 0,
          codeAdditions4Weeks: 0, codeDeletions4Weeks: 0, commitCount4Weeks: 0,
          developerScore: 0,
        },
        communityData: {
          twitterFollowers: 0, redditSubscribers: 0, telegramMembers: 0, communityScore: 0,
        },
        scores: {
          coinGeckoScore: 0, developerScore: 0, communityScore: 0, liquidityScore: 0, publicInterestScore: 0,
        },
        platforms: {},
        sentiment: { upVotes: 0, downVotes: 0, upVotesPercentage: 0, downVotesPercentage: 0 },
        exchangeListings: [],
        investigatedAt: new Date().toISOString(),
        dataQuality: 'low',
        sources: [],
        warnings: [
          `CoinGecko API returned no data for ${coinId}`,
          'Project exists but comprehensive data is unavailable',
        ],
      };
    }
  
  // Calculate data quality
  const hasDescription = (cgData.description?.length || 0) > 50;
  const hasDevData = (cgData.developerData?.stars || 0) > 0 || (cgData.developerData?.commitCount4Weeks || 0) > 0;
  const hasCommunityData = (cgData.communityData?.twitterFollowers || 0) > 0;
  const hasMarketData = (cgData.marketData?.currentPrice || 0) > 0;
  
  const dataQualityScore = [hasDescription, hasDevData, hasCommunityData, hasMarketData]
    .filter(Boolean).length;
  
  const dataQuality: 'high' | 'medium' | 'low' = 
    dataQualityScore >= 3 ? 'high' : 
    dataQualityScore >= 2 ? 'medium' : 'low';
  
  // Build warnings
  const warnings: string[] = [];
  if (!hasDescription) warnings.push('Limited project description available');
  if (!hasDevData) warnings.push('No developer/GitHub data available');
  if (!hasCommunityData) warnings.push('Limited community data available');
  if ((cgData.marketData?.marketCapRank || 999) > 500) warnings.push('Low market cap rank - higher risk asset');
  if ((cgData.scores?.liquidityScore || 0) < 20) warnings.push('Low liquidity - may have high slippage');
  
  const investigation: ProjectInvestigation = {
    hasData: true, // v2.9.1: Successful data fetch
    projectId: cgData.projectId || coinId,
    symbol: cgData.symbol || projectQuery.toUpperCase(),
    name: cgData.name || projectQuery,
    description: cgData.description || '',
    category: cgData.category || 'Unknown',
    categories: cgData.categories || [],
    launchDate: cgData.launchDate,
    links: cgData.links || {},
    marketData: cgData.marketData || {
      currentPrice: 0, marketCap: 0, volume24h: 0, volumeMarketCapRatio: 0,
      priceChange24h: 0, priceChange7d: 0, priceChange30d: 0,
      ath: 0, athDate: '', athChangePercent: 0,
      atl: 0, atlDate: '', atlChangePercent: 0,
      high24h: 0, low24h: 0,
    },
    supply: cgData.supply || {},
    developerData: cgData.developerData || {
      forks: 0, stars: 0, subscribers: 0, totalIssues: 0, closedIssues: 0,
      pullRequestsMerged: 0, pullRequestContributors: 0,
      codeAdditions4Weeks: 0, codeDeletions4Weeks: 0, commitCount4Weeks: 0,
      developerScore: 0,
    },
    communityData: cgData.communityData || {
      twitterFollowers: 0, redditSubscribers: 0, telegramMembers: 0, communityScore: 0,
    },
    scores: cgData.scores || {
      coinGeckoScore: 0, developerScore: 0, communityScore: 0, liquidityScore: 0, publicInterestScore: 0,
    },
    platforms: cgData.platforms || {},
    sentiment: cgData.sentiment || { upVotes: 0, downVotes: 0, upVotesPercentage: 0, downVotesPercentage: 0 },
    watchlistPortfolioUsers: cgData.watchlistPortfolioUsers,
    exchangeListings: cgData.exchangeListings || [],
    investigatedAt: new Date().toISOString(),
    dataQuality,
    sources: ['coingecko'],
    warnings,
  };

  logger.info(`[Investigation v2.9.1] ✅ Completed investigation for ${projectQuery} in ${Date.now() - startTime}ms`, {
    quality: dataQuality,
    hasMarketData: hasMarketData,
    hasDevData: hasDevData,
    hasCommunityData: hasCommunityData,
    warningCount: warnings.length,
  });

  return investigation;
  
  } catch (error) {
    // v2.9.1: PRODUCTION ERROR HANDLING - Never return null, always return structured error
    logger.error(`[Investigation v2.9.1] ❌ Investigation failed for ${projectQuery}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return a failed investigation with clear error indicators
    return {
      hasData: false,
      projectId: projectQuery.toLowerCase(),
      symbol: projectQuery.toUpperCase(),
      name: projectQuery,
      description: '',
      category: 'Unknown',
      categories: [],
      links: {},
      marketData: {
        currentPrice: 0, marketCap: 0, volume24h: 0, volumeMarketCapRatio: 0,
        priceChange24h: 0, priceChange7d: 0, priceChange30d: 0,
        ath: 0, athDate: '', athChangePercent: 0,
        atl: 0, atlDate: '', atlChangePercent: 0,
        high24h: 0, low24h: 0,
      },
      supply: {},
      developerData: {
        forks: 0, stars: 0, subscribers: 0, totalIssues: 0, closedIssues: 0,
        pullRequestsMerged: 0, pullRequestContributors: 0,
        codeAdditions4Weeks: 0, codeDeletions4Weeks: 0, commitCount4Weeks: 0,
        developerScore: 0,
      },
      communityData: {
        twitterFollowers: 0, redditSubscribers: 0, telegramMembers: 0, communityScore: 0,
      },
      scores: {
        coinGeckoScore: 0, developerScore: 0, communityScore: 0, liquidityScore: 0, publicInterestScore: 0,
      },
      platforms: {},
      sentiment: { upVotes: 0, downVotes: 0, upVotesPercentage: 0, downVotesPercentage: 0 },
      exchangeListings: [],
      investigatedAt: new Date().toISOString(),
      dataQuality: 'low',
      sources: [],
      warnings: [
        'Investigation failed due to error',
        error instanceof Error ? error.message : 'Unknown error occurred',
      ],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR AI CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format investigation results for AI context
 * This is what gets passed to the AI for analysis
 */
export function formatInvestigationForAI(investigation: ProjectInvestigation): string {
  const { marketData, developerData, communityData, scores, links, supply } = investigation;
  
  // v2.9.1: Handle failed investigations gracefully
  if (!investigation.hasData) {
    return `
═══════════════════════════════════════════════════════════════════════════════
⚠️ PROJECT INVESTIGATION FAILED: ${investigation.name} (${investigation.symbol})
═══════════════════════════════════════════════════════════════════════════════

STATUS: Data unavailable
REASON: ${investigation.warnings.join('; ')}

⚠️ CRITICAL INSTRUCTION:
- DO NOT improvise or estimate any data for this project
- Inform the user that comprehensive project data is currently unavailable
- Only use verified market data if provided separately
- Suggest the user try again later or check official project sources

═══════════════════════════════════════════════════════════════════════════════
`;
  }

  // Format large numbers
  const formatNumber = (n: number): string => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
  };

  const formatCount = (n: number): string => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toString();
  };

  const formatPercent = (n: number): string => {
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '[unknown]';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  let context = `
═══════════════════════════════════════════════════════════════════════════════
📊 VERIFIED PROJECT INVESTIGATION: ${investigation.name} (${investigation.symbol})
DATA_QUALITY: ${investigation.dataQuality.toUpperCase()} | SOURCES: ${investigation.sources.length}
═══════════════════════════════════════════════════════════════════════════════

🔖 BASIC INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAME: ${investigation.name}
SYMBOL: ${investigation.symbol}
CATEGORY: ${investigation.category}
CATEGORIES: ${investigation.categories.join(', ') || 'Unknown'}
${investigation.launchDate ? `LAUNCH_DATE: ${formatDate(investigation.launchDate)}` : ''}
COINGECKO_ID: ${investigation.projectId}

📝 DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${investigation.description.slice(0, 1000)}${investigation.description.length > 1000 ? '...' : ''}

💰 VERIFIED MARKET DATA (from CoinGecko - USE THESE VALUES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT_PRICE: $${marketData.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 8 })}
MARKET_CAP: ${formatNumber(marketData.marketCap)}
MARKET_CAP_RANK: #${marketData.marketCapRank || 'Unknown'}
${marketData.fullyDilutedValuation ? `FDV: ${formatNumber(marketData.fullyDilutedValuation)}` : ''}
VOLUME_24H: ${formatNumber(marketData.volume24h)}
VOLUME/MCAP: ${(marketData.volumeMarketCapRatio * 100).toFixed(2)}%

PRICE_CHANGE_24H: ${formatPercent(marketData.priceChange24h)}
PRICE_CHANGE_7D: ${formatPercent(marketData.priceChange7d)}
PRICE_CHANGE_30D: ${formatPercent(marketData.priceChange30d)}
${marketData.priceChange1y ? `PRICE_CHANGE_1Y: ${formatPercent(marketData.priceChange1y)}` : ''}

HIGH_24H: $${marketData.high24h.toLocaleString(undefined, { maximumFractionDigits: 8 })}
LOW_24H: $${marketData.low24h.toLocaleString(undefined, { maximumFractionDigits: 8 })}

ALL_TIME_HIGH: $${marketData.ath.toLocaleString(undefined, { maximumFractionDigits: 8 })}
ATH_DATE: ${formatDate(marketData.athDate)}
ATH_CHANGE: ${formatPercent(marketData.athChangePercent)}

ALL_TIME_LOW: $${marketData.atl.toLocaleString(undefined, { maximumFractionDigits: 8 })}
ATL_DATE: ${formatDate(marketData.atlDate)}
ATL_CHANGE: ${formatPercent(marketData.atlChangePercent)}

📊 SUPPLY INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CIRCULATING_SUPPLY: ${supply.circulating ? formatCount(supply.circulating) : 'Unknown'}
TOTAL_SUPPLY: ${supply.total ? formatCount(supply.total) : 'Unknown'}
MAX_SUPPLY: ${supply.max ? formatCount(supply.max) : 'No max supply'}

👨‍💻 DEVELOPER DATA (GitHub Activity)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB_STARS: ${formatCount(developerData.stars)}
GITHUB_FORKS: ${formatCount(developerData.forks)}
CONTRIBUTORS: ${developerData.pullRequestContributors}
COMMITS_4_WEEKS: ${developerData.commitCount4Weeks}
CODE_ADDITIONS_4_WEEKS: ${formatCount(developerData.codeAdditions4Weeks)}
OPEN_ISSUES: ${developerData.totalIssues - developerData.closedIssues}
CLOSED_ISSUES: ${developerData.closedIssues}
PR_MERGED: ${developerData.pullRequestsMerged}
DEVELOPER_SCORE: ${developerData.developerScore.toFixed(1)}/100

👥 COMMUNITY DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TWITTER_FOLLOWERS: ${formatCount(communityData.twitterFollowers)}
REDDIT_SUBSCRIBERS: ${formatCount(communityData.redditSubscribers)}
TELEGRAM_MEMBERS: ${formatCount(communityData.telegramMembers)}
COMMUNITY_SCORE: ${communityData.communityScore.toFixed(1)}/100

⭐ COINGECKO SCORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COINGECKO_SCORE: ${scores.coinGeckoScore.toFixed(1)}/100
DEVELOPER_SCORE: ${scores.developerScore.toFixed(1)}/100
COMMUNITY_SCORE: ${scores.communityScore.toFixed(1)}/100
LIQUIDITY_SCORE: ${scores.liquidityScore.toFixed(1)}/100
PUBLIC_INTEREST: ${scores.publicInterestScore.toFixed(1)}/100

😊 COMMUNITY SENTIMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENTIMENT_UP: ${investigation.sentiment.upVotesPercentage.toFixed(1)}%
SENTIMENT_DOWN: ${investigation.sentiment.downVotesPercentage.toFixed(1)}%
${investigation.watchlistPortfolioUsers ? `WATCHLIST_USERS: ${formatCount(investigation.watchlistPortfolioUsers)}` : ''}

🔗 LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${links.website ? `WEBSITE: ${links.website}` : ''}
${links.twitter ? `TWITTER: ${links.twitter}` : ''}
${links.telegram ? `TELEGRAM: ${links.telegram}` : ''}
${links.discord ? `DISCORD: ${links.discord}` : ''}
${links.reddit ? `REDDIT: ${links.reddit}` : ''}
${links.github?.length ? `GITHUB: ${links.github[0]}` : ''}
${links.whitepaper ? `WHITEPAPER: ${links.whitepaper}` : ''}
`;

  // Add exchange listings if available
  if (investigation.exchangeListings.length > 0) {
    context += `
🏦 TOP EXCHANGE LISTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    investigation.exchangeListings.slice(0, 5).forEach(listing => {
      context += `• ${listing.exchange}: ${listing.pair} (Vol: ${formatNumber(listing.volume24h)})${listing.trustScore ? ` [${listing.trustScore}]` : ''}\n`;
    });
  }

  // Add contract addresses
  const platforms = Object.entries(investigation.platforms);
  if (platforms.length > 0) {
    context += `
📋 CONTRACT ADDRESSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    platforms.slice(0, 5).forEach(([chain, address]) => {
      if (address) {
        context += `• ${chain}: ${address.slice(0, 20)}...${address.slice(-8)}\n`;
      }
    });
  }

  // Add warnings
  if (investigation.warnings.length > 0) {
    context += `
⚠️ WARNINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    investigation.warnings.forEach(warning => {
      context += `• ${warning}\n`;
    });
  }

  context += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA_QUALITY: ${investigation.dataQuality.toUpperCase()}
SOURCES: ${investigation.sources.join(', ')}
INVESTIGATED_AT: ${investigation.investigatedAt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return context;
}

// Export singleton instance
export const projectInvestigationService = {
  investigateProject,
  formatInvestigationForAI,
  resolveCoinGeckoId,
};

export default projectInvestigationService;
