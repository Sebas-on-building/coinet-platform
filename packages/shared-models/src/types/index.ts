// =============================================================================
// COINET AI SHARED MODELS - TYPES
// =============================================================================

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change24h: number;
  marketCap?: number;
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply?: number;
  maxSupply?: number;
}

export interface AIRecommendation {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  timeframe: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: number;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  riskTolerance: 'low' | 'medium' | 'high';
  favoriteAssets: string[];
  notifications: boolean;
} 