import { apiManager } from './ApiManager';

export interface CoinGeckoConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  rateLimitRequests?: number;
  rateLimitWindowMs?: number;
}

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: any;
  last_updated: string;
}

export interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  asset_platform_id: string;
  platforms: Record<string, string>;
  detail_platforms: Record<string, any>;
  block_time_in_minutes: number;
  hashing_algorithm: string;
  categories: string[];
  public_notice: string;
  additional_notices: string[];
  description: {
    en: string;
  };
  links: {
    homepage: string[];
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    announcement_url: string[];
    twitter_screen_name: string;
    facebook_username: string;
    bitcointalk_thread_identifier: number;
    telegram_channel_identifier: string;
    subreddit_url: string;
    repos_url: {
      github: string[];
      bitbucket: string[];
    };
  };
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  country_origin: string;
  genesis_date: string;
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  watchlist_portfolio_users: number;
  market_cap_rank: number;
  coingecko_rank: number;
  coingecko_score: number;
  developer_score: number;
  community_score: number;
  liquidity_score: number;
  public_interest_score: number;
  market_data: {
    current_price: Record<string, number>;
    total_value_locked: any;
    mcap_to_tvl_ratio: any;
    fdv_to_tvl_ratio: any;
    roi: any;
    ath: Record<string, number>;
    ath_change_percentage: Record<string, number>;
    ath_date: Record<string, string>;
    atl: Record<string, number>;
    atl_change_percentage: Record<string, number>;
    atl_date: Record<string, string>;
    market_cap: Record<string, number>;
    market_cap_rank: number;
    fully_diluted_valuation: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_14d: number;
    price_change_percentage_30d: number;
    price_change_percentage_60d: number;
    price_change_percentage_200d: number;
    price_change_percentage_1y: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    price_change_24h_in_currency: Record<string, number>;
    price_change_percentage_1h_in_currency: Record<string, number>;
    price_change_percentage_24h_in_currency: Record<string, number>;
    price_change_percentage_7d_in_currency: Record<string, number>;
    price_change_percentage_14d_in_currency: Record<string, number>;
    price_change_percentage_30d_in_currency: Record<string, number>;
    price_change_percentage_60d_in_currency: Record<string, number>;
    price_change_percentage_200d_in_currency: Record<string, number>;
    price_change_percentage_1y_in_currency: Record<string, number>;
    market_cap_change_24h_in_currency: Record<string, number>;
    market_cap_change_percentage_24h_in_currency: Record<string, number>;
    total_supply: number;
    max_supply: number;
    circulating_supply: number;
    last_updated: string;
  };
  public_interest_stats: {
    alexa_rank: number;
    bing_matches: number;
  };
  status_updates: any[];
  last_updated: string;
}

export interface HistoricalPrice {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface TrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  price_btc: number;
  score: number;
}

export interface TrendingData {
  coins: {
    item: TrendingCoin;
  }[];
  nfts: any[];
  exchanges: any[];
}

export interface GlobalData {
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
  markets: number;
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
  updated_at: number;
}

export class CoinGeckoService {
  private static instance: CoinGeckoService;
  private config: CoinGeckoConfig;
  private baseUrl: string;

  private constructor(config: CoinGeckoConfig = {}) {
    this.config = {
      baseUrl: 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      rateLimitRequests: 100,
      rateLimitWindowMs: 60000, // 1 minute
      ...config,
    };

    this.baseUrl = this.config.baseUrl!;

    // Configure rate limiting
    apiManager.configureRateLimit('coingecko', {
      requests: this.config.rateLimitRequests!,
      windowMs: this.config.rateLimitWindowMs!,
    });
  }

  static getInstance(config?: CoinGeckoConfig): CoinGeckoService {
    if (!CoinGeckoService.instance) {
      CoinGeckoService.instance = new CoinGeckoService(config);
    }
    return CoinGeckoService.instance;
  }

