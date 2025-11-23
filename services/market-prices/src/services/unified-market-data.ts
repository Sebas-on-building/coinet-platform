/**
 * Unified Market Data Service
 * Provides best-price aggregation and unified data access across all providers
 * Divine perfection in data aggregation
 */

import {
  DataSource,
  MarketPrice,
  ProviderError,
  PriceUpdateType,
} from '../types';
import { CoinGeckoRestClient } from '../providers/coingecko-rest';
import { CoinMarketCapRestClient } from '../providers/coinmarketcap-rest';
import { DefiLlamaRestClient } from '../providers/defillama-rest';
import { DexScreenerRestClient } from '../providers/dexscreener-rest';
import { logger } from '../utils/logger';

/**
 * Best price result with confidence scoring
 */
export interface BestPriceResult {
  price: number;
  source: DataSource;
  confidence: number;
  timestamp: Date;
  allPrices: Array<{
    price: number;
    source: DataSource;
    timestamp: Date;
  }>;
}

/**
 * Aggregated market data combining all sources
 */
export interface AggregatedMarketData {
  symbol: string;
  coinId: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  sources: {
    coingecko?: MarketPrice;
    coinmarketcap?: MarketPrice;
    defillama?: any;
    dexscreener?: any;
  };
  confidence: number;
  lastUpdated: Date;
  priceVariance: number;
  priceStdDev: number;
}

/**
 * Provider weight configuration for confidence scoring
 */
interface ProviderWeights {
  coingecko: number;
  coinmarketcap: number;
  defillama: number;
  dexscreener: number;
}

const DEFAULT_WEIGHTS: ProviderWeights = {
  coingecko: 0.4,      // Primary source - highest weight
  coinmarketcap: 0.25, // Secondary source
  defillama: 0.15,     // Tertiary source (mainly for DeFi data)
  dexscreener: 0.2,    // DEX data source
};

/**
 * Unified Market Data Service
 * Aggregates data from all providers with intelligent failover and confidence scoring
 */
export class UnifiedMarketDataService {
  private geckoClient: CoinGeckoRestClient;
  private cmcClient?: CoinMarketCapRestClient;
  private defillamaClient?: DefiLlamaRestClient;
  private dexscreenerClient?: DexScreenerRestClient;
  private weights: ProviderWeights;

  constructor(
    geckoClient: CoinGeckoRestClient,
    cmcClient?: CoinMarketCapRestClient,
    defillamaClient?: DefiLlamaRestClient,
    dexscreenerClient?: DexScreenerRestClient,
    weights: ProviderWeights = DEFAULT_WEIGHTS
  ) {
    this.geckoClient = geckoClient;
    this.cmcClient = cmcClient;
    this.defillamaClient = defillamaClient;
    this.dexscreenerClient = dexscreenerClient;
    this.weights = weights;
  }

