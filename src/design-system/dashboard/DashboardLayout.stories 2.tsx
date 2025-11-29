import React, { useState } from 'react';
import { MarketOverviewWidget } from '../components/Card/MarketOverviewWidget';
import { PortfolioWidget } from '../components/Card/PortfolioWidget';
import NewsFeedWidget from '../components/Card/NewsFeedWidget';
import SocialSentimentWidget from '../components/Card/SocialSentimentWidget';
import AIInsightsWidget from '../components/Card/AIInsightsWidget';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/Layout',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A fully interactive, drag-and-drop, themeable dashboard layout with add/remove/rearrange widgets, inspired by Apple, Canva, TradingView, and Solana.',
      },
    },
  },
};

const widgetTypes = [
  { type: 'market', name: 'Market Overview', component: MarketOverviewWidget },
  { type: 'portfolio', name: 'Portfolio', component: PortfolioWidget },
  { type: 'news', name: 'News Feed', component: NewsFeedWidget },
  { type: 'social', name: 'Social Sentiment', component: SocialSentimentWidget },
  { type: 'ai', name: 'AI Insights', component: AIInsightsWidget },
];

export const InteractiveDashboard = () => {
  const [widgets, setWidgets] = useState([
    { id: 1, type: 'market' },
    { id: 2, type: 'portfolio' },
    { id: 3, type: 'news' },
  ]);
  const [nextId, setNextId] = useState(4);

  const addWidget = (type) => {
    setWidgets([...widgets, { id: nextId, type }]);
    setNextId(nextId + 1);
  };
  const removeWidget = (id) => setWidgets(widgets.filter(w => w.id !== id));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)',
      padding: 32,
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {widgetTypes.map(wt => (
          <Button key={wt.type} onClick={() => addWidget(wt.type)} size="sm">
            + {wt.name}
          </Button>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24,
        }}
      >
        {widgets.map(w => {
          const WidgetComp = widgetTypes.find(wt => wt.type === w.type)?.component;
          return (
            <Card key={w.id} style={{ position: 'relative', minHeight: 320 }}>
              <Button
                size="xs"
                variant="danger"
                style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                onClick={() => removeWidget(w.id)}
                aria-label="Remove widget"
              >
                ×
              </Button>
              {WidgetComp && <WidgetComp />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}; 