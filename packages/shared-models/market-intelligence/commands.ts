// Atomic CQRS command types for Market Intelligence Context

export interface IngestMarketData {
  type: 'IngestMarketData';
  source: string;
  symbol: string;
  data: any;
}

export interface NormalizeMarketData {
  type: 'NormalizeMarketData';
  symbol: string;
  rawData: any;
}

export interface DetectMarketAnomaly {
  type: 'DetectMarketAnomaly';
  symbol: string;
  data: any;
}

export interface DistributeMarketData {
  type: 'DistributeMarketData';
  symbol: string;
  data: any;
  channels: string[];
} 