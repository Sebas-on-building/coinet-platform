import { Kafka } from "kafkajs";

export async function checkKafkaHealth(kafkaConfig: any, topics: string[]) {
  const kafka = new Kafka(kafkaConfig);
  const admin = kafka.admin();
  await admin.connect();
  const topicMetadata = await admin.fetchTopicMetadata({ topics });
  // Add logic to check lag, etc. (placeholder)
  await admin.disconnect();
  return topicMetadata;
}
