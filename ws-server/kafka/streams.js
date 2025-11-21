const { Kafka } = require('kafkajs');
const topics = require('./topics');
const { sendToTopic } = require('./producer');

const windows = [
  { name: '10s', ms: 10 * 1000, topic: topics.MARKET_AVG_10S },
  { name: '30s', ms: 30 * 1000, topic: topics.MARKET_AVG_30S },
  { name: '5m', ms: 5 * 60 * 1000, topic: topics.MARKET_AVG_5M },
  { name: '1h', ms: 60 * 60 * 1000, topic: topics.MARKET_AVG_1H },
  { name: '1d', ms: 24 * 60 * 60 * 1000, topic: topics.MARKET_AVG_1D },
];

const aggregates = [
  { name: 'avg', fn: arr => arr.reduce((a, b) => a + b.price, 0) / arr.length, topic: w => w.topic },
  { name: 'median', fn: arr => { const s = arr.map(x => x.price).sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }, topic: w => topics[`MARKET_MEDIAN_${w.name.toUpperCase()}`] },
  { name: 'stddev', fn: arr => { const mean = arr.reduce((a, b) => a + b.price, 0) / arr.length; return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b.price - mean, 2), 0) / arr.length); }, topic: w => topics[`MARKET_STDDEV_${w.name.toUpperCase()}`] },
];

async function startRollingAggregateStream(config, pluginHooks = []) {
  const kafka = new Kafka({ brokers: config.brokers });
  const consumer = kafka.consumer({ groupId: 'rolling-aggregate-stream-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: topics.MARKET_TICKS, fromBeginning: false });

  const buffers = {};
  const lastTimestamps = {};

  await consumer.run({
    eachMessage: async ({ message }) => {
      const tick = JSON.parse(message.value.toString());
      const { symbol, price, timestamp } = tick;
      if (!symbol) return;
      if (!buffers[symbol]) buffers[symbol] = {};
      for (const w of windows) {
        if (!buffers[symbol][w.name]) buffers[symbol][w.name] = [];
        buffers[symbol][w.name].push({ price, timestamp });
        buffers[symbol][w.name] = buffers[symbol][w.name].filter(t => Date.now() - t.timestamp <= w.ms);
        if (!lastTimestamps[symbol]) lastTimestamps[symbol] = {};
        if (!lastTimestamps[symbol][w.name]) lastTimestamps[symbol][w.name] = 0;
        if (Date.now() - lastTimestamps[symbol][w.name] > w.ms) {
          lastTimestamps[symbol][w.name] = Date.now();
          const buf = buffers[symbol][w.name];
          if (buf.length > 0) {
            for (const agg of aggregates) {
              const value = agg.fn(buf);
              const topic = agg.topic(w);
              if (topic) await sendToTopic(topic, { symbol, timestamp: Date.now(), [agg.name]: value, count: buf.length });
            }
            // Plugin hooks: e.g. sentiment, anomaly, forecast, custom
            for (const plugin of pluginHooks) {
              const pluginResult = await plugin({ symbol, buffer: buf });
              if (pluginResult && pluginResult.topic && pluginResult.data) {
                await sendToTopic(pluginResult.topic, pluginResult.data);
              }
            }
          }
        }
      }
    }
  });
}

module.exports = { startRollingAggregateStream }; 