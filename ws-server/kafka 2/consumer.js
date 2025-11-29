const { Kafka } = require('kafkajs');
const topics = require('./topics');
const { broadcastToSubscribers } = require('../ws/subscriptions');
const { auditLog } = require('../ws/audit');

async function startKafkaConsumer(config, wss, redisPubSub) {
  const kafka = new Kafka({ brokers: config.brokers });
  const consumer = kafka.consumer({ groupId: 'ws-broadcast-group' });
  const portfolioConsumer = kafka.consumer({ groupId: 'portfolio-service-group' });
  const alertsConsumer = kafka.consumer({ groupId: 'alerts-service-group' });
  const analyticsConsumer = kafka.consumer({ groupId: 'analytics-service-group' });

  // Core real-time topics
  await consumer.connect();
  await consumer.subscribe({ topic: topics.MARKET_TICKS, fromBeginning: false });
  await consumer.subscribe({ topic: topics.STRATEGY_SIGNALS, fromBeginning: false });
  await consumer.subscribe({ topic: topics.MARKET_AVG_30S, fromBeginning: false });
  await consumer.subscribe({ topic: topics.MARKET_AVG_5M, fromBeginning: false });
  await consumer.subscribe({ topic: topics.MARKET_AVG_1H, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message, partition }) => {
      const data = JSON.parse(message.value.toString());
      broadcastToSubscribers(wss, data, topic);
      redisPubSub && redisPubSub.publish(topic, message.value.toString());
      auditLog('kafka_message', { topic, partition, data });
    }
  });

  // Portfolio Service: consume market.ticks for valuation
  await portfolioConsumer.connect();
  await portfolioConsumer.subscribe({ topic: topics.MARKET_TICKS, fromBeginning: false });
  await portfolioConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const tick = JSON.parse(message.value.toString());
      // TODO: Update portfolio valuations
      auditLog('portfolio_valuation', { topic, tick });
    }
  });

  // Alerts Service: consume market.ticks for alert evaluation
  await alertsConsumer.connect();
  await alertsConsumer.subscribe({ topic: topics.MARKET_TICKS, fromBeginning: false });
  await alertsConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const tick = JSON.parse(message.value.toString());
      // TODO: Evaluate alert conditions
      auditLog('alert_evaluation', { topic, tick });
    }
  });

  // Analytics Service: consume for training/inference
  await analyticsConsumer.connect();
  await analyticsConsumer.subscribe({ topic: topics.MARKET_TICKS, fromBeginning: false });
  await analyticsConsumer.subscribe({ topic: topics.MARKET_AVG_30S, fromBeginning: false });
  await analyticsConsumer.subscribe({ topic: topics.MARKET_AVG_5M, fromBeginning: false });
  await analyticsConsumer.subscribe({ topic: topics.MARKET_AVG_1H, fromBeginning: false });
  await analyticsConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value.toString());
      // TODO: Train models, run inference, update analytics, plugin aggregates, AI/ML
      auditLog('analytics_event', { topic, data });
    }
  });

  // Kafka Streams/KSQL integration (placeholder)
  // TODO: Integrate with Kafka Streams or KSQL for rolling aggregates, e.g. moving average
}

module.exports = { startKafkaConsumer }; 