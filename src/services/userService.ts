import { toast } from "react-hot-toast";

export type BadgeType =
  | "early_adopter"
  | "market_expert"
  | "social_butterfly"
  | "prediction_master"
  | "community_leader"
  | "technical_analyst"
  | "sentiment_analyst"
  | "volume_analyst"
  | "liquidity_expert"
  | "volatility_expert";

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  level: number;
  progress: number;
  requirements: {
    current: number;
    target: number;
    metric: string;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  requirements: {
    current: number;
    target: number;
    metric: string;
  };
  rewards: {
    reputation: number;
    badges?: BadgeType[];
  };
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  following: string[];
  followers: string[];
  watchlists: string[];
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      telegram: boolean;
      discord: boolean;
    };
    privacy: {
      showWatchlists: boolean;
      showFollowing: boolean;
      allowMentions: boolean;
    };
  };
  stats: {
    eventsTracked: number;
    commentsPosted: number;
    watchlistsCreated: number;
    followersCount: number;
    followingCount: number;
    reputation: number;
    predictionAccuracy: number;
    analysisCount: number;
    helpfulVotes: number;
    totalVotes: number;
  };
  badges: Badge[];
  achievements: Achievement[];
  expertise: {
    technical: number;
    fundamental: number;
    sentiment: number;
    volume: number;
    liquidity: number;
    volatility: number;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  type: "comment" | "watchlist" | "follow" | "mention";
  content: string;
  timestamp: Date;
  eventId?: string;
  targetUserId?: string;
}

class UserService {
  private static instance: UserService;
  private users: Map<string, UserProfile> = new Map();
  private activities: UserActivity[] = [];
  private readonly BADGE_REQUIREMENTS: Record<
    BadgeType,
    {
      name: string;
      description: string;
      requirements: { metric: string; target: number };
    }
  > = {
    early_adopter: {
      name: "Early Adopter",
      description: "Joined during the beta phase",
      requirements: { metric: "daysSinceJoin", target: 0 },
    },
    market_expert: {
      name: "Market Expert",
      description: "Achieved high prediction accuracy",
      requirements: { metric: "predictionAccuracy", target: 0.8 },
    },
    social_butterfly: {
      name: "Social Butterfly",
      description: "Active community member",
      requirements: { metric: "commentsPosted", target: 100 },
    },
    prediction_master: {
      name: "Prediction Master",
      description: "Made accurate market predictions",
      requirements: { metric: "successfulPredictions", target: 50 },
    },
    community_leader: {
      name: "Community Leader",
      description: "Helped other users",
      requirements: { metric: "helpfulVotes", target: 100 },
    },
    technical_analyst: {
      name: "Technical Analyst",
      description: "Expert in technical analysis",
      requirements: { metric: "technicalAnalysis", target: 50 },
    },
    sentiment_analyst: {
      name: "Sentiment Analyst",
      description: "Expert in sentiment analysis",
      requirements: { metric: "sentimentAnalysis", target: 50 },
    },
    volume_analyst: {
      name: "Volume Analyst",
      description: "Expert in volume analysis",
      requirements: { metric: "volumeAnalysis", target: 50 },
    },
    liquidity_expert: {
      name: "Liquidity Expert",
      description: "Expert in liquidity analysis",
      requirements: { metric: "liquidityAnalysis", target: 50 },
    },
    volatility_expert: {
      name: "Volatility Expert",
      description: "Expert in volatility analysis",
      requirements: { metric: "volatilityAnalysis", target: 50 },
    },
  };

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.users.get(userId) || null;
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async followUser(followerId: string, targetId: string): Promise<void> {
    const follower = this.users.get(followerId);
    const target = this.users.get(targetId);

    if (!follower || !target) {
      throw new Error("User not found");
    }

    if (!follower.following.includes(targetId)) {
      follower.following.push(targetId);
      target.followers.push(followerId);
      follower.stats.followingCount++;
      target.stats.followersCount++;

      this.activities.push({
        id: Date.now().toString(),
        userId: followerId,
        type: "follow",
        content: `${follower.username} started following ${target.username}`,
        timestamp: new Date(),
        targetUserId: targetId,
      });
    }
  }

  async unfollowUser(followerId: string, targetId: string): Promise<void> {
    const follower = this.users.get(followerId);
    const target = this.users.get(targetId);

    if (!follower || !target) {
      throw new Error("User not found");
    }

    follower.following = follower.following.filter((id) => id !== targetId);
    target.followers = target.followers.filter((id) => id !== followerId);
    follower.stats.followingCount--;
    target.stats.followersCount--;
  }