  /**
   * Get best price across all providers with confidence scoring
   * @param symbol Coin symbol (e.g., 'BTC', 'ETH')
   * @returns Best price with confidence score
   */
  async getBestPrice(symbol: string): Promise<BestPriceResult> {
    const prices: Array<{
      price: number;
      source: DataSource;
      timestamp: Date;
      weight: number;
    }> = [];

    // Fetch from CoinGecko (primary)
    try {
      const geckoData = await this.geckoClient.getSimplePrice(
        symbol.toLowerCase(),
        'usd',
        true,
        true,
        true,
        true
      );
      const coinId = symbol.toLowerCase();
      if (geckoData[coinId] && geckoData[coinId].usd) {
        const price = geckoData[coinId].usd;
        prices.push({
          price,
          source: DataSource.COINGECKO,
          timestamp: geckoData[coinId].last_updated_at
            ? new Date(geckoData[coinId].last_updated_at * 1000)
            : new Date(),
          weight: this.weights.coingecko,
        });
      }
    } catch (error) {
      logger.warn('CoinGecko price fetch failed', { symbol, error });
    }

    // Fetch from CoinMarketCap (fallback)
    if (this.cmcClient) {
      try {
        const cmcData = await this.cmcClient.getQuotesBySymbol(symbol, 'USD');
        if (cmcData.data && (cmcData.data as any)[symbol]) {
          const quote = (cmcData.data as any)[symbol];
          const price = quote.quote.USD.price;
          if (price > 0) {
            prices.push({
              price,
              source: DataSource.COINMARKETCAP,
              timestamp: quote.last_updated
                ? new Date(quote.last_updated)
                : new Date(),
              weight: this.weights.coinmarketcap,
            });
          }
        }
      } catch (error) {
        logger.warn('CoinMarketCap price fetch failed', { symbol, error });
      }
    }

    // Fetch from DexScreener (DEX data source)
    if (this.dexscreenerClient) {
      try {
        // Search for pairs matching the symbol
        const dexPairs = await this.dexscreenerClient.searchPairsByQuery(symbol);
        if (dexPairs && dexPairs.length > 0) {
          // Find the pair with highest liquidity (most reliable)
          const bestPair = dexPairs.reduce((best, current) => {
            const bestLiquidity = best.liquidity?.usd || 0;
            const currentLiquidity = current.liquidity?.usd || 0;
            return currentLiquidity > bestLiquidity ? current : best;
          });

          // Use USD price if available, otherwise convert from native price
          if (bestPair.priceUsd) {
            const price = parseFloat(bestPair.priceUsd);
            if (price > 0) {
              prices.push({
                price,
                source: DataSource.DEXSCREENER,
                timestamp: bestPair.pairCreatedAt
                  ? new Date(bestPair.pairCreatedAt * 1000)
                  : new Date(),
                weight: this.weights.dexscreener,
              });
            }
          }
        }
      } catch (error) {
        logger.warn('DexScreener price fetch failed', { symbol, error });
      }
    }

    if (prices.length === 0) {
      throw new ProviderError(
        `No price data available for ${symbol}`,
        DataSource.COINGECKO,
        404
      );
    }

    // Calculate weighted average price
    const totalWeight = prices.reduce((sum, p) => sum + p.weight, 0);
    const weightedPrice = prices.reduce(
      (sum, p) => sum + p.price * p.weight,
      0
    ) / totalWeight;

    // Calculate confidence based on:
    // 1. Number of sources (more sources = higher confidence)
    // 2. Price variance (lower variance = higher confidence)
    // 3. Recency (more recent = higher confidence)
    const priceVariance = this.calculateVariance(
      prices.map(p => p.price)
    );
    const maxVariance = weightedPrice * 0.1; // 10% max variance expected
    const varianceScore = Math.max(0, 1 - (priceVariance / maxVariance));

    const sourceCountScore = Math.min(1, prices.length / 2); // Max score at 2+ sources
    const recencyScore = this.calculateRecencyScore(prices);

    const confidence = (
      varianceScore * 0.5 +
      sourceCountScore * 0.3 +
      recencyScore * 0.2
    ) * 100;

    // Find the price closest to weighted average (most reliable)
    const bestPrice = prices.reduce((best, current) => {
      const bestDiff = Math.abs(best.price - weightedPrice);
      const currentDiff = Math.abs(current.price - weightedPrice);
      return currentDiff < bestDiff ? current : best;
    });

    return {
      price: weightedPrice,
      source: bestPrice.source,
      confidence: Math.round(confidence),
      timestamp: new Date(),
      allPrices: prices.map(p => ({
        price: p.price,
        source: p.source,
        timestamp: p.timestamp,
      })),
    };
  }

