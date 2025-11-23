import * as Sentry from "@sentry/nextjs";

export interface PortfolioAsset {
  symbol: string;
  amount: number;
  value: number;
  percent: number;
}

export interface PortfolioSnapshotData {
  totalBalance: number;
  pnl: number;
  allocation: PortfolioAsset[];
}

export interface OnChainMetricData {
  value: number;
  trend: number[];
  anomaly: { label: string; description: string };
  aiExplainer: string;
  source: string; // e.g., 'Blockchair'
  timestamp: string; // ISO string
  confidence: number; // 0-1
}

export interface PriceTick {
  asset: string;
  price: number;
  timestamp: number;
  volume: number | null;
  source: string;
  high24h: number | null;
  low24h: number | null;
  marketCap: number | null;
}

export async function getPortfolioSnapshot(
  address?: string,
  currency: string = "USD",
): Promise<PortfolioSnapshotData> {
  if (!address) {
    // Return mock data if no address is provided
    return {
      totalBalance: 42000,
      pnl: 2500,
      allocation: [
        { symbol: "BTC", amount: 0.5, value: 25000, percent: 60 },
        { symbol: "ETH", amount: 5, value: 12600, percent: 30 },
        { symbol: "SOL", amount: 100, value: 4200, percent: 10 },
      ],
    };
  }
  // Use Covalent API (demo, no API key required for some endpoints)
  const chainId = 1; // Ethereum mainnet
  const url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?quote-currency=${currency}&format=JSON`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.data || !data.data.items) throw new Error("No portfolio data");
  const assets = data.data.items
    .filter((item: any) => Number(item.balance) > 0 && item.quote)
    .map((item: any) => ({
      symbol: item.contract_ticker_symbol,
      amount: Number(item.balance) / Math.pow(10, item.contract_decimals),
      value: item.quote,
      percent: 0, // will calculate below
    }));
  const totalBalance = assets.reduce((sum: number, a: any) => sum + a.value, 0);
  assets.forEach(
    (a: PortfolioAsset) =>
      (a.percent = totalBalance ? (a.value / totalBalance) * 100 : 0),
  );
  // P&L is mocked for now
  return {
    totalBalance,
    pnl: 0,
    allocation: assets,
  };
}
