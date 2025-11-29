import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

// Mock data for Bitcoin price
const generateBitcoinData = (timeframe: string) => {
  const basePrice = 111617;
  const dataPoints = timeframe === '1D' ? 24 : timeframe === '5D' ? 120 : 720;
  const data = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const variation = (Math.random() - 0.5) * 4000;
    const price = basePrice + variation + (Math.sin(i / 10) * 2000);
    
    let time;
    if (timeframe === '1D') {
      time = `${String(i).padStart(2, '0')}:00`;
    } else if (timeframe === '5D') {
      const day = Math.floor(i / 24);
      const hour = i % 24;
      time = `${day + 1}d ${hour}h`;
    } else {
      time = `${Math.floor(i / 30) + 1}M`;
    }
    
    data.push({
      time,
      price: Math.round(price * 100) / 100,
      timestamp: Date.now() - (dataPoints - i) * 60000
    });
  }
  
  return data;
};

const timeframes = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '1M', value: '1M' },
  { label: '6M', value: '6M' },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'MAX', value: 'MAX' }
];

export function SimpleBitcoinChart() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [isLoading, setIsLoading] = useState(true);
  const data = generateBitcoinData(selectedTimeframe);
  
  // Simulate loading state for charts
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [selectedTimeframe]);
  
  const currentPrice = 111617.00;
  const priceChange = -2356.00;
  const percentChange = -2.06;
  const dayRange = { low: 110710, high: 114827 };
  
  const isPositive = priceChange >= 0;
  
  // Get min and max for Y-axis
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;
  
  if (isLoading) {
    return <ChartSkeleton />;
  }
  
  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/20 rounded-3xl p-4 md:p-8 shadow-xl">
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xs md:text-sm">₿</span>
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground">Bitcoin (BTC)</h2>
        </div>
        
        {/* Price Display */}
        <div className="space-y-1 md:space-y-2">
          <div className="text-3xl md:text-5xl font-bold text-foreground">
            ${currentPrice.toLocaleString()}
          </div>
          <div className={`flex items-center gap-1.5 md:gap-2 text-base md:text-lg font-medium ${
            isPositive ? 'text-success' : 'text-destructive'
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4 md:w-5 md:h-5" /> : <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />}
            <span>{isPositive ? '+' : ''}${Math.abs(priceChange).toLocaleString()}</span>
            <span>({isPositive ? '+' : ''}{percentChange}%)</span>
            <span className="text-muted-foreground font-normal text-sm md:text-base">Today</span>
          </div>
        </div>
      </div>
      
      {/* Timeframe Selector - Wrapping on mobile */}
      <div className="mb-4 md:mb-8 p-1.5 md:p-2 bg-muted/30 rounded-xl overflow-x-hidden">
        <div className="flex flex-wrap gap-1 md:gap-1.5" style={{ WebkitOverflowScrolling: 'touch' }}>
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setSelectedTimeframe(tf.value)}
              className={`min-w-[44px] md:min-w-[60px] px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedTimeframe === tf.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-64 md:h-80 mb-4 md:mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="0%" 
                  stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                  stopOpacity={0.3}
                />
                <stop 
                  offset="100%" 
                  stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minPrice - padding, maxPrice + padding]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
              width={60}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary */}
      <div className="text-xs md:text-sm text-muted-foreground bg-muted/20 rounded-xl p-3 md:p-4">
        <p>
          Price now: ~${currentPrice.toLocaleString()} (${Math.abs(priceChange).toLocaleString()} today). 
          Day range: ${dayRange.low.toLocaleString()}–${dayRange.high.toLocaleString()}.
        </p>
      </div>
    </div>
  );
}