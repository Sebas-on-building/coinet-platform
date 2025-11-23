import {
  Order,
  OrderType,
  OrderSide,
  TimeInForce,
  OrderStatus,
  OrderBook,
  MarketDepth,
  ExecutionReport,
  SlippageInfo,
  SmartOrderParams,
} from "../types/trading";
import { WebSocketService, WebSocketMessage } from "./websocket";

class TradingService {
  private static instance: TradingService;
  private wsService: WebSocketService;
  private orderBook: OrderBook = { bids: [], asks: [], timestamp: 0 };
  private activeOrders: Map<string, Order> = new Map();
  private lastMessageTime = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnectionEstablished = false;
  private mockMode = process.env.NODE_ENV === "development";

  private constructor() {
    this.wsService = new WebSocketService();
    this.initializeWebSocket();
    this.setupHeartbeat();
  }

  public static getInstance(): TradingService {
    if (!TradingService.instance) {
      TradingService.instance = new TradingService();
    }
    return TradingService.instance;
  }

  private initializeWebSocket() {
    if (this.mockMode) {
      console.log("[MockTradingService] Initializing in mock mode");
      this.setupMockData();
      this.isConnectionEstablished = true;
      return;
    }

    // Subscribe to trade execution channel
    this.wsService.subscribe(
      "trading",
      "executions",
      (message: WebSocketMessage) => {
        this.lastMessageTime = Date.now();
        this.handleWebSocketMessage(message.data);
      },
    );

    // Subscribe to order book updates
    this.wsService.subscribe(
      "trading",
      "orderbook",
      (message: WebSocketMessage) => {
        this.lastMessageTime = Date.now();
        if (message.data && message.data.bids && message.data.asks) {
          this.updateOrderBook(message.data);
        }
      },
    );

    // Handle connection errors
    this.wsService.on("error", (error) => {
      console.warn("Trading service WebSocket error:", error);
    });

    // Set connection as established when trading service is ready
    this.wsService.on("open", () => {
      console.log("Trading service WebSocket connected");
      this.isConnectionEstablished = true;
    });

    // Handle connection close
    this.wsService.on("close", () => {
      console.log("Trading service WebSocket closed");
      this.isConnectionEstablished = false;
    });
  }

  private setupMockData() {
    // Create mock order book
    const mockOrderBook: OrderBook = {
      bids: Array.from({ length: 10 }, (_, i) => {
        const price = 45000 - i * 10;
        return [price, Math.random() * 2] as [number, number];
      }),
      asks: Array.from({ length: 10 }, (_, i) => {
        const price = 45010 + i * 10;
        return [price, Math.random() * 2] as [number, number];
      }),
      timestamp: Date.now(),
    };

    this.updateOrderBook(mockOrderBook);

    // Simulate periodic updates
    setInterval(() => {
      // Update with small random changes
      const updatedBook: OrderBook = {
        bids: this.orderBook.bids.map(([price, qty]) => {
          return [
            price * (1 + (Math.random() - 0.5) * 0.001),
            qty * (1 + (Math.random() - 0.5) * 0.05),
          ] as [number, number];
        }),
        asks: this.orderBook.asks.map(([price, qty]) => {
          return [
            price * (1 + (Math.random() - 0.5) * 0.001),
            qty * (1 + (Math.random() - 0.5) * 0.05),
          ] as [number, number];
        }),
        timestamp: Date.now(),
      };

      this.updateOrderBook(updatedBook);
    }, 5000);
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.mockMode) {
        // In mock mode, we don't need to check for heartbeats
        return;
      }

