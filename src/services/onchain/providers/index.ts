import { BlockchairProvider } from "./BlockchairProvider";
import { InfuraProvider } from "./InfuraProvider";
import { AlchemyProvider } from "./AlchemyProvider";
import type { OnChainMetricData } from "../getOnChainMetric";
import type { OnChainProvider } from "./OnChainProvider";

// List of available on-chain metric providers (add new providers here)
const providers: OnChainProvider[] = [
  new BlockchairProvider(),
  new InfuraProvider(),
  new AlchemyProvider(),
  // new GlassnodeProvider(), // Example: add more providers as needed
];

/**
 * Try each provider in order, returning the first successful result.
 * If all providers fail, throw an error.
 * @param blockchain - The blockchain to query
 * @param metric - The metric to fetch
 * @param timeframe - The timeframe for the metric
 */
export async function getOnChainMetric(
  blockchain: string,
  metric: string,
  timeframe: string,
): Promise<OnChainMetricData> {
  let lastError: any = null;
  for (const provider of providers) {
    try {
      return await provider.getMetric(blockchain, metric, timeframe);
    } catch (err) {
      lastError = err;
      // Optionally log error here
    }
  }
  throw new Error(
    `All on-chain metric providers failed. Last error: ${lastError}`,
  );
}
