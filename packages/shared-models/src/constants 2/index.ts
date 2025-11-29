// =============================================================================
// COINET AI SHARED MODELS - CONSTANTS
// =============================================================================

export const API_ENDPOINTS = {
  MARKET_DATA: '/api/v1/market',
  AI_RECOMMENDATIONS: '/api/v1/ai/recommendations',
  USER_PROFILE: '/api/v1/user',
  WEBSOCKET: '/ws',
} as const;

export const DEFAULT_PAGINATION = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const CACHE_TTL = {
  MARKET_DATA: 30, // seconds
  AI_RECOMMENDATIONS: 300, // 5 minutes
  USER_PROFILE: 3600, // 1 hour
} as const;

export const POPULAR_CRYPTOCURRENCIES = [
  'BTC',
  'ETH',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'SOL',
  'DOT',
  'AVAX',
  'MATIC',
] as const; 