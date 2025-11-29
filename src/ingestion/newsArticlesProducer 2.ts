import { BaseProducer } from "./baseProducer";
import {
  kafkaConfig,
  registryConfig,
  newsArticlesSchemaId,
} from "../config/kafkaConfig";

export class NewsArticlesProducer extends BaseProducer {
  constructor() {
    super("news-articles", kafkaConfig, registryConfig);
  }

  async publishArticle(articleData: any) {
    await this.send(articleData, newsArticlesSchemaId);
  }
}
