// =============================================================================
// COINET AI SHARED MODELS - ENUMS
// =============================================================================

export enum AssetType {
  CRYPTOCURRENCY = 'cryptocurrency',
  TOKEN = 'token',
  STABLECOIN = 'stablecoin',
  NFT = 'nft',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit',
}

export enum RecommendationType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
} 