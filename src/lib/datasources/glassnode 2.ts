import fetch from 'node-fetch';

const GLASSNODE_API_BASE = 'https://api.glassnode.com/v1/metrics';

export interface GlassnodeOptions {
  metric: string;    // e.g., "addresses/active_count"
  asset: string;     // e.g., "BTC"
  frequency?: string; // e.g., "1d" for daily, "10m" for 10 minutes, etc.
  apiKey: string;
}

// Glassnode returns data points as { t: UnixTime, v: value }
interface GlassnodeDataPoint { t: number; v: number; }

/**
 * Fetches time series data from Glassnode API
 * @param options Configuration for the API request
 * @returns Array of normalized data points with time in milliseconds
 */
export async function fetchGlassnodeSeries(options: GlassnodeOptions) {
  const { metric, asset, frequency = '1d', apiKey } = options;
  const url = `${GLASSNODE_API_BASE}/${metric}?api_key=${apiKey}&a=${asset}&i=${frequency}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Glassnode API error: ${res.statusText} (${res.status})`);
    }
    const data: GlassnodeDataPoint[] = await res.json();

    // Normalize to { time, value } format
    return data.map(dp => ({
      time: dp.t * 1000, // Convert seconds to milliseconds for JavaScript
      value: dp.v
    }));
  } catch (error) {
    console.error('Error fetching from Glassnode:', error);
    throw error;
  }
}

/**
 * Returns a list of available Glassnode metrics for user selection
 */
export const glassnodeMetrics = [
  { id: 'addresses/active_count', name: 'Active Addresses', category: 'Network' },
  { id: 'addresses/sending_count', name: 'Sending Addresses', category: 'Network' },
  { id: 'addresses/receiving_count', name: 'Receiving Addresses', category: 'Network' },
  { id: 'transactions/count', name: 'Transaction Count', category: 'Transactions' },
  { id: 'transactions/size_mean', name: 'Average Transaction Size', category: 'Transactions' },
  { id: 'transactions/transfers_volume_sum', name: 'Transfer Volume', category: 'Transactions' },
  { id: 'mining/difficulty_latest', name: 'Mining Difficulty', category: 'Mining' },
  { id: 'mining/hash_rate_mean', name: 'Hash Rate', category: 'Mining' },
  { id: 'market/price_usd_close', name: 'Price (USD)', category: 'Market' },
  { id: 'market/marketcap_usd', name: 'Market Cap', category: 'Market' },
  { id: 'market/exchange_volume_usd_sum', name: 'Exchange Volume', category: 'Market' },
  { id: 'indicators/sopr', name: 'SOPR', category: 'Indicators' },
  { id: 'indicators/fear_and_greed', name: 'Fear & Greed Index', category: 'Indicators' },
];

/**
 * Supported assets in Glassnode
 */
export const glassnodeAssets = [
  { id: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum' },
  { id: 'LTC', name: 'Litecoin' },
  { id: 'AAVE', name: 'Aave' },
  { id: 'LINK', name: 'Chainlink' },
  { id: 'UNI', name: 'Uniswap' },
  // Add more as needed or fetch dynamically if Glassnode provides an API for that
];

/**
 * Supported time frequencies in Glassnode
 */
export const glassnodeFrequencies = [
  { id: '10m', name: '10 minutes' },
  { id: '1h', name: '1 hour' },
  { id: '24h', name: '24 hours' },
  { id: '1d', name: '1 day' },
  { id: '1w', name: '1 week' },
  { id: '1month', name: '1 month' },
]; 