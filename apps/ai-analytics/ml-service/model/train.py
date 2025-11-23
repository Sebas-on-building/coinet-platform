import pandas as pd
import numpy as np
import psycopg2
import pickle
from sklearn.ensemble import RandomForestRegressor

def fetch_historical_data(symbol):
    conn = psycopg2.connect("dbname=timescale user=ai password=ai host=timescaledb")
    query = f"SELECT time, price FROM market_data WHERE symbol = %s ORDER BY time DESC LIMIT 10000"
    df = pd.read_sql(query, conn, params=(symbol,))
    conn.close()
    return df

def train_model(symbol):
    df = fetch_historical_data(symbol)
    X = df['price'].rolling(window=10).mean().dropna().values.reshape(-1, 1)
    y = df['price'].iloc[10:].values
    model = RandomForestRegressor()
    model.fit(X, y)
    pickle.dump(model, open(f"model_{symbol}.pkl", "wb"))

if __name__ == "__main__":
    for symbol in ['BTCUSD', 'ETHUSD']:
        train_model(symbol) 