module.exports = async function rollingAveragePlugin(params) {
  // params: { data: [number], window: number }
  const { data, window } = params;
  if (!Array.isArray(data) || !window || window < 1) return { error: 'Invalid params' };
  const result = [];
  for (let i = 0; i <= data.length - window; i++) {
    const avg = data.slice(i, i + window).reduce((a, b) => a + b, 0) / window;
    result.push(avg);
  }
  return { rollingAverage: result };
}; 