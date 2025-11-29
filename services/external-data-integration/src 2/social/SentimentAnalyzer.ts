/**
 * =========================================
 * SENTIMENT ANALYZER
 * =========================================
 * Advanced social media sentiment analysis with streaming APIs
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord';
  author: {
    id: string;
    username: string;
    displayName?: string;
    verified?: boolean;
    followers?: number;
  };
  content: string;
  timestamp: Date;
  url?: string;
  mentions: string[]; // @mentions, subreddits, etc.
  hashtags: string[];
  media?: {
    type: 'image' | 'video' | 'gif';
    url: string;
    alt?: string;
  }[];
  engagement: {
    likes: number;
    retweets?: number;
    replies?: number;
    shares?: number;
    comments?: number;
    score?: number; // Reddit score
  };
  language: string;
  location?: {
    country?: string;
    coordinates?: [number, number];
  };
  metadata: {
    source: string;
    collectedAt: Date;
    processedAt: Date;
    confidence: number;
  };
}

export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  confidence: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
  topics: string[];
  entities: {
    cryptocurrencies: string[];
    projects: string[];
    people: string[];
    organizations: string[];
  };
  urgency: 'low' | 'medium' | 'high' | 'critical';
  marketImpact: number; // 0 to 1
}

export interface SocialMediaConfig {
  platforms: {
    twitter?: {
      enabled: boolean;
      bearerToken: string;
      rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
      };
    };
    reddit?: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      userAgent: string;
      rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
      };
    };
    telegram?: {
      enabled: boolean;
      botToken: string;
      channels: string[];
      rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
      };
    };
    discord?: {
      enabled: boolean;
      botToken: string;
      guilds: string[];
      rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
      };
    };
  };
  keywords: string[];
  languages: string[];
  collection: {
    bufferSize: number;
    deduplicationWindow: number; // seconds
    maxRetries: number;
  };
  sentiment: {
    model: 'basic' | 'advanced' | 'ml';
    cacheResults: boolean;
    cacheTtl: number;
  };
}

export class SentimentAnalyzer extends EventEmitter {
  private logger: Logger;
  private config: SocialMediaConfig;
  private httpClients: Map<string, AxiosInstance> = new Map();
  private messageBuffer: SocialMediaPost[] = new Map(); // Use Map for deduplication
  private sentimentCache: Map<string, SentimentAnalysis> = new Map();
  private isRunning: boolean = false;

  // Performance tracking
  private totalPosts: number = 0;
  private sentimentAnalyses: number = 0;
  private startTime: number = Date.now();

  constructor(config: SocialMediaConfig) {
    super();
    this.logger = new Logger('SentimentAnalyzer');

    this.config = {
      keywords: ['bitcoin', 'ethereum', 'crypto', 'defi', 'nft', 'web3'],
      languages: ['en'],
      collection: {
        bufferSize: 10000,
        deduplicationWindow: 300, // 5 minutes
        maxRetries: 3
      },
      sentiment: {
        model: 'advanced',
        cacheResults: true,
        cacheTtl: 3600 // 1 hour
      },
      ...config
    };
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Social Media Sentiment Analyzer...');
      this.isRunning = true;

      // Initialize API clients
      await this.initializeClients();

      // Start streaming for each platform
      await this.startStreaming();

      this.logger.info('✅ Social Media Sentiment Analyzer started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start Social Media Sentiment Analyzer', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Social Media Sentiment Analyzer...');
      this.isRunning = false;

      // Close all HTTP clients
      for (const [platform, client] of this.httpClients.entries()) {
        try {
          // Close any streaming connections
          if (client.defaults.baseURL) {
            this.logger.debug(`Closing connections for ${platform}`);
          }
        } catch (error) {
          this.logger.error(`Failed to close ${platform} client`, error);
        }
      }
      this.httpClients.clear();

      this.logger.info('✅ Social Media Sentiment Analyzer stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Social Media Sentiment Analyzer', error);
      throw error;
    }
  }

  /**
   * Get recent posts from buffer
   */
  getRecentPosts(limit: number = 100): SocialMediaPost[] {
    const posts = Array.from(this.messageBuffer.values());
    return posts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get posts by platform
   */
  getPostsByPlatform(platform: string, limit: number = 50): SocialMediaPost[] {
    const posts = Array.from(this.messageBuffer.values());
    return posts
      .filter(post => post.platform === platform)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get posts containing specific keywords
   */
  getPostsByKeywords(keywords: string[], limit: number = 50): SocialMediaPost[] {
    const posts = Array.from(this.messageBuffer.values());
    return posts
      .filter(post =>
        keywords.some(keyword =>
          post.content.toLowerCase().includes(keyword.toLowerCase()) ||
          post.hashtags.some(hashtag => hashtag.toLowerCase().includes(keyword.toLowerCase()))
        )
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Analyze sentiment for a post
   */
  async analyzeSentiment(post: SocialMediaPost): Promise<SentimentAnalysis> {
    try {
      // Check cache first
      const cacheKey = `${post.platform}:${post.id}`;
      const cached = this.sentimentCache.get(cacheKey);
      if (cached && this.config.sentiment.cacheResults) {
        return cached;
      }

      const analysis = await this.performSentimentAnalysis(post);

      // Cache the result
      if (this.config.sentiment.cacheResults) {
        this.sentimentCache.set(cacheKey, analysis);

        // Clean up old cache entries
        if (this.sentimentCache.size > 10000) {
          const oldestKey = Array.from(this.sentimentCache.keys())[0];
          this.sentimentCache.delete(oldestKey);
        }
      }

      this.sentimentAnalyses++;

      return analysis;

    } catch (error: any) {
      this.logger.error(`Failed to analyze sentiment for post ${post.id}`, error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    isRunning: boolean;
    platformsActive: string[];
    totalPlatforms: number;
    postsCollected: number;
    postsPerSecond: number;
    sentimentAnalyses: number;
    bufferSize: number;
    cacheSize: number;
    uptime: number;
  } {
    const platformsActive = Object.entries(this.config.platforms)
      .filter(([_, config]) => config?.enabled)
      .map(([platform]) => platform);

    const uptime = Date.now() - this.startTime;
    const postsPerSecond = this.totalPosts / Math.max(1, uptime / 1000);

    return {
      isRunning: this.isRunning,
      platformsActive,
      totalPlatforms: platformsActive.length,
      postsCollected: this.totalPosts,
      postsPerSecond,
      sentimentAnalyses: this.sentimentAnalyses,
      bufferSize: this.messageBuffer.size,
      cacheSize: this.sentimentCache.size,
      uptime
    };
  }

  private async initializeClients(): Promise<void> {
    // Initialize Twitter client
    if (this.config.platforms.twitter?.enabled) {
      await this.initializeTwitterClient();
    }

    // Initialize Reddit client
    if (this.config.platforms.reddit?.enabled) {
      await this.initializeRedditClient();
    }

    // Initialize Telegram client
    if (this.config.platforms.telegram?.enabled) {
      await this.initializeTelegramClient();
    }

    // Initialize Discord client
    if (this.config.platforms.discord?.enabled) {
      await this.initializeDiscordClient();
    }
  }

  private async initializeTwitterClient(): Promise<void> {
    const config = this.config.platforms.twitter!;
    const client = axios.create({
      baseURL: 'https://api.twitter.com/2',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${config.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.httpClients.set('twitter', client);
    this.logger.info('✅ Twitter API client initialized');
  }

  private async initializeRedditClient(): Promise<void> {
    const config = this.config.platforms.reddit!;
    const client = axios.create({
      baseURL: 'https://oauth.reddit.com',
      timeout: 30000,
      headers: {
        'User-Agent': config.userAgent,
        'Content-Type': 'application/json'
      }
    });

    // Get access token
    try {
      const tokenResponse = await axios.post('https://www.reddit.com/api/v1/access_token', {
        grant_type: 'client_credentials'
      }, {
        auth: {
          username: config.clientId,
          password: config.clientSecret
        },
        headers: {
          'User-Agent': config.userAgent
        }
      });

      client.defaults.headers.common['Authorization'] = `Bearer ${tokenResponse.data.access_token}`;
      this.httpClients.set('reddit', client);
      this.logger.info('✅ Reddit API client initialized');

    } catch (error: any) {
      this.logger.error('Failed to authenticate with Reddit API', error);
      throw error;
    }
  }

  private async initializeTelegramClient(): Promise<void> {
    const config = this.config.platforms.telegram!;
    const client = axios.create({
      baseURL: `https://api.telegram.org/bot${config.botToken}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.httpClients.set('telegram', client);
    this.logger.info('✅ Telegram API client initialized');
  }

  private async initializeDiscordClient(): Promise<void> {
    const config = this.config.platforms.discord!;
    const client = axios.create({
      baseURL: 'https://discord.com/api/v10',
      timeout: 30000,
      headers: {
        'Authorization': `Bot ${config.botToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.httpClients.set('discord', client);
    this.logger.info('✅ Discord API client initialized');
  }

  private async startStreaming(): Promise<void> {
    // Start Twitter streaming
    if (this.config.platforms.twitter?.enabled) {
      this.startTwitterStreaming();
    }

    // Start Reddit monitoring
    if (this.config.platforms.reddit?.enabled) {
      this.startRedditMonitoring();
    }

    // Start Telegram monitoring
    if (this.config.platforms.telegram?.enabled) {
      this.startTelegramMonitoring();
    }

    // Start Discord monitoring
    if (this.config.platforms.discord?.enabled) {
      this.startDiscordMonitoring();
    }
  }

  private startTwitterStreaming(): void {
    const client = this.httpClients.get('twitter');
    if (!client) return;

    // Build Twitter filtered stream rules
    const rules = this.config.keywords.map(keyword => ({
      value: keyword,
      tag: `keyword:${keyword}`
    }));

    // Set up streaming rules (simplified for demo)
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Poll recent tweets containing keywords
        const response = await client.get('/tweets/search/recent', {
          params: {
            query: this.config.keywords.join(' OR '),
            max_results: 100,
            'tweet.fields': 'author_id,created_at,public_metrics,entities,lang',
            'user.fields': 'username,verified,public_metrics',
            'expansions': 'author_id'
          }
        });

        if (response.data.data) {
          for (const tweet of response.data.data) {
            await this.processTwitterPost(tweet, response.data.includes?.users);
          }
        }

      } catch (error: any) {
        this.logger.error('Failed to fetch Twitter posts', error);
      }
    }, 60000); // Poll every minute (respects rate limits)
  }

  private startRedditMonitoring(): void {
    const client = this.httpClients.get('reddit');
    if (!client) return;

    // Monitor relevant subreddits
    const subreddits = ['cryptocurrency', 'bitcoin', 'ethereum', 'defi', 'CryptoMarkets'];

    setInterval(async () => {
      if (!this.isRunning) return;

      for (const subreddit of subreddits) {
        try {
          const response = await client.get(`/r/${subreddit}/new`, {
            params: {
              limit: 25
            }
          });

          if (response.data.data?.children) {
            for (const child of response.data.data.children) {
              await this.processRedditPost(child.data, subreddit);
            }
          }

        } catch (error: any) {
          this.logger.error(`Failed to fetch Reddit posts from r/${subreddit}`, error);
        }
      }
    }, 30000); // Poll every 30 seconds
  }

  private startTelegramMonitoring(): void {
    const client = this.httpClients.get('telegram');
    if (!client) return;

    const config = this.config.platforms.telegram!;

    setInterval(async () => {
      if (!this.isRunning) return;

      for (const channel of config.channels) {
        try {
          // Get channel updates
          const response = await client.get(`/getUpdates`, {
            params: {
              chat_id: channel,
              limit: 100
            }
          });

          if (response.data.result) {
            for (const update of response.data.result) {
              if (update.message) {
                await this.processTelegramMessage(update.message, channel);
              }
            }
          }

        } catch (error: any) {
          this.logger.error(`Failed to fetch Telegram messages from ${channel}`, error);
        }
      }
    }, 30000); // Poll every 30 seconds
  }

  private startDiscordMonitoring(): void {
    const client = this.httpClients.get('discord');
    if (!client) return;

    const config = this.config.platforms.discord!;

    setInterval(async () => {
      if (!this.isRunning) return;

      for (const guildId of config.guilds) {
        try {
          // Get guild channels
          const channelsResponse = await client.get(`/guilds/${guildId}/channels`);

          for (const channel of channelsResponse.data) {
            if (channel.type === 0) { // Text channel
              // Get recent messages
              const messagesResponse = await client.get(`/channels/${channel.id}/messages`, {
                params: { limit: 100 }
              });

              for (const message of messagesResponse.data) {
                await this.processDiscordMessage(message, channel.id);
              }
            }
          }

        } catch (error: any) {
          this.logger.error(`Failed to fetch Discord messages from guild ${guildId}`, error);
        }
      }
    }, 60000); // Poll every minute
  }

  private async processTwitterPost(tweet: any, users?: any[]): Promise<void> {
    try {
      const user = users?.find(u => u.id === tweet.author_id);

      const post: SocialMediaPost = {
        id: tweet.id,
        platform: 'twitter',
        author: {
          id: tweet.author_id,
          username: user?.username || 'unknown',
          displayName: user?.name,
          verified: user?.verified,
          followers: user?.public_metrics?.followers_count
        },
        content: tweet.text,
        timestamp: new Date(tweet.created_at),
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        mentions: tweet.entities?.mentions?.map((m: any) => m.username) || [],
        hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || [],
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0
        },
        language: tweet.lang || 'en',
        metadata: {
          source: 'twitter-api',
          collectedAt: new Date(),
          processedAt: new Date(),
          confidence: 0.9
        }
      };

      await this.addPost(post);

    } catch (error: any) {
      this.logger.error(`Failed to process Twitter post ${tweet.id}`, error);
    }
  }

  private async processRedditPost(post: any, subreddit: string): Promise<void> {
    try {
      // Skip if not relevant to crypto
      const isRelevant = this.config.keywords.some(keyword =>
        post.title.toLowerCase().includes(keyword) ||
        post.selftext?.toLowerCase().includes(keyword)
      );

      if (!isRelevant) return;

      const redditPost: SocialMediaPost = {
        id: post.id,
        platform: 'reddit',
        author: {
          id: post.author,
          username: post.author,
          displayName: post.author
        },
        content: `${post.title}\n\n${post.selftext || ''}`,
        timestamp: new Date(post.created_utc * 1000),
        url: `https://reddit.com${post.permalink}`,
        mentions: [subreddit],
        hashtags: [],
        engagement: {
          likes: post.score || 0,
          comments: post.num_comments || 0,
          score: post.score || 0
        },
        language: 'en',
        metadata: {
          source: 'reddit-api',
          collectedAt: new Date(),
          processedAt: new Date(),
          confidence: 0.85
        }
      };

      await this.addPost(redditPost);

    } catch (error: any) {
      this.logger.error(`Failed to process Reddit post ${post.id}`, error);
    }
  }

  private async processTelegramMessage(message: any, channelId: string): Promise<void> {
    try {
      if (!message.text) return;

      const telegramPost: SocialMediaPost = {
        id: message.message_id.toString(),
        platform: 'telegram',
        author: {
          id: message.from?.id?.toString() || 'unknown',
          username: message.from?.username || 'unknown',
          displayName: message.from?.first_name
        },
        content: message.text,
        timestamp: new Date(message.date * 1000),
        mentions: message.entities?.filter((e: any) => e.type === 'mention').map((e: any) => message.text.substring(e.offset, e.offset + e.length)) || [],
        hashtags: [],
        engagement: {
          likes: 0, // Telegram doesn't provide reaction counts in basic API
          comments: 0
        },
        language: 'en',
        metadata: {
          source: 'telegram-api',
          collectedAt: new Date(),
          processedAt: new Date(),
          confidence: 0.8
        }
      };

      await this.addPost(telegramPost);

    } catch (error: any) {
      this.logger.error(`Failed to process Telegram message ${message.message_id}`, error);
    }
  }

  private async processDiscordMessage(message: any, channelId: string): Promise<void> {
    try {
      if (!message.content) return;

      const discordPost: SocialMediaPost = {
        id: message.id,
        platform: 'discord',
        author: {
          id: message.author.id,
          username: message.author.username,
          displayName: message.author.global_name || message.author.username
        },
        content: message.content,
        timestamp: new Date(message.timestamp),
        mentions: message.mentions?.map((m: any) => m.username) || [],
        hashtags: [],
        engagement: {
          likes: 0, // Discord reactions not easily accessible
          comments: 0
        },
        language: 'en',
        metadata: {
          source: 'discord-api',
          collectedAt: new Date(),
          processedAt: new Date(),
          confidence: 0.75
        }
      };

      await this.addPost(discordPost);

    } catch (error: any) {
      this.logger.error(`Failed to process Discord message ${message.id}`, error);
    }
  }

  private async addPost(post: SocialMediaPost): Promise<void> {
    try {
      // Deduplication check
      const key = `${post.platform}:${post.id}`;
      if (this.messageBuffer.has(key)) {
        return; // Already processed
      }

      // Check if post is too old (avoid backfill)
      const age = Date.now() - post.timestamp.getTime();
      if (age > this.config.collection.deduplicationWindow * 1000) {
        return;
      }

      // Add to buffer
      this.messageBuffer.set(key, post);
      this.totalPosts++;

      // Maintain buffer size
      if (this.messageBuffer.size > this.config.collection.bufferSize) {
        // Remove oldest entries
        const keysToRemove = Array.from(this.messageBuffer.keys()).slice(0, 1000);
        keysToRemove.forEach(k => this.messageBuffer.delete(k));
      }

      // Emit post event for further processing
      this.emit('new-post', { post, timestamp: new Date() });

      // Auto-analyze sentiment
      if (this.isRelevantPost(post)) {
        const sentiment = await this.analyzeSentiment(post);
        this.emit('sentiment-analysis', { post, sentiment, timestamp: new Date() });
      }

    } catch (error: any) {
      this.logger.error(`Failed to add post ${post.id}`, error);
    }
  }

  private isRelevantPost(post: SocialMediaPost): boolean {
    // Check if post contains relevant keywords
    const content = post.content.toLowerCase();
    return this.config.keywords.some(keyword =>
      content.includes(keyword.toLowerCase()) ||
      post.hashtags.some(hashtag => hashtag.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  private async performSentimentAnalysis(post: SocialMediaPost): Promise<SentimentAnalysis> {
    // Enhanced sentiment analysis using multiple techniques
    const text = post.content.toLowerCase();

    // Basic keyword-based sentiment
    let score = 0;
    let positiveWords = 0;
    let negativeWords = 0;

    // Positive sentiment indicators
    const positiveIndicators = [
      'bullish', 'moon', 'pump', 'buy', 'hodl', 'diamond hands', 'to the moon',
      'great', 'awesome', 'amazing', 'excellent', 'love', 'like', 'good', 'best',
      'profit', 'gains', 'win', 'success', 'happy', 'excited'
    ];

    // Negative sentiment indicators
    const negativeIndicators = [
      'bearish', 'dump', 'sell', 'paper hands', 'rekt', 'loss', 'crash', 'bad',
      'terrible', 'awful', 'hate', 'dislike', 'worst', 'fail', 'scam', 'rug',
      'angry', 'sad', 'worried', 'fear', 'panic', 'fud'
    ];

    for (const word of positiveIndicators) {
      if (text.includes(word)) {
        score += 0.1;
        positiveWords++;
      }
    }

    for (const word of negativeIndicators) {
      if (text.includes(word)) {
        score -= 0.1;
        negativeWords++;
      }
    }

    // Normalize score
    if (positiveWords + negativeWords > 0) {
      score = Math.max(-1, Math.min(1, score));
    } else {
      score = 0; // Neutral if no indicators found
    }

    // Determine label
    let label: SentimentAnalysis['label'] = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';
    else if (Math.abs(score) > 0.3) label = 'mixed';

    // Extract entities
    const entities = this.extractEntities(text);

    // Calculate urgency based on engagement and recency
    let urgency: SentimentAnalysis['urgency'] = 'low';
    const engagementScore = (post.engagement.likes || 0) + (post.engagement.retweets || 0) + (post.engagement.comments || 0);
    const ageMinutes = (Date.now() - post.timestamp.getTime()) / (1000 * 60);

    if (engagementScore > 100 || ageMinutes < 10) urgency = 'high';
    else if (engagementScore > 20 || ageMinutes < 60) urgency = 'medium';

    // Calculate market impact
    const marketImpact = this.calculateMarketImpact(post, entities, urgency);

    return {
      score,
      confidence: Math.min(0.9, (positiveWords + negativeWords) / 10), // Higher confidence with more indicators
      label,
      emotions: this.extractEmotions(text),
      topics: this.extractTopics(text),
      entities,
      urgency,
      marketImpact
    };
  }

  private extractEntities(text: string): SentimentAnalysis['entities'] {
    const entities: SentimentAnalysis['entities'] = {
      cryptocurrencies: [],
      projects: [],
      people: [],
      organizations: []
    };

    // Cryptocurrency extraction
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'AVAX', 'LUNA', 'UNI', 'LINK'];
    cryptoSymbols.forEach(symbol => {
      if (text.includes(symbol.toLowerCase()) || text.includes(symbol)) {
        entities.cryptocurrencies.push(symbol);
      }
    });

    // Project extraction
    const projects = ['bitcoin', 'ethereum', 'binance', 'cardano', 'solana', 'polkadot'];
    projects.forEach(project => {
      if (text.includes(project)) {
        entities.projects.push(project.charAt(0).toUpperCase() + project.slice(1));
      }
    });

    // Organization extraction
    const organizations = ['coinbase', 'binance', 'kraken', 'uniswap', 'aave', 'compound'];
    organizations.forEach(org => {
      if (text.includes(org)) {
        entities.organizations.push(org.charAt(0).toUpperCase() + org.slice(1));
      }
    });

    return entities;
  }

  private extractEmotions(text: string): SentimentAnalysis['emotions'] {
    const emotions: SentimentAnalysis['emotions'] = {
      joy: 0,
      anger: 0,
      fear: 0,
      sadness: 0,
      surprise: 0,
      disgust: 0
    };

    // Simple emotion detection based on keywords
    if (text.includes('happy') || text.includes('excited') || text.includes('great')) emotions.joy += 0.3;
    if (text.includes('angry') || text.includes('mad') || text.includes('furious')) emotions.anger += 0.3;
    if (text.includes('fear') || text.includes('scared') || text.includes('worried')) emotions.fear += 0.3;
    if (text.includes('sad') || text.includes('disappointed') || text.includes('regret')) emotions.sadness += 0.3;
    if (text.includes('wow') || text.includes('amazing') || text.includes('incredible')) emotions.surprise += 0.3;

    return emotions;
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];

    // Topic extraction based on keywords
    if (text.includes('price') || text.includes('pump') || text.includes('dump')) topics.push('price');
    if (text.includes('defi') || text.includes('yield') || text.includes('staking')) topics.push('defi');
    if (text.includes('nft') || text.includes('art') || text.includes('collectible')) topics.push('nft');
    if (text.includes('regulation') || text.includes('sec') || text.includes('government')) topics.push('regulation');
    if (text.includes('adoption') || text.includes('mainstream') || text.includes('institutional')) topics.push('adoption');

    return topics;
  }

  private calculateMarketImpact(post: SocialMediaPost, entities: SentimentAnalysis['entities'], urgency: SentimentAnalysis['urgency']): number {
    let impact = 0;

    // Base impact from entities
    impact += entities.cryptocurrencies.length * 0.1;
    impact += entities.projects.length * 0.15;
    impact += entities.organizations.length * 0.05;

    // Urgency multiplier
    const urgencyMultiplier = { low: 0.5, medium: 1.0, high: 1.5, critical: 2.0 };
    impact *= urgencyMultiplier[urgency];

    // Engagement multiplier
    const engagement = (post.engagement.likes || 0) + (post.engagement.retweets || 0) + (post.engagement.comments || 0);
    if (engagement > 1000) impact *= 2;
    else if (engagement > 100) impact *= 1.5;

    // Author influence (simplified)
    if (post.author.verified) impact *= 1.3;
    if (post.author.followers && post.author.followers > 10000) impact *= 1.2;

    return Math.min(1, impact);
  }

  getStatus(): string {
    const platformsActive = Object.entries(this.config.platforms)
      .filter(([_, config]) => config?.enabled)
      .length;

    return this.isRunning ? `Running (${platformsActive} platforms active)` : 'Stopped';
  }
}
