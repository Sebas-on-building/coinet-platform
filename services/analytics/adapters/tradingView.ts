import axios from 'axios';

export async function fetchIndicators(symbol: string, interval: string) {
  try {
    const res = await axios.get(`https://api.tradingview.com/indicators?symbol=${symbol}&interval=${interval}`);
    // Normalize data as needed
    return res.data;
  } catch (err) {
    throw new Error('TradingView fetchIndicators failed: ' + err);
  }
}

export async function fetchChartData(symbol: string, interval: string) {
  try {
    const res = await axios.get(`https://api.tradingview.com/chart?symbol=${symbol}&interval=${interval}`);
    // Normalize data as needed
    return res.data;
  } catch (err) {
    throw new Error('TradingView fetchChartData failed: ' + err);
  }
} 