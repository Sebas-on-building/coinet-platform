import React, { useEffect, useState } from 'react';
import { OverviewCard } from '../components/dashboard/OverviewCard';
import { LatestNews } from '../components/dashboard/LatestNews';
import { MiniChart } from '../components/dashboard/MiniChart';

// <DashboardPage>: Container component, fetches data and passes to presentational components
export const DashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [news, setNews] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Fetch overview data
    fetch('/api/overview').then(r => r.json()).then(setOverview);
    // Fetch news
    fetch('/api/news').then(r => r.json()).then(setNews);
    // Fetch chart data
    fetch('/api/chart/overview').then(r => r.json()).then(setChartData);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
      {/* Presentational components: stateless, receive data via props */}
      <div>
        <OverviewCard data={overview} />
        <MiniChart data={chartData} />
      </div>
      <LatestNews news={news} />
    </div>
  );
}; 