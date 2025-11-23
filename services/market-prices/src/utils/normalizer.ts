/**
 * Data Normalization
 * Transform provider-specific data into unified Coinet format
 */

import {
  DataSource,
  MarketPrice,
  OHLCV,
  CoinMetadata,
  TickerData,
  PriceUpdateType,
  CoinGeckoMarket,
  CoinGeckoCoin,
  CoinMarketCapQuote,
  CoinMarketCapListing,
  CoinMarketCapOHLCV,
  DataNormalizationError,
} from '../types';
import { logger } from './logger';

/**
 * Symbol registry for mapping between different provider IDs
 */
export class SymbolRegistry {
  private geckoToCoinetMap: Map<string, string> = new Map();
  private cmcToCoinetMap: Map<number, string> = new Map();
  private messariToCoinetMap: Map<string, string> = new Map();
  private coinetToGeckoMap: Map<string, string> = new Map();
  private coinetToCmcMap: Map<string, number> = new Map();
  private coinetToMessariMap: Map<string, string> = new Map();

  /**
   * Register a symbol mapping
   */
  register(
    coinetSymbol: string,
    geckoId?: string,
    cmcId?: number,
    messariSlug?: string
  ): void {
    if (geckoId) {
      this.geckoToCoinetMap.set(geckoId, coinetSymbol);
      this.coinetToGeckoMap.set(coinetSymbol, geckoId);
    }
    if (cmcId) {
      this.cmcToCoinetMap.set(cmcId, coinetSymbol);
      this.coinetToCmcMap.set(coinetSymbol, cmcId);
    }
    if (messariSlug) {
      this.messariToCoinetMap.set(messariSlug, coinetSymbol);
      this.coinetToMessariMap.set(coinetSymbol, messariSlug);
    }
  }

  /**
   * Get Coinet symbol from CoinGecko ID
   */
  fromGecko(geckoId: string): string | undefined {
    return this.geckoToCoinetMap.get(geckoId);
  }

  /**
   * Get Coinet symbol from CoinMarketCap ID
   */
  fromCMC(cmcId: number): string | undefined {
    return this.cmcToCoinetMap.get(cmcId);
  }

  /**
   * Get Coinet symbol from Messari slug
   */
  fromMessari(messariSlug: string): string | undefined {
    return this.messariToCoinetMap.get(messariSlug);
  }

  /**
   * Get CoinGecko ID from Coinet symbol
   */
  toGecko(coinetSymbol: string): string | undefined {
    return this.coinetToGeckoMap.get(coinetSymbol);
  }

  /**
   * Get CoinMarketCap ID from Coinet symbol
   */
  toCMC(coinetSymbol: string): number | undefined {
    return this.coinetToCmcMap.get(coinetSymbol);
  }

  /**
   * Get Messari slug from Coinet symbol
   */
  toMessari(coinetSymbol: string): string | undefined {
    return this.coinetToMessariMap.get(coinetSymbol);
  }

