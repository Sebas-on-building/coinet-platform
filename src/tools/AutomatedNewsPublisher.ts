import { CryptoNewsWriter } from "./CryptoNewsWriter";
import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { NewsFilter, NewsItem } from "../types/news";
import { NewsImpactPredictor } from "./NewsImpactPredictor";
import fs from "fs";
import path from "path";
import axios from "axios";
import {
  formatTraditionalNews,
  ArticleTemplateData,
} from "../templates/crypto-news-article-template";

/**
 * Configuration for a publishing endpoint
 */
interface PublishingEndpoint {
  name: string;
  type: "file" | "webhook" | "api" | "medium" | "substack" | "ghost";
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

/**
 * Configuration for a scheduled article
 */
interface ArticleSchedule {
  id: string;
  title: string;
  topic: string;
  assets: string[];
  frequency: "hourly" | "daily" | "weekly" | "custom";
  customIntervalHours?: number;
  template: "traditional" | "digest" | "technical" | "opinion";
  includePricePrediction?: boolean;
  maxWords?: number;
  enabled: boolean;
  lastPublished?: string;
  endpoints: string[]; // References to publishing endpoint names
  timeOfDay?: string; // Format: 'HH:MM' for daily/weekly
  dayOfWeek?: number; // 0-6 for weekly (Sunday = 0)
  minNewsItems?: number; // Minimum number of news items to trigger publishing
}

/**
 * Extended options for research topic with publishedAfter option
 */
interface ExtendedResearchOptions {
  assets?: string[];
  sources?: string[];
  limit?: number;
  timeframeHours?: number;
  publishedAfter?: string;
}

/**
 * Publishing result
 */
interface PublishingResult {
  articleId: string;
  title: string;
  publishDate: string;
  endpoints: Array<{
    name: string;
    success: boolean;
    url?: string;
    error?: string;
  }>;
  filePath?: string;
}

/**
 * AutomatedNewsPublisher - Extends CryptoNewsWriter to automatically write
 * and publish articles based on configured topics and schedules
 */
export class AutomatedNewsPublisher extends CryptoNewsWriter {
  private schedules: ArticleSchedule[] = [];
  private endpoints: PublishingEndpoint[] = [];
  private configPath: string;
  private historyPath: string;
  private publishingHistory: PublishingResult[] = [];
  private isRunning = false;
  private timers: NodeJS.Timeout[] = [];
  private newsServiceInstance: NewsAggregationService;
  private impactPredictor: NewsImpactPredictor;

  /**
   * Create a new AutomatedNewsPublisher
   */
  constructor(
    outputDir: string = "./crypto-news-articles",
    configPath: string = "./publishing-config.json",
  ) {
    super(outputDir);
    this.configPath = configPath;
    this.historyPath = path.join(
      path.dirname(configPath),
      "publishing-history.json",
    );
    this.newsServiceInstance = NewsAggregationService.getInstance();
    this.impactPredictor = new NewsImpactPredictor();

    // Load configuration if it exists
    this.loadConfiguration();

    // Load publishing history if it exists
    this.loadPublishingHistory();
  }

