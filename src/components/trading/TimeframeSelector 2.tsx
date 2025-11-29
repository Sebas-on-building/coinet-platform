import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion } from '@/lib/motion';

// Types
interface Timeframe {
  id: string;
  label: string;
}

interface TimeframeSelectorProps {
  timeframes: Timeframe[];
  selected: Timeframe;
  onSelect: (timeframe: Timeframe) => void;
  variant?: 'pills' | 'tabs' | 'buttons';
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframes,
  selected,
  onSelect,
  variant = 'pills',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Handle timeframe selection
  const handleSelect = (timeframe: Timeframe) => {
    onSelect(timeframe);
  };

  // Determine the style based on variant
  const getContainerStyle = () => {
    switch (variant) {
      case 'pills':
        return 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1 inline-flex';
      case 'tabs':
        return 'inline-flex border-b border-gray-200 dark:border-gray-700 w-auto';
      case 'buttons':
      default:
        return 'inline-flex gap-0.5';
    }
  };

  // Determine the style for each button
  const getButtonStyle = (isSelected: boolean, timeframeId: string) => {
    const isHovered = hoveredId === timeframeId;

    switch (variant) {
      case 'pills':
        return twMerge(
          'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
          isSelected
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
        );
      case 'tabs':
        return twMerge(
          'px-3 py-2 text-xs font-medium border-b-2 transition-all duration-200',
          isSelected
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600',
        );
      case 'buttons':
      default:
        return twMerge(
          'px-3 py-1.5 text-xs font-medium border transition-all duration-200 first:rounded-l-md last:rounded-r-md -ml-px first:ml-0',
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 z-10'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
        );
    }
  };

  return (
    <div className={getContainerStyle()}>
      {timeframes.map((timeframe) => {
        const isSelected = selected.id === timeframe.id;

        return (
          <button
            key={timeframe.id}
            onClick={() => handleSelect(timeframe)}
            className={getButtonStyle(isSelected, timeframe.id)}
            onMouseEnter={() => setHoveredId(timeframe.id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-pressed={isSelected}
          >
            {variant === 'pills' && isSelected && (
              <motion.span
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md z-0"
                layoutId="timeframeHighlight"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
              />
            )}
            <span className="relative z-10">{timeframe.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TimeframeSelector; 