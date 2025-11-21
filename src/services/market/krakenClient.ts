import axios from "axios";
import { z } from "zod";
import type { PriceTick } from "./MarketDataService";

// Zod schema for Kraken ticker endpoint
const KrakenTickerSchema = z.object({
  error: z.array(z.string()),
  result: z.record(
    z.string(),
    z.object({
      c: z.array(z.string()), // [close price, lot volume]
      v: z.array(z.string()), // [today, last 24h]
      h: z.array(z.string()), // [today, last 24h]
      l: z.array(z.string()), // [today, last 24h]
      // ...other fields omitted
    }),
  ),
});

// Symbol/quote to Kraken pair mapping
const SYMBOL_QUOTE_TO_PAIR: Record<string, string> = {
  btc_usd: "XXBTZUSD",
  eth_usd: "XETHZUSD",
  btc_eur: "XXBTZEUR",
  eth_eur: "XETHZEUR",
  ada_usd: "ADAUSD",
  sol_usd: "SOLUSD",
  usdt_usd: "USDTZUSD",
  ltc_usd: "XLTCZUSD",
  xrp_usd: "XXRPZUSD",
  dot_usd: "DOTUSD",
  bnb_usd: "BNBUSD",
  // Add more as needed
};

export class KrakenClient {
  private readonly baseUrl = "https://api.kraken.com/0/public";
  private readonly maxRetries = 3;

  async getTicker(symbol: string, quote: string): Promise<PriceTick> {
    const key = `${symbol.toLowerCase()}_${quote.toLowerCase()}`;
    const pair =
      SYMBOL_QUOTE_TO_PAIR[key] ||
      `${symbol.toUpperCase()}${quote.toUpperCase()}`;
    const url = `${this.baseUrl}/Ticker?pair=${pair}`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url);
        const parsed = KrakenTickerSchema.safeParse(data);
        if (!parsed.success) throw new Error("Invalid response from Kraken");
        if (parsed.data.error && parsed.data.error.length > 0)
          throw new Error(parsed.data.error.join(","));
        const ticker = parsed.data.result[pair];
        if (!ticker) throw new Error("Pair not found in Kraken response");
        return {
          asset: symbol.toUpperCase(),
          price: parseFloat(ticker.c[0]),
          timestamp: Date.now(),
          volume: ticker.v[1] ? parseFloat(ticker.v[1]) : null,
          source: "kraken",
          high24h: ticker.h[1] ? parseFloat(ticker.h[1]) : null,
          low24h: ticker.l[1] ? parseFloat(ticker.l[1]) : null,
          marketCap: null, // Kraken does not provide market cap
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
