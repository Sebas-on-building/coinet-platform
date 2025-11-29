import { BaseProducer } from "./baseProducer";
import {
  kafkaConfig,
  registryConfig,
  marketTicksSchemaId,
} from "../config/kafkaConfig";

export class MarketTicksProducer extends BaseProducer {
  constructor() {
    super("market-ticks", kafkaConfig, registryConfig);
  }

  async publishTick(tickData: any) {
    await this.send(tickData, marketTicksSchemaId);
  }
}
