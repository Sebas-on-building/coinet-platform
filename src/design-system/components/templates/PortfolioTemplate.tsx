import React, { useState, useEffect } from 'react';
import { Header } from '../organisms/Header';
import { DashboardCard } from '../organisms/DashboardCard';
import { AssetTable, AssetTableProps } from '../organisms/AssetTable';
import clsx from 'clsx';

// --- Real-time presence (avatars/cursors) ---
const PresenceBar = ({ users }: { users: { id: string; name: string; avatar: string }[] }) => (
  <div className="co-presence-bar">
    {users.map(u => (
      <img key={u.id} src={u.avatar} alt={u.name} title={u.name} className="co-presence-avatar" />
    ))}
  </div>
);

// --- Widget Analytics Panel ---
const WidgetAnalyticsPanel = ({ analytics }: { analytics: any[] }) => (
  <div className="co-widget-analytics-panel">
    <h4>Widget Analytics</h4>
    <ul>
      {analytics.map(a => (
        <li key={a.id}>{a.label}: {a.usage} uses, {a.collaborators} collaborators</li>
      ))}
    </ul>
  </div>
);

// --- Widget Version History ---
const WidgetVersionHistory = ({ versions, onRevert }: { versions: any[]; onRevert: (v: any) => void }) => (
  <div className="co-widget-version-history">
    <h5>Version History</h5>
    <ul>
      {versions.map((v, i) => (
        <li key={i}>
          <button onClick={() => onRevert(v)}>Revert to {v.timestamp}</button>
        </li>
      ))}
    </ul>
  </div>
);

// --- Widget Comments ---
const WidgetComments = ({ comments, onAdd }: { comments: any[]; onAdd: (c: string) => void }) => {
  const [text, setText] = useState('');
  return (
    <div className="co-widget-comments">
      <h5>Comments</h5>
      <ul>
        {comments.map((c, i) => <li key={i}>{c.text} <span>({c.user})</span></li>)}
      </ul>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Add comment..." />
      <button onClick={() => { onAdd(text); setText(''); }}>Add</button>
    </div>
  );
};

export interface PortfolioTemplateProps {
  headerProps: React.ComponentProps<typeof Header>;
  summaryCards: React.ReactElement<typeof DashboardCard>[];
  assetTableProps: AssetTableProps;
  chart?: React.ReactNode;
  newsFeed?: React.ReactNode;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const PortfolioTemplate: React.FC<PortfolioTemplateProps> = ({
  headerProps,
  summaryCards,
  assetTableProps,
  chart,
  newsFeed,
  theme = 'light',
  className,
  style,
}) => {
  // Real-time presence (simulate)
  const [users, setUsers] = useState([
    { id: 'u1', name: 'Alice', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 'u2', name: 'Bob', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
  ]);
  // Widget analytics (simulate)
  const [analytics, setAnalytics] = useState([
    { id: 'w1', label: 'Analytics', usage: 42, collaborators: 2 },
    { id: 'w2', label: 'News Feed', usage: 30, collaborators: 1 },
    { id: 'w3', label: 'Chart', usage: 55, collaborators: 3 },
  ]);
  // Widget version history (simulate)
  const [versions, setVersions] = useState([{ timestamp: '2024-06-01 10:00', state: {} }]);
  // Widget comments (simulate)
  const [comments, setComments] = useState([{ text: 'Great widget!', user: 'Alice' }]);
  // AI auto-grouping (simulate)
  const [aiGroups, setAiGroups] = useState([['w1', 'w3']]);
  // Onboarding/help
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('co-theme-dark', theme === 'dark');
    document.body.classList.toggle('co-theme-light', theme === 'light');
  }, [theme]);

  return (
    <div className={clsx('co-portfoliotemplate', `co-portfoliotemplate-${theme}`, className)} style={style}>
      <Header {...headerProps} />
      <PresenceBar users={users} />
      <main className="co-portfoliotemplate-main" role="main" aria-label="Portfolio main content">
        <section className="co-portfoliotemplate-summary" aria-label="Portfolio summary">
          {summaryCards.map((card, i) => (
            <div key={i} className="co-portfoliotemplate-summarycard">{card}</div>
          ))}
        </section>
        <section className="co-portfoliotemplate-chart" aria-label="Portfolio chart">
          {chart}
        </section>
        <section className="co-portfoliotemplate-assets" aria-label="Portfolio assets">
          <AssetTable {...assetTableProps} />
        </section>
        <section className="co-portfoliotemplate-news" aria-label="Portfolio news feed">
          {newsFeed}
        </section>
        <WidgetAnalyticsPanel analytics={analytics} />
        <WidgetVersionHistory versions={versions} onRevert={v => { /* ... */ }} />
        <WidgetComments comments={comments} onAdd={c => setComments(cs => [...cs, { text: c, user: 'You' }])} />
        <button onClick={() => setShowHelp(h => !h)}>Help</button>
        {showHelp && (
          <div className="co-portfoliotemplate-help">
            <h4>How to use your Portfolio Dashboard</h4>
            <ul>
              <li>Drag, resize, and group widgets.</li>
              <li>See who's collaborating in real time.</li>
              <li>Use AI to auto-group or suggest layouts.</li>
              <li>Track widget usage and history.</li>
              <li>Add comments and notes to any widget.</li>
            </ul>
            <button onClick={() => setShowHelp(false)}>Close</button>
          </div>
        )}
      </main>
    </div>
  );
}; 