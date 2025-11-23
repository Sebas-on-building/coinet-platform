import { SchemaRegistry, SchemaType } from "@kafkajs/confluent-schema-registry";
import * as fs from "fs";
import * as path from "path";

const registry = new SchemaRegistry({ host: "http://localhost:8081" });

const schemas = [
  { name: "market-ticks", file: "market_ticks.avsc" },
  { name: "onchain-metrics", file: "onchain_metrics.avsc" },
  { name: "social-metrics", file: "social_metrics.avsc" },
  { name: "news-articles", file: "news_articles.avsc" },
];

async function registerAll() {
  for (const { name, file } of schemas) {
    const schemaPath = path.join(__dirname, "schemas", file);
    const schema = fs.readFileSync(schemaPath, "utf-8");
    const { id } = await registry.register(
      { type: SchemaType.AVRO, schema },
      { subject: name + "-value" },
    );
    console.log(`Registered schema for ${name}: ID = ${id}`);
  }
}

registerAll().catch(console.error);
