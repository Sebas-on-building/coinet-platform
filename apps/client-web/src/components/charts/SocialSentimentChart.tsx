import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SentimentDataPoint } from './mockData';

interface SocialSentimentChartProps {
  data: SentimentDataPoint[];
  className?: string;
}

export function SocialSentimentChart({ data, className }: SocialSentimentChartProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatVolume = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getSentimentColor = (value: number) => {
    if (value >= 70) return '#22c55e'; // Green
    if (value >= 50) return '#eab308'; // Yellow
    if (value >= 30) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getSentimentLabel = (value: number) => {
    if (value >= 70) return 'Very Positive';
    if (value >= 50) return 'Positive';
    if (value >= 30) return 'Negative';
    return 'Very Negative';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{formatDate(label)}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Sentiment:</span>
              <span 
                className="font-medium"
                style={{ color: getSentimentColor(data.sentiment) }}
              >
                {data.sentiment.toFixed(1)} ({getSentimentLabel(data.sentiment)})
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Social Volume:</span>
              <span className="font-medium">{formatVolume(data.social_volume)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">News Sentiment:</span>
              <span 
                className="font-medium"
                style={{ color: getSentimentColor(data.news_sentiment) }}
              >
                {data.news_sentiment.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const averageSentiment = data.reduce((sum, item) => sum + item.sentiment, 0) / data.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sentiment Overview Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Current Sentiment</div>
          <div 
            className="text-lg font-bold"
            style={{ color: getSentimentColor(data[data.length - 1]?.sentiment || 50) }}
          >
            {data[data.length - 1]?.sentiment.toFixed(1) || '50.0'}
          </div>
          <div className="text-xs text-muted-foreground">
            {getSentimentLabel(data[data.length - 1]?.sentiment || 50)}
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Avg 30D</div>
          <div 
            className="text-lg font-bold"
            style={{ color: getSentimentColor(averageSentiment) }}
          >
            {averageSentiment.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            Overall Trend
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Social Volume</div>
          <div className="text-lg font-bold text-primary">
            {formatVolume(data[data.length - 1]?.social_volume || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            Daily Posts
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3} 
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="sentiment"
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="volume"
              orientation="right"
              tickFormatter={formatVolume}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Social Volume Bars */}
            <Bar
              yAxisId="volume"
              dataKey="social_volume"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              name="Social Volume"
              radius={[2, 2, 0, 0]}
            />
            
            {/* Sentiment Lines */}
            <Line
              yAxisId="sentiment"
              type="monotone"
              dataKey="sentiment"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
              name="Social Sentiment"
            />
            
            <Line
              yAxisId="sentiment"
              type="monotone"
              dataKey="news_sentiment"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
              name="News Sentiment"
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment Scale */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-muted-foreground">Very Negative (0-30)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span className="text-muted-foreground">Negative (30-50)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-muted-foreground">Positive (50-70)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-muted-foreground">Very Positive (70-100)</span>
        </div>
      </div>
    </div>
  );
}