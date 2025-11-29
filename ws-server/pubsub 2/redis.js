const Redis = require('ioredis');
function setupRedisPubSub(config, wss) {
  const pub = new Redis(config.url);
  const sub = new Redis(config.url);
  sub.subscribe('market.ticks', 'analytics.events');
  sub.on('message', (channel, message) => {
    wss.clients.forEach(ws => {
      if (ws.readyState === 1 && ws.subscriptions && ws.subscriptions.includes(channel)) {
        ws.send(message);
      }
    });
  });
  return pub;
}
module.exports = { setupRedisPubSub }; 