  /**
   * Get aggregated market data from all sources
   * @param symbol Coin symbol
   * @returns Aggregated market data with all sources
   */
  async getAggregatedMarketData(symbol: string): Promise<AggregatedMarketData> {
    const sources: AggregatedMarketData['sources'] = {};
    const prices: number[] = [];
    const volumes: number[] = [];
    const marketCaps: number[] = [];
    const priceChanges24h: number[] = []; // Absolute price changes
    const priceChangePercentages24h: number[] = []; // Percentage changes

    // Fetch from CoinGecko
    try {
      const geckoMarkets = await this.geckoClient.getCoinMarkets(
        'usd',
        [symbol.toLowerCase()],
        undefined,
        'market_cap_desc',
        1,
        1
      );
      if (geckoMarkets && geckoMarkets.length > 0) {
        const market = geckoMarkets[0];
        const geckoPrice: MarketPrice = {
          symbol: market.symbol.toUpperCase(),
          coinId: market.id,
          price: market.current_price,
          priceChange24h: market.price_change_24h || 0,
          priceChangePercentage24h: market.price_change_percentage_24h || 0,
          marketCap: market.market_cap || 0,
          volume24h: market.total_volume || 0,
          lastUpdated: (market as any).last_updated ? new Date((market as any).last_updated) : new Date(),
          source: DataSource.COINGECKO,
          updateType: PriceUpdateType.REST,
        };
        sources.coingecko = geckoPrice;
        prices.push(geckoPrice.price);
        volumes.push(geckoPrice.volume24h);
        marketCaps.push(geckoPrice.marketCap);
        priceChanges24h.push(geckoPrice.priceChange24h || 0);
        priceChangePercentages24h.push(geckoPrice.priceChangePercentage24h || 0);
      }
    } catch (error) {
      logger.warn('CoinGecko data fetch failed', { symbol, error });
    }

    // Fetch from CoinMarketCap
    if (this.cmcClient) {
      try {
        const cmcData = await this.cmcClient.getQuotesBySymbol(symbol, 'USD');
        if (cmcData.data && (cmcData.data as any)[symbol]) {
          const quote = (cmcData.data as any)[symbol];
          const usdQuote = quote.quote.USD;
          const cmcPrice: MarketPrice = {
            symbol: quote.symbol,
            coinId: String(quote.id),
            price: usdQuote.price,
            priceChange24h: usdQuote.price_change_24h || 0,
            priceChangePercentage24h: usdQuote.percent_change_24h || 0,
            marketCap: usdQuote.market_cap || 0,
            volume24h: usdQuote.volume_24h || 0,
            lastUpdated: new Date(quote.last_updated || Date.now()),
            source: DataSource.COINMARKETCAP,
            updateType: PriceUpdateType.REST,
          };
          sources.coinmarketcap = cmcPrice;
          prices.push(cmcPrice.price);
          volumes.push(cmcPrice.volume24h);
          marketCaps.push(cmcPrice.marketCap);
          priceChanges24h.push(cmcPrice.priceChange24h || 0);
          priceChangePercentages24h.push(cmcPrice.priceChangePercentage24h || 0);
        }
      } catch (error) {
        logger.warn('CoinMarketCap data fetch failed', { symbol, error });
      }
    }

    // Fetch from DexScreener (DEX data source)
    if (this.dexscreenerClient) {
      try {
        const dexPairs = await this.dexscreenerClient.searchPairsByQuery(symbol);
        if (dexPairs && dexPairs.length > 0) {
          // Find the pair with highest liquidity
          const bestPair = dexPairs.reduce((best, current) => {
            const bestLiquidity = best.liquidity?.usd || 0;
            const currentLiquidity = current.liquidity?.usd || 0;
            return currentLiquidity > bestLiquidity ? current : best;
          });

          if (bestPair.priceUsd) {
            const dexPrice = parseFloat(bestPair.priceUsd);
            const dexVolume = bestPair.volume?.h24 || 0;
            const dexPriceChange = bestPair.priceChange?.h24 || 0;

            if (dexPrice > 0) {
              // Store DexScreener data in sources
              sources.dexscreener = {
                symbol: `${bestPair.baseToken.symbol}/${bestPair.quoteToken.symbol}`,
                coinId: bestPair.baseToken.address,
                price: dexPrice,
                priceChange24h: 0, // DexScreener doesn't provide absolute change
                priceChangePercentage24h: dexPriceChange,
                marketCap: bestPair.fdv || 0,
                volume24h: dexVolume,
                lastUpdated: bestPair.pairCreatedAt
                  ? new Date(bestPair.pairCreatedAt * 1000)
                  : new Date(),
                source: DataSource.DEXSCREENER,
                updateType: PriceUpdateType.REST,
              };

              prices.push(dexPrice);
              volumes.push(dexVolume);
              if (bestPair.fdv) {
                marketCaps.push(bestPair.fdv);
              }
              priceChangePercentages24h.push(dexPriceChange);
            }
          }
        }
      } catch (error) {
        logger.warn('DexScreener data fetch failed', { symbol, error });
      }
    }

    if (prices.length === 0) {
      throw new ProviderError(
        `No market data available for ${symbol}`,
        DataSource.COINGECKO,
        404
      );
    }

    // Calculate aggregated values
    const avgPrice = this.calculateAverage(prices);
    const avgVolume = this.calculateAverage(volumes);
    const avgMarketCap = this.calculateAverage(marketCaps);
    const avgPriceChange24h = this.calculateAverage(priceChanges24h);
    const avgPriceChangePercentage24h = this.calculateAverage(priceChangePercentages24h);

    // Calculate confidence and variance
    const priceVariance = this.calculateVariance(prices);
    const priceStdDev = Math.sqrt(priceVariance);
    const confidence = this.calculateConfidence(
      prices.length,
      priceVariance,
      avgPrice
    );

    // Use CoinGecko data as primary source for coinId
    const coinId = sources.coingecko?.coinId || symbol.toLowerCase();

    return {
      symbol: symbol.toUpperCase(),
      coinId,
      price: avgPrice,
      priceChange24h: avgPriceChange24h,
      priceChangePercentage24h: avgPriceChangePercentage24h,
      marketCap: avgMarketCap,
      volume24h: avgVolume,
      sources,
      confidence: Math.round(confidence),
      lastUpdated: new Date(),
      priceVariance,
      priceStdDev,
    };
  }

