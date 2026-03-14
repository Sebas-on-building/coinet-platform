/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🛡️ PROVIDER RESPONSE SCHEMAS — Runtime Validation Layer                   ║
 * ║                                                                               ║
 * ║   Zod schemas for validating external provider API responses.                ║
 * ║   No external payload should be trusted blindly.                             ║
 * ║                                                                               ║
 * ║   Usage:                                                                      ║
 * ║     const result = validateProvider('coingecko_price', response.data);       ║
 * ║     if (!result.ok) { handleDegradation(result.error); }                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// COINGECKO SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const CoinGeckoPriceEntrySchema = z.object({
  usd: z.number(),
  usd_24h_change: z.number().optional().nullable(),
  usd_24h_vol: z.number().optional().nullable(),
  usd_market_cap: z.number().optional().nullable(),
  last_updated_at: z.number().optional(),
});

/** CoinGecko /simple/price response: { [coinId]: { usd, ... } } */
export const CoinGeckoPriceSchema = z.record(z.string(), CoinGeckoPriceEntrySchema);

const CoinGeckoMarketItemSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number().nullable(),
  price_change_24h: z.number().nullable().optional(),
  price_change_percentage_24h: z.number().nullable().optional(),
  total_volume: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(),
  high_24h: z.number().nullable().optional(),
  low_24h: z.number().nullable().optional(),
  ath: z.number().nullable().optional(),
  ath_date: z.string().nullable().optional(),
  circulating_supply: z.number().nullable().optional(),
  total_supply: z.number().nullable().optional(),
  max_supply: z.number().nullable().optional(),
  last_updated: z.string().nullable().optional(),
});

/** CoinGecko /coins/markets response */
export const CoinGeckoMarketsSchema = z.array(CoinGeckoMarketItemSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// CMC SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const CMCQuoteSchema = z.object({
  price: z.number(),
  percent_change_24h: z.number().nullable().optional(),
  volume_24h: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(),
  last_updated: z.string().nullable().optional(),
});

const CMCCoinEntrySchema = z.object({
  name: z.string().optional(),
  symbol: z.string().optional(),
  circulating_supply: z.number().nullable().optional(),
  total_supply: z.number().nullable().optional(),
  max_supply: z.number().nullable().optional(),
  quote: z.object({
    USD: CMCQuoteSchema,
  }),
});

/** CMC /cryptocurrency/quotes/latest response wrapper */
export const CMCResponseSchema = z.object({
  data: z.record(z.string(), CMCCoinEntrySchema.or(z.array(CMCCoinEntrySchema))),
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEXSCREENER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const DexPairTokenSchema = z.object({
  address: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
});

const DexPairSchema = z.object({
  chainId: z.string().optional(),
  dexId: z.string().optional(),
  pairAddress: z.string().optional(),
  baseToken: DexPairTokenSchema.optional(),
  quoteToken: DexPairTokenSchema.optional(),
  priceNative: z.string().optional(),
  priceUsd: z.string().optional().nullable(),
  volume: z.object({ h24: z.number().optional() }).optional(),
  priceChange: z.object({ h24: z.number().optional() }).optional(),
  liquidity: z.object({ usd: z.number().optional() }).optional(),
  fdv: z.number().optional().nullable(),
  txns: z.object({
    h24: z.object({
      buys: z.number().optional(),
      sells: z.number().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

/** DexScreener /search or /tokens response */
export const DexScreenerPairsSchema = z.object({
  pairs: z.array(DexPairSchema).nullable().optional(),
});

/** DexScreener /pairs/:chainId/:pairAddress response */
export const DexScreenerPairSchema = z.object({
  pair: DexPairSchema.nullable().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFILLAMA SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const DefiLlamaCoinSchema = z.object({
  price: z.number(),
  confidence: z.number().optional(),
  timestamp: z.number().optional(),
  symbol: z.string().optional(),
  decimals: z.number().optional(),
});

/** DeFiLlama /prices/current response */
export const DefiLlamaPricesSchema = z.object({
  coins: z.record(z.string(), DefiLlamaCoinSchema),
});

/** DeFiLlama /protocol/:slug response (partial) */
export const DefiLlamaProtocolSchema = z.object({
  tvl: z.number().nullable().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  chain: z.string().optional(),
  chains: z.array(z.string()).optional(),
}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════════
// COINGLASS SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const CoinglassLiquidationItemSchema = z.object({
  exchangeName: z.string().optional(),
  symbol: z.string().optional(),
  side: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  usdValue: z.union([z.string(), z.number()]).optional(),
  timestamp: z.number().optional(),
});

const CoinglassFundingItemSchema = z.object({
  exchangeName: z.string().optional(),
  symbol: z.string().optional(),
  rate: z.union([z.string(), z.number()]).optional(),
  predictedRate: z.union([z.string(), z.number()]).optional().nullable(),
  timestamp: z.number().optional(),
});

const CoinglassOIItemSchema = z.object({
  symbol: z.string().optional(),
  openInterest: z.number().optional(),
  openInterestCh24: z.number().optional(),
  openInterestCh24Percent: z.number().optional(),
});

/** CoinGlass standard response envelope */
export const CoinglassResponseSchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  msg: z.string().optional(),
  data: z.unknown().optional(),
});

export const CoinglassLiquidationsSchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  data: z.array(CoinglassLiquidationItemSchema).optional().nullable(),
});

export const CoinglassFundingSchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  data: z.array(CoinglassFundingItemSchema).optional().nullable(),
});

export const CoinglassOISchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  data: z.array(CoinglassOIItemSchema).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPER
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; provider: string };

/**
 * Validate a provider response against its Zod schema.
 * On failure, logs the error and returns a structured failure result.
 */
export function validateProvider<T>(
  provider: string,
  schema: z.ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errorMsg = result.error.issues
    .slice(0, 3)
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ');

  logger.warn('Provider schema validation failed', { provider, error: errorMsg });
  return { ok: false, error: errorMsg, provider };
}
