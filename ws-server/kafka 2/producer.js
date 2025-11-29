const { Kafka } = require('kafkajs');
const config = require('../config');

const kafka = new Kafka({ brokers: config.kafka.brokers });
const producer = kafka.producer();

async function connectProducer() {
  if (!producer.isConnected()) await producer.connect();
}

async function sendToTopic(topic, message) {
  await connectProducer();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}

async function produceMarketTick(tick) {
  await sendToTopic('market.ticks', tick);
}

async function produceStrategySignal(signal) {
  await sendToTopic('strategy.signals', signal);
}

module.exports = {
  sendToTopic,
  produceMarketTick,
  produceStrategySignal,
  producer,
}; 