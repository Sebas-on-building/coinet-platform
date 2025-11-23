import axios from 'axios';

export async function fetchOnchainMetrics(symbol: string, metric: string) {
  try {
    const res = await axios.get(`https://api.glassnode.com/v1/metrics/${metric}?a=${symbol}&api_key=${process.env.GLASSNODE_API_KEY}`);
    // Normalize data as needed
    return res.data;
  } catch (err) {
    throw new Error('Glassnode fetchOnchainMetrics failed: ' + err);
  }
} 