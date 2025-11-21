import { BaseProducer } from "./baseProducer";
import {
  kafkaConfig,
  registryConfig,
  socialMetricsSchemaId,
} from "../config/kafkaConfig";

export class SocialMetricsProducer extends BaseProducer {
  constructor() {
    super("social-metrics", kafkaConfig, registryConfig);
  }

  async publishMetric(metricData: any) {
    await this.send(metricData, socialMetricsSchemaId);
  }
}
