import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChartHeader } from '../components/charts/ChartHeader';
import { TradingViewChart } from '../components/charts/TradingViewChart';
import { ChartSidebar } from '../components/charts/ChartSidebar';

// <ChartPage>: Container component, fetches data and passes to presentational components
export const ChartPage = () => {
  const { symbol } = useParams();
  const [chartData, setChartData] = useState(null);
  const [sidebarData, setSidebarData] = useState(null);

  useEffect(() => {
    fetch(`/api/chart/${symbol}`).then(r => r.json()).then(setChartData);
    fetch(`/api/chart/${symbol}/sidebar`).then(r => r.json()).then(setSidebarData);
  }, [symbol]);

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      {/* Presentational components: stateless, receive data via props */}
      <div style={{ flex: 1 }}>
        <ChartHeader symbol={symbol} />
        <TradingViewChart data={chartData} />
      </div>
      <ChartSidebar data={sidebarData} />
    </div>
  );
}; 