import type { OnChainProvider } from "./OnChainProvider";
import type { OnChainMetricData } from "../getOnChainMetric";

export class TheGraphProvider implements OnChainProvider {
  async getMetric(
    blockchain: string,
    metric: string,
    timeframe: string,
  ): Promise<OnChainMetricData> {
    // TODO: Implement real The Graph subgraph query
    const now = new Date();
    return {
      value: 33333,
      trend: [33000, 33100, 33200, 33300, 33333],
      anomaly: { label: "None", description: "No anomaly detected" },
      aiExplainer: `Metric ${metric} for ${blockchain} is stable (The Graph mock).`,
      source: "TheGraph",
      timestamp: now.toISOString(),
      confidence: 0.9,
    };
  }
}