  /**
   * Calculate variance of prices
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return 0;

    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return this.calculateAverage(squaredDiffs);
  }

  /**
   * Calculate average of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    sourceCount: number,
    variance: number,
    averagePrice: number
  ): number {
    // Source count score (0-1)
    const sourceScore = Math.min(1, sourceCount / 2);

    // Variance score (lower variance = higher score)
    const maxVariance = averagePrice * 0.1; // 10% max expected variance
    const varianceScore = Math.max(0, 1 - (variance / maxVariance));

    // Combined confidence (0-100)
    return (sourceScore * 0.5 + varianceScore * 0.5) * 100;
  }

  /**
   * Calculate recency score based on timestamps
   */
  private calculateRecencyScore(
    prices: Array<{ timestamp: Date }>
  ): number {
    if (prices.length === 0) return 0;

    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes max age
    const ages = prices.map(p => now - p.timestamp.getTime());
    const avgAge = this.calculateAverage(ages);
    const recencyScore = Math.max(0, 1 - (avgAge / maxAge));

    return recencyScore;
  }

  /**
   * Get prices from multiple symbols at once
   * @param symbols Array of coin symbols
   * @returns Map of symbol to best price result
   */
  async getBestPrices(
    symbols: string[]
  ): Promise<Map<string, BestPriceResult>> {
    const results = new Map<string, BestPriceResult>();

    // Fetch all prices in parallel
    const promises = symbols.map(async (symbol) => {
      try {
        const result = await this.getBestPrice(symbol);
        return { symbol, result };
      } catch (error) {
        logger.error('Failed to get best price', { symbol, error });
        return null;
      }
    });

    const resolved = await Promise.all(promises);
    resolved.forEach((item) => {
      if (item) {
        results.set(item.symbol, item.result);
      }
    });

    return results;
  }
}

export default UnifiedMarketDataService;

