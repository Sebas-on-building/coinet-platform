import React, { useEffect, useState } from 'react';
import { Card } from '../design-system/Card';

export function AnimatedStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ badges: 0, events: 0 });

  useEffect(() => {
    fetch(`/badges?userId=${userId}`)
      .then(res => res.json())
      .then(data => setStats(s => ({ ...s, badges: data.badges.length })));
    fetch(`/analytics/user`)
      .then(res => res.json())
      .then(data => setStats(s => ({ ...s, events: data.events.length })));
  }, [userId]);

  return (
    <Card>
      <h3>Your Achievements</h3>
      <div style={{ display: 'flex', gap: 32, fontSize: 24, fontWeight: 700 }}>
        <div>
          <span role="img" aria-label="badges">🏅</span>
          <span style={{ marginLeft: 8, transition: 'color 0.3s', color: '#0e76fd' }}>{stats.badges}</span>
          <div style={{ fontSize: 14, color: '#888' }}>Badges</div>
        </div>
        <div>
          <span role="img" aria-label="events">📈</span>
          <span style={{ marginLeft: 8, transition: 'color 0.3s', color: '#6e4fff' }}>{stats.events}</span>
          <div style={{ fontSize: 14, color: '#888' }}>Events</div>
        </div>
      </div>
    </Card>
  );
} 