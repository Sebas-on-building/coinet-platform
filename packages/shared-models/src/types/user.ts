export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isVerified: boolean;
  preferences: UserPreferences;
  subscription: UserSubscription;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  notifications: NotificationPreferences;
  trading: TradingPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  priceAlerts: boolean;
  newsAlerts: boolean;
  tradingSignals: boolean;
}

export interface TradingPreferences {
  defaultPortfolio: string;
  riskTolerance: 'low' | 'medium' | 'high';
  autoRebalance: boolean;
  preferredExchanges: string[];
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  features: string[];
} 