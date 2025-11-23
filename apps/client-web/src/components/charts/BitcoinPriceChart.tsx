import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { PriceDataPoint } from './mockData';
import { useTimeframeData, TimeframeValue } from '@/hooks/useTimeframeData';

interface BitcoinPriceChartProps {
  data: PriceDataPoint[];
  className?: string;
  variant?: 'line' | 'area';
  height?: number;
  showGrid?: boolean;
  minimal?: boolean;
  timeframe?: TimeframeValue;
}

export function BitcoinPriceChart({ 
  data, 
  className, 
  variant = 'area',
  height = 320,
  showGrid = true,
  minimal = false,
  timeframe = '1T'
}: BitcoinPriceChartProps) {
  const { filteredData, timeAxisFormatter, tickInterval } = useTimeframeData(data, timeframe);
  
  // Use filtered data based on timeframe
  const chartData = filteredData;
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = timeAxisFormatter;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-background/98 backdrop-blur-md border border-border/40 rounded-xl p-4 shadow-2xl">
          <p className="font-semibold text-foreground mb-2 text-sm">{formatDate(label)}</p>
          <div className="text-lg font-bold text-foreground">
            {formatPrice(data.price)}
          </div>
        </div>
      );
    }
    return null;
  };

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const priceRange = maxPrice - minPrice;
  const yAxisMin = minPrice - (priceRange * 0.05);
  const yAxisMax = maxPrice + (priceRange * 0.05);

  const chartProps = {
    data: chartData,
    margin: minimal 
      ? { top: 10, right: 20, left: 10, bottom: 25 }
      : { top: 15, right: 30, left: 15, bottom: 40 }
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        {variant === 'area' ? (
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="1 1" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
            )}
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval as any}
              height={30}
              minTickGap={20}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              tickFormatter={formatPrice}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              orientation="right"
              width={minimal ? 70 : 85}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              connectNulls={true}
              activeDot={{ 
                r: 4, 
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2
              }}
            />
          </AreaChart>
        ) : (
          <LineChart {...chartProps}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="1 1" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
            )}
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval as any}
              height={30}
              minTickGap={20}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              tickFormatter={formatPrice}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              orientation="right"
              width={minimal ? 70 : 85}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls={true}
              activeDot={{ 
                r: 4, 
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2
              }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}