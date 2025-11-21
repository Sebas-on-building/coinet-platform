import React from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ReferenceLine
} from 'recharts';
import { CandlestickDataPoint } from './mockData';

interface CandlestickChartProps {
  data: CandlestickDataPoint[];
  className?: string;
}

// Custom Candlestick component
const Candlestick = ({ payload, x, y, width, height }: any) => {
  if (!payload) return null;
  
  const { open, high, low, close } = payload;
  const isPositive = close >= open;
  
  const bodyHeight = Math.abs(close - open);
  const bodyY = Math.min(close, open);
  
  // Scale factors (these would normally come from the chart dimensions)
  const scale = height / (high - low || 1);
  const offsetY = y - (high - Math.max(close, open)) * scale;
  
  const candleWidth = width * 0.6;
  const candleX = x - candleWidth / 2;
  
  return (
    <g>
      {/* Wick */}
      <line
        x1={x}
        y1={y - (high - Math.max(close, open)) * scale}
        x2={x}
        y2={y + (Math.min(close, open) - low) * scale}
        stroke={isPositive ? '#22c55e' : '#ef4444'}
        strokeWidth={1}
      />
      
      {/* Body */}
      <rect
        x={candleX}
        y={offsetY}
        width={candleWidth}
        height={bodyHeight * scale || 1}
        fill={isPositive ? '#22c55e' : '#ef4444'}
        stroke={isPositive ? '#22c55e' : '#ef4444'}
        strokeWidth={1}
      />
    </g>
  );
};

export function CandlestickChart({ data, className }: CandlestickChartProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.close >= data.open;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{formatDate(label)}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open:</span>
              <span>{formatPrice(data.open)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span className="text-green-600">{formatPrice(data.high)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span className="text-red-600">{formatPrice(data.low)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Close:</span>
              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                {formatPrice(data.close)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Volume:</span>
              <span>{(data.volume / 1e9).toFixed(1)}B</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
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
            domain={['dataMin * 0.98', 'dataMax * 1.02']}
            tickFormatter={formatPrice}
            stroke="hsl(var(--muted-foregreen))"
            fontSize={12}
            tick={{ fontSize: 11 }}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Using Bar chart as a workaround for candlesticks */}
          {data.map((item, index) => {
            const isPositive = item.close >= item.open;
            return (
              <Bar
                key={index}
                dataKey={() => Math.max(item.open, item.close)}
                fill={isPositive ? '#22c55e' : '#ef4444'}
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={1}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}