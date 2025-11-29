import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface UserPreferences {
  userId: string;
  theme: "light" | "dark" | "system";
  notifications: {
    email: boolean;
    push: boolean;
  };
  watchlist: string[];
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Timestamp;
}

export interface WatchlistItem {
  userId: string;
  assetId: string;
  addedAt: Timestamp;
  notes?: string;
  priceAlert?: {
    targetPrice: number;
    condition: "above" | "below";
  };
}

export interface PriceAlert {
  id: string;
  userId: string;
  assetId: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: Timestamp;
  triggered: boolean;
  triggeredAt?: Timestamp;
}
