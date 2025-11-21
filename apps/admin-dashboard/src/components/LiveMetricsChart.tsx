import React from 'react';

interface LiveMetricsChartProps {
  title: string;
  data: number[];
  labels: string[];
}

export const LiveMetricsChart: React.FC<LiveMetricsChartProps> = ({ title, data, labels }) => {
  // Placeholder: Replace with Chart.js, Recharts, or similar
  return (
    <div className="rounded-xl shadow p-6 bg-gradient-to-br from-white/80 to-gray-100/60 border border-gray-200 flex flex-col gap-2">
      <div className="font-semibold text-lg text-gray-800 mb-2">{title}</div>
      <div className="h-32 flex items-center justify-center text-gray-400">[Live Chart Placeholder]</div>
    </div>
  );
}; 