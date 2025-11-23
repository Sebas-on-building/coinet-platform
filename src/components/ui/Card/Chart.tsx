import React from 'react';
import { motion } from 'framer-motion';

export interface ChartProps {
  type: 'line' | 'bar' | 'pie';
  data: number[];
  labels?: string[];
  colors?: string[];
  width?: number;
  height?: number;
  ariaLabel?: string;
  className?: string;
}

export const Chart: React.FC<ChartProps> & {
  Line: typeof ChartLine;
  Bar: typeof ChartBar;
  Pie: typeof ChartPie;
} = ({ type, data, labels, colors, width = 180, height = 80, ariaLabel, className }) => {
  if (type === 'line') return <ChartLine data={data} labels={labels} colors={colors} width={width} height={height} ariaLabel={ariaLabel} className={className} />;
  if (type === 'bar') return <ChartBar data={data} labels={labels} colors={colors} width={width} height={height} ariaLabel={ariaLabel} className={className} />;
  if (type === 'pie') return <ChartPie data={data} labels={labels} colors={colors} width={width} height={height} ariaLabel={ariaLabel} className={className} />;
  return null;
};

export const ChartLine: React.FC<Omit<ChartProps, 'type'>> = ({ data, colors = ['var(--color-accent-blue)'], width = 180, height = 80, ariaLabel, className }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / (max - min || 1)) * height}`).join(' ');
  return (
    <svg width={width} height={height} aria-label={ariaLabel} className={className} style={{ background: 'var(--color-surface)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
      <motion.polyline
        points={points}
        fill="none"
        stroke={colors[0]}
        strokeWidth={3}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
    </svg>
  );
};

export const ChartBar: React.FC<Omit<ChartProps, 'type'>> = ({ data, colors = ['var(--color-accent-blue)'], width = 180, height = 80, ariaLabel, className }) => {
  const barWidth = width / data.length;
  const max = Math.max(...data);
  return (
    <svg width={width} height={height} aria-label={ariaLabel} className={className} style={{ background: 'var(--color-surface)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
      {data.map((d, i) => (
        <motion.rect
          key={i}
          x={i * barWidth + 4}
          y={height - (d / (max || 1)) * height}
          width={barWidth - 8}
          height={(d / (max || 1)) * height}
          fill={colors[i % colors.length]}
          initial={{ height: 0, y: height }}
          animate={{ height: (d / (max || 1)) * height, y: height - (d / (max || 1)) * height }}
          transition={{ duration: 0.6, delay: i * 0.05 }}
        />
      ))}
    </svg>
  );
};

export const ChartPie: React.FC<Omit<ChartProps, 'type'>> = ({ data, colors = ['var(--color-accent-blue)'], width = 80, height = 80, ariaLabel, className }) => {
  const total = data.reduce((a, b) => a + b, 0);
  let acc = 0;
  const radius = Math.min(width, height) / 2 - 6;
  const cx = width / 2;
  const cy = height / 2;
  return (
    <svg width={width} height={height} aria-label={ariaLabel} className={className} style={{ background: 'var(--color-surface)', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
      {data.map((d, i) => {
        const start = acc;
        const end = acc + d;
        const large = d / total > 0.5 ? 1 : 0;
        const a = (start / total) * 2 * Math.PI;
        const b = (end / total) * 2 * Math.PI;
        const x1 = cx + radius * Math.sin(a);
        const y1 = cy - radius * Math.cos(a);
        const x2 = cx + radius * Math.sin(b);
        const y2 = cy - radius * Math.cos(b);
        acc += d;
        return (
          <motion.path
            key={i}
            d={`M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`}
            fill={colors[i % colors.length]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          />
        );
      })}
    </svg>
  );
};

Chart.Line = ChartLine;
Chart.Bar = ChartBar;
Chart.Pie = ChartPie; 