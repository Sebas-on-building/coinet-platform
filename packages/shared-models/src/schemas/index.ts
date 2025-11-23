// =============================================================================
// COINET AI SHARED MODELS - ZOD SCHEMAS
// =============================================================================

import { z } from 'zod';

export const MarketDataSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  timestamp: z.number().positive(),
  change24h: z.number(),
  marketCap: z.number().positive().optional(),
});

export const CryptoAssetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  price: z.number().positive(),
  marketCap: z.number().positive(),
  volume24h: z.number().nonnegative(),
  circulatingSupply: z.number().positive(),
  totalSupply: z.number().positive().optional(),
  maxSupply: z.number().positive().optional(),
});

export const AIRecommendationSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  type: z.enum(['buy', 'sell', 'hold']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  timeframe: z.string(),
  createdAt: z.number().positive(),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().optional(),
  createdAt: z.number().positive(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    riskTolerance: z.enum(['low', 'medium', 'high']),
    favoriteAssets: z.array(z.string()),
    notifications: z.boolean(),
  }).optional(),
}); 