// Atomic CQRS command types for Portfolio Management Context

export interface CreatePortfolio {
  type: 'CreatePortfolio';
  userId: string;
}

export interface AddAsset {
  type: 'AddAsset';
  portfolioId: string;
  symbol: string;
  quantity: number;
  price: number;
}

export interface RemoveAsset {
  type: 'RemoveAsset';
  portfolioId: string;
  symbol: string;
  quantity: number;
  price: number;
}

export interface RebalancePortfolio {
  type: 'RebalancePortfolio';
  portfolioId: string;
  newAllocations: Record<string, number>;
}

export interface UpdatePortfolioPerformance {
  type: 'UpdatePortfolioPerformance';
  portfolioId: string;
  performance: any;
} 