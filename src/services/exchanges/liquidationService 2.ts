import { WebSocket } from "ws";
import { EventEmitter } from "events";

interface LiquidationData {
  price: number;
  longLiquidations: number;
  shortLiquidations: number;
  totalLiquidations: number;
  timestamp: string;
  exchange: string;
  leverage: number;
}

interface ExchangeConfig {
  name: string;
  wsUrl: string;
  apiKey?: string;
  apiSecret?: string;
}

class LiquidationService extends EventEmitter {
  private exchanges: Map<string, WebSocket> = new Map();
  private liquidationData: Map<string, LiquidationData[]> = new Map();
  private configs: ExchangeConfig[] = [
    {
      name: "Binance",
      wsUrl: "wss://fstream.binance.com/ws/!forceOrder@arr",
    },
    {
      name: "Bybit",
      wsUrl: "wss://stream.bybit.com/v5/public/linear",
    },
    {
      name: "OKX",
      wsUrl: "wss://ws.okx.com:8443/ws/v5/public",
    },
    {
      name: "Deribit",
      wsUrl: "wss://www.deribit.com/ws/api/v2",
    },
  ];

  constructor() {
    super();
    this.initializeWebSockets();
  }

  private initializeWebSockets() {
    this.configs.forEach((config) => {
      try {
        const ws = new WebSocket(config.wsUrl);
        this.exchanges.set(config.name, ws);

        ws.on("open", () => {
          console.log(`Connected to ${config.name} WebSocket`);
          this.subscribeToLiquidations(ws, config.name);
        });

        ws.on("message", (data: string) => {
          this.handleLiquidationMessage(config.name, data);
        });

        ws.on("error", (error) => {
          console.error(`Error in ${config.name} WebSocket:`, error);
          this.reconnectWebSocket(config);
        });

        ws.on("close", () => {
          console.log(`${config.name} WebSocket closed`);
          this.reconnectWebSocket(config);
        });
      } catch (error) {
        console.error(`Failed to initialize ${config.name} WebSocket:`, error);
      }
    });
  }

  private subscribeToLiquidations(ws: WebSocket, exchange: string) {
    switch (exchange) {
      case "Binance":
        ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: ["!forceOrder@arr"],
            id: 1,
          }),
        );
        break;
      case "Bybit":
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: ["liquidation"],
          }),
        );
        break;
      case "OKX":
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [
              {
                channel: "liquidation",
                instId: "BTC-USDT-SWAP",
              },
            ],
          }),
        );
        break;
      case "Deribit":
        ws.send(
          JSON.stringify({
            method: "public/subscribe",
            params: {
              channels: ["liquidation.BTC-PERPETUAL"],
            },
          }),
        );
        break;
    }
  }

  private handleLiquidationMessage(exchange: string, data: string) {
    try {
      const message = JSON.parse(data);
      let liquidation: LiquidationData | null = null;

      switch (exchange) {
        case "Binance":
          liquidation = this.parseBinanceLiquidation(message);
          break;
        case "Bybit":
          liquidation = this.parseBybitLiquidation(message);
          break;
        case "OKX":
          liquidation = this.parseOKXLiquidation(message);
          break;
        case "Deribit":
          liquidation = this.parseDeribitLiquidation(message);
          break;
      }

      if (liquidation) {
        this.addLiquidationData(exchange, liquidation);
        this.emit("liquidation", liquidation);
      }
    } catch (error) {
      console.error(`Error parsing ${exchange} liquidation message:`, error);
    }
  }

  private parseBinanceLiquidation(message: any): LiquidationData | null {
    if (!message.e || message.e !== "forceOrder") return null;
    return {
      price: parseFloat(message.p),
      longLiquidations: message.S === "BUY" ? parseFloat(message.q) : 0,
      shortLiquidations: message.S === "SELL" ? parseFloat(message.q) : 0,
      totalLiquidations: parseFloat(message.q),
      timestamp: new Date(message.T).toISOString(),
      exchange: "Binance",
      leverage: parseFloat(message.l) || 1,
    };
  }

  private parseBybitLiquidation(message: any): LiquidationData | null {
    if (!message.data || !message.data.length) return null;
    const data = message.data[0];
    return {
      price: parseFloat(data.price),
      longLiquidations: data.side === "Buy" ? parseFloat(data.size) : 0,
      shortLiquidations: data.side === "Sell" ? parseFloat(data.size) : 0,
      totalLiquidations: parseFloat(data.size),
      timestamp: new Date(data.updated_time).toISOString(),
      exchange: "Bybit",
      leverage: parseFloat(data.leverage) || 1,
    };
  }

  private parseOKXLiquidation(message: any): LiquidationData | null {
    if (!message.data || !message.data.length) return null;
    const data = message.data[0];
    return {
      price: parseFloat(data.px),
      longLiquidations: data.side === "buy" ? parseFloat(data.sz) : 0,
      shortLiquidations: data.side === "sell" ? parseFloat(data.sz) : 0,
      totalLiquidations: parseFloat(data.sz),
      timestamp: new Date(data.ts).toISOString(),
      exchange: "OKX",
      leverage: parseFloat(data.lever) || 1,
    };
  }

  private parseDeribitLiquidation(message: any): LiquidationData | null {
    if (!message.params || !message.params.data) return null;
    const data = message.params.data;
    return {
      price: parseFloat(data.price),
      longLiquidations: data.direction === "buy" ? parseFloat(data.amount) : 0,
      shortLiquidations:
        data.direction === "sell" ? parseFloat(data.amount) : 0,
      totalLiquidations: parseFloat(data.amount),
      timestamp: new Date(data.timestamp).toISOString(),
      exchange: "Deribit",
      leverage: parseFloat(data.leverage) || 1,
    };
  }

  private addLiquidationData(exchange: string, data: LiquidationData) {
    const exchangeData = this.liquidationData.get(exchange) || [];
    exchangeData.push(data);
    this.liquidationData.set(exchange, exchangeData);
  }

  private reconnectWebSocket(config: ExchangeConfig) {
    setTimeout(() => {
      console.log(`Attempting to reconnect to ${config.name}...`);
      this.initializeWebSockets();
    }, 5000);
  }

  public async getLiquidationData(
    timeframe: string,
  ): Promise<LiquidationData[]> {
    const now = Date.now();
    const timeframeMs = this.getTimeframeInMs(timeframe);
    const startTime = now - timeframeMs;

    const allData: LiquidationData[] = [];
    this.liquidationData.forEach((data, exchange) => {
      const filteredData = data.filter(
        (d) => new Date(d.timestamp).getTime() >= startTime,
      );
      allData.push(...filteredData);
    });

    return allData.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  private getTimeframeInMs(timeframe: string): number {
    switch (timeframe) {
      case "1H":
        return 60 * 60 * 1000;
      case "4H":
        return 4 * 60 * 60 * 1000;
      case "1D":
        return 24 * 60 * 60 * 1000;
      case "1W":
        return 7 * 24 * 60 * 60 * 1000;
      case "1M":
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}

const liquidationService = new LiquidationService();
export const getLiquidationData = (timeframe: string) =>
  liquidationService.getLiquidationData(timeframe);
