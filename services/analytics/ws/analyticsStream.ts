import { Server, WebSocket } from 'ws';

let wss: Server | null = null;

export function setupAnalyticsStream(server: any) {
  wss = new Server({ server });
  wss.on('connection', (socket: WebSocket) => {
    socket.send(JSON.stringify({ type: 'welcome', message: 'Analytics stream connected.' }));
  });
}

export function broadcastAnalyticsEvent(event: any) {
  if (!wss) return;
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
} 