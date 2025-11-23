import axios, { AxiosError } from "axios";
import { z } from "zod";
import { PriceTick } from "./MarketDataService";

// Zod schema for CoinAPI spot price endpoint
const CoinApiTickerSchema = z.object({
  asset_id_base: z.string(),
  asset_id_quote: z.string(),
  rate: z.number(),
  time: z.string(),
});
// Zod schema for CoinAPI asset info endpoint (for volume, if available)
const CoinApiAssetSchema = z.object({
  asset_id: z.string(),
  volume_1day_usd: z.number().optional(),
});

// Static mapping from common tickers to CoinApi asset IDs
const SYMBOL_TO_COINAPI: Record<string, string> = {
  btc: "BTC",
  eth: "ETH",
  usdt: "USDT",
  bnb: "BNB",
  sol: "SOL",
  ada: "ADA",
  xrp: "XRP",
  doge: "DOGE",
  dot: "DOT",
  matic: "MATIC",
  ltc: "LTC",
  link: "LINK",
  avax: "AVAX",
  shib: "SHIB",
  trx: "TRX",
  // Add more as needed
};

const COINAPI_KEY = process.env.COINAPI_KEY;
if (!COINAPI_KEY) {
  throw new Error("COINAPI_KEY environment variable is required but not set.");
}

export class CoinApiClient {
  private readonly baseUrl = "https://rest.coinapi.io/v1";
  private readonly maxRetries = 3;
  private readonly apiKey = COINAPI_KEY;

  async getBTCTicker(): Promise<PriceTick> {
    if (!this.apiKey) throw new Error("COINAPI_KEY not set in environment");
    const url = `${this.baseUrl}/exchangerate/BTC/USD`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url, {
          headers: { "X-CoinAPI-Key": this.apiKey },
        });
        const parsed = CoinApiTickerSchema.safeParse(data);
        if (!parsed.success) throw new Error("Invalid response from CoinAPI");
        const d = parsed.data;
        return {
          asset: "BTC",
          price: d.rate,
          timestamp: new Date(d.time).getTime(),
          volume: null,
          source: "coinapi",
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
   * CoinAPI's free tier may not provide volume, so this will often be null.
   */
  async getTicker(symbol: string, quote: string): Promise<PriceTick> {
    if (!this.apiKey) throw new Error("COINAPI_KEY not set in environment");
    // Map symbol and quote to CoinApi asset IDs if possible
    const base =
      SYMBOL_TO_COINAPI[symbol.toLowerCase()] || symbol.toUpperCase();
    const quoteAsset =
      SYMBOL_TO_COINAPI[quote.toLowerCase()] || quote.toUpperCase();
    const url = `${this.baseUrl}/exchangerate/${base}/${quoteAsset}`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url, {
          headers: { "X-CoinAPI-Key": this.apiKey },
        });
        const parsed = CoinApiTickerSchema.safeParse(data);
        if (!parsed.success) throw new Error("Invalid response from CoinAPI");
        const d = parsed.data;
        // Try to get volume from /assets/{base} (volume_1day_usd is in USD, not always in quote currency)
        let volume: number | null = null;
        if (quoteAsset === "USD") {
          try {
            const assetUrl = `${this.baseUrl}/assets/${base}`;
            const { data: assetData } = await axios.get(assetUrl, {
              headers: { "X-CoinAPI-Key": this.apiKey },
            });
            if (Array.isArray(assetData) && assetData.length > 0) {
              const assetParsed = CoinApiAssetSchema.safeParse(assetData[0]);
              if (
                assetParsed.success &&
                typeof assetParsed.data.volume_1day_usd === "number"
              ) {
                volume = assetParsed.data.volume_1day_usd;
              }
            }
          } catch {}
        }
        return {
          asset: base,
          price: d.rate,
          timestamp: new Date(d.time).getTime(),
          volume,
          source: "coinapi",
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
