'use client';

import React, { useEffect, useState } from 'react';
import { motion } from '@/lib/motion';

interface SupportResistancePoint {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
}

interface SupportResistanceLinesProps {
  data: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  containerHeight: number;
  containerWidth: number;
  maxPrice: number;
  minPrice: number;
  onLinesComputed?: (lines: SupportResistancePoint[]) => void;
}

const SupportResistanceLines: React.FC<SupportResistanceLinesProps> = ({
  data,
  containerHeight,
  containerWidth,
  maxPrice,
  minPrice,
  onLinesComputed,
}) => {
  const [lines, setLines] = useState<SupportResistancePoint[]>([]);

  // Calculate support/resistance levels
  useEffect(() => {
    if (!data.length) return;

    // This is a simplified algorithm to detect support/resistance levels
    // In a real app, you would use more sophisticated algorithms
    const findSupportResistanceLevels = () => {
      const prices = data.map(candle => candle.close);
      const priceMap = new Map<number, number>();

      // Round prices to reduce noise
      const pricePrecision = 2;
      const roundFactor = 10 ** pricePrecision;

      // Count frequency of price points
      prices.forEach(price => {
        const roundedPrice = Math.round(price * roundFactor) / roundFactor;
        priceMap.set(roundedPrice, (priceMap.get(roundedPrice) || 0) + 1);
      });

      // Find local maxima in price frequency
      const levels: SupportResistancePoint[] = [];
      const points = Array.from(priceMap.entries())
        .sort((a, b) => a[0] - b[0]);

      const threshold = Math.max(...Array.from(priceMap.values())) * 0.2;

      // Find levels based on frequency and surrounding points
      points.forEach(([price, count], index) => {
        // Skip if frequency is too low
        if (count < threshold) return;

        // Determine if this is a support or resistance level
        // based on comparison with previous prices
        const recentPrices = prices.slice(-10);
        const currentPrice = prices[prices.length - 1];

        const type = price <= currentPrice ? 'support' : 'resistance';

        // Calculate strength based on frequency
        const strength = Math.min(1, count / (prices.length * 0.2));

        levels.push({
          price,
          type,
          strength,
        });
      });

      // Limit the number of levels to avoid clutter
      const maxLevels = 5;
      const sortedLevels = levels
        .sort((a, b) => b.strength - a.strength)
        .slice(0, maxLevels);

      return sortedLevels;
    };

    const supportResistanceLevels = findSupportResistanceLevels();
    setLines(supportResistanceLevels);

    if (onLinesComputed) {
      onLinesComputed(supportResistanceLevels);
    }
  }, [data, onLinesComputed]);

  // Scale price to y-coordinate
  const priceToY = (price: number): number => {
    const range = maxPrice - minPrice;
    const normalizedPosition = (maxPrice - price) / range;
    return containerHeight * normalizedPosition;
  };

  if (!lines.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {lines.map((line, index) => {
        const y = priceToY(line.price);
        return (
          <motion.div
            key={`${line.type}-${index}`}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 0.8, width: containerWidth }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{
              position: 'absolute',
              top: y,
              left: 0,
              height: 1,
              backgroundColor: line.type === 'support' ? '#4CAF50' : '#FF5252',
              opacity: line.strength * 0.7 + 0.3,
              zIndex: 5,
            }}
          >
            <div
              className={`absolute right-0 px-2 py-1 text-xs font-medium rounded-md z-10 ${line.type === 'support'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              style={{ transform: 'translateY(-50%)' }}
            >
              {line.price.toFixed(2)} ({line.type === 'support' ? 'S' : 'R'})
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default SupportResistanceLines; 