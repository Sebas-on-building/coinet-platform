import type { OnChainProvider } from "./OnChainProvider";
import type { OnChainMetricData } from "../getOnChainMetric";

export class AlchemyProvider implements OnChainProvider {
  async getMetric(
    blockchain: string,
    metric: string,
    timeframe: string,
  ): Promise<OnChainMetricData> {
    // TODO: Implement real Alchemy API call
    // For now, return a mock
    const now = new Date();
    return {
      value: 54321,
      trend: [54000, 54100, 54200, 54300, 54321],
      anomaly: { label: "None", description: "No anomaly detected" },
      aiExplainer: `Metric ${metric} for ${blockchain} is stable (Alchemy mock).`,
      source: "Alchemy",
      timestamp: now.toISOString(),
      confidence: 0.9,
    };
  }
}