  async getUserActivity(
    userId: string,
    limit: number = 20,
  ): Promise<UserActivity[]> {
    return this.activities
      .filter(
        (activity) =>
          activity.userId === userId || activity.targetUserId === userId,
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getFeed(userId: string, limit: number = 20): Promise<UserActivity[]> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const followingIds = [userId, ...user.following];
    return this.activities
      .filter((activity) => followingIds.includes(activity.userId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async mentionUser(
    mentionerId: string,
    mentionedId: string,
    eventId: string,
    content: string,
  ): Promise<void> {
    const mentioner = this.users.get(mentionerId);
    const mentioned = this.users.get(mentionedId);

    if (!mentioner || !mentioned) {
      throw new Error("User not found");
    }

    if (!mentioned.preferences.privacy.allowMentions) {
      throw new Error("User does not allow mentions");
    }

    this.activities.push({
      id: Date.now().toString(),
      userId: mentionerId,
      type: "mention",
      content: `${mentioner.username} mentioned ${mentioned.username}: ${content}`,
      timestamp: new Date(),
      eventId,
      targetUserId: mentionedId,
    });
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<UserProfile["preferences"]["notifications"]>,
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.preferences.notifications = {
      ...user.preferences.notifications,
      ...preferences,
    };
  }

  async updatePrivacySettings(
    userId: string,
    settings: Partial<UserProfile["preferences"]["privacy"]>,
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.preferences.privacy = {
      ...user.preferences.privacy,
      ...settings,
    };
  }

  async updateUserStats(
    userId: string,
    updates: Partial<UserProfile["stats"]>,
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.stats = { ...user.stats, ...updates };
    await this.checkAchievements(userId);
    await this.checkBadges(userId);
  }

  async updateExpertise(
    userId: string,
    updates: Partial<UserProfile["expertise"]>,
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.expertise = { ...user.expertise, ...updates };
    await this.checkBadges(userId);
  }

  private async checkAchievements(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    const newAchievements: Achievement[] = [];
    const stats = user.stats;

    // Check for new achievements based on stats
    if (
      stats.eventsTracked >= 100 &&
      !user.achievements.find((a) => a.id === "event_tracker")
    ) {
      newAchievements.push({
        id: "event_tracker",
        name: "Event Tracker",
        description: "Tracked 100 events",
        icon: "📊",
        progress: 100,
        requirements: {
          current: stats.eventsTracked,
          target: 100,
          metric: "eventsTracked",
        },
        rewards: {
          reputation: 100,
          badges: ["market_expert"],
        },
      });
    }

    if (
      stats.predictionAccuracy >= 0.8 &&
      !user.achievements.find((a) => a.id === "prediction_master")
    ) {
      newAchievements.push({
        id: "prediction_master",
        name: "Prediction Master",
        description: "Achieved 80% prediction accuracy",
        icon: "🎯",
        progress: 100,
        requirements: {
          current: stats.predictionAccuracy * 100,
          target: 80,
          metric: "predictionAccuracy",
        },
        rewards: {
          reputation: 200,
          badges: ["prediction_master"],
        },
      });
    }

    // Add new achievements
    for (const achievement of newAchievements) {
      achievement.unlockedAt = new Date();
      user.achievements.push(achievement);
      user.stats.reputation += achievement.rewards.reputation;

      if (achievement.rewards.badges) {
        for (const badgeType of achievement.rewards.badges) {
          await this.awardBadge(userId, badgeType);
        }
      }

      toast.success(`Achievement unlocked: ${achievement.name}!`);
    }
  }

  private async checkBadges(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    for (const [type, requirements] of Object.entries(
      this.BADGE_REQUIREMENTS,
    )) {
      const currentBadge = user.badges.find((b) => b.type === type);
      const currentLevel = currentBadge?.level || 0;
      const nextLevel = currentLevel + 1;

      // Check if user meets requirements for next level
      const metric = requirements.requirements.metric;
      const target = requirements.requirements.target * nextLevel;
      const current = this.getMetricValue(user, metric);

      if (current >= target) {
        await this.awardBadge(userId, type as BadgeType, nextLevel);
      }
    }
  }

  private getMetricValue(user: UserProfile, metric: string): number {
    switch (metric) {
      case "predictionAccuracy":
        return user.stats.predictionAccuracy;
      case "commentsPosted":
        return user.stats.commentsPosted;
      case "helpfulVotes":
        return user.stats.helpfulVotes;
      case "technicalAnalysis":
        return user.expertise.technical;
      case "sentimentAnalysis":
        return user.expertise.sentiment;
      case "volumeAnalysis":
        return user.expertise.volume;
      case "liquidityAnalysis":
        return user.expertise.liquidity;
      case "volatilityAnalysis":
        return user.expertise.volatility;
      default:
        return 0;
    }
  }

  async awardBadge(
    userId: string,
    type: BadgeType,
    level: number = 1,
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const requirements = this.BADGE_REQUIREMENTS[type];
    const currentBadge = user.badges.find((b) => b.type === type);

    if (currentBadge && currentBadge.level >= level) {
      return; // Badge already awarded at this level or higher
    }

    const badge: Badge = {
      type,
      name: requirements.name,
      description: requirements.description,
      icon: this.getBadgeIcon(type),
      unlockedAt: new Date(),
      level,
      progress: 100,
      requirements: {
        current: this.getMetricValue(user, requirements.requirements.metric),
        target: requirements.requirements.target * level,
        metric: requirements.requirements.metric,
      },
    };

    if (currentBadge) {
      // Update existing badge
      Object.assign(currentBadge, badge);
    } else {
      // Add new badge
      user.badges.push(badge);
    }

    toast.success(`Badge unlocked: ${badge.name} (Level ${level})!`);
  }

  private getBadgeIcon(type: BadgeType): string {
    const icons: Record<BadgeType, string> = {
      early_adopter: "🚀",
      market_expert: "📈",
      social_butterfly: "🦋",
      prediction_master: "🎯",
      community_leader: "👑",
      technical_analyst: "📊",
      sentiment_analyst: "😊",
      volume_analyst: "📊",
      liquidity_expert: "💧",
      volatility_expert: "📉",
    };
    return icons[type];
  }
}

export const userService = UserService.getInstance();