  /**
   * Load configuration from file
   */
  private loadConfiguration(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
        this.schedules = config.schedules || [];
        this.endpoints = config.endpoints || [];
      } else {
        // Create default configuration
        this.schedules = [];
        this.endpoints = [
          {
            name: "file",
            type: "file",
            enabled: true,
          },
        ];
        this.saveConfiguration();
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfiguration(): void {
    try {
      const config = {
        schedules: this.schedules,
        endpoints: this.endpoints,
      };
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(config, null, 2),
        "utf8",
      );
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
  }

  /**
   * Load publishing history from file
   */
  private loadPublishingHistory(): void {
    try {
      if (fs.existsSync(this.historyPath)) {
        this.publishingHistory = JSON.parse(
          fs.readFileSync(this.historyPath, "utf8"),
        );
      }
    } catch (error) {
      console.error("Failed to load publishing history:", error);
    }
  }

  /**
   * Save publishing history to file
   */
  private savePublishingHistory(): void {
    try {
      fs.writeFileSync(
        this.historyPath,
        JSON.stringify(this.publishingHistory, null, 2),
        "utf8",
      );
    } catch (error) {
      console.error("Failed to save publishing history:", error);
    }
  }

  /**
   * Add a new publishing endpoint
   */
  public addEndpoint(endpoint: PublishingEndpoint): boolean {
    // Check if endpoint already exists
    if (this.endpoints.some((e) => e.name === endpoint.name)) {
      return false;
    }

    this.endpoints.push(endpoint);
    this.saveConfiguration();
    return true;
  }

  /**
   * Update an existing endpoint
   */
  public updateEndpoint(
    name: string,
    endpoint: Partial<PublishingEndpoint>,
  ): boolean {
    const index = this.endpoints.findIndex((e) => e.name === name);
    if (index === -1) {
      return false;
    }

    this.endpoints[index] = { ...this.endpoints[index], ...endpoint };
    this.saveConfiguration();
    return true;
  }

  /**
   * Remove an endpoint
   */
  public removeEndpoint(name: string): boolean {
    const initialLength = this.endpoints.length;
    this.endpoints = this.endpoints.filter((e) => e.name !== name);

    if (this.endpoints.length === initialLength) {
      return false;
    }

    // Remove references to this endpoint from all schedules
    this.schedules.forEach((schedule) => {
      schedule.endpoints = schedule.endpoints.filter((e) => e !== name);
    });

    this.saveConfiguration();
    return true;
  }

  /**
   * Add a new article schedule
   */
  public addSchedule(schedule: ArticleSchedule): string {
    // Generate ID if not provided
    if (!schedule.id) {
      schedule.id = Date.now().toString();
    }

    // Validate endpoints
    schedule.endpoints = schedule.endpoints.filter((endpointName) =>
      this.endpoints.some((e) => e.name === endpointName),
    );

    this.schedules.push(schedule);
    this.saveConfiguration();
    return schedule.id;
  }

  /**
   * Update an existing schedule
   */
  public updateSchedule(
    id: string,
    schedule: Partial<ArticleSchedule>,
  ): boolean {
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index === -1) {
      return false;
    }

    this.schedules[index] = { ...this.schedules[index], ...schedule };

    // Validate endpoints
    this.schedules[index].endpoints = this.schedules[index].endpoints.filter(
      (endpointName) => this.endpoints.some((e) => e.name === endpointName),
    );

    this.saveConfiguration();
    return true;
  }

  /**
   * Remove a schedule
   */
  public removeSchedule(id: string): boolean {
    const initialLength = this.schedules.length;
    this.schedules = this.schedules.filter((s) => s.id !== id);

    if (this.schedules.length === initialLength) {
      return false;
    }

    this.saveConfiguration();
    return true;
  }