      const now = Date.now();
      if (this.isConnectionEstablished && now - this.lastMessageTime > 30000) {
        // No message for 30 seconds
        console.warn(
          "No heartbeat received for 30 seconds, reconnecting trading service...",
        );
        this.wsService.disconnectFromSource("trading");
        setTimeout(() => {
          this.wsService.connectToSource("trading");
        }, 1000);
      }
    }, 10000);
  }

  private handleWebSocketMessage(data: any) {
    try {
      switch (data.type) {
        case "orderbook":
          this.updateOrderBook(data.payload);
          break;
        case "execution":
          this.handleExecutionUpdate(data.payload);
          break;
        case "heartbeat":
          // Handle heartbeat
          break;
        case "error":
          console.error("Received error from trading service:", data.payload);
          break;
        default:
          // Silently handle unknown message types in production
          if (process.env.NODE_ENV !== "production") {
            console.warn("Unknown message type:", data.type);
          }
      }
    } catch (error) {
      console.error("Error handling trading message:", error);
    }
  }

  private updateOrderBook(data: OrderBook) {
    this.orderBook = data;
  }

  private handleExecutionUpdate(report: ExecutionReport) {
    const order = this.activeOrders.get(report.orderId);
    if (order) {
      this.updateOrderStatus(order, report);
    }
  }

  private updateOrderStatus(order: Order, report: ExecutionReport) {
    order.filledQuantity += report.quantity;
    order.remainingQuantity = order.quantity - order.filledQuantity;
    order.averagePrice =
      (order.averagePrice * (order.filledQuantity - report.quantity) +
        report.price * report.quantity) /
      order.filledQuantity;

    if (order.remainingQuantity === 0) {
      order.status = "FILLED";
    } else {
      order.status = "PARTIALLY_FILLED";
    }
  }

  private calculateSlippage(
    expectedPrice: number,
    actualPrice: number,
  ): SlippageInfo {
    const slippagePercent =
      ((actualPrice - expectedPrice) / expectedPrice) * 100;
    return {
      expectedPrice,
      actualPrice,
      slippagePercent,
      impact:
        Math.abs(slippagePercent) > 1
          ? "HIGH"
          : Math.abs(slippagePercent) > 0.5
            ? "MEDIUM"
            : "LOW",
    };
  }

  public async placeOrder(
    symbol: string,
    type: OrderType,
    side: OrderSide,
    quantity: number,
    price?: number,
    stopPrice?: number,
    timeInForce: TimeInForce = "GTC",
    flags = { postOnly: false, reduceOnly: false },
  ): Promise<Order> {
    const order: Order = {
      id: Math.random().toString(36).substr(2, 9),
      symbol,
      type,
      side,
      price: price || 0,
      stopPrice,
      quantity,
      timeInForce,
      status: "NEW",
      flags,
      timestamp: Date.now(),
      filledQuantity: 0,
      averagePrice: 0,
      remainingQuantity: quantity,
      fee: 0,
      feeAsset: symbol.split("/")[1] || "USDT",
    };

    // Add order to active orders
    this.activeOrders.set(order.id, order);

    // Send order to exchange
    await this.submitOrderToExchange(order);

    return order;
  }

  private async submitOrderToExchange(order: Order): Promise<void> {
    if (this.mockMode) {
      // Simulate exchange response in mock mode
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Simulate order execution (partial or full)
      setTimeout(() => {
        const executionReport: ExecutionReport = {
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          price: order.price || this.getCurrentPrice(order.symbol, order.side),
          quantity: Math.min(
            order.quantity,
            Math.random() * order.quantity + 0.1 * order.quantity,
          ),
          timestamp: Date.now(),
          fee: 0,
          tradeId: Math.random().toString(36).substr(2, 9),
          feeAsset: order.feeAsset,
        };

        this.handleExecutionUpdate(executionReport);

        // If not fully filled, complete after some time
        if (order.status === "PARTIALLY_FILLED") {
          setTimeout(() => {
            const finalReport: ExecutionReport = {
              orderId: order.id,
              symbol: order.symbol,
              side: order.side,
              price:
                order.price || this.getCurrentPrice(order.symbol, order.side),
              quantity: order.remainingQuantity,
              timestamp: Date.now(),
              fee: 0,
              tradeId: Math.random().toString(36).substr(2, 9),
              feeAsset: order.feeAsset,
            };

            this.handleExecutionUpdate(finalReport);
          }, 1500);
        }
      }, 800);

      return;
    }

    // Implement exchange-specific order submission logic
    // This is where you would integrate with your specific exchange's API
    try {
      // Send order via WebSocket
      this.wsService.send({
        type: "placeOrder",
        data: order,
      });
    } catch (error) {
      order.status = "REJECTED";
      throw new Error(`Failed to submit order: ${error}`);
    }
  }

  public async smartOrder(
    symbol: string,
    side: OrderSide,
    quantity: number,
    params: SmartOrderParams,
  ): Promise<Order[]> {
    const orders: Order[] = [];

    if (params.splitOrders && quantity > params.maxSplits) {
      // Split into multiple orders to minimize market impact
      const splitSize = quantity / params.maxSplits;
      for (let i = 0; i < params.maxSplits; i++) {
        const order = await this.placeOrder(
          symbol,
          "LIMIT",
          side,
          splitSize,
          this.getCurrentPrice(symbol, side),
          undefined,
          "GTC",
          { postOnly: true, reduceOnly: false },
        );
        orders.push(order);

        // Add delay between orders
        await new Promise((resolve) =>
          setTimeout(resolve, params.timeWindow / params.maxSplits),
        );
      }
    } else {
      // Place single order
      const order = await this.placeOrder(symbol, "MARKET", side, quantity);
      orders.push(order);
    }

    return orders;
  }

  private getCurrentPrice(symbol: string, side: OrderSide): number {
    // Get best bid/ask from order book
    if (side === "BUY") {
      return this.orderBook.asks.length > 0 ? this.orderBook.asks[0][0] : 0;
    } else {
      return this.orderBook.bids.length > 0 ? this.orderBook.bids[0][0] : 0;
    }
  }

  public getMarketDepth(levels: number = 10): MarketDepth[] {
    const depth: MarketDepth[] = [];

    // Combine bids and asks into a unified depth representation
    const maxLevel = Math.min(
      levels,
      Math.max(this.orderBook.bids.length, this.orderBook.asks.length),
    );

    for (let i = 0; i < maxLevel; i++) {
      const bid =
        i < this.orderBook.bids.length ? this.orderBook.bids[i] : [0, 0];
      const ask =
        i < this.orderBook.asks.length ? this.orderBook.asks[i] : [0, 0];

      depth.push({
        bidPrice: bid[0],
        bidQuantity: bid[1],
        askPrice: ask[0],
        askQuantity: ask[1],
        spread: ask[0] - bid[0],
        spreadPercent: ((ask[0] - bid[0]) / bid[0]) * 100,
        price: (bid[0] + ask[0]) / 2,
        quantity: 0,
        total: bid[1] + ask[1],
        side: "BUY",
      });
    }

    return depth;
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) {
      return false;
    }

    if (this.mockMode) {
      // Simulate cancel in mock mode
      await new Promise((resolve) => setTimeout(resolve, 200));
      order.status = "CANCELED";
      return true;
    }

    try {
      // Send cancel request via WebSocket
      this.wsService.send({
        type: "cancelOrder",
        data: { orderId },
      });

      order.status = "CANCELED";
      return true;
    } catch (error) {
      console.error("Failed to cancel order:", error);
      return false;
    }
  }

  public getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values()).filter((order) =>
      ["NEW", "PARTIALLY_FILLED"].includes(order.status),
    );
  }

  public getOrderBook(): OrderBook {
    return { ...this.orderBook };
  }
}

export const tradingService = TradingService.getInstance();
