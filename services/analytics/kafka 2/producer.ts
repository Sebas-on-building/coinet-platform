import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'coient-analytics',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
  logLevel: logLevel.ERROR,
});
const producer = kafka.producer();
producer.connect();

export async function sendEvent(topic: string, event: any) {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(event) }],
  });
} 