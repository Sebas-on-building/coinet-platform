import { Kafka, logLevel } from 'kafkajs';
import { kafkaConfig, kafkaTopics } from './kafkaConfig';

const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  logLevel: logLevel.INFO,
});

const producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 5,
  retry: { retries: 5 },
});

// Usage: publishPortfolioEvent({ symbol: 'BTCUSD', ... })
export async function publishPortfolioEvent(event: { symbol: string;[key: string]: any }) {
  await producer.connect();
  await producer.send({
    topic: kafkaTopics.portfolioEvents,
    acks: -1, // acks=all
    messages: [
      {
        key: event.symbol, // Partition by symbol
        value: JSON.stringify(event),
      },
    ],
  });
  // Do not disconnect after every send; keep producer alive for performance
}

export async function disconnectProducer() {
  await producer.disconnect();
} 