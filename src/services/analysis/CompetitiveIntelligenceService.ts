import { EventEmitter } from "events";
import { NewsItem, HistoricalNewsData } from "../../types/news";
import { HistoricalNewsService } from "../news/HistoricalNewsService";
import { NewsEnrichmentService } from "../news/NewsEnrichmentService";

interface CompetitiveAnalysis {
  projectId: string;
  projectName: string;
  newsCount: number;
  averageSentiment: number;
  sentimentTrend: number;
  topNarratives: Array<{
    name: string;
    momentum: number;
    sentiment: number;
  }>;
  marketImpact: {
    priceChange: number;
    volumeChange: number;
    socialEngagement: number;
  };
  coverageDistribution: {
    source: string;
    count: number;
    sentiment: number;
  }[];
}

interface NarrativeComparison {
  narrative: string;
  projects: {
    [projectId: string]: {
      momentum: number;
      sentiment: number;
      newsCount: number;
    };
  };
  overallTrend: number;
}

interface MarketCorrelation {
  projectId: string;
  correlations: {
    [otherProjectId: string]: {
      priceCorrelation: number;
      volumeCorrelation: number;
      sentimentCorrelation: number;
      narrativeOverlap: number;
    };
  };
}

export class CompetitiveIntelligenceService extends EventEmitter {
  private static instance: CompetitiveIntelligenceService;
  private historicalNewsService: HistoricalNewsService;
  private newsEnrichmentService: NewsEnrichmentService;

  private constructor() {
    super();
    this.historicalNewsService = HistoricalNewsService.getInstance();
    this.newsEnrichmentService = NewsEnrichmentService.getInstance();
  }

  public static getInstance(): CompetitiveIntelligenceService {
    if (!CompetitiveIntelligenceService.instance) {
      CompetitiveIntelligenceService.instance =
        new CompetitiveIntelligenceService();
    }
    return CompetitiveIntelligenceService.instance;
  }

  /**
   * Compare news coverage across multiple projects
   */
  public async compareProjectsCoverage(
    projectIds: string[],
    timeframe: { startDate: Date; endDate: Date },
  ): Promise<CompetitiveAnalysis[]> {
    const analyses = await Promise.all(
      projectIds.map(async (projectId) => {
        const news = await this.historicalNewsService.searchArchive({
          startDate: timeframe.startDate.toISOString(),
          endDate: timeframe.endDate.toISOString(),
          assets: [projectId],
        });

        return this.analyzeProjectCoverage(projectId, news);
      }),
    );

    return analyses;
  }

  /**
   * Track narrative shifts between competing ecosystems
   */
  public async trackNarrativeShifts(
    projectIds: string[],
    timeframe: { startDate: Date; endDate: Date },
  ): Promise<NarrativeComparison[]> {
    const allNews = await Promise.all(
      projectIds.map((projectId) =>
        this.historicalNewsService.searchArchive({
          startDate: timeframe.startDate.toISOString(),
          endDate: timeframe.endDate.toISOString(),
          assets: [projectId],
        }),
      ),
    );

    const narratives = this.extractCommonNarratives(allNews.flat());
    return this.compareNarrativesAcrossProjects(
      narratives,
      allNews,
      projectIds,
    );
  }

  /**
   * Analyze news coverage for a single project
   */
  private async analyzeProjectCoverage(
    projectId: string,
    news: HistoricalNewsData[],
  ): Promise<CompetitiveAnalysis> {
    const enrichedNews = await this.newsEnrichmentService.enrichNewsBatch(
      news.map((item) => item.newsItem),
    );

    const sourceDistribution = this.calculateSourceDistribution(enrichedNews);
    const topNarratives = this.extractTopNarratives(news);
    const marketImpact = this.calculateMarketImpact(news);

    return {
      projectId,
      projectName: projectId, // In a real implementation, this would be fetched from a project database
      newsCount: news.length,
      averageSentiment: this.calculateAverageSentiment(enrichedNews),
      sentimentTrend: this.calculateSentimentTrend(enrichedNews),
      topNarratives,
      marketImpact,
      coverageDistribution: sourceDistribution,
    };
  }

  /**
   * Extract common narratives across all news items
   */
  private extractCommonNarratives(news: HistoricalNewsData[]): string[] {
    const narrativeCount = new Map<string, number>();

    news.forEach((item) => {
      item.narrativeTags.forEach((tag) => {
        narrativeCount.set(tag, (narrativeCount.get(tag) || 0) + 1);
      });
    });

    return Array.from(narrativeCount.entries())
      .filter(([_, count]) => count >= 2) // Only include narratives mentioned in multiple items
      .map(([narrative]) => narrative);
  }

