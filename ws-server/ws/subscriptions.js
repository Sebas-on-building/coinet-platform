function broadcastToSubscribers(wss, data, topic) {
  wss.clients.forEach(ws => {
    if (
      ws.readyState === 1 &&
      ws.subscriptions &&
      (
        ws.subscriptions.includes(topic) ||
        (data.symbol && ws.subscriptions.includes(data.symbol))
      ) &&
      (!ws.user || hasPermission(ws.user, topic))
    ) {
      ws.send(JSON.stringify({ topic, data }));
    }
  });
}

function hasPermission(user, topic) {
  // RBAC: check if user has permission for topic
  if (!user || !user.roles) return false;
  // Example: admin can see all, others filtered
  if (user.roles.includes('admin')) return true;
  // Add more granular checks as needed
  return user.allowedTopics && user.allowedTopics.includes(topic);
}

function handleSubscriptions(ws) {
  ws.subscriptions = ws.subscriptions || [];
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.subscribe && !ws.subscriptions.includes(data.subscribe)) ws.subscriptions.push(data.subscribe);
      if (data.unsubscribe) ws.subscriptions = ws.subscriptions.filter(s => s !== data.unsubscribe);
    } catch { }
  });
}

module.exports = { broadcastToSubscribers, handleSubscriptions }; 