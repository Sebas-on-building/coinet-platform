import React, { useEffect, useState } from 'react';
import { Card } from '../design-system/Card';
import { Line } from 'react-chartjs-2';

export function AnalyticsCharts() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/analytics-admin/aggregate')
      .then(res => res.json())
      .then(stats => {
        setData([
          { label: 'Users', data: [10, 20, 30, stats.totalUsers] },
          { label: 'Badges', data: [2, 5, 8, stats.totalBadges] },
          { label: 'Events', data: [100, 200, 300, stats.totalEvents] }
        ]);
      });
  }, []);

  const chartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Now'],
    datasets: data.map((d, i) => ({
      label: d.label,
      data: d.data,
      borderColor: ['#0e76fd', '#6e4fff', '#00c896'][i],
      fill: false,
      tension: 0.4
    }))
  };

  return (
    <Card>
      <h2>Growth Over Time</h2>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <Line data={chartData} />
      </div>
    </Card>
  );
} 