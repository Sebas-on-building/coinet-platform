import { MarketDataIngested } from 'shared-models/market-intelligence/events';

export function onMarketDataIngested(event: MarketDataIngested) {
  // Update projections, trigger downstream processing
  // Extensible: add listeners for analytics, anomaly detection
} 