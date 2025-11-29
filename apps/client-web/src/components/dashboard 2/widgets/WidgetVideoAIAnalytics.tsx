import React, { useEffect, useState } from 'react';

export const WidgetVideoAIAnalytics = () => {
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/video/ai-insights?videoId=demo')
      .then(res => res.json())
      .then(setInsights);
  }, []);

  return (
    <div style={{
      background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>Video AI Insights</h2>
      <ul>
        {insights.map((insight, i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <strong>{insight.type}:</strong> {insight.value}
          </li>
        ))}
      </ul>
    </div>
  );
}; 