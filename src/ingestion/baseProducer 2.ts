import { Kafka, Producer } from "kafkajs";
import { SchemaRegistry, SchemaType } from "@kafkajs/confluent-schema-registry";

export abstract class BaseProducer {
  protected kafka: Kafka;
  protected producer: Producer;
  protected registry: SchemaRegistry;
  protected topic: string;

  constructor(topic: string, kafkaConfig: any, registryConfig: any) {
    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.registry = new SchemaRegistry(registryConfig);
    this.topic = topic;
  }

  async connect() {
    await this.producer.connect();
  }

  async send(message: any, schemaId: number) {
    const encoded = await this.registry.encode(schemaId, message);
    await this.producer.send({
      topic: this.topic,
      messages: [{ value: encoded }],
    });
  }

  async disconnect() {
    await this.producer.disconnect();
  }
}