  /**
   * Get coins market data
   */
  async getCoinsMarket(options: {
    vsCurrency?: string;
    ids?: string[];
    category?: string;
    order?: string;
    perPage?: number;
    page?: number;
    sparkline?: boolean;
    priceChangePercentage?: string;
  } = {}): Promise<CoinData[]> {
    const params = new URLSearchParams({
      vs_currency: options.vsCurrency || 'usd',
      order: options.order || 'market_cap_desc',
      per_page: (options.perPage || 100).toString(),
      page: (options.page || 1).toString(),
      sparkline: (options.sparkline || false).toString(),
    });

    if (options.ids && options.ids.length > 0) {
      params.append('ids', options.ids.join(','));
    }

    if (options.category) {
      params.append('category', options.category);
    }

    if (options.priceChangePercentage) {
      params.append('price_change_percentage', options.priceChangePercentage);
    }

    const url = `${this.baseUrl}/coins/markets?${params.toString()}`;
    const cacheKey = `coingecko:markets:${params.toString()}`;

    return apiManager.makeRequest<CoinData[]>({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 30000, // 30 seconds
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get coin details
   */
  async getCoinDetails(coinId: string, options: {
    localization?: boolean;
    tickers?: boolean;
    marketData?: boolean;
    communityData?: boolean;
    developerData?: boolean;
    sparkline?: boolean;
  } = {}): Promise<CoinDetails> {
    const params = new URLSearchParams({
      localization: (options.localization || false).toString(),
      tickers: (options.tickers || false).toString(),
      market_data: (options.marketData !== false).toString(),
      community_data: (options.communityData || false).toString(),
      developer_data: (options.developerData || false).toString(),
      sparkline: (options.sparkline || false).toString(),
    });

    const url = `${this.baseUrl}/coins/${coinId}?${params.toString()}`;
    const cacheKey = `coingecko:coin:${coinId}:${params.toString()}`;

    return apiManager.makeRequest<CoinDetails>({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 60000, // 1 minute
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get historical market data
   */
  async getCoinHistory(coinId: string, options: {
    vsCurrency?: string;
    days?: number | 'max';
    interval?: 'daily' | 'hourly';
  } = {}): Promise<HistoricalPrice> {
    const params = new URLSearchParams({
      vs_currency: options.vsCurrency || 'usd',
      days: (options.days || 30).toString(),
    });

    if (options.interval) {
      params.append('interval', options.interval);
    }

    const url = `${this.baseUrl}/coins/${coinId}/market_chart?${params.toString()}`;
    const cacheKey = `coingecko:history:${coinId}:${params.toString()}`;

    return apiManager.makeRequest<HistoricalPrice>({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 300000, // 5 minutes
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get trending coins
   */
  async getTrendingCoins(): Promise<TrendingData> {
    const url = `${this.baseUrl}/search/trending`;
    const cacheKey = 'coingecko:trending';

    return apiManager.makeRequest<TrendingData>({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 600000, // 10 minutes
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get global market data
   */
  async getGlobalData(): Promise<{ data: GlobalData }> {
    const url = `${this.baseUrl}/global`;
    const cacheKey = 'coingecko:global';

    return apiManager.makeRequest<{ data: GlobalData }>({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 300000, // 5 minutes
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Search for coins
   */
  async searchCoins(query: string): Promise<{
    coins: Array<{
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      thumb: string;
      large: string;
    }>;
    exchanges: any[];
    icos: any[];
    categories: any[];
    nfts: any[];
  }> {
    const params = new URLSearchParams({
      query,
    });

    const url = `${this.baseUrl}/search?${params.toString()}`;
    const cacheKey = `coingecko:search:${query}`;

    return apiManager.makeRequest({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 300000, // 5 minutes
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get coin price by contract address
   */
  async getCoinPriceByContract(
    platform: string,
    contractAddress: string,
    vsCurrency: string = 'usd'
  ): Promise<Record<string, Record<string, number>>> {
    const params = new URLSearchParams({
      contract_addresses: contractAddress,
      vs_currencies: vsCurrency,
    });

    const url = `${this.baseUrl}/simple/token_price/${platform}?${params.toString()}`;
    const cacheKey = `coingecko:token:${platform}:${contractAddress}:${vsCurrency}`;

    return apiManager.makeRequest({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 30000, // 30 seconds
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get simple price for multiple coins
   */
  async getSimplePrices(
    ids: string[],
    vsCurrencies: string[] = ['usd'],
    options: {
      includeMarketCap?: boolean;
      include24hrVol?: boolean;
      include24hrChange?: boolean;
      includeLastUpdatedAt?: boolean;
    } = {}
  ): Promise<Record<string, Record<string, number>>> {
    const params = new URLSearchParams({
      ids: ids.join(','),
      vs_currencies: vsCurrencies.join(','),
    });

    if (options.includeMarketCap) {
      params.append('include_market_cap', 'true');
    }

    if (options.include24hrVol) {
      params.append('include_24hr_vol', 'true');
    }

    if (options.include24hrChange) {
      params.append('include_24hr_change', 'true');
    }

    if (options.includeLastUpdatedAt) {
      params.append('include_last_updated_at', 'true');
    }

    const url = `${this.baseUrl}/simple/price?${params.toString()}`;
    const cacheKey = `coingecko:simple:${params.toString()}`;

    return apiManager.makeRequest({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 30000, // 30 seconds
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const url = `${this.baseUrl}/simple/supported_vs_currencies`;
    const cacheKey = 'coingecko:currencies';

    return apiManager.makeRequest<string[]>({
      url,
      method: 'GET',
      headers: this.getHeaders(),
      timeout: this.config.timeout,
      cacheKey,
      cacheTtl: 86400000, // 24 hours
      rateLimitKey: 'coingecko',
    });
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Coinet/1.0',
    };

    if (this.config.apiKey) {
      headers['X-CG-Demo-API-Key'] = this.config.apiKey;
    }

    return headers;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/ping`;
      const response = await apiManager.makeRequest<{ gecko_says: string }>({
        url,
        method: 'GET',
        headers: this.getHeaders(),
        timeout: 5000,
        rateLimitKey: 'coingecko',
      });

      return response.gecko_says === 'OK';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const coinGeckoService = CoinGeckoService.getInstance(); 