import { IngestMarketData } from 'shared-models/market-intelligence/commands';

export function handleIngestMarketData(cmd: IngestMarketData) {
  // Validate, transform, and persist raw data
  // Emit MarketDataIngested event
  // Extensible: add hooks for new exchanges, data types
} 