  /**
   * Start automated publishing
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log("Starting automated news publishing");

    // Process each schedule
    this.schedules.forEach((schedule) => {
      if (!schedule.enabled) {
        return;
      }

      let intervalMs: number;
      switch (schedule.frequency) {
        case "hourly":
          intervalMs = 60 * 60 * 1000;
          break;
        case "daily":
          intervalMs = 24 * 60 * 60 * 1000;
          break;
        case "weekly":
          intervalMs = 7 * 24 * 60 * 60 * 1000;
          break;
        case "custom":
          intervalMs = (schedule.customIntervalHours || 24) * 60 * 60 * 1000;
          break;
        default:
          intervalMs = 24 * 60 * 60 * 1000; // Default to daily
      }

      // Check if it's time to publish based on last published timestamp
      this.checkAndPublish(schedule);

      // Set up timer for future publishing
      const timer = setInterval(() => {
        this.checkAndPublish(schedule);
      }, intervalMs);

      this.timers.push(timer);
    });
  }

  /**
   * Stop automated publishing
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log("Stopping automated news publishing");
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers = [];
    this.isRunning = false;
  }

  /**
   * Check if a schedule should be published now and publish if needed
   */
  private async checkAndPublish(schedule: ArticleSchedule): Promise<void> {
    if (!schedule.enabled) {
      return;
    }

    const now = new Date();
    let shouldPublish = false;

    // If lastPublished is not set, we should publish
    if (!schedule.lastPublished) {
      shouldPublish = true;
    } else {
      const lastPublished = new Date(schedule.lastPublished);

      switch (schedule.frequency) {
        case "hourly":
          shouldPublish =
            now.getTime() - lastPublished.getTime() >= 60 * 60 * 1000;
          break;
        case "daily":
          if (schedule.timeOfDay) {
            const [targetHour, targetMinute] = schedule.timeOfDay
              .split(":")
              .map(Number);
            shouldPublish =
              now.getDate() !== lastPublished.getDate() &&
              now.getHours() >= targetHour &&
              (now.getHours() > targetHour || now.getMinutes() >= targetMinute);
          } else {
            shouldPublish =
              now.getTime() - lastPublished.getTime() >= 24 * 60 * 60 * 1000;
          }
          break;
        case "weekly":
          if (schedule.dayOfWeek !== undefined && schedule.timeOfDay) {
            const [targetHour, targetMinute] = schedule.timeOfDay
              .split(":")
              .map(Number);
            shouldPublish =
              now.getDay() === schedule.dayOfWeek &&
              now.getHours() >= targetHour &&
              (now.getHours() > targetHour ||
                now.getMinutes() >= targetMinute) &&
              now.getTime() - lastPublished.getTime() >=
                6 * 24 * 60 * 60 * 1000;
          } else {
            shouldPublish =
              now.getTime() - lastPublished.getTime() >=
              7 * 24 * 60 * 60 * 1000;
          }
          break;
        case "custom":
          const interval =
            (schedule.customIntervalHours || 24) * 60 * 60 * 1000;
          shouldPublish = now.getTime() - lastPublished.getTime() >= interval;
          break;
      }
    }

    if (shouldPublish) {
      try {
        // Check for minimum news items if configured
        if (schedule.minNewsItems && schedule.minNewsItems > 0) {
          const newsItems = await this.newsServiceInstance.searchNews(
            schedule.topic,
            {
              assets: schedule.assets,
              limit: schedule.minNewsItems,
              publishedAfter: schedule.lastPublished,
            } as NewsFilter,
          );

          if (newsItems.length < schedule.minNewsItems) {
            console.log(
              `Not enough news items for "${schedule.title}". Found ${newsItems.length}, need ${schedule.minNewsItems}`,
            );
            return;
          }
        }

        // Publish the article
        await this.publishScheduledArticle(schedule);

        // Update last published timestamp
        this.updateSchedule(schedule.id, {
          lastPublished: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Failed to publish article "${schedule.title}":`, error);
      }
    }
  }

  /**
   * Process article for scheduled publishing
   */
  private async publishScheduledArticle(
    schedule: ArticleSchedule,
  ): Promise<PublishingResult> {
    console.log(`Publishing article: ${schedule.title}`);

    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    const titleWithDate = `${schedule.title} - ${formattedDate}`;

    // Research the topic
    const research = await this.researchTopic(schedule.topic, {
      assets: schedule.assets,
    });

    // Get market impact data if available
    const impact = await this.researchMarketImpact(
      schedule.topic,
      schedule.assets,
    );

    // Get impact prediction if enabled for this schedule
    const impactPrediction = schedule.includePricePrediction
      ? await this.getImpactPrediction(research.newsItems, schedule.assets)
      : null;

    // Generate content based on template
    let content = "";

    if (schedule.template === "digest") {
      // Format as a digest - bullet points, summaries, etc.
      content = await this.generateDigestTemplate(
        titleWithDate,
        research.sources,
        research.keyPoints,
        schedule.assets,
        impactPrediction,
      );
    } else if (schedule.template === "technical") {
      // Format as a technical analysis
      content = await this.generateTechnicalTemplate(
        titleWithDate,
        research.summary,
        research.keyPoints,
        schedule.assets,
        impact,
        impactPrediction,
      );
    } else if (schedule.template === "opinion") {
      // Format as an opinion piece
      content = await this.generateOpinionTemplate(
        titleWithDate,
        schedule.topic,
        research.keyPoints,
        impact,
      );
    } else {
      // Format using traditional news template
      try {
        // Prepare data for the template
        const templateData: ArticleTemplateData = {
          title: titleWithDate,
          summary: research.summary,
          keyPoints: research.keyPoints,
          impact: impact
            ? {
                score: impact.sentimentScore,
                market_sentiment: impact.overallSentiment,
                importance: 0.6, // Default importance
                affected_assets: impact.keyAssets.map((a) => a.symbol),
              }
            : undefined,
          keyAssets: impact ? impact.keyAssets : [],
          expert_quotes: [], // Would need to extract these from news items
          background: `${schedule.topic} has been a significant area of interest in the cryptocurrency market.`,
          outlook: `Investors and traders should continue monitoring ${schedule.assets.join(", ")} for potential market movements related to this topic.`,
          sources: research.sources,
        };

        // Format the content using the traditional news template
        content = formatTraditionalNews(templateData);
      } catch (error) {
        console.log(
          "Traditional news template error, using default template",
          error,
        );
        // Fallback to the default template if traditional template fails
        content = await this.generateArticleTemplate(
          titleWithDate,
          schedule.topic,
          schedule.assets,
        );
      }
    }

    // Save the article to a file using a safe filename
    const safeTitleFilename = this.createSafeFilename(titleWithDate);
    const filePath = await this.saveArticle(safeTitleFilename, content);

    // Publish to all configured endpoints
    const publishingResult: PublishingResult = {
      articleId: schedule.id,
      title: titleWithDate,
      publishDate: new Date().toISOString(),
      endpoints: [],
      filePath,
    };

    // Track the news impact for correlation analysis
    if (research.newsItems && research.newsItems.length > 0) {
      this.trackNewsForCorrelation(research.newsItems);
    }

    // Publish to all enabled endpoints
    for (const endpoint of this.endpoints) {
      if (endpoint.enabled) {
        try {
          const result = await this.publishToEndpoint(
            filePath,
            titleWithDate,
            content,
            endpoint,
          );
          publishingResult.endpoints.push({
            name: endpoint.name,
            url: result.url,
            success: result.success,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          publishingResult.endpoints.push({
            name: endpoint.name,
            url: "",
            success: false,
            error: errorMessage,
          });
        }
      }
    }

    // Update the schedule's last published date
    schedule.lastPublished = new Date().toISOString();
    this.saveConfiguration();

    // Add to publishing history
    this.publishingHistory.push(publishingResult);
    this.savePublishingHistory();

    return publishingResult;
  }

  /**
   * Create a safe filename for saving articles
   */
  private createSafeFilename(filename: string): string {
    return filename
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /**
   * Publish content to a specific endpoint
   */
  private async publishToEndpoint(
    filePath: string,
    title: string,
    content: string,
    endpoint: PublishingEndpoint,
  ): Promise<{ success: boolean; url?: string }> {
    switch (endpoint.type) {
      case "file":
        // Already saved to file, so just return success
        return { success: true };

      case "webhook":
        if (!endpoint.url) {
          throw new Error("Webhook URL is required");
        }

        await axios.post(
          endpoint.url,
          {
            title,
            content,
            publishDate: new Date().toISOString(),
          },
          {
            headers: endpoint.headers || {},
          },
        );

        return { success: true };

      case "api":
        if (!endpoint.url) {
          throw new Error("API URL is required");
        }

        const apiResponse = await axios.post(
          endpoint.url,
          {
            title,
            content,
            publishDate: new Date().toISOString(),
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...(endpoint.apiKey
                ? { Authorization: `Bearer ${endpoint.apiKey}` }
                : {}),
              ...(endpoint.headers || {}),
            },
          },
        );

        return {
          success: true,
          url: apiResponse.data.url || apiResponse.data.link || undefined,
        };

      case "medium":
        if (!endpoint.url || !endpoint.apiKey) {
          throw new Error("Medium API integration requires URL and API key");
        }

        const mediumResponse = await axios.post(
          endpoint.url,
          {
            title,
            contentFormat: "markdown",
            content,
            publishStatus: "public",
            tags: ["cryptocurrency", "blockchain", "crypto-news"],
          },
          {
            headers: {
              Authorization: `Bearer ${endpoint.apiKey}`,
              "Content-Type": "application/json",
              ...(endpoint.headers || {}),
            },
          },
        );

        return {
          success: true,
          url: mediumResponse.data.url,
        };

      case "substack":
        if (!endpoint.url || !endpoint.apiKey) {
          throw new Error("Substack API integration requires URL and API key");
        }

        const substackResponse = await axios.post(
          endpoint.url,
          {
            title,
            body_markdown: content,
            publish_status: "draft", // Default to draft for safety
          },
          {
            headers: {
              Authorization: `Bearer ${endpoint.apiKey}`,
              "Content-Type": "application/json",
              ...(endpoint.headers || {}),
            },
          },
        );

        return {
          success: true,
          url: substackResponse.data.url || substackResponse.data.post_url,
        };

      case "ghost":
        if (!endpoint.url || !endpoint.apiKey) {
          throw new Error("Ghost API integration requires URL and API key");
        }

        const ghostResponse = await axios.post(
          `${endpoint.url}/ghost/api/v3/admin/posts/`,
          {
            posts: [
              {
                title,
                markdown: content,
                status: "draft", // Default to draft for safety
                tags: ["cryptocurrency", "blockchain", "crypto-news"],
              },
            ],
          },
          {
            headers: {
              Authorization: `Ghost Admin API Key ${endpoint.apiKey}`,
              "Content-Type": "application/json",
              ...(endpoint.headers || {}),
            },
          },
        );

        return {
          success: true,
          url: ghostResponse.data.posts[0].url,
        };

      default:
        throw new Error(`Unsupported endpoint type: ${endpoint.type}`);
    }
  }

  /**
   * Force publish a specific article schedule immediately
   */
  public async publishNow(
    scheduleId: string,
  ): Promise<PublishingResult | null> {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (!schedule || !schedule.enabled) {
      return null;
    }

    return this.publishScheduledArticle(schedule);
  }

  /**
   * Get all available publishing endpoints
   */
  public getEndpoints(): PublishingEndpoint[] {
    return [...this.endpoints];
  }

  /**
   * Get all article schedules
   */
  public getSchedules(): ArticleSchedule[] {
    return [...this.schedules];
  }

  /**
   * Get publishing history
   */
  public getPublishingHistory(limit?: number): PublishingResult[] {
    const history = [...this.publishingHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Research a topic and get news information
   */
  public async researchTopic(
    topic: string,
    options?: {
      assets?: string[];
      sources?: string[];
      limit?: number;
      timeframeHours?: number;
    },
  ): Promise<{
    newsItems: NewsItem[];
    summary: string;
    keyPoints: string[];
    sources: string[];
  }> {
    // Get news about this topic
    const newsItems = await this.newsServiceInstance.searchNews(topic, options);
    // Extract summary and key points using base class methods
    const summary = super.generateSummary(newsItems, topic);
    const keyPoints = super.extractKeyPoints(newsItems);
    // Extract sources for attribution (as in base class)
    const sourcesSet = new Set<string>();
    newsItems.forEach((item) => {
      sourcesSet.add(`${item.source} (${item.url})`);
    });
    return {
      newsItems,
      summary,
      keyPoints,
      sources: Array.from(sourcesSet),
    };
  }

  /**
   * Get impact prediction for news items
   */
  private async getImpactPrediction(
    newsItems: any[],
    assets: string[],
  ): Promise<any | null> {
    if (!newsItems || newsItems.length === 0) {
      return null;
    }

    try {
      // Analyze news group to get predictions
      const analyzedGroups =
        await this.impactPredictor.analyzeNewsGroup(newsItems);

      // Return predictions filtered to relevant assets
      return {
        groups: analyzedGroups,
        assets: assets,
      };
    } catch (error) {
      console.error("Error getting impact prediction:", error);
      return null;
    }
  }

  /**
   * Format price predictions for display in articles
   */
  private formatPricePredictions(predictionData: any): Array<{
    asset: string;
    direction: string;
    magnitude: number;
    confidence: number;
    timeframe: string;
  }> {
    const result: Array<{
      asset: string;
      direction: string;
      magnitude: number;
      confidence: number;
      timeframe: string;
    }> = [];

    // Process each news group's predictions
    predictionData.groups.forEach((group: any) => {
      const assets = predictionData.assets;

      // Filter for relevant assets
      assets.forEach((asset: string) => {
        const prediction = group.predictions.asset_predictions[asset];

        if (prediction) {
          result.push({
            asset,
            direction: prediction.direction,
            magnitude: prediction.expected_magnitude,
            confidence: prediction.confidence,
            timeframe: prediction.timeframe,
          });
        }
      });
    });

    // Filter out duplicates and keep highest confidence predictions
    const assetMap = new Map<string, (typeof result)[0]>();

    result.forEach((pred) => {
      if (
        !assetMap.has(pred.asset) ||
        assetMap.get(pred.asset)!.confidence < pred.confidence
      ) {
        assetMap.set(pred.asset, pred);
      }
    });

    return Array.from(assetMap.values());
  }

  /**
   * Track news items for correlation analysis
   */
  private async trackNewsForCorrelation(newsItems: any[]): Promise<void> {
    if (!newsItems || newsItems.length === 0) {
      return;
    }

    try {
      // Track each news item
      for (const item of newsItems) {
        this.impactPredictor.trackNewsItem(item);
      }
    } catch (error) {
      console.error("Error tracking news for correlation:", error);
    }
  }

  /**
   * Generate a digest template for publishing
   */
  private async generateDigestTemplate(
    title: string,
    sources: string[],
    keyPoints: string[],
    assets: string[],
    impactPrediction: any,
  ): Promise<string> {
    // TODO: Implement digest formatting logic
    return `# ${title}\n\nDigest content goes here.`;
  }

  /**
   * Generate a technical analysis template for publishing
   */
  private async generateTechnicalTemplate(
    title: string,
    summary: string,
    keyPoints: string[],
    assets: string[],
    impact: any,
    impactPrediction: any,
  ): Promise<string> {
    // TODO: Implement technical analysis formatting logic
    return `# ${title}\n\nTechnical analysis content goes here.`;
  }

  /**
   * Generate an opinion template for publishing
   */
  private async generateOpinionTemplate(
    title: string,
    topic: string,
    keyPoints: string[],
    impact: any,
  ): Promise<string> {
    // TODO: Implement opinion formatting logic
    return `# ${title}\n\nOpinion content goes here.`;
  }
}
