import axios from "axios";
import Fuse from "fuse.js";
import { franc } from "franc-min";
import Sentiment from "sentiment";
import SentimentFr from "sentiment-fr";

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
}

let tokenList: TokenInfo[] = [];
let fuse: Fuse<TokenInfo> | null = null;
let lastFetched = 0;

/**
 * Fetch and cache the token list from CoinGecko. Refresh every 6 hours.
 */
export async function refreshTokenList() {
  const now = Date.now();
  if (now - lastFetched < 6 * 60 * 60 * 1000 && tokenList.length > 0) return;
  const { data } = await axios.get(
    "https://api.coingecko.com/api/v3/coins/list",
  );
  tokenList = data;
  fuse = new Fuse(tokenList, { keys: ["symbol", "name"], threshold: 0.3 });
  lastFetched = now;
}

/**
 * Fuzzy lookup for a token by symbol or name.
 */
export async function getTokenInfoBySymbolOrName(
  query: string,
): Promise<TokenInfo | null> {
  await refreshTokenList();
  if (!fuse) return null;
  const res = fuse.search(query);
  return res.length > 0 ? res[0].item : null;
}

/**
 * Extract asset symbol from text using $SYMBOL or fuzzy name/symbol matching.
 */
export async function extractAsset(text: string): Promise<string | null> {
  // Regex for $SYMBOL
  const match = text.match(/\$([A-Z0-9]{2,10})/);
  if (match) {
    const info = await getTokenInfoBySymbolOrName(match[1]);
    return info ? info.symbol.toUpperCase() : null;
  }
  // Fuzzy match for names/symbols
  const words = text.toLowerCase().split(/\W+/);
  for (const word of words) {
    const info = await getTokenInfoBySymbolOrName(word);
    if (info) return info.symbol.toUpperCase();
  }
  return null;
}

const sentiment = new Sentiment();
const sentimentFr = new SentimentFr();

/**
 * Multi-language sentiment analysis. Returns comparative score (-1 to 1).
 */
export function analyzeSentiment(text: string): number {
  const lang = franc(text, { minLength: 3 });
  if (lang === "eng") return sentiment.analyze(text).comparative;
  if (lang === "fra") return sentimentFr.analyze(text).comparative;
  // Add more as needed
  return 0; // Neutral for unsupported
}
