import type { OnChainProvider } from "./OnChainProvider";
import type { OnChainMetricData } from "../getOnChainMetric";

export class EtherscanProvider implements OnChainProvider {
  async getMetric(
    blockchain: string,
    metric: string,
    timeframe: string,
  ): Promise<OnChainMetricData> {
    // TODO: Implement real Etherscan API call
    const now = new Date();
    return {
      value: 22222,
      trend: [22000, 22100, 22200, 22210, 22222],
      anomaly: { label: "None", description: "No anomaly detected" },
      aiExplainer: `Metric ${metric} for ${blockchain} is stable (Etherscan mock).`,
      source: "Etherscan",
      timestamp: now.toISOString(),
      confidence: 0.9,
    };
  }
}
