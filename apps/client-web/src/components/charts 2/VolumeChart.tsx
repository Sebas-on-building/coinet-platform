import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PriceDataPoint } from './mockData';

interface VolumeChartProps {
  data: PriceDataPoint[];
  className?: string;
  height?: number;
  compact?: boolean;
}

export function VolumeChart({ 
  data, 
  className, 
  height = 120,
  compact = false 
}: VolumeChartProps) {
  const formatVolume = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return compact 
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-foreground mb-2">{formatDate(label)}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-semibold text-foreground">{formatVolume(data.volume)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate average volume for dynamic bar colors
  const avgVolume = data.reduce((sum, item) => sum + item.volume, 0) / data.length;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="2 2" 
            stroke="hsl(var(--border))" 
            opacity={0.2}
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            hide={compact}
          />
          <YAxis
            tickFormatter={formatVolume}
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            orientation="right"
            width={60}
            hide={compact}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="volume"
            fill="hsl(var(--primary))"
            fillOpacity={0.8}
            radius={[1, 1, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}