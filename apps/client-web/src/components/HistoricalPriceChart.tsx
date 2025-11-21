import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface HistoricalDataPoint {
  date: string;
  price: number;
  volume: number;
  signal: "entry" | "exit" | null;
  entryPrice: number | null;
  exitPrice: number | null;
}

interface HistoricalPriceChartProps {
  data: HistoricalDataPoint[];
  coin: string;
  className?: string;
}

export function HistoricalPriceChart({ data, coin, className }: HistoricalPriceChartProps) {
  // Format price for display
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{formatDate(label)}</p>
          <p className="text-primary">Price: {formatPrice(data.price)}</p>
          {data.signal && (
            <div className="flex items-center gap-1 mt-1">
              {data.signal === "entry" ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500 text-sm">Entry Signal</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500 text-sm">Exit Signal</span>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Get entry and exit points for reference dots
  const entryPoints = data.filter(d => d.signal === "entry");
  const exitPoints = data.filter(d => d.signal === "exit");

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatPrice}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            domain={['dataMin * 0.95', 'dataMax * 1.05']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Main price line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name={`${coin} Price`}
          />
          
          {/* Entry signals */}
          {entryPoints.map((point, index) => (
            <ReferenceDot
              key={`entry-${index}`}
              x={point.date}
              y={point.price}
              r={4}
              fill="hsl(var(--success))"
              stroke="hsl(var(--success-foreground))"
              strokeWidth={2}
            />
          ))}
          
          {/* Exit signals */}
          {exitPoints.map((point, index) => (
            <ReferenceDot
              key={`exit-${index}`}
              x={point.date}
              y={point.price}
              r={4}
              fill="hsl(var(--destructive))"
              stroke="hsl(var(--destructive-foreground))"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend for signals */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success"></div>
          <span className="text-muted-foreground">Entry Signals ({entryPoints.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive"></div>
          <span className="text-muted-foreground">Exit Signals ({exitPoints.length})</span>
        </div>
      </div>
    </div>
  );
}