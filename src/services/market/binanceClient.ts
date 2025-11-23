import axios, { AxiosError } from "axios";
import { z } from "zod";
import { PriceTick } from "./MarketDataService";

// Zod schema for Binance ticker/price endpoint (price only)
const BinanceTickerSchema = z.object({
  symbol: z.string(),
  price: z.string(),
});
// Zod schema for Binance 24hr ticker endpoint (price + volume)
const Binance24hrTickerSchema = z.object({
  symbol: z.string(),
  lastPrice: z.string(),
  quoteVolume: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
});

// Static mapping from common symbol/quote pairs to Binance pairs
const SYMBOL_QUOTE_TO_PAIR: Record<string, string> = {
  btc_usdt: "BTCUSDT",
  eth_usdt: "ETHUSDT",
  bnb_usdt: "BNBUSDT",
  sol_usdt: "SOLUSDT",
  ada_usdt: "ADAUSDT",
  xrp_usdt: "XRPUSDT",
  doge_usdt: "DOGEUSDT",
  dot_usdt: "DOTUSDT",
  matic_usdt: "MATICUSDT",
  ltc_usdt: "LTCUSDT",
  link_usdt: "LINKUSDT",
  avax_usdt: "AVAXUSDT",
  shib_usdt: "SHIBUSDT",
  trx_usdt: "TRXUSDT",
  // Add more as needed
};

export class BinanceClient {
  private readonly baseUrl = "https://api.binance.com/api/v3";
  private readonly maxRetries = 3;

  async getBTCTicker(): Promise<PriceTick> {
    const url = `${this.baseUrl}/ticker/price?symbol=BTCUSDT`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url);
        const parsed = BinanceTickerSchema.safeParse(data);
        if (!parsed.success) throw new Error("Invalid response from Binance");
        const d = parsed.data;
        return {
          asset: "BTC",
          price: parseFloat(d.price),
          timestamp: Date.now(),
          volume: null,
          source: "binance",
          high24h: null,
          low24h: null,
          marketCap: null,
        };
      } catch (err: any) {
        lastError = err;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 429 ||
            (err.response?.status && err.response.status >= 500))
        ) {
          // Exponential backoff
          await new Promise((res) =>
            setTimeout(res, Math.pow(2, attempt) * 500),
          );
          attempt++;
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  /**
   * Fetches price and 24h volume for a symbol/quote pair. If volume is not available, sets volume to null.
   */
  async getTicker(symbol: string, quote: string): Promise<PriceTick> {
    // Map symbol/quote to Binance pair if possible
    const key = `${symbol.toLowerCase()}_${quote.toLowerCase()}`;
    const pair =
      SYMBOL_QUOTE_TO_PAIR[key] || symbol.toUpperCase() + quote.toUpperCase();
    // Use /ticker/24hr for price and volume
    const url = `${this.baseUrl}/ticker/24hr?symbol=${pair}`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url);
        const parsed = Binance24hrTickerSchema.safeParse(data);
        if (parsed.success) {
          return {
            asset: symbol.toUpperCase(),
            price: parseFloat(parsed.data.lastPrice),
            timestamp: Date.now(),
            volume: parsed.data.quoteVolume
              ? parseFloat(parsed.data.quoteVolume)
              : null,
            source: "binance",
            high24h: parsed.data.highPrice
              ? parseFloat(parsed.data.highPrice)
              : null,
            low24h: parsed.data.lowPrice
              ? parseFloat(parsed.data.lowPrice)
              : null,
            marketCap: null,
          };
        }
        // Fallback to price-only endpoint
        const priceUrl = `${this.baseUrl}/ticker/price?symbol=${pair}`;
        const { data: priceData } = await axios.get(priceUrl);
        const priceParsed = BinanceTickerSchema.safeParse(priceData);
        if (!priceParsed.success)
          throw new Error("Invalid response from Binance");
        return {
          asset: symbol.toUpperCase(),
          price: parseFloat(priceParsed.data.price),
          timestamp: Date.now(),
          volume: null,
          source: "binance",
          high24h: null,
          low24h: null,
          marketCap: null,
        };
      } catch (err: any) {
        lastError = err;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 429 ||
            (err.response?.status && err.response.status >= 500))
        ) {
          // Exponential backoff
          await new Promise((res) =>
            setTimeout(res, Math.pow(2, attempt) * 500),
          );
          attempt++;
        } else {
          break;
        }
      }
    }
    throw lastError;
  }
}
