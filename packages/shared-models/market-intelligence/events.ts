// Atomic event types for Market Intelligence Context

export interface MarketDataIngested {
  type: 'MarketDataIngested';
  source: string;
  symbol: string;
  timestamp: string;
  rawData: any;
}

export interface MarketDataNormalized {
  type: 'MarketDataNormalized';
  symbol: string;
  timestamp: string;
  normalizedData: any;
}

export interface MarketAnomalyDetected {
  type: 'MarketAnomalyDetected';
  symbol: string;
  timestamp: string;
  anomalyType: string;
  details: any;
}

export interface MarketDataDistributed {
  type: 'MarketDataDistributed';
  symbol: string;
  timestamp: string;
  distributionChannels: string[];
  data: any;
} 