  /**
   * Load default mappings for popular cryptocurrencies
   */
  loadDefaults(): void {
    // Top cryptocurrencies with Messari slugs
    this.register('BTC', 'bitcoin', 1, 'bitcoin');
    this.register('ETH', 'ethereum', 1027, 'ethereum');
    this.register('USDT', 'tether', 825, 'tether');
    this.register('BNB', 'binancecoin', 1839, 'binance-coin');
    this.register('SOL', 'solana', 5426, 'solana');
    this.register('XRP', 'ripple', 52, 'xrp');
    this.register('USDC', 'usd-coin', 3408, 'usd-coin');
    this.register('ADA', 'cardano', 2010, 'cardano');
    this.register('AVAX', 'avalanche-2', 5805, 'avalanche');
    this.register('DOGE', 'dogecoin', 74, 'dogecoin');
    this.register('TRX', 'tron', 1958, 'tron');
    this.register('DOT', 'polkadot', 6636, 'polkadot');
    this.register('MATIC', 'matic-network', 3890, 'polygon');
    this.register('LINK', 'chainlink', 1975, 'chainlink');
    this.register('WBTC', 'wrapped-bitcoin', 3717, 'wrapped-bitcoin');
    this.register('UNI', 'uniswap', 7083, 'uniswap');
    this.register('ATOM', 'cosmos', 3794, 'cosmos');
    this.register('LTC', 'litecoin', 2, 'litecoin');
    this.register('XLM', 'stellar', 512, 'stellar');
    this.register('XMR', 'monero', 328, 'monero');
    
    // Additional tokens with unlock schedules
    this.register('APT', 'aptos', 21794, 'aptos');
    this.register('ARB', 'arbitrum', 11841, 'arbitrum');
    this.register('OP', 'optimism', 11840, 'optimism');
    this.register('SUI', 'sui', 20947, 'sui');
    this.register('SEI', 'sei-network', 23149, 'sei');
    this.register('TIA', 'celestia', 22861, 'celestia');
    this.register('STRK', 'starknet', 22691, 'starknet');
    this.register('PYTH', 'pyth-network', 28177, 'pyth-network');
    this.register('WLD', 'worldcoin-wld', 13502, 'worldcoin');
    this.register('IMX', 'immutable-x', 10603, 'immutable-x');
    this.register('DYDX', 'dydx-chain', 28324, 'dydx');
    this.register('BLUR', 'blur', 23121, 'blur');
    this.register('OSMO', 'osmosis', 12220, 'osmosis');
    this.register('INJ', 'injective-protocol', 7226, 'injective');
    this.register('FET', 'fetch-ai', 3773, 'fetch-ai');
    this.register('RNDR', 'render-token', 5690, 'render');
    this.register('GRT', 'the-graph', 6719, 'the-graph');
    this.register('AAVE', 'aave', 7278, 'aave');
    this.register('SNX', 'synthetix-network-token', 2586, 'synthetix');
    this.register('MKR', 'maker', 1518, 'maker');

    logger.info('Symbol registry loaded with default mappings', {
      geckoMappings: this.geckoToCoinetMap.size,
      cmcMappings: this.cmcToCoinetMap.size,
      messariMappings: this.messariToCoinetMap.size,
    });
  }

  /**
   * Get registry statistics
   */
  getStats(): any {
    return {
      geckoMappings: this.geckoToCoinetMap.size,
      cmcMappings: this.cmcToCoinetMap.size,
      messariMappings: this.messariToCoinetMap.size,
    };
  }
}

// Singleton instance
let registryInstance: SymbolRegistry | null = null;

export function getSymbolRegistry(): SymbolRegistry {
  if (!registryInstance) {
    registryInstance = new SymbolRegistry();
    registryInstance.loadDefaults();
  }
  return registryInstance;
}

/**
 * Data normalizer class
 */
export class DataNormalizer {
  private registry: SymbolRegistry;

  constructor(registry?: SymbolRegistry) {
    this.registry = registry || getSymbolRegistry();
  }

