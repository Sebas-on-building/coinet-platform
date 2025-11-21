import pickle, numpy as np, json
from kafka import KafkaConsumer, KafkaProducer
import clickhouse_connect

def load_model(symbol):
    return pickle.load(open(f"model_{symbol}.pkl", "rb"))

consumer = KafkaConsumer('market.ticks', bootstrap_servers='kafka:9092', value_deserializer=lambda m: json.loads(m.decode()))
producer = KafkaProducer(bootstrap_servers='kafka:9092', value_serializer=lambda m: json.dumps(m).encode())

models = {symbol: load_model(symbol) for symbol in ['BTCUSD', 'ETHUSD']}
client = clickhouse_connect.get_client(host='clickhouse', username='default', password='')

for msg in consumer:
    symbol = msg.value['symbol']
    prices = msg.value['prices'][-10:]
    if len(prices) == 10:
        pred = models[symbol].predict(np.array([prices]))[0]
        producer.send('signals', {'symbol': symbol, 'prediction': float(pred)})
        client.command(f"INSERT INTO analytics_results (symbol, prediction, ts) VALUES ('{symbol}', {float(pred)}, now())") 