const analyticsPlugins = {
  correlation: require('../analytics/correlation'),
  anomaly: require('../analytics/anomaly'),
  forecast: require('../analytics/forecast'),
  ohlc: require('../analytics/ohlc'),
  rollingAverage: require('../analytics/rollingAverage'),
};
const aiPlugins = {
  llm: require('../ai/llm'),
  vision: require('../ai/vision'),
  sentiment: require('../ai/sentiment'),
};
const userPlugins = {}; // Dynamically loaded user plugins

const plugins = { ...analyticsPlugins, ...aiPlugins, ...userPlugins };

function loadPlugins(wss) {
  // Hot-reload, live demo, versioning, rollback, etc.
  // Watch /plugins/user for new plugins and add to plugins object
}
module.exports = { loadPlugins, plugins }; 