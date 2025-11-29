import React, { useState } from 'react';
// You would use a library like react-grid-layout or dnd-kit for real DnD/resizing
import { Responsive, WidthProvider } from 'react-grid-layout';
import { MarketOverviewWidget } from '../components/Card/MarketOverviewWidget';
import { PortfolioWidget } from '../components/Card/PortfolioWidget';
import NewsFeedWidget from '../components/Card/NewsFeedWidget';
import SocialSentimentWidget from '../components/Card/SocialSentimentWidget';
import AIInsightsWidget from '../components/Card/AIInsightsWidget';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const widgetTypes = [
  { type: 'market', name: 'Market Overview', component: MarketOverviewWidget },
  { type: 'portfolio', name: 'Portfolio', component: PortfolioWidget },
  { type: 'news', name: 'News Feed', component: NewsFeedWidget },
  { type: 'social', name: 'Social Sentiment', component: SocialSentimentWidget },
  { type: 'ai', name: 'AI Insights', component: AIInsightsWidget },
];

export default {
  title: 'Dashboard/DnD & Resizing',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A drag-and-drop, resizable dashboard layout with add/remove/rearrange widgets, inspired by Apple, Canva, TradingView, and Solana.',
      },
    },
  },
};

export const DnDResizableDashboard = () => {
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

  const layout = widgets.map((w, i) => ({
    i: String(w.id),
    x: i % 3,
    y: Math.floor(i / 3),
    w: 1,
    h: 2,
    minW: 1,
    minH: 2,
  }));

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
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 3, md: 2, sm: 1, xs: 1 }}
        rowHeight={180}
        width={1200}
        isResizable
        isDraggable
        onLayoutChange={() => { }}
      >
        {widgets.map(w => {
          const WidgetComp = widgetTypes.find(wt => wt.type === w.type)?.component;
          return (
            <div key={w.id} data-grid={layout.find(l => l.i === String(w.id))}>
              <Card style={{ position: 'relative', minHeight: 320 }}>
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
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
};
