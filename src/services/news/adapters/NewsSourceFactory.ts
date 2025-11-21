import { NewsSourceAdapter } from "./NewsSourceAdapter";
import { CoinDeskAdapter } from "./CoinDeskAdapter";
import { CryptoCompareAdapter } from "./CryptoCompareAdapter";
import { CointelegraphAdapter } from "./CointelegraphAdapter";
import { CryptoNewsAdapter } from "./CryptoNewsAdapter";
import { TwitterSourceAdapter } from "./TwitterSourceAdapter";

/**
 * Factory for creating news source adapters.
 * This class handles the instantiation of all news sources and provides methods to access them.
 */
export class NewsSourceFactory {
  private adapters: Map<string, NewsSourceAdapter> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize all news source adapters
   */
  private initialize(): void {
    // Standard RSS/API-based adapters
    this.registerAdapter(new CoinDeskAdapter());
    this.registerAdapter(new CryptoCompareAdapter());
    this.registerAdapter(new CointelegraphAdapter());
    this.registerAdapter(new CryptoNewsAdapter());

    // Twitter-based adapters with specific configurations
    this.registerAdapter(
      new TwitterSourceAdapter({
        id: "whale-alert",
        name: "Whale Alert",
        username: "whale_alert",
        logoUrl:
          "https://pbs.twimg.com/profile_images/1125384733335592961/SKphZAn1_400x400.png",
        reliability: 0.95,
        category: "crypto",
        dataType: "whale_transactions",
      }),
    );

    this.registerAdapter(
      new TwitterSourceAdapter({
        id: "cryptoquant",
        name: "CryptoQuant",
        username: "cryptoquant_com",
        logoUrl:
          "https://pbs.twimg.com/profile_images/1295578309538377734/cCVA_IQw_400x400.jpg",
        reliability: 0.92,
        category: "crypto",
        dataType: "on_chain_metrics",
      }),
    );

    this.registerAdapter(
      new TwitterSourceAdapter({
        id: "glassnode-alerts",
        name: "Glassnode Alerts",
        username: "glassnodealerts",
        logoUrl:
          "https://pbs.twimg.com/profile_images/1295242344016916486/qcx8pritBd4W1rKdSZ8GqQ_400x400.jpg",
        reliability: 0.93,
        category: "crypto",
        dataType: "on_chain_metrics",
      }),
    );

    this.registerAdapter(
      new TwitterSourceAdapter({
        id: "santiment",
        name: "Santiment",
        username: "santimentfeed",
        logoUrl:
          "https://pbs.twimg.com/profile_images/1175731113732124672/xSoMfqgT_400x400.jpg",
        reliability: 0.88,
        category: "crypto",
        dataType: "market_data",
      }),
    );

    this.registerAdapter(
      new TwitterSourceAdapter({
        id: "radar-hits",
        name: "Radar Hits",
        username: "RadarHits",
        logoUrl:
          "https://pbs.twimg.com/profile_images/1378132696515219458/GDgG4kY0_400x400.jpg",
        reliability: 0.85,
        category: "financial",
        dataType: "general_news",
      }),
    );
  }

  /**
   * Register a news source adapter
   */
  public registerAdapter(adapter: NewsSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Get a specific adapter by ID
   */
  public getAdapter(id: string): NewsSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get all available adapters
   */
  public getAllAdapters(): NewsSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapters filtered by category
   */
  public getAdaptersByCategory(category: string): NewsSourceAdapter[] {
    return this.getAllAdapters().filter(
      (adapter) => adapter.category === category,
    );
  }

  /**
   * Get adapters filtered by reliability threshold
   */
  public getAdaptersByReliability(minReliability: number): NewsSourceAdapter[] {
    return this.getAllAdapters().filter(
      (adapter) => adapter.reliability >= minReliability,
    );
  }

  /**
   * Get adapters that support a specific capability
   */
  public getAdaptersByCapability(
    capabilityKey: string,
    value: boolean,
  ): NewsSourceAdapter[] {
    return this.getAllAdapters().filter((adapter) => {
      const capabilities = adapter.getCapabilities();
      return capabilities[capabilityKey as keyof typeof capabilities] === value;
    });
  }

  /**
   * Get adapters that support a specific language
   */
  public getAdaptersByLanguage(language: string): NewsSourceAdapter[] {
    return this.getAllAdapters().filter((adapter) => {
      const capabilities = adapter.getCapabilities();
      return capabilities.supportsLanguages.includes(language);
    });
  }

  /**
   * Get trusted sources (high reliability)
   */
  public getTrustedSources(): NewsSourceAdapter[] {
    return this.getAdaptersByReliability(0.85);
  }

  /**
   * Get adapters that support real-time updates
   */
  public getRealTimeSources(): NewsSourceAdapter[] {
    return this.getAdaptersByCapability("supportsRealTimeUpdates", true);
  }
}
