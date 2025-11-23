function handlePresence(ws, wss) {
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'presence') {
        ws.presence = data.payload;
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'presence', user: ws.user?.id, payload: data.payload }));
          }
        });
      }
    } catch { }
  });
}
module.exports = { handlePresence }; 