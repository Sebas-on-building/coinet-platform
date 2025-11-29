from flask import Flask, request, jsonify
import pickle, numpy as np
from data.fetch_features import fetch_features
import clickhouse_connect

app = Flask(__name__)
models = {symbol: pickle.load(open(f"model/model_{symbol}.pkl", "rb")) for symbol in ['BTCUSD', 'ETHUSD']}

@app.route('/api/v1/analytics/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol')
    features = fetch_features(symbol)  # e.g. last 10 prices
    pred = models[symbol].predict(np.array([features]))[0]
    return jsonify({ "symbol": symbol, "prediction": float(pred) })

@app.route('/api/v1/analytics/history', methods=['GET'])
def history():
    symbol = request.args.get('symbol')
    client = clickhouse_connect.get_client(host='clickhouse', username='default', password='')
    rows = client.query(f"SELECT ts, prediction FROM analytics_results WHERE symbol = '{symbol}' ORDER BY ts DESC LIMIT 100").result_rows
    return jsonify({"symbol": symbol, "history": [{"ts": ts, "prediction": pred} for ts, pred in rows]})

@app.route('/api/v1/analytics/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 