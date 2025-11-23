import time, json, threading
from kafka import KafkaConsumer, KafkaProducer
import redis
from datetime import datetime, timedelta

# In-memory alert cache (replace with DB/cache in production)
alerts = []

# Notification stubs
def send_email(user_id, alert, price):
    print(f"[EMAIL] User {user_id}: Alert {alert['alertId']} triggered at price {price}")

def send_sms(user_id, alert, price):
    print(f"[SMS] User {user_id}: Alert {alert['alertId']} triggered at price {price}")

def publish_ws_event(user_id, alert, price):
    print(f"[WS] User {user_id}: Alert {alert['alertId']} triggered at price {price}")

# Kafka/Redis setup
consumer = KafkaConsumer('market.ticks', bootstrap_servers='kafka:9092', value_deserializer=lambda m: json.loads(m.decode()))
producer = KafkaProducer(bootstrap_servers='kafka:9092', value_serializer=lambda m: json.dumps(m).encode())
r = redis.Redis(host='localhost', port=6379, db=0)

# Alert evaluation loop
def evaluate_alerts():
    for msg in consumer:
        symbol = msg.value['symbol']
        price = msg.value['price']
        now = datetime.utcnow()
        for alert in alerts:
            if not alert['active'] or alert['symbol'] != symbol:
                continue
            triggered = False
            if alert['condition'] == 'above' and price > alert['threshold']:
                triggered = True
            elif alert['condition'] == 'below' and price < alert['threshold']:
                triggered = True
            if triggered:
                last = alert['lastTriggered']
                cooldown = timedelta(seconds=alert['cooldown'])
                if not last or now - datetime.fromisoformat(last) > cooldown:
                    alert['lastTriggered'] = now.isoformat()
                    # Send notifications
                    send_email(alert['userId'], alert, price)
                    send_sms(alert['userId'], alert, price)
                    publish_ws_event(alert['userId'], alert, price)
                    # Publish to Kafka/Redis
                    event = {
                        "userId": alert['userId'],
                        "alertId": alert['alertId'],
                        "symbol": symbol,
                        "price": price,
                        "time": now.isoformat()
                    }
                    producer.send('alerts', event)
                    r.publish('alerts', json.dumps(event))
                    # Auto-disable one-time alerts
                    if alert.get('oneTime', False):
                        alert['active'] = False

# Background thread to sync alerts from API (poll every 10s)
def sync_alerts():
    import requests
    while True:
        try:
            resp = requests.get('http://localhost:3000/api/v1/alerts')
            if resp.status_code == 200:
                global alerts
                alerts = resp.json()
        except Exception as e:
            print(f"[ALERT SYNC ERROR] {e}")
        time.sleep(10)

if __name__ == "__main__":
    threading.Thread(target=sync_alerts, daemon=True).start()
    evaluate_alerts() 