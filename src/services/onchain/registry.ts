/**
 * Central registry for supported blockchains and on-chain metrics.
 * Add new blockchains/metrics here, or use the register functions for dynamic extension (e.g., plugins).
 */

// Blockchain registry: maps display name to provider-specific ID
export const blockchainRegistry: Record<string, string> = {
  Bitcoin: "bitcoin",
  Ethereum: "ethereum",
  // Add more blockchains here
};

// Metric registry: maps display name to provider-specific key
export const metricRegistry: Record<string, string> = {
  Transactions: "transactions_count",
  "Active Addresses": "active_addresses_count",
  Fees: "fees_usd",
  Hashrate: "hashrate_24h",
  // Add more metrics here
};

/**
 * Dynamically register a new blockchain.
 * @param name - Display name (e.g., 'Solana')
 * @param id - Provider-specific ID (e.g., 'solana')
 */
export function registerBlockchain(name: string, id: string) {
  blockchainRegistry[name] = id;
}

/**
 * Dynamically register a new metric.
 * @param name - Display name (e.g., 'Gas Price')
 * @param key - Provider-specific key (e.g., 'gas_price')
 */
export function registerMetric(name: string, key: string) {
  metricRegistry[name] = key;
}

/**
 * Usage example:
 *   registerBlockchain('Solana', 'solana');
 *   registerMetric('Gas Price', 'gas_price');
 */
