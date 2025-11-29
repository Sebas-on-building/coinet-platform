import { BaseProducer } from "./baseProducer";
import {
  kafkaConfig,
  registryConfig,
  onchainMetricsSchemaId,
} from "../config/kafkaConfig";

export class OnchainMetricsProducer extends BaseProducer {
  constructor() {
    super("onchain-metrics", kafkaConfig, registryConfig);
  }

  async publishMetric(metricData: any) {
    await this.send(metricData, onchainMetricsSchemaId);
  }
}
