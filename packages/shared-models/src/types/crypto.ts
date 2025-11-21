export interface CryptoCurrency {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
}

export interface BlockchainData {
  network: string;
  blockHeight: number;
  hashRate: number;
  difficulty: number;
  transactionCount: number;
  activeAddresses: number;
  timestamp: Date;
}

export interface DeFiProtocol {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  category: string;
  chain: string;
  riskScore: number;
} 