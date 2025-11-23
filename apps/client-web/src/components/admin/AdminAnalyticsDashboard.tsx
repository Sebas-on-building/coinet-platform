import React, { useEffect, useState } from 'react';
import { Card } from '../design-system/Card';

export function AdminAnalyticsDashboard() {
  const [stats, setStats] = useState<any>({});
  useEffect(() => {
    fetch('/analytics-admin/aggregate')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);
  return (
    <Card>
      <h2>Platform Analytics</h2>
      <ul>
        <li>Total Users: {stats.totalUsers}</li>
        <li>Total Badges Awarded: {stats.totalBadges}</li>
        <li>Total Events: {stats.totalEvents}</li>
      </ul>
    </Card>
  );
} 