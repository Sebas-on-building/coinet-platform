import { Kafka } from 'kafkajs';

const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
const producer = kafka.producer();

export async function sendMarketTick(tick: { time: string, symbol: string, price: number, volume: number }) {
  await producer.connect();
  await producer.send({
    topic: 'market_ticks',
    messages: [{ value: JSON.stringify(tick) }],
  });
  await producer.disconnect();
} 