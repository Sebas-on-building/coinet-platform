module.exports = async function ohlcPlugin(params) {
  // params: { prices: [{ timestamp, price }] }
  if (!params || !Array.isArray(params.prices) || params.prices.length === 0) return { error: 'No price data' };
  const sorted = params.prices.sort((a, b) => a.timestamp - b.timestamp);
  const open = sorted[0].price;
  const close = sorted[sorted.length - 1].price;
  const high = Math.max(...sorted.map(p => p.price));
  const low = Math.min(...sorted.map(p => p.price));
  return { open, high, low, close, count: sorted.length };
}; 