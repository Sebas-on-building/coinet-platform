export interface UserFeedback {
  id: string;
  userId: string;
  responseId: string;
  rating: number; // 1-5 scale
  comment?: string;
  category: FeedbackCategory;
  timestamp: Date;
}

export type FeedbackCategory =
  | 'accuracy'
  | 'helpfulness'
  | 'relevance'
  | 'clarity'
  | 'completeness';

export interface BanditArm {
  id: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  rewards: number[];
  totalReward: number;
  count: number;
  averageReward: number;
  confidence: number;
}

export interface BanditState {
  arms: BanditArm[];
  totalTrials: number;
  explorationRate: number;
  lastUpdated: Date;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  averageRating: number;
  categoryBreakdown: Record<FeedbackCategory, number>;
  providerPerformance: Record<string, {
    averageRating: number;
    count: number;
  }>;
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
} 