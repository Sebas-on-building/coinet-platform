import { OnChainMetricData } from "../getOnChainMetric";

/**
 * Interface for on-chain metric data providers.
 * All providers (Blockchair, Glassnode, Etherscan, etc.) must implement this interface.
 */
export interface OnChainProvider {
  /**
   * Fetch a specific on-chain metric for a given blockchain and timeframe.
   * @param blockchain - The blockchain to query (e.g., 'Bitcoin', 'Ethereum').
   * @param metric - The metric to fetch (e.g., 'Transactions', 'Active Addresses').
   * @param timeframe - The timeframe for the metric (e.g., '1d', '7d', '30d').
   * @returns A Promise resolving to standardized OnChainMetricData.
   */
  getMetric(
    blockchain: string,
    metric: string,
    timeframe: string,
  ): Promise<OnChainMetricData>;
}
