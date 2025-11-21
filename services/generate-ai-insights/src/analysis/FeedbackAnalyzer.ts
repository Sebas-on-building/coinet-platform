/**
 * =========================================
 * FEEDBACK ANALYZER
 * =========================================
 * Divine world-class user feedback analysis and sentiment processing
 */

// import { Logger } from '../utils/Logger';
// import * as sentiment from 'sentiment';
// import * as natural from 'natural';
import {
  UserFeedback,
  AIInsightsConfig,
  UserBehaviorPattern,
  RecommendationPriority
} from '../types';

/**
 * Feedback analyzer for user sentiment and behavior analysis
 */
export class FeedbackAnalyzer {
  private config: AIInsightsConfig;

  constructor(config: AIInsightsConfig) {
    this.config = config;
  }

  /**
   * Analyze user feedback comprehensively
   */
  async analyzeFeedback(feedback: UserFeedback[]): Promise<{
    summary: {
      totalFeedback: number;
      avgRating: number;
      sentimentDistribution: { positive: number; negative: number; neutral: number };
      commonComplaints: string[];
      commonPraises: string[];
      trends: Array<{ category: string; trend: 'improving' | 'declining' | 'stable'; confidence: number }>;
    };
    patterns: UserBehaviorPattern[];
    insights: string[];
  }> {
    // Debug logging removed for simplicity

    if (feedback.length === 0) {
      return {
        summary: {
          totalFeedback: 0,
          avgRating: 0,
          sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
          commonComplaints: [],
          commonPraises: [],
          trends: []
        },
        patterns: [],
        insights: []
      };
    }

    // Analyze sentiment distribution
    const sentimentDistribution = this.analyzeSentimentDistribution(feedback);

    // Extract common themes
    const { complaints, praises } = this.extractCommonThemes(feedback);

    // Analyze rating trends
    const trends = this.analyzeRatingTrends(feedback);

    // Detect user behavior patterns
    const patterns = this.detectUserBehaviorPatterns(feedback);

    // Generate insights
    const insights = this.generateFeedbackInsights(feedback, sentimentDistribution, trends, patterns);

    const summary = {
      totalFeedback: feedback.length,
      avgRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length,
      sentimentDistribution,
      commonComplaints: complaints.slice(0, 5),
      commonPraises: praises.slice(0, 5),
      trends
    };

    // Logging removed for simplicity

    return { summary, patterns, insights };
  }

  /**
   * Analyze sentiment distribution
   */
  private analyzeSentimentDistribution(feedback: UserFeedback[]): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    const distribution = { positive: 0, negative: 0, neutral: 0 };

    for (const fb of feedback) {
      switch (fb.sentiment) {
        case 'positive':
          distribution.positive++;
          break;
        case 'negative':
          distribution.negative++;
          break;
        case 'neutral':
          distribution.neutral++;
          break;
      }
    }

