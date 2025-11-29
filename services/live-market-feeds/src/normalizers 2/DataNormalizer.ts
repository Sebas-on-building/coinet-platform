/**
 * =========================================
 * DATA NORMALIZER
 * =========================================
 * Normalizes heterogeneous exchange payloads into a common format
 * with standardized field names and data types
 */

import { MarketData, ExchangeType, TradeData, QuoteData, OrderBookData } from '../types';
import { Logger } from '../utils/Logger';

export class DataNormalizer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DataNormalizer');
  }

  /**
   * Normalize raw exchange data into standardized MarketData format
   */
  normalize(rawData: any, exchange: ExchangeType, dataType: string): MarketData | null {
    try {
      switch (dataType) {
        case 'trades':
          return this.normalizeTrade(rawData, exchange);
        case 'quotes':
        case 'ticker':
          return this.normalizeQuote(rawData, exchange);
        case 'orderbook':
          return this.normalizeOrderBook(rawData, exchange);
        default:
          this.logger.warn(`Unknown data type: ${dataType}`);
          return null;
      }
    } catch (error: any) {
      this.logger.error(`Failed to normalize ${dataType} data from ${exchange}`, error);
      return null;
    }
  }

  /**
   * Normalize trade data from different exchanges
   */
  private normalizeTrade(rawData: any, exchange: ExchangeType): MarketData {
    let symbol: string = 'UNKNOWN';
    let price: number = 0;
    let volume: number = 0;
    let timestamp: Date;
    let side: 'buy' | 'sell' | 'unknown' = 'unknown';

    switch (exchange) {
      case 'binance':
        symbol = rawData.s || symbol;
        price = parseFloat(rawData.p || '0');
        volume = parseFloat(rawData.q || '0');
        timestamp = new Date(rawData.T);
        side = rawData.m ? 'sell' : 'buy'; // m = isBuyerMaker
        break;

      case 'coinbase':
        symbol = rawData.product_id?.replace('-', '') || symbol;
        price = parseFloat(rawData.price || '0');
        volume = parseFloat(rawData.size || '0');
        timestamp = new Date(rawData.time);
        side = rawData.side || side;
        break;

      case 'kraken':
        const tradeData = rawData[1];
        symbol = rawData[3]?.replace('/', '') || symbol;
        price = parseFloat(tradeData?.[0] || '0');
        volume = parseFloat(tradeData?.[1] || '0');
        timestamp = new Date(parseInt(tradeData?.[2] || '0') * 1000);
        side = tradeData?.[3] === 'b' ? 'buy' : tradeData?.[3] === 's' ? 'sell' : side;
        break;

      case 'deribit':
        symbol = rawData.instrument_name?.replace('-', '') || symbol;
        price = parseFloat(rawData.price || '0');
        volume = parseFloat(rawData.amount || '0');
        timestamp = new Date(rawData.timestamp);
        side = rawData.direction || side;
        break;

      case 'bybit':
        symbol = rawData.symbol || symbol;
        price = parseFloat(rawData.price || '0');
        volume = parseFloat(rawData.qty || '0');
        timestamp = new Date(rawData.trade_time_ms);
        side = rawData.side || side;
        break;

      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    return {
      exchange,
      symbol: symbol.toUpperCase(),
      type: 'trade',
      price,
      volume,
      timestamp,
      side,
      raw: rawData,
      normalized: true,
      metadata: {
        source: exchange,
        ingestionTime: new Date()
      }
    } as TradeData;
  }

  /**
   * Normalize quote/ticker data from different exchanges
   */
  private normalizeQuote(rawData: any, exchange: ExchangeType): MarketData {
    let symbol: string = 'UNKNOWN';
    let bid: number = 0;
    let ask: number = 0;
    let bidVolume: number = 0;
    let askVolume: number = 0;
    let timestamp: Date;

    switch (exchange) {
      case 'binance':
        symbol = rawData.s || symbol;
        bid = parseFloat(rawData.b || '0');
        ask = parseFloat(rawData.a || '0');
        bidVolume = parseFloat(rawData.B || '0');
        askVolume = parseFloat(rawData.A || '0');
        timestamp = new Date(rawData.E);
        break;

      case 'coinbase':
        symbol = rawData.product_id?.replace('-', '') || symbol;
        bid = parseFloat(rawData.best_bid || '0');
        ask = parseFloat(rawData.best_ask || '0');
        bidVolume = parseFloat(rawData.best_bid_size || '0');
        askVolume = parseFloat(rawData.best_ask_size || '0');
        timestamp = new Date(rawData.time);
        break;

      case 'kraken':
        const rawResultKeys = Object.keys(rawData.result || {});
        const tickerKey = rawResultKeys.length > 0 ? rawResultKeys[0] : undefined; 
        const tickerData = tickerKey ? rawData.result?.[tickerKey] : undefined; 

        if (!tickerData) throw new Error('Invalid Kraken ticker data');

        symbol = tickerKey?.replace('/', '') || symbol; 
        bid = parseFloat(tickerData.b?.[0] || '0');
        ask = parseFloat(tickerData.a?.[0] || '0');
        bidVolume = parseFloat(tickerData.b?.[2] || '0');
        askVolume = parseFloat(tickerData.a?.[2] || '0');
        timestamp = new Date();
        break;

      case 'deribit':
        symbol = rawData.instrument_name?.replace('-', '') || symbol;
        bid = parseFloat(rawData.best_bid_price || '0');
        ask = parseFloat(rawData.best_ask_price || '0');
        bidVolume = parseFloat(rawData.best_bid_amount || '0');
        askVolume = parseFloat(rawData.best_ask_amount || '0');
        timestamp = new Date(rawData.timestamp);
        break;

      case 'bybit':
        symbol = rawData.symbol || symbol;
        bid = parseFloat(rawData.bid1Price || '0');
        ask = parseFloat(rawData.ask1Price || '0');
        bidVolume = parseFloat(rawData.bid1Size || '0');
        askVolume = parseFloat(rawData.ask1Size || '0');
        timestamp = new Date(rawData.timestamp);
        break;

      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    return {
      exchange,
      symbol: symbol.toUpperCase(),
      type: 'quote',
      bid,
      ask,
      bidVolume,
      askVolume,
      timestamp,
      raw: rawData,
      normalized: true,
      metadata: {
        source: exchange,
        ingestionTime: new Date()
      }
    } as QuoteData;
  }

  /**
   * Normalize order book data from different exchanges
   */
  private normalizeOrderBook(rawData: any, exchange: ExchangeType): MarketData {
    let symbol: string = 'UNKNOWN';
    let bids: Array<[number, number]> = [];
    let asks: Array<[number, number]> = [];
    let timestamp: Date;

    switch (exchange) {
      case 'binance':
        symbol = rawData.s || symbol;
        bids = rawData.bids?.map((bid: string[]) => [parseFloat(bid[0] || '0'), parseFloat(bid[1] || '0')]) || [];
        asks = rawData.asks?.map((ask: string[]) => [parseFloat(ask[0] || '0'), parseFloat(ask[1] || '0')]) || [];
        timestamp = new Date(rawData.E);
        break;

      case 'coinbase':
        symbol = rawData.product_id?.replace('-', '') || symbol;
        bids = rawData.bids?.map((bid: any) => [parseFloat(bid.price || '0'), parseFloat(bid.size || '0')]) || [];
        asks = rawData.asks?.map((ask: any) => [parseFloat(ask.price || '0'), parseFloat(ask.size || '0')]) || [];
        timestamp = new Date(rawData.time);
        break;

      case 'kraken':
        const rawResultKeysBook = Object.keys(rawData.result || {});
        const bookKey = rawResultKeysBook.length > 0 ? rawResultKeysBook[0] : undefined; 
        const bookData = bookKey ? rawData.result?.[bookKey] : undefined; 

        if (!bookData) throw new Error('Invalid Kraken order book data');

        symbol = bookKey?.replace('/', '') || symbol; 
        bids = bookData.bids?.map((bid: string[]) => [parseFloat(bid[0] || '0'), parseFloat(bid[1] || '0')]) || [];
        asks = bookData.asks?.map((ask: string[]) => [parseFloat(ask[0] || '0'), parseFloat(ask[1] || '0')]) || [];
        timestamp = new Date();
        break;

      case 'deribit':
        symbol = rawData.instrument_name?.replace('-', '') || symbol;
        bids = rawData.bids?.map((bid: string[]) => [parseFloat(bid[0] || '0'), parseFloat(bid[1] || '0')]) || [];
        asks = rawData.asks?.map((ask: string[]) => [parseFloat(ask[0] || '0'), parseFloat(ask[1] || '0')]) || [];
        timestamp = new Date(rawData.timestamp);
        break;

      case 'bybit':
        symbol = rawData.symbol || symbol;
        bids = rawData.b?.map((bid: string[]) => [parseFloat(bid[0] || '0'), parseFloat(bid[1] || '0')]) || [];
        asks = rawData.a?.map((ask: string[]) => [parseFloat(ask[0] || '0'), parseFloat(ask[1] || '0')]) || [];
        timestamp = new Date(rawData.timestamp);
        break;

      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    return {
      exchange,
      symbol: symbol.toUpperCase(),
      type: 'orderbook',
      bids,
      asks,
      timestamp,
      raw: rawData,
      normalized: true,
      metadata: {
        source: exchange,
        ingestionTime: new Date()
      }
    } as OrderBookData;
  }

  /**
   * Detect data type from raw message
   */
  detectDataType(rawData: any, exchange: ExchangeType): string {
    // Exchange-specific detection logic
    switch (exchange) {
      case 'binance':
        return this.detectBinanceDataType(rawData);
      case 'coinbase':
        return this.detectCoinbaseDataType(rawData);
      case 'kraken':
        return this.detectKrakenDataType(rawData);
      case 'deribit':
        return this.detectDeribitDataType(rawData);
      case 'bybit':
        return this.detectBybitDataType(rawData);
      default:
        return 'unknown';
    }
  }

  private detectBinanceDataType(rawData: any): string {
    if (rawData.e === 'trade') return 'trades';
    if (rawData.e === '24hrTicker') return 'quotes';
    if (rawData.e === 'depthUpdate') return 'orderbook';
    if (rawData.e === 'kline') return 'ohlc';
    return 'unknown';
  }

  private detectCoinbaseDataType(rawData: any): string {
    if (rawData.type === 'match') return 'trades';
    if (rawData.type === 'ticker') return 'quotes';
    if (rawData.type === 'snapshot' || rawData.type === 'l2update') return 'orderbook';
    return 'unknown';
  }

  private detectKrakenDataType(rawData: any): string {
    // Kraken trade messages are arrays, ticker/ohlc are objects
    if (Array.isArray(rawData) && rawData.length >= 2 && Array.isArray(rawData[1])) return 'trades';
    if (rawData.result && typeof rawData.result === 'object' && !Array.isArray(rawData.result)) return 'quotes'; // Check for object not array
    if (rawData.result && typeof rawData.result === 'object' && Object.keys(rawData.result)[0]?.startsWith('book')) return 'orderbook'; // Add orderbook detection
    return 'unknown';
  }

  private detectDeribitDataType(rawData: any): string {
    if (rawData.method === 'public/trades' || rawData.params?.channel === 'trades') return 'trades';
    if (rawData.method === 'public/ticker' || rawData.params?.channel === 'ticker') return 'quotes';
    if (rawData.method === 'public/book' || rawData.params?.channel === 'book') return 'orderbook';
    return 'unknown';
  }

  private detectBybitDataType(rawData: any): string {
    if (rawData.topic === 'trade') return 'trades';
    if (rawData.topic === 'tickers') return 'quotes';
    if (rawData.topic === 'orderbook') return 'orderbook';
    return 'unknown';
  }
}
