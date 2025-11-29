import { MarketTicksProducer } from "./marketTicksProducer";

async function main() {
  const producer = new MarketTicksProducer();
  await producer.connect();

  // Example tick data (must match Avro schema)
  const tickData = {
    symbol: "BTCUSD",
    price: 65000.5,
    timestamp: Date.now(),
  };

  await producer.publishTick(tickData);
  console.log("Tick data sent!");
  await producer.disconnect();
}

main().catch(console.error);
