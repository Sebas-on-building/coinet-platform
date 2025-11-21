import { TradingViewLightweightChart } from './TradingViewLightweightChart';
import type { TradingViewChartConfig } from '@/types/tradingview';

interface TradingViewChatChartProps extends TradingViewChartConfig {
  isMobile?: boolean;
}

export function TradingViewChatChart({
  symbol,
  interval,
  height,
  isMobile = false,
}: TradingViewChatChartProps) {
  const chartHeight = height || (isMobile ? 300 : 400);

  return (
    <div className="my-4 w-full">
      <TradingViewLightweightChart
        symbol={symbol}
        interval={interval}
        height={chartHeight}
      />
    </div>
  );
}