  /**
   * Compare narratives across different projects
   */
  private compareNarrativesAcrossProjects(
    narratives: string[],
    projectNews: HistoricalNewsData[][],
    projectIds: string[],
  ): NarrativeComparison[] {
    return narratives.map((narrative) => {
      const projectStats = projectIds.reduce(
        (acc, projectId, index) => {
          const projectItems = projectNews[index].filter((item) =>
            item.narrativeTags.includes(narrative),
          );

          acc[projectId] = {
            momentum: this.calculateNarrativeMomentum(projectItems),
            sentiment: this.calculateNarrativeSentiment(projectItems),
            newsCount: projectItems.length,
          };

          return acc;
        },
        {} as {
          [key: string]: {
            momentum: number;
            sentiment: number;
            newsCount: number;
          };
        },
      );

      return {
        narrative,
        projects: projectStats,
        overallTrend: this.calculateOverallNarrativeTrend(projectStats),
      };
    });
  }

  /**
   * Calculate source distribution for news coverage
   */
  private calculateSourceDistribution(news: NewsItem[]) {
    const sourceStats = new Map<
      string,
      { count: number; totalSentiment: number }
    >();

    news.forEach((item) => {
      const stats = sourceStats.get(item.source) || {
        count: 0,
        totalSentiment: 0,
      };
      stats.count++;
      stats.totalSentiment += item.marketContext?.sentiment || 0;
      sourceStats.set(item.source, stats);
    });

    return Array.from(sourceStats.entries()).map(([source, stats]) => ({
      source,
      count: stats.count,
      sentiment: stats.totalSentiment / stats.count,
    }));
  }

  /**
   * Extract top narratives from news items
   */
  private extractTopNarratives(news: HistoricalNewsData[]) {
    const narrativeStats = new Map<
      string,
      { momentum: number; sentiment: number }
    >();

    news.forEach((item) => {
      item.narrativeTags.forEach((tag) => {
        const stats = narrativeStats.get(tag) || { momentum: 0, sentiment: 0 };
        stats.momentum += item.impactMetrics?.momentum || 0;
        stats.sentiment += item.newsItem.marketContext?.sentiment || 0;
        narrativeStats.set(tag, stats);
      });
    });

    return Array.from(narrativeStats.entries())
      .map(([name, stats]) => ({
        name,
        momentum: stats.momentum / news.length,
        sentiment: stats.sentiment / news.length,
      }))
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 5);
  }

  /**
   * Calculate market impact metrics
   */
  private calculateMarketImpact(news: HistoricalNewsData[]) {
    return {
      priceChange:
        news.reduce(
          (sum, item) => sum + (item.impactMetrics?.priceChange24h || 0),
          0,
        ) / news.length,
      volumeChange:
        news.reduce(
          (sum, item) => sum + (item.impactMetrics?.volumeChange24h || 0),
          0,
        ) / news.length,
      socialEngagement:
        news.reduce(
          (sum, item) => sum + (item.impactMetrics?.socialEngagement || 0),
          0,
        ) / news.length,
    };
  }

  /**
   * Calculate average sentiment
   */
  private calculateAverageSentiment(news: NewsItem[]): number {
    const sentiments = news.map((item) => item.marketContext?.sentiment || 0);
    return (
      sentiments.reduce((sum, sentiment) => sum + sentiment, 0) /
      sentiments.length
    );
  }

  /**
   * Calculate sentiment trend
   */
  private calculateSentimentTrend(news: NewsItem[]): number {
    if (news.length < 2) return 0;

    const sortedNews = [...news].sort(
      (a, b) =>
        new Date(a.published_at).getTime() - new Date(b.published_at).getTime(),
    );

    const sentiments = sortedNews.map(
      (item) => item.marketContext?.sentiment || 0,
    );
    const n = sentiments.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = sentiments.reduce((sum, y) => sum + y, 0);
    const sumXY = sentiments.reduce((sum, y, i) => sum + y * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate narrative momentum
   */
  private calculateNarrativeMomentum(news: HistoricalNewsData[]): number {
    if (news.length === 0) return 0;
    return (
      news.reduce((sum, item) => sum + (item.impactMetrics?.momentum || 0), 0) /
      news.length
    );
  }

  /**
   * Calculate narrative sentiment
   */
  private calculateNarrativeSentiment(news: HistoricalNewsData[]): number {
    if (news.length === 0) return 0;
    return (
      news.reduce(
        (sum, item) => sum + (item.newsItem.marketContext?.sentiment || 0),
        0,
      ) / news.length
    );
  }

  /**
   * Calculate overall narrative trend
   */
  private calculateOverallNarrativeTrend(projectStats: {
    [key: string]: { momentum: number; sentiment: number; newsCount: number };
  }): number {
    const projects = Object.values(projectStats);
    if (projects.length === 0) return 0;

    const totalMomentum = projects.reduce(
      (sum, project) => sum + project.momentum,
      0,
    );
    const totalSentiment = projects.reduce(
      (sum, project) => sum + project.sentiment,
      0,
    );
    const totalNews = projects.reduce(
      (sum, project) => sum + project.newsCount,
      0,
    );

    return (totalMomentum * 0.6 + totalSentiment * 0.4) / totalNews;
  }

  /**
   * Analyze market correlations between projects
   */
  public async analyzeMarketCorrelations(
    projectIds: string[],
    timeframe: { startDate: Date; endDate: Date },
  ): Promise<MarketCorrelation[]> {
    const analyses = await Promise.all(
      projectIds.map(async (projectId) => {
        const news = await this.historicalNewsService.searchArchive({
          startDate: timeframe.startDate.toISOString(),
          endDate: timeframe.endDate.toISOString(),
          assets: [projectId],
        });

        const correlations = await Promise.all(
          projectIds
            .filter((id) => id !== projectId)
            .map(async (otherProjectId) => {
              const otherNews = await this.historicalNewsService.searchArchive({
                startDate: timeframe.startDate.toISOString(),
                endDate: timeframe.endDate.toISOString(),
                assets: [otherProjectId],
              });

              return {
                [otherProjectId]: {
                  priceCorrelation: this.calculatePriceCorrelation(
                    news,
                    otherNews,
                  ),
                  volumeCorrelation: this.calculateVolumeCorrelation(
                    news,
                    otherNews,
                  ),
                  sentimentCorrelation: this.calculateSentimentCorrelation(
                    news,
                    otherNews,
                  ),
                  narrativeOverlap: this.calculateNarrativeOverlap(
                    news,
                    otherNews,
                  ),
                },
              };
            }),
        );

        return {
          projectId,
          correlations: Object.assign({}, ...correlations),
        };
      }),
    );

    return analyses;
  }

  /**
   * Calculate price correlation between two projects
   */
  private calculatePriceCorrelation(
    project1News: HistoricalNewsData[],
    project2News: HistoricalNewsData[],
  ): number {
    const priceChanges1 = project1News.map(
      (item) => item.impactMetrics?.priceChange24h || 0,
    );
    const priceChanges2 = project2News.map(
      (item) => item.impactMetrics?.priceChange24h || 0,
    );
    return this.calculatePearsonCorrelation(priceChanges1, priceChanges2);
  }

  /**
   * Calculate volume correlation between two projects
   */
  private calculateVolumeCorrelation(
    project1News: HistoricalNewsData[],
    project2News: HistoricalNewsData[],
  ): number {
    const volumeChanges1 = project1News.map(
      (item) => item.impactMetrics?.volumeChange24h || 0,
    );
    const volumeChanges2 = project2News.map(
      (item) => item.impactMetrics?.volumeChange24h || 0,
    );
    return this.calculatePearsonCorrelation(volumeChanges1, volumeChanges2);
  }

  /**
   * Calculate sentiment correlation between two projects
   */
  private calculateSentimentCorrelation(
    project1News: HistoricalNewsData[],
    project2News: HistoricalNewsData[],
  ): number {
    const sentiments1 = project1News.map(
      (item) => item.newsItem.marketContext?.sentiment || 0,
    );
    const sentiments2 = project2News.map(
      (item) => item.newsItem.marketContext?.sentiment || 0,
    );
    return this.calculatePearsonCorrelation(sentiments1, sentiments2);
  }

  /**
   * Calculate narrative overlap between two projects
   */
  private calculateNarrativeOverlap(
    project1News: HistoricalNewsData[],
    project2News: HistoricalNewsData[],
  ): number {
    const narratives1 = new Set(
      project1News.flatMap((item) => item.narrativeTags),
    );
    const narratives2 = new Set(
      project2News.flatMap((item) => item.narrativeTags),
    );

    const intersection = new Set(
      [...narratives1].filter((x) => narratives2.has(x)),
    );
    const union = new Set([...narratives1, ...narratives2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
