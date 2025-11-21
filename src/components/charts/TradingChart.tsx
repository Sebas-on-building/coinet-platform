/**
 * Trading Chart Component
 * 
 * A professional trading chart component that integrates with
 * the strategy builder.
 */

import React, { useEffect, useRef } from 'react';

interface TradingChartProps {
  symbol?: string;
  timeframe?: string;
  height?: number;
}

const TradingChart: React.FC<TradingChartProps> = ({
  symbol = 'BTCUSDT',
  timeframe = '1h',
  height = 500
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Initialize chart
  useEffect(() => {
    // In a real implementation, this would initialize a chart library
    // like TradingView or Lightweight Charts

    const container = chartContainerRef.current;
    if (!container) return;

    // Add a placeholder chart drawing
    const drawPlaceholderChart = () => {
      const canvas = document.createElement('canvas');
      canvas.width = container.clientWidth;
      canvas.height = height;
      container.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set background
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      ctx.fillStyle = isDarkMode ? '#1f2937' : '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw chart grid
      ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let i = 0; i < 10; i++) {
        const y = (i + 1) * (height / 10);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Vertical grid lines
      for (let i = 0; i < 10; i++) {
        const x = (i + 1) * (canvas.width / 10);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw a dummy price line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.8);

      // Create a sine wave pattern
      for (let x = 0; x < canvas.width; x += 5) {
        const randomFactor = 0.9 + Math.random() * 0.2;
        const y = height * 0.5 + Math.sin(x * 0.02) * height * 0.2 * randomFactor;
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Draw some candles
      for (let i = 0; i < 50; i++) {
        const x = 40 + i * (canvas.width - 80) / 50;
        const candleWidth = 8;
        const open = height * 0.5 + Math.sin(i * 0.3) * height * 0.2;
        const close = height * 0.5 + Math.sin((i + 1) * 0.3) * height * 0.2;
        const high = Math.min(open, close) - Math.random() * 20;
        const low = Math.max(open, close) + Math.random() * 20;

        // Draw candle body
        ctx.fillStyle = close < open ? '#ef4444' : '#10b981';
        ctx.fillRect(x - candleWidth / 2, Math.min(open, close), candleWidth, Math.abs(close - open));

        // Draw wicks
        ctx.strokeStyle = close < open ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, Math.min(open, close));
        ctx.moveTo(x, Math.max(open, close));
        ctx.lineTo(x, low);
        ctx.stroke();
      }

      // Add chart title and information
      ctx.fillStyle = isDarkMode ? '#f3f4f6' : '#111827';
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${symbol} - ${timeframe}`, 20, 30);

      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.fillText('Placeholder chart - real implementation would use TradingView or LightweightCharts', 20, 50);
    };

    drawPlaceholderChart();

    return () => {
      // Clean up
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, timeframe, height]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
      style={{ height: `${height}px` }}
      aria-label="Trading chart"
    >
      {/* Chart is rendered in this container */}
    </div>
  );
};

export default TradingChart; 