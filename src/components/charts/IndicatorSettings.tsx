/**
 * Indicator Settings Component
 * 
 * A modal dialog for configuring technical indicator parameters
 * and visual appearance.
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { IndicatorConfig } from '@/lib/indicators/types';
import { Indicators } from '@/lib/indicators';
import { twMerge } from 'tailwind-merge';

export interface IndicatorSettingsProps {
  indicator: IndicatorConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedConfig: IndicatorConfig) => void;
}

interface ColorOption {
  name: string;
  value: string;
}

// Tailwind-style color palette for indicator visuals
const colorOptions: ColorOption[] = [
  { name: 'Red', value: '#EF4444' }, // red-500
  { name: 'Orange', value: '#F59E0B' }, // amber-500
  { name: 'Yellow', value: '#EAB308' }, // yellow-500
  { name: 'Green', value: '#10B981' }, // emerald-500
  { name: 'Teal', value: '#14B8A6' }, // teal-500
  { name: 'Blue', value: '#3B82F6' }, // blue-500
  { name: 'Indigo', value: '#6366F1' }, // indigo-500
  { name: 'Purple', value: '#8B5CF6' }, // violet-500
  { name: 'Pink', value: '#EC4899' }, // pink-500
  { name: 'Gray', value: '#6B7280' }, // gray-500
];

const lineStyleOptions = [
  { name: 'Solid', value: 'solid' },
  { name: 'Dashed', value: 'dashed' },
  { name: 'Dotted', value: 'dotted' },
];

const positionOptions = [
  { name: 'Main Chart', value: 'main' },
  { name: 'Below Chart', value: 'below' },
  { name: 'Separate Panel', value: 'separate' },
];

const IndicatorSettings: React.FC<IndicatorSettingsProps> = ({
  indicator,
  isOpen,
  onClose,
  onSave,
}) => {
  // Create a working copy of the indicator config
  const [config, setConfig] = useState<IndicatorConfig>({ ...indicator });

  // Reset the working config when the indicator changes
  useEffect(() => {
    setConfig({ ...indicator });
  }, [indicator]);

  // Get the indicator definition for metadata
  const indicatorDef = Indicators[indicator.name];

  if (!indicatorDef || !isOpen) return null;

  // Handle option changes
  const handleOptionChange = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: value
      }
    }));
  };

  // Handle visual property changes
  const handleVisualChange = (seriesKey: string, property: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      visuals: {
        ...prev.visuals,
        [seriesKey]: {
          ...prev.visuals[seriesKey],
          [property]: value
        }
      }
    }));
  };

  // Handle positioning change
  const handlePositionChange = (position: 'main' | 'below' | 'separate') => {
    setConfig(prev => ({
      ...prev,
      position
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
    onClose();
  };

  // Determine which options to render based on the indicator type
  const renderOptions = () => {
    // Get the default options from the indicator definition
    const options = { ...indicatorDef.defaultOptions, ...config.options };

    return Object.entries(options).map(([key, value]) => {
      if (typeof value === 'number') {
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min={1}
                max={key.includes('Period') ? 200 : 10}
                step={1}
                value={config.options[key] || value}
                onChange={(e) => handleOptionChange(key, parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min={1}
                value={config.options[key] || value}
                onChange={(e) => handleOptionChange(key, parseInt(e.target.value, 10))}
                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );
      }

      if (typeof value === 'boolean') {
        return (
          <div key={key} className="mb-4 flex items-center">
            <input
              type="checkbox"
              id={`option-${key}`}
              checked={!!config.options[key]}
              onChange={(e) => handleOptionChange(key, e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
            />
            <label htmlFor={`option-${key}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          </div>
        );
      }

      return null;
    });
  };

  // Render visual settings for each series
  const renderVisualSettings = () => {
    // Determine which series this indicator produces
    let seriesKeys: string[] = [];

    if (typeof indicatorDef.calculate([], config.options) === 'object' && !Array.isArray(indicatorDef.calculate([], config.options))) {
      // Multiple series (like MACD or Bollinger Bands)
      seriesKeys = Object.keys(indicatorDef.calculate([], config.options) as object);
    } else {
      // Single series (like SMA or EMA)
      seriesKeys = ['line'];
    }

    return seriesKeys.map(seriesKey => {
      // Initialize visuals if not present
      if (!config.visuals[seriesKey]) {
        config.visuals[seriesKey] = {
          color: colorOptions[0].value,
          lineWidth: 1.5,
          lineStyle: 'solid'
        };
      }

      const seriesVisuals = config.visuals[seriesKey];

      return (
        <div key={seriesKey} className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {seriesKey.charAt(0).toUpperCase() + seriesKey.slice(1)} Series
          </h4>

          {/* Color Picker */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleVisualChange(seriesKey, 'color', color.value)}
                  className={twMerge(
                    'w-6 h-6 rounded-full border-2',
                    seriesVisuals.color === color.value
                      ? 'border-gray-900 dark:border-white'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  aria-label={`Set color to ${color.name}`}
                />
              ))}
            </div>
          </div>

          {/* Line Width */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Line Width
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.5}
                value={seriesVisuals.lineWidth || 1.5}
                onChange={(e) => handleVisualChange(seriesKey, 'lineWidth', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-center">
                {seriesVisuals.lineWidth || 1.5}
              </span>
            </div>
          </div>

          {/* Line Style */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Line Style
            </label>
            <div className="flex flex-wrap gap-2">
              {lineStyleOptions.map(style => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => handleVisualChange(seriesKey, 'lineStyle', style.value)}
                  className={twMerge(
                    'px-2 py-1 text-xs rounded-md',
                    seriesVisuals.lineStyle === style.value
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className={twMerge(
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
      !isOpen && 'hidden'
    )}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Configure {indicatorDef.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 max-h-[70vh]">
          {/* Description */}
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {indicatorDef.description}
          </div>

          {/* Position Settings */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chart Position
            </label>
            <div className="flex flex-wrap gap-2">
              {positionOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePositionChange(option.value as any)}
                  className={twMerge(
                    'px-3 py-1.5 text-sm rounded-md border',
                    config.position === option.value
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-200'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>

          {/* Indicator Options */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parameters
            </h4>
            {renderOptions()}
          </div>

          {/* Visual Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visual Style
            </h4>
            {renderVisualSettings()}
          </div>

          {/* Resources */}
          {indicatorDef.references && indicatorDef.references.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Learn More
              </h4>
              <div className="text-sm">
                {indicatorDef.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline block mb-1"
                  >
                    {ref.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 mr-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndicatorSettings; 