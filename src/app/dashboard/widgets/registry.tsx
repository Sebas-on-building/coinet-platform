// =========================
// Widget Registry
// =========================
import MarketOverviewWidget from './MarketOverview/MarketOverviewWidget';
import MarketOverviewConfig from './MarketOverview/MarketOverviewConfig';
import React from 'react';
import PortfolioWidget from './Portfolio/PortfolioWidget';
import PortfolioConfig from './Portfolio/PortfolioConfig';
import SentimentWidget from './Sentiment/SentimentWidget';
import SentimentConfig from './Sentiment/SentimentConfig';
import NewsFeedWidget from './NewsFeed/NewsFeedWidget';
import NewsFeedConfig from './NewsFeed/NewsFeedConfig';
import SocialFeedWidget from './SocialFeed/SocialFeedWidget';
import SocialFeedConfig from './SocialFeed/SocialFeedConfig';
import TradingPanelWidget from './TradingPanel/TradingPanelWidget';
import TradingPanelConfig from './TradingPanel/TradingPanelConfig';
import AnalyticsWidget from './Analytics/AnalyticsWidget';
import AnalyticsConfig from './Analytics/AnalyticsConfig';

export interface WidgetMeta {
  key: string;
  name: string;
  description: string;
  component: React.ComponentType<any>;
  configComponent?: React.ComponentType<any>;
  defaultConfig?: Record<string, any>;
  icon?: React.ReactNode;
  category?: string;
}

export const widgetRegistry: Record<string, WidgetMeta> = {
  marketOverview: {
    key: 'marketOverview',
    name: 'Market Overview',
    description: 'Shows top market movers and prices.',
    component: MarketOverviewWidget,
    configComponent: MarketOverviewConfig,
    defaultConfig: { topN: 3 },
    icon: <span role="img" aria-label="Market">📈</span>,
    category: 'Market',
  },
  portfolio: {
    key: 'portfolio',
    name: 'Portfolio',
    description: 'Displays your asset allocation and value.',
    component: PortfolioWidget,
    configComponent: PortfolioConfig,
    defaultConfig: { topN: 5 },
    icon: <span role="img" aria-label="Portfolio">💼</span>,
    category: 'Portfolio',
  },
  sentiment: {
    key: 'sentiment',
    name: 'Sentiment',
    description: 'Shows social and news sentiment for assets.',
    component: SentimentWidget,
    configComponent: SentimentConfig,
    defaultConfig: { source: 'twitter' },
    icon: <span role="img" aria-label="Sentiment">📊</span>,
    category: 'Analytics',
  },
  newsFeed: {
    key: 'newsFeed',
    name: 'News Feed',
    description: 'Latest news headlines and sources.',
    component: NewsFeedWidget,
    configComponent: NewsFeedConfig,
    defaultConfig: { source: 'all' },
    icon: <span role="img" aria-label="News">📰</span>,
    category: 'News',
  },
  socialFeed: {
    key: 'socialFeed',
    name: 'Social Feed',
    description: 'Trending social posts and discussions.',
    component: SocialFeedWidget,
    configComponent: SocialFeedConfig,
    defaultConfig: { source: 'all' },
    icon: <span role="img" aria-label="Social">💬</span>,
    category: 'Social',
  },
  tradingPanel: {
    key: 'tradingPanel',
    name: 'Trading Panel',
    description: 'Place trades and manage orders.',
    component: TradingPanelWidget,
    configComponent: TradingPanelConfig,
    defaultConfig: { defaultSymbol: 'BTC' },
    icon: <span role="img" aria-label="Trading">🛒</span>,
    category: 'Trading',
  },
  analytics: {
    key: 'analytics',
    name: 'Analytics / Backtesting',
    description: 'Run and view strategy analytics.',
    component: AnalyticsWidget,
    configComponent: AnalyticsConfig,
    defaultConfig: { strategy: 'momentum' },
    icon: <span role="img" aria-label="Analytics">📈</span>,
    category: 'Analytics',
  },
  // Add more widgets here
}; 