    return distribution;
  }

  /**
   * Extract common themes from feedback
   */
  private extractCommonThemes(feedback: UserFeedback[]): {
    complaints: string[];
    praises: string[];
  } {
    const complaints: string[] = [];
    const praises: string[] = [];

    for (const fb of feedback) {
      if (fb.comment) {
        const comment = fb.comment?.toLowerCase() || '';
        const words = comment.split(/\s+/);

        if (fb.sentiment === 'negative') {
          // Extract negative keywords
          const negativeKeywords = words.filter(word =>
            ['late', 'wrong', 'inaccurate', 'false', 'spam', 'annoying', 'bad', 'poor'].includes(word)
          );
          complaints.push(...negativeKeywords);
        } else if (fb.sentiment === 'positive') {
          // Extract positive keywords
          const positiveKeywords = words.filter(word =>
            ['accurate', 'timely', 'good', 'helpful', 'perfect', 'excellent', 'great'].includes(word)
          );
          praises.push(...positiveKeywords);
        }
      }
    }

    // Count frequency and return top themes
    const complaintCounts = this.countFrequencies(complaints);
    const praiseCounts = this.countFrequencies(praises);

    return {
      complaints: complaintCounts.slice(0, 10),
      praises: praiseCounts.slice(0, 10)
    };
  }

  /**
   * Count word frequencies
   */
  private countFrequencies(words: string[]): string[] {
    const counts = new Map<string, number>();

    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * Analyze rating trends over time
   */
  private analyzeRatingTrends(feedback: UserFeedback[]): Array<{
    category: string;
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
  }> {
    const trends: Array<{
      category: string;
      trend: 'improving' | 'declining' | 'stable';
      confidence: number;
    }> = [];

    // Group by category
    const categoryGroups = new Map<string, UserFeedback[]>();

    for (const fb of feedback) {
      for (const category of fb.categories) {
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(fb);
      }
    }

    // Analyze trends for each category
    for (const [category, categoryFeedback] of categoryGroups) {
      if (categoryFeedback.length < 5) continue; // Need minimum data points

      const sorted = categoryFeedback.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const trend = this.calculateTrend(sorted.map(f => f.rating));

      if (trend.confidence > 0.6) {
        trends.push({
          category,
          trend: trend.direction,
          confidence: trend.confidence
        });
      }
    }

    return trends;
  }

  /**
   * Calculate trend for ratings
   */
  private calculateTrend(ratings: number[]): {
    direction: 'improving' | 'declining' | 'stable';
    confidence: number;
  } {
    if (ratings.length < 2) {
      return { direction: 'stable', confidence: 0 };
    }

    // Simple trend calculation using linear regression on indices
    const n = ratings.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = ratings;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (slope > 0.1) direction = 'improving';
    else if (slope < -0.1) direction = 'declining';

    // Confidence based on R-squared approximation
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + (sumY - slope * sumX) / n;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);

    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const confidence = Math.min(Math.abs(slope) * 10, 1); // Scale confidence with slope magnitude

    return { direction, confidence: Math.max(0, Math.min(1, confidence)) };
  }

  /**
   * Detect user behavior patterns
   */
  private detectUserBehaviorPatterns(feedback: UserFeedback[]): UserBehaviorPattern[] {
    const patterns: UserBehaviorPattern[] = [];

    // Group feedback by user
    const userGroups = new Map<string, UserFeedback[]>();

    for (const fb of feedback) {
      if (!userGroups.has(fb.userId)) {
        userGroups.set(fb.userId, []);
      }
      userGroups.get(fb.userId)!.push(fb);
    }

    // Analyze each user's feedback pattern
    for (const [userId, userFeedback] of userGroups) {
      if (userFeedback.length < 3) continue;

      const pattern = this.analyzeUserFeedbackPattern(userId, userFeedback);
      if (pattern.confidence > 0.7) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze individual user feedback pattern
   */
  private analyzeUserFeedbackPattern(userId: string, feedback: UserFeedback[]): UserBehaviorPattern {
    // Calculate feedback frequency
    const sorted = feedback.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const timeSpan = sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime();
    const frequency = feedback.length / (timeSpan / (1000 * 60 * 60 * 24)); // feedback per day

    // Analyze sentiment consistency
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const fb of feedback) {
      sentimentCounts[fb.sentiment]++;
    }

    const dominantSentiment = Object.entries(sentimentCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as 'positive' | 'negative' | 'neutral';

    // Determine pattern type
    let pattern: string;
    let impact: 'low' | 'medium' | 'high' = 'low';

    if (frequency > 2 && dominantSentiment === 'positive') {
      pattern = 'engaged_positive_user';
      impact = 'high';
    } else if (frequency > 2 && dominantSentiment === 'negative') {
      pattern = 'dissatisfied_frequent_user';
      impact = 'high';
    } else if (frequency < 0.5) {
      pattern = 'infrequent_user';
      impact = 'medium';
    } else {
      pattern = 'moderate_user';
      impact = 'medium';
    }

    // Calculate confidence
    const confidence = Math.min(feedback.length / 10, 1); // More feedback = higher confidence

    // Generate recommendations
    const recommendations = this.generateUserRecommendations(pattern, dominantSentiment, frequency);

    return {
      userId,
      pattern,
      frequency,
      confidence,
      impact: impact as any,
      recommendations,
      lastSeen: sorted[sorted.length - 1].timestamp
    };
  }

  /**
   * Generate recommendations based on user pattern
   */
  private generateUserRecommendations(
    pattern: string,
    dominantSentiment: string,
    frequency: number
  ): string[] {
    const recommendations: string[] = [];

    switch (pattern) {
      case 'engaged_positive_user':
        recommendations.push('Consider this user as a potential beta tester');
        recommendations.push('Send personalized thank you messages');
        break;

      case 'dissatisfied_frequent_user':
        recommendations.push('Investigate and address specific complaints');
        recommendations.push('Consider offering compensation or incentives');
        break;

      case 'infrequent_user':
        recommendations.push('Send re-engagement campaigns');
        recommendations.push('Simplify onboarding process');
        break;

      default:
        if (dominantSentiment === 'negative') {
          recommendations.push('Improve user experience based on feedback');
        }
    }

    return recommendations;
  }

  /**
   * Generate insights from feedback analysis
   */
  private generateFeedbackInsights(
    feedback: UserFeedback[],
    sentimentDistribution: { positive: number; negative: number; neutral: number },
    trends: Array<{ category: string; trend: string; confidence: number }>,
    patterns: UserBehaviorPattern[]
  ): string[] {
    const insights: string[] = [];

    // Overall sentiment insights
    const totalFeedback = feedback.length;
    const positivePercentage = (sentimentDistribution.positive / totalFeedback) * 100;
    const negativePercentage = (sentimentDistribution.negative / totalFeedback) * 100;

    if (positivePercentage > 80) {
      insights.push(`Excellent user satisfaction: ${positivePercentage.toFixed(1)}% positive feedback`);
    } else if (negativePercentage > 30) {
      insights.push(`Concerning feedback: ${negativePercentage.toFixed(1)}% negative sentiment detected`);
    }

    // Trend insights
    const improvingTrends = trends.filter(t => t.trend === 'improving');
    if (improvingTrends.length > 0) {
      insights.push(`${improvingTrends.length} feedback categories showing improvement`);
    }

    // Pattern insights
    const engagedUsers = patterns.filter(p => p.pattern === 'engaged_positive_user');
    if (engagedUsers.length > 0) {
      insights.push(`${engagedUsers.length} highly engaged users identified`);
    }

    return insights;
  }

  /**
   * Process sentiment for individual feedback (simplified)
   */
  processSentiment(text: string): { score: number; sentiment: 'positive' | 'negative' | 'neutral' } {
    // Simple keyword-based sentiment analysis for development
    const positiveWords = ['good', 'excellent', 'great', 'perfect', 'love', 'awesome', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    let sentiment: 'positive' | 'negative' | 'neutral';
    let score = 0;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      score = 0.5;
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      score = -0.5;
    } else {
      sentiment = 'neutral';
      score = 0;
    }

    return { score, sentiment };
  }

  /**
   * Extract keywords from feedback text (simplified)
   */
  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    // Simple word splitting for development
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Remove stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'this', 'that', 'these',
      'those', 'alert', 'notification', 'signal'
    ]);

    const filteredWords = words.filter(word => !stopWords.has(word));

    // Count frequencies
    const frequencies = new Map<string, number>();
    for (const word of filteredWords) {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }

    // Return top keywords
    return Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Categorize feedback automatically
   */
  categorizeFeedback(feedback: UserFeedback): string[] {
    const categories: string[] = [];
    const text = (feedback.comment || '').toLowerCase();

    // Accuracy-related
    if (text.includes('accurate') || text.includes('correct') || text.includes('wrong') || text.includes('false')) {
      categories.push('accuracy');
    }

    // Timing-related
    if (text.includes('time') || text.includes('late') || text.includes('early') || text.includes('delay')) {
      categories.push('timing');
    }

    // Frequency-related
    if (text.includes('many') || text.includes('few') || text.includes('frequency') || text.includes('spam')) {
      categories.push('frequency');
    }

    // User experience
    if (text.includes('easy') || text.includes('hard') || text.includes('confusing') || text.includes('intuitive')) {
      categories.push('usability');
    }

    return categories.length > 0 ? categories : ['general'];
  }
}
