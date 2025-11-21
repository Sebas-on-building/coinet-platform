import { OnChainProvider } from "./OnChainProvider";
import { OnChainMetricData } from "../getOnChainMetric";
import { blockchainRegistry, metricRegistry } from "../registry";

// Map metric keys to Blockchair chart endpoints
const chartEndpointMap: Record<string, string> = {
  transactions_count: "transactions",
  active_addresses_count: "active_addresses",
  fees_usd: "fees_usd",
  hashrate_24h: "hashrate_24h",
  // Add more as supported
};

// Helper to parse timeframe string to number of days
function parseTimeframe(timeframe: string): number {
  if (!timeframe) return 7;
  const match = timeframe.match(/(\d+)d/);
  if (match) return parseInt(match[1], 10);
  return 7; // default
}

export class BlockchairProvider implements OnChainProvider {
  /**
   * Uses the central registry for blockchain and metric lookups.
   * Fetches real trend data from Blockchair charts endpoints if supported.
   */
  async getMetric(
    blockchain: string,
    metric: string,
    timeframe: string,
  ): Promise<OnChainMetricData> {
    const chain = blockchainRegistry[blockchain] || "bitcoin";
    const metricKey = metricRegistry[metric] || "transactions_count";
    const chartEndpoint = chartEndpointMap[metricKey];
    const days = parseTimeframe(timeframe);
    let trend: number[] = [];
    let value = 0;
    try {
      if (chartEndpoint) {
        // Fetch historical data from /charts/{endpoint}
        const url = `https://api.blockchair.com/${chain}/charts/${chartEndpoint}`;
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Blockchair chart API error: ${res.status}`);
        const data = await res.json();
        const chartData = data.data[chartEndpoint];
        if (!Array.isArray(chartData) || chartData.length === 0)
          throw new Error("No chart data");
        // Get the last N days
        const sliced = chartData.slice(-days);
        trend = sliced.map((entry: any) => entry[1]);
        value = trend[trend.length - 1];
      } else {
        // Fallback: fetch current value from /stats and return flat trend
        const url = `https://api.blockchair.com/${chain}/stats`;
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Blockchair stats API error: ${res.status}`);
        const data = await res.json();
        value = data.data[metricKey] || 0;
        trend = Array(days).fill(value);
      }
    } catch (error) {
      throw new Error(`BlockchairProvider failed: ${error}`);
    }
    // Mock anomaly and AI explainer for now
    return {
      value,
      trend,
      anomaly: {
        label: "Spike",
        description: `Unusual change in ${metric.toLowerCase()} on ${blockchain}`,
      },
      aiExplainer: `A spike in ${metric.toLowerCase()} may indicate increased network activity or market events on ${blockchain}.`,
      source: "Blockchair",
      timestamp: new Date().toISOString(),
      confidence: 1,
    };
  }
}
