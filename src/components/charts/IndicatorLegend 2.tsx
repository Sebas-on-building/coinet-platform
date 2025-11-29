/**
 * Indicator Legend Component
 * 
 * Displays active technical indicators with visual controls
 * for toggling, configuring, and removing them.
 */

import React, { useState } from 'react';
import { XMarkIcon, PencilIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';
import { IndicatorConfig } from '@/lib/indicators/types';
import { createIndicatorConfig, Indicators } from '@/lib/indicators';

export interface IndicatorLegendProps {
  indicators: IndicatorConfig[];
  onToggleIndicator?: (id: string, active: boolean) => void;
  onRemoveIndicator?: (id: string) => void;
  onConfigureIndicator?: (id: string) => void;
  onAddIndicator?: (indicator: IndicatorConfig) => void;
  className?: string;
}

/**
 * Groups indicators by their category
 */
const groupIndicatorsByCategory = (indicators: IndicatorConfig[]) => {
  const groups: Record<string, IndicatorConfig[]> = {};

  indicators.forEach((ind) => {
    const indicatorDef = Indicators[ind.name];
    if (!indicatorDef) return;

    const category = indicatorDef.category;
    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(ind);
  });

  return groups;
};

/**
 * Indicator Legend Component
 */
const IndicatorLegend: React.FC<IndicatorLegendProps> = ({
  indicators,
  onToggleIndicator,
  onRemoveIndicator,
  onConfigureIndicator,
  onAddIndicator,
  className
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Group indicators by category
  const groupedIndicators = groupIndicatorsByCategory(indicators);

  // Handle indicator toggle
  const handleToggle = (id: string, currentState: boolean) => {
    if (onToggleIndicator) {
      onToggleIndicator(id, !currentState);
    }
  };

  // Handle indicator removal
  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveIndicator) {
      onRemoveIndicator(id);
    }
  };

  // Handle indicator configuration
  const handleConfigure = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConfigureIndicator) {
      onConfigureIndicator(id);
    }
  };

  // Handle adding a new indicator
  const handleAddIndicator = (name: string) => {
    if (onAddIndicator) {
      const config = createIndicatorConfig(name);
      if (config) {
        onAddIndicator(config);
      }
      setShowAddMenu(false);
    }
  };

  // Available indicators for adding
  const availableIndicators = Object.entries(Indicators)
    .map(([key, indicator]) => ({
      name: key,
      displayName: indicator.name,
      category: indicator.category,
      description: indicator.description
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className={twMerge('rounded-lg bg-white dark:bg-gray-800 shadow-sm', className)}>
      {/* Indicator Groups */}
      <div className="p-2 space-y-2">
        {Object.entries(groupedIndicators).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>

            <div className="space-y-1">
              {items.map((indicator) => {
                // Determine primary color from visuals
                const visualKey = Object.keys(indicator.visuals)[0] || 'line';
                const color = indicator.visuals[visualKey]?.color || '#3B82F6'; // Default to blue-500

                return (
                  <div
                    key={indicator.id}
                    onClick={() => handleToggle(indicator.id, indicator.isActive)}
                    className={twMerge(
                      'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer',
                      'border border-gray-100 dark:border-gray-700',
                      indicator.isActive
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-900/50 opacity-70'
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {indicator.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => handleToggle(indicator.id, indicator.isActive)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {indicator.isActive ? (
                          <EyeIcon className="w-4 h-4" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleConfigure(indicator.id, e)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleRemove(indicator.id, e)}
                        className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add Indicator Button */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-700">
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 
              hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          >
            + Add Indicator
          </button>

          {/* Add Indicator Menu */}
          {showAddMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 
              rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-10">
              <div className="p-2 space-y-1">
                {Object.entries(groupIndicatorsByCategory(
                  availableIndicators.map(ind => ({
                    id: ind.name,
                    name: ind.name,
                    isActive: true,
                    options: {},
                    visuals: {},
                    position: 'main'
                  } as IndicatorConfig))
                )).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h4>

                    {items.map((item) => {
                      const indicatorDef = Indicators[item.name];

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleAddIndicator(item.name)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                          {indicatorDef?.name || item.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndicatorLegend; 