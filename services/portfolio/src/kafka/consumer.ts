import { Kafka, logLevel } from 'kafkajs';
import { kafkaConfig, kafkaTopics } from '../../../../src/config/kafkaConfig';

const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  logLevel: logLevel.INFO,
});

const consumer = kafka.consumer({ groupId: 'portfolio-service-group' });

// Usage: startConsumer(handleTick)
export async function startConsumer(handleTick: (tick: any) => Promise<void>) {
  await consumer.connect();
  await consumer.subscribe({ topic: kafkaTopics.marketTicks, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (message.value) {
        const tick = JSON.parse(message.value.toString());
        await handleTick(tick);
      }
    },
  });
}

export async function disconnectConsumer() {
  await consumer.disconnect();
} 