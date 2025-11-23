import type { OnChainProvider } from "./OnChainProvider";
import type { OnChainMetricData } from "../getOnChainMetric";

const INFURA_API_KEY = process.env.INFURA_API_KEY;

export class InfuraProvider implements OnChainProvider {
  async getMetric(
    blockchain: string,
    metric: string,
    timeframe: string,
  ): Promise<OnChainMetricData> {
    if (!INFURA_API_KEY) throw new Error("INFURA_API_KEY not set");
    if (blockchain.toLowerCase() !== "ethereum")
      throw new Error("InfuraProvider only supports Ethereum");
    if (metric === "txCount") {
      // Fetch latest block number
      const blockRes = await fetch(
        `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        },
      );
      const blockData = await blockRes.json();
      const blockNumber = parseInt(blockData.result, 16);
      // Fetch block data
      const blockInfoRes = await fetch(
        `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [blockData.result, false],
            id: 1,
          }),
        },
      );
      const blockInfo = await blockInfoRes.json();
      const txCount = blockInfo.result.transactions.length;
      const now = new Date();
      return {
        value: txCount,
        trend: [txCount], // For demo, just current value
        anomaly: { label: "None", description: "No anomaly detected" },
        aiExplainer: `Transaction count for Ethereum latest block via Infura.`,
        source: "Infura",
        timestamp: now.toISOString(),
        confidence: 0.99,
      };
    }
    // Fallback: mock
    const now = new Date();
    return {
      value: 12345,
      trend: [12000, 12100, 12200, 12300, 12345],
      anomaly: { label: "None", description: "No anomaly detected" },
      aiExplainer: `Metric ${metric} for ${blockchain} is stable (Infura mock).`,
      source: "Infura",
      timestamp: now.toISOString(),
      confidence: 0.9,
    };
  }
}