  /**
   * Normalize CoinGecko market data to MarketPrice
   */
  normalizeCoinGeckoMarket(
    data: CoinGeckoMarket,
    updateType: PriceUpdateType = PriceUpdateType.REST
  ): MarketPrice {
    try {
      const coinetSymbol = this.registry.fromGecko(data.id) || data.symbol.toUpperCase();

      return {
        symbol: data.symbol.toLowerCase(),
        coinId: coinetSymbol,
        price: data.current_price || 0,
        priceChange24h: data.price_change_24h || 0,
        priceChangePercentage24h: data.price_change_percentage_24h || 0,
        marketCap: data.market_cap || 0,
        volume24h: data.total_volume || 0,
        circulatingSupply: data.circulating_supply,
        totalSupply: data.total_supply,
        maxSupply: data.max_supply,
        ath: data.ath,
        athDate: data.ath_date ? new Date(data.ath_date) : undefined,
        atl: data.atl,
        atlDate: data.atl_date ? new Date(data.atl_date) : undefined,
        lastUpdated: new Date(data.last_updated),
        source: DataSource.COINGECKO,
        updateType,
      };
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinGecko market data: ${error}`,
        DataSource.COINGECKO,
        data
      );
    }
  }

  /**
   * Normalize CoinMarketCap quote to MarketPrice
   */
  normalizeCoinMarketCapQuote(
    symbol: string,
    data: any,
    updateType: PriceUpdateType = PriceUpdateType.REST
  ): MarketPrice {
    try {
      const cmcId = data.id;
      const coinetSymbol = this.registry.fromCMC(cmcId) || data.symbol.toUpperCase();
      const quote = data.quote?.USD || {};

      return {
        symbol: data.symbol.toLowerCase(),
        coinId: coinetSymbol,
        price: quote.price || 0,
        priceChange24h: 0, // CMC doesn't provide absolute change, only percentage
        priceChangePercentage24h: quote.percent_change_24h || 0,
        marketCap: quote.market_cap || 0,
        volume24h: quote.volume_24h || 0,
        circulatingSupply: data.circulating_supply,
        totalSupply: data.total_supply,
        maxSupply: data.max_supply,
        lastUpdated: new Date(quote.last_updated || data.last_updated),
        source: DataSource.COINMARKETCAP,
        updateType,
      };
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinMarketCap quote: ${error}`,
        DataSource.COINMARKETCAP,
        data
      );
    }
  }

  /**
   * Normalize CoinMarketCap listing to MarketPrice
   */
  normalizeCoinMarketCapListing(
    data: any,
    updateType: PriceUpdateType = PriceUpdateType.REST
  ): MarketPrice {
    return this.normalizeCoinMarketCapQuote(data.symbol, data, updateType);
  }

  /**
   * Normalize CoinGecko OHLC data to OHLCV array
   */
  normalizeCoinGeckoOHLC(
    coinId: string,
    data: number[][],
    symbol: string
  ): OHLCV[] {
    try {
      const coinetSymbol = this.registry.fromGecko(coinId) || symbol.toUpperCase();

      return data.map((candle) => {
        const [timestamp, open, high, low, close, volume = 0] = candle;
        
        return {
          symbol: symbol.toLowerCase(),
          coinId: coinetSymbol,
          timestamp: new Date(timestamp),
          open,
          high,
          low,
          close,
          volume,
          source: DataSource.COINGECKO,
        };
      });
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinGecko OHLC data: ${error}`,
        DataSource.COINGECKO,
        data
      );
    }
  }

  /**
   * Normalize CoinMarketCap OHLCV data
   */
  normalizeCoinMarketCapOHLCV(data: CoinMarketCapOHLCV): OHLCV[] {
    try {
      const cmcId = data.data.id;
      const symbol = data.data.symbol.toLowerCase();
      const coinetSymbol = this.registry.fromCMC(cmcId) || data.data.symbol.toUpperCase();

      return data.data.quotes.map((quote) => {
        const usdQuote = quote.quote.USD;
        
        return {
          symbol,
          coinId: coinetSymbol,
          timestamp: new Date(usdQuote.timestamp),
          open: usdQuote.open,
          high: usdQuote.high,
          low: usdQuote.low,
          close: usdQuote.close,
          volume: usdQuote.volume,
          source: DataSource.COINMARKETCAP,
        };
      });
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinMarketCap OHLCV data: ${error}`,
        DataSource.COINMARKETCAP,
        data
      );
    }
  }

  /**
   * Normalize CoinGecko coin metadata
   */
  normalizeCoinGeckoMetadata(data: CoinGeckoCoin): CoinMetadata {
    try {
      const coinetSymbol = this.registry.fromGecko(data.id) || data.symbol.toUpperCase();

      return {
        coinId: coinetSymbol,
        symbol: data.symbol.toLowerCase(),
        name: data.name,
        description: data.description?.en,
        categories: data.categories || [],
        platforms: data.platforms || {},
        links: {
          homepage: data.links?.homepage,
          blockchain_site: data.links?.blockchain_site,
          official_forum_url: data.links?.official_forum_url,
          chat_url: data.links?.chat_url,
          announcement_url: data.links?.announcement_url,
          twitter_screen_name: data.links?.twitter_screen_name,
          facebook_username: data.links?.facebook_username,
          telegram_channel_identifier: data.links?.telegram_channel_identifier,
          subreddit_url: data.links?.subreddit_url,
          repos_url: data.links?.repos_url,
        },
        image: data.image,
        genesisDate: data.genesis_date ? new Date(data.genesis_date) : undefined,
        sentimentVotesUpPercentage: data.sentiment_votes_up_percentage,
        sentimentVotesDownPercentage: data.sentiment_votes_down_percentage,
        marketCapRank: data.market_cap_rank,
        coingeckoRank: data.coingecko_rank,
        lastUpdated: new Date(data.last_updated),
        source: DataSource.COINGECKO,
      };
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinGecko metadata: ${error}`,
        DataSource.COINGECKO,
        data
      );
    }
  }

  /**
   * Normalize CoinMarketCap metadata
   */
  normalizeCoinMarketCapMetadata(data: any): CoinMetadata {
    try {
      const cmcId = data.id;
      const coinetSymbol = this.registry.fromCMC(cmcId) || data.symbol.toUpperCase();

      return {
        coinId: coinetSymbol,
        symbol: data.symbol.toLowerCase(),
        name: data.name,
        description: data.description,
        categories: data.tags || [],
        platforms: {},
        links: {
          homepage: data.urls?.website,
          blockchain_site: data.urls?.explorer,
          official_forum_url: [],
          chat_url: data.urls?.chat,
          announcement_url: data.urls?.announcement,
          twitter_screen_name: data.urls?.twitter?.[0],
          subreddit_url: data.urls?.reddit?.[0],
        },
        image: {
          large: data.logo,
          small: data.logo,
          thumb: data.logo,
        },
        genesisDate: data.date_added ? new Date(data.date_added) : undefined,
        lastUpdated: new Date(),
        source: DataSource.COINMARKETCAP,
      };
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinMarketCap metadata: ${error}`,
        DataSource.COINMARKETCAP,
        data
      );
    }
  }

  /**
   * Normalize CoinGecko ticker data
   */
  normalizeCoinGeckoTicker(data: any, coinId: string): TickerData {
    try {
      const coinetSymbol = this.registry.fromGecko(coinId) || data.coin_id?.toUpperCase();

      return {
        symbol: data.base.toLowerCase(),
        coinId: coinetSymbol,
        base: data.base,
        target: data.target,
        market: {
          name: data.market.name,
          identifier: data.market.identifier,
        },
        last: data.last,
        volume: data.volume,
        convertedLast: data.converted_last || {},
        convertedVolume: data.converted_volume || {},
        trustScore: data.trust_score || 'unknown',
        bidAskSpreadPercentage: data.bid_ask_spread_percentage || 0,
        timestamp: new Date(),
        lastTradedAt: new Date(data.last_traded_at),
        lastFetchAt: new Date(data.last_fetch_at),
        isAnomaly: data.is_anomaly || false,
        isStale: data.is_stale || false,
        source: DataSource.COINGECKO,
      };
    } catch (error) {
      throw new DataNormalizationError(
        `Failed to normalize CoinGecko ticker: ${error}`,
        DataSource.COINGECKO,
        data
      );
    }
  }
}

// Singleton instance
let normalizerInstance: DataNormalizer | null = null;

export function getDataNormalizer(): DataNormalizer {
  if (!normalizerInstance) {
    normalizerInstance = new DataNormalizer();
  }
  return normalizerInstance;
}

export default {
  SymbolRegistry,
  DataNormalizer,
  getSymbolRegistry,
  getDataNormalizer,
};

