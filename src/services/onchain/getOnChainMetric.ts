import crypto from "crypto";

export interface OnChainMetricData {
  value: number;
  trend: number[];
  anomaly: { label: string; description: string };
  aiExplainer: string;
  source: string; // e.g., 'Blockchair'
  timestamp: string; // ISO string
  confidence: number; // 0-1
}

const blockchairMap: Record<string, string> = {
  Bitcoin: "bitcoin",
  Ethereum: "ethereum",
};

const metricMap: Record<string, string> = {
  Transactions: "transactions_count",
  "Active Addresses": "active_addresses_count",
  Fees: "fees_usd",
  Hashrate: "hashrate_24h",
};

// Simple in-memory event bus for demonstration
export const eventBus: {
  publish: (event: string, data: any) => void;
  subscribers: Record<string, ((data: any) => void)[]>;
} = {
  subscribers: {},
  publish(event, data) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach((fn) => fn(data));
    }
  },
};

export function subscribe(event: string, fn: (data: any) => void) {
  if (!eventBus.subscribers[event]) eventBus.subscribers[event] = [];
  eventBus.subscribers[event].push(fn);
}

export async function getOnChainMetric(
  blockchain: string,
  metric: string,
  timeframe: string,
): Promise<OnChainMetricData> {
  const chain = blockchairMap[blockchain] || "bitcoin";
  const metricKey = metricMap[metric] || "transactions_count";
  // Fetch latest metric value
  const url = `https://api.blockchair.com/${chain}/stats`;
  const res = await fetch(url);
  const data = await res.json();
  const value = data.data[metricKey] || 0;
  // Mock trend data for now
  const trend = Array(5)
    .fill(0)
    .map((_, i) => value * (1 - 0.05 * (4 - i)));
  // Mock anomaly and AI explainer
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
    confidence: 0.95,
  };
}

// Batch historical pulls (e.g., daily for last N days)
export async function batchFetchOnChainMetrics(
  blockchain: string,
  metric: string,
  days: number,
): Promise<void> {
  const results: OnChainMetricData[] = [];
  for (let i = 0; i < days; i++) {
    // For demo, just use current value and decrement timestamp
    const data = await getOnChainMetric(blockchain, metric, "1d");
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.timestamp = date.toISOString();
    results.push(data);
  }
  // Compute checksum
  const checksum = sha256(JSON.stringify(results));
  // Publish to event bus with checksum
  eventBus.publish("onchain-metrics-batch", { results, checksum });
}

// Checksum verification
export function verifyChecksum(data: any, checksum: string): boolean {
  return sha256(JSON.stringify(data)) === checksum;
}

export function sha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}
