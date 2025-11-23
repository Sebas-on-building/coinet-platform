module.exports = async function sentimentPlugin(params) {
  // params: { text: string }
  if (!params || typeof params.text !== 'string') return { error: 'No text' };
  // Mocked: random score
  const score = Math.round((Math.random() * 2 - 1) * 100) / 100;
  return { sentiment: score, text: params.text };
}; 