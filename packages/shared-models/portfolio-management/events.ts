// Atomic event types for Portfolio Management Context

export interface PortfolioCreated {
  type: 'PortfolioCreated';
  userId: string;
  portfolioId: string;
  timestamp: string;
}

export interface AssetAdded {
  type: 'AssetAdded';
  portfolioId: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface AssetRemoved {
  type: 'AssetRemoved';
  portfolioId: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface PortfolioRebalanced {
  type: 'PortfolioRebalanced';
  portfolioId: string;
  newAllocations: Record<string, number>;
  timestamp: string;
}

export interface PortfolioPerformanceUpdated {
  type: 'PortfolioPerformanceUpdated';
  portfolioId: string;
  performance: any;
  timestamp: string;
} 