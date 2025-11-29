import axios from 'axios';

export async function fetchMarketSentiment(symbol: string) {
  try {
    const res = await axios.get(`https://api.coinank.com/v1/sentiment?symbol=${symbol}&api_key=${process.env.COINANK_API_KEY}`);
    // Normalize data as needed
    return res.data;
  } catch (err) {
    throw new Error('CoinAnk fetchMarketSentiment failed: ' + err);
  }
} 