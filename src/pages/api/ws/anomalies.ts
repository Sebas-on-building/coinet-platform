import { NextApiRequest } from "next";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let wss: any = null;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.wss) {
    const WebSocketServer = require("ws").Server;
    wss = new WebSocketServer({ server: res.socket.server });
    const redis = new Redis(REDIS_URL);
    wss.on("connection", (ws: any) => {
      const sub = new Redis(REDIS_URL);
      sub.subscribe("anomalies");
      sub.on("message", (_channel, message) => {
        ws.send(message);
      });
      ws.on("close", () => {
        sub.disconnect();
      });
    });
    res.socket.server.wss = wss;
    console.log("[WS] Anomalies WebSocket server started");
  }
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ status: "ok" }));
}
