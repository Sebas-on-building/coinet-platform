import React from "react";
import { motion } from "framer-motion";
import { getTypographyClasses } from "../../styles/typography";

interface PriceChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradient?: boolean;
  showGrid?: boolean;
  showPoints?: boolean;
  className?: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  width = 300,
  height = 150,
  color = "var(--color-primary-500)",
  gradient = true,
  showGrid = true,
  showPoints = false,
  className = "",
}) => {
  // Normalize data to fit within the chart dimensions
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  }));

  // Generate path for the line
  const path = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${acc} L ${point.x} ${point.y}`;
  }, "");

  // Generate gradient ID
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Grid Lines */}
      {showGrid && (
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="border-b border-neutral-200 dark:border-neutral-700"
              style={{ top: `${(i * 100) / 6}%` }}
            />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="border-r border-neutral-200 dark:border-neutral-700"
              style={{ left: `${(i * 100) / 6}%` }}
            />
          ))}
        </div>
      )}

      {/* Chart */}
      <svg
        width={width}
        height={height}
        className="relative"
        style={{ overflow: "visible" }}
      >
        <defs>
          {gradient && (
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        {/* Area under the line */}
        {gradient && (
          <motion.path
            d={`${path} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {/* Line */}
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {/* Points */}
        {showPoints &&
          points.map((point, index) => (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
            />
          ))}
      </svg>

      {/* Price Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {[min, (min + max) / 2, max].map((price, index) => (
          <span
            key={index}
            className={`${getTypographyClasses("data", "small")} text-neutral-600 dark:text-neutral-300`}
          >
            $
            {price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ))}
      </div>
    </div>
  );
};
