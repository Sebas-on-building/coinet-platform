import { PortfolioWidget } from "./PortfolioWidget";
import MarketOverviewWidget from './MarketOverviewWidget';
import NewsFeedWidget from './NewsFeedWidget';
import SocialSentimentWidget from './SocialSentimentWidget';
import AIInsightsWidget from './AIInsightsWidget';

// NOTE: All widgets should accept and forward the `analyticsEvent` prop for standardized analytics event tracking and a11y.
export const widgetRegistry = {
  market: { name: 'Market Overview', component: MarketOverviewWidget },
  portfolio: { name: 'Portfolio', component: PortfolioWidget },
  news: { name: 'News', component: NewsFeedWidget },
  social: { name: 'Social Sentiment', component: SocialSentimentWidget },
  ai: { name: 'AI Insights', component: AIInsightsWidget },
};
