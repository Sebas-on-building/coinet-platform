import { notificationService } from "./notificationService";
import { toast } from "react-hot-toast";

export interface PriceImpact {
  current: number;
  change: number;
  timestamp: Date;
  asset: "btc" | "eth" | "market";
  unit: "%" | "$";
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  likes: number;
  replies: Comment[];
}

export interface Watchlist {
  id: string;
  name: string;
  userId: string;
  eventIds: string[];
  isPublic: boolean;
  collaborators: string[];
}

export interface FinancialEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  source: string;
  sourceUrl: string;
  watchUrl?: string;
  relevance: number; // 0-100 score for crypto market relevance
  impact: {
    bestCase: string;
    worstCase: string;
    expectedCase: string;
    priceImpact?: {
      btc?: { min: number; max: number; unit: "%" | "$" };
      eth?: { min: number; max: number; unit: "%" | "$" };
      market?: { min: number; max: number; unit: "%" | "$" };
    };
    volumeImpact?: {
      expected: number;
      unit: "%" | "$";
    };
    volatilityImpact?: {
      expected: number;
      unit: "%";
    };
  };
  category:
    | "speech"
    | "meeting"
    | "report"
    | "earnings"
    | "social"
    | "news"
    | "other";
  speaker?: string;
  organization?: string;
  tags: string[];
  marketSentiment?: "bullish" | "bearish" | "neutral";
  sourceType: "official" | "social" | "news" | "community";
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
  confidence: number; // 0-100 score for prediction confidence
  realTimeImpact?: {
    priceImpacts: PriceImpact[];
    volumeChange: number;
    volatilityChange: number;
    lastUpdated: Date;
  };
  comments: Comment[];
  watchlistCount: number;
  isWatched: boolean;
}

class FinancialEventService {
  private events: FinancialEvent[] = [];
  private watchlists: Watchlist[] = [];
  private readonly NOTIFICATION_BEFORE_MINUTES = 10;
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPriceTracking();
  }

  private startPriceTracking() {
    // Update prices every minute
    this.priceUpdateInterval = setInterval(() => {
      this.updatePriceImpacts();
    }, 60000);
  }

  private async updatePriceImpacts() {
    try {
      // TODO: Implement actual price fetching from exchange APIs
      // For now, using mock data
      this.events = this.events.map((event) => {
        if (!event.realTimeImpact) {
          return event;
        }

        const newPriceImpacts = event.realTimeImpact.priceImpacts.map(
          (impact) => ({
            ...impact,
            current: impact.current + (Math.random() * 2 - 1), // Random change between -1 and 1
            change: Math.random() * 2 - 1,
            timestamp: new Date(),
          }),
        );

        return {
          ...event,
          realTimeImpact: {
            ...event.realTimeImpact,
            priceImpacts: newPriceImpacts,
            volumeChange:
              event.realTimeImpact.volumeChange + (Math.random() * 10 - 5),
            volatilityChange:
              event.realTimeImpact.volatilityChange + (Math.random() * 5 - 2.5),
            lastUpdated: new Date(),
          },
        };
      });
    } catch (error) {
      console.error("Error updating price impacts:", error);
    }
  }

  async fetchEvents(): Promise<FinancialEvent[]> {
    try {
      // TODO: Implement actual API calls to various sources
      // For now, using enhanced mock data
      const mockEvents: FinancialEvent[] = [
        {
          id: "1",
          title: "Fed Chair Powell Speech",
          description:
            "Federal Reserve Chair Jerome Powell will speak about monetary policy and economic outlook",
          startTime: new Date("2024-03-20T14:00:00Z"),
          endTime: new Date("2024-03-20T15:00:00Z"),
          source: "Federal Reserve",
          sourceUrl: "https://www.federalreserve.gov",
          watchUrl: "https://www.federalreserve.gov/live",
          relevance: 95,
          impact: {
            bestCase:
              "Dovish tone could lead to rate cut expectations, potentially boosting crypto markets",
            worstCase:
              "Hawkish stance might strengthen USD, putting pressure on crypto markets",
            expectedCase: "Neutral stance with focus on data dependency",
            priceImpact: {
              btc: { min: -5, max: 10, unit: "%" },
              eth: { min: -7, max: 12, unit: "%" },
              market: { min: -4, max: 8, unit: "%" },
            },
            volumeImpact: {
              expected: 50,
              unit: "%",
            },
            volatilityImpact: {
              expected: 30,
              unit: "%",
            },
          },
          category: "speech",
          speaker: "Jerome Powell",
          organization: "Federal Reserve",
          tags: ["fed", "monetary-policy", "usd"],
          marketSentiment: "neutral",
          sourceType: "official",
          confidence: 85,
        },
        {
          id: "2",
          title: "Vitalik Buterin Tweet on ETH Scaling",
          description:
            "Ethereum co-founder discusses upcoming scaling solutions and their impact on gas fees",
          startTime: new Date("2024-03-21T12:00:00Z"),
          endTime: new Date("2024-03-21T12:30:00Z"),
          source: "Twitter",
          sourceUrl: "https://twitter.com/VitalikButerin",
          relevance: 88,
          impact: {
            bestCase:
              "Positive sentiment could drive ETH price higher and increase L2 adoption",
            worstCase:
              "Technical concerns might cause short-term price volatility",
            expectedCase:
              "Neutral to positive market reaction with focus on long-term implications",
            priceImpact: {
              eth: { min: -3, max: 8, unit: "%" },
            },
            volumeImpact: {
              expected: 25,
              unit: "%",
            },
            volatilityImpact: {
              expected: 15,
              unit: "%",
            },
          },
          category: "social",
          speaker: "Vitalik Buterin",
          organization: "Ethereum Foundation",
          tags: ["ethereum", "scaling", "gas-fees", "l2"],
          marketSentiment: "bullish",
          sourceType: "social",
          engagement: {
            likes: 15000,
            shares: 5000,
            comments: 2000,
          },
          confidence: 75,
        },
        {
          id: "3",
          title: "Coinbase Q4 Earnings Report",
          description:
            "Coinbase releases quarterly earnings report with focus on trading volumes and institutional adoption",
          startTime: new Date("2024-03-22T20:00:00Z"),
          endTime: new Date("2024-03-22T21:00:00Z"),
          source: "Coinbase",
          sourceUrl: "https://investor.coinbase.com",
          relevance: 85,
          impact: {
            bestCase:
              "Strong earnings could boost market confidence and COIN stock price",
            worstCase:
              "Disappointing results might lead to broader market concerns",
            expectedCase:
              "Mixed results with focus on institutional growth metrics",
            priceImpact: {
              market: { min: -2, max: 5, unit: "%" },
            },
            volumeImpact: {
              expected: 20,
              unit: "%",
            },
            volatilityImpact: {
              expected: 10,
              unit: "%",
            },
          },
          category: "earnings",
          organization: "Coinbase",
          tags: ["coinbase", "earnings", "institutional"],
          marketSentiment: "neutral",
          sourceType: "official",
          confidence: 80,
        },
      ];

      this.events = mockEvents;

      // Add real-time impact data to events
      this.events = this.events.map((event) => ({
        ...event,
        realTimeImpact: {
          priceImpacts: [
            {
              current: 0,
              change: 0,
              timestamp: new Date(),
              asset: "btc",
              unit: "%",
            },
            {
              current: 0,
              change: 0,
              timestamp: new Date(),
              asset: "eth",
              unit: "%",
            },
          ],
          volumeChange: 0,
          volatilityChange: 0,
          lastUpdated: new Date(),
        },
        comments: [],
        watchlistCount: 0,
        isWatched: false,
      }));

      return this.events;
    } catch (error) {
      console.error("Error fetching financial events:", error);
      toast.error("Failed to fetch financial events");
      return [];
    }
  }

  async scheduleEventNotifications(
    event: FinancialEvent,
    reminderMinutes: number = this.NOTIFICATION_BEFORE_MINUTES,
  ): Promise<void> {
    const notificationTime = new Date(event.startTime);
    notificationTime.setMinutes(
      notificationTime.getMinutes() - reminderMinutes,
    );

    // Schedule notification
    await notificationService.scheduleNotification({
      title: `Upcoming: ${event.title}`,
      body: this.generateNotificationBody(event),
      userId: "user", // TODO: Replace with actual user ID
      type: "push",
      data: {
        eventId: event.id,
        watchUrl: event.watchUrl,
        impact: event.impact,
      },
      scheduledTime: notificationTime,
    });
  }

  private generateNotificationBody(event: FinancialEvent): string {
    const priceImpact = event.impact.priceImpact;
    const volumeImpact = event.impact.volumeImpact;
    const volatilityImpact = event.impact.volatilityImpact;

    return `
${event.description}

Impact Analysis:
- Best Case: ${event.impact.bestCase}
- Worst Case: ${event.impact.worstCase}
- Expected: ${event.impact.expectedCase}

${
  priceImpact
    ? `Price Impact:
${priceImpact.btc ? `- BTC: ${priceImpact.btc.min}% to ${priceImpact.btc.max}%` : ""}
${priceImpact.eth ? `- ETH: ${priceImpact.eth.min}% to ${priceImpact.eth.max}%` : ""}
${priceImpact.market ? `- Market: ${priceImpact.market.min}% to ${priceImpact.market.max}%` : ""}`
    : ""
}

${volumeImpact ? `Expected Volume Change: ${volumeImpact.expected}${volumeImpact.unit}` : ""}
${volatilityImpact ? `Expected Volatility: ${volatilityImpact.expected}${volatilityImpact.unit}` : ""}

Market Sentiment: ${event.marketSentiment?.toUpperCase() || "N/A"}
Relevance Score: ${event.relevance}/100
Confidence: ${event.confidence}%

${
  event.sourceType === "social" && event.engagement
    ? `
Social Engagement:
- Likes: ${event.engagement.likes?.toLocaleString()}
- Shares: ${event.engagement.shares?.toLocaleString()}
- Comments: ${event.engagement.comments?.toLocaleString()}`
    : ""
}

Watch Live: ${event.watchUrl || "Not available"}
    `.trim();
  }

  getEventsByRelevance(minRelevance: number = 0): FinancialEvent[] {
    return this.events
      .filter((event) => event.relevance >= minRelevance)
      .sort((a, b) => b.relevance - a.relevance);
  }

  getUpcomingEvents(): FinancialEvent[] {
    const now = new Date();
    return this.events
      .filter((event) => event.startTime > now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  getEventsByCategory(category: FinancialEvent["category"]): FinancialEvent[] {
    return this.events.filter((event) => event.category === category);
  }

  getEventsByTag(tag: string): FinancialEvent[] {
    return this.events.filter((event) => event.tags.includes(tag));
  }

  async addEvent(event: Omit<FinancialEvent, "id">): Promise<FinancialEvent> {
    const newEvent: FinancialEvent = {
      ...event,
      id: Date.now().toString(),
    };

    this.events.push(newEvent);
    await this.scheduleEventNotifications(newEvent);
    return newEvent;
  }

  async updateEvent(event: FinancialEvent): Promise<FinancialEvent> {
    const index = this.events.findIndex((e) => e.id === event.id);
    if (index === -1) {
      throw new Error("Event not found");
    }

    this.events[index] = event;
    await this.scheduleEventNotifications(event);
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    this.events = this.events.filter((event) => event.id !== id);
  }

  // Watchlist Management
  async createWatchlist(
    name: string,
    userId: string,
    isPublic: boolean = false,
  ): Promise<Watchlist> {
    const watchlist: Watchlist = {
      id: Date.now().toString(),
      name,
      userId,
      eventIds: [],
      isPublic,
      collaborators: [],
    };
    this.watchlists.push(watchlist);
    return watchlist;
  }

  async addToWatchlist(watchlistId: string, eventId: string): Promise<void> {
    const watchlist = this.watchlists.find((w) => w.id === watchlistId);
    if (!watchlist) {
      throw new Error("Watchlist not found");
    }

    if (!watchlist.eventIds.includes(eventId)) {
      watchlist.eventIds.push(eventId);
      const event = this.events.find((e) => e.id === eventId);
      if (event) {
        event.watchlistCount++;
      }
    }
  }

  async removeFromWatchlist(
    watchlistId: string,
    eventId: string,
  ): Promise<void> {
    const watchlist = this.watchlists.find((w) => w.id === watchlistId);
    if (!watchlist) {
      throw new Error("Watchlist not found");
    }

    watchlist.eventIds = watchlist.eventIds.filter((id) => id !== eventId);
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.watchlistCount--;
    }
  }

  async addCollaborator(watchlistId: string, userId: string): Promise<void> {
    const watchlist = this.watchlists.find((w) => w.id === watchlistId);
    if (!watchlist) {
      throw new Error("Watchlist not found");
    }

    if (!watchlist.collaborators.includes(userId)) {
      watchlist.collaborators.push(userId);
    }
  }

  // Comments Management
  async addComment(
    eventId: string,
    userId: string,
    username: string,
    content: string,
  ): Promise<Comment> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const comment: Comment = {
      id: Date.now().toString(),
      userId,
      username,
      content,
      timestamp: new Date(),
      likes: 0,
      replies: [],
    };

    event.comments.push(comment);
    return comment;
  }

  async addReply(
    eventId: string,
    commentId: string,
    userId: string,
    username: string,
    content: string,
  ): Promise<Comment> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const comment = event.comments.find((c) => c.id === commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const reply: Comment = {
      id: Date.now().toString(),
      userId,
      username,
      content,
      timestamp: new Date(),
      likes: 0,
      replies: [],
    };

    comment.replies.push(reply);
    return reply;
  }

  async likeComment(eventId: string, commentId: string): Promise<void> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const comment = event.comments.find((c) => c.id === commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    comment.likes++;
  }
}

export const financialEventService = new FinancialEventService();
