/**
 * Advanced Chart Container
 * 
 * A comprehensive chart solution that combines PriceChart with indicator
 * management, chart type selection, timeframe selection, and persistent
 * user configurations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import {
  ArrowPathIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import PriceChart, { ChartType, TimeframeOption } from './PriceChart';
import IndicatorLegend from './IndicatorLegend';
import IndicatorSettings from './IndicatorSettings';
import { Candle, IndicatorConfig, ChartConfig } from '@/lib/indicators/types';
import { createIndicatorConfig } from '@/lib/indicators';
import { fetchJson } from '@/utils/fetch';
import { twMerge } from 'tailwind-merge';

const chartTypes: { id: ChartType; label: string }[] = [
  { id: 'candlestick', label: 'Candlestick' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
  { id: 'bar', label: 'Bar' },
  { id: 'heikinashi', label: 'Heikin-Ashi' },
];

const timeframeOptions: TimeframeOption[] = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '30m', label: '30m' },
  { id: '1h', label: '1h' },
  { id: '4h', label: '4h' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

export interface AdvancedChartContainerProps {
  symbol: string;
  initialData: Candle[];
  defaultTimeframe?: string;
  defaultChartType?: ChartType;
  height?: number;
  allowFullscreen?: boolean;
  onTimeframeChange?: (timeframe: string) => void;
  onSymbolChange?: (symbol: string) => void;
  className?: string;
  onRealtimeUpdate?: (tick: any) => void;
}

const AdvancedChartContainer: React.FC<AdvancedChartContainerProps> = ({
  symbol,
  initialData,
  defaultTimeframe = '1h',
  defaultChartType = 'candlestick',
  height = 500,
  allowFullscreen = true,
  onTimeframeChange,
  onSymbolChange,
  className,
  onRealtimeUpdate
}) => {
  const { user } = useUser();
  const { resolvedTheme } = useTheme();

  // State for chart configuration
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Candle[]>(initialData);
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [showVolume, setShowVolume] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // State for indicator settings modal
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorConfig | null>(null);
  const [isIndicatorSettingsOpen, setIsIndicatorSettingsOpen] = useState(false);

  // State for chart type and timeframe dropdowns
  const [isChartTypeDropdownOpen, setIsChartTypeDropdownOpen] = useState(false);
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);

  // Load saved chart configuration when user changes
  useEffect(() => {
    if (!user) return;

    const loadSavedConfig = async () => {
      try {
        setIsLoading(true);

        // Fetch user's default chart configuration
        const response = await fetchJson<ChartConfig>('/api/chartState?defaultOnly=true');

        if (response) {
          setConfigId(response.id ?? null);
          setChartType(response.chartType as ChartType);
          setTimeframe(response.timeframe);
          setIndicators(response.indicators || []);
          setShowVolume(response.showVolume ?? true);
          setShowGrid(response.showGrid ?? true);

          // Notify parent components of changes if needed
          if (onTimeframeChange && response.timeframe !== timeframe) {
            onTimeframeChange(response.timeframe);
          }
        }
      } catch (error) {
        console.error('Error loading chart configuration:', error);
        // Use defaults if configuration can't be loaded
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedConfig();
  }, [user, timeframe, onTimeframeChange]);

  // Save chart configuration when it changes
  const saveChartConfig = useCallback(async () => {
    if (!user) return;

    const config: Partial<ChartConfig> = {
      symbol,
      timeframe,
      chartType,
      indicators,
      showVolume,
      showGrid,
      theme: resolvedTheme as 'light' | 'dark' | 'system',
      isDefault: true
    };

    try {
      if (configId) {
        // Update existing config
        await fetchJson<ChartConfig>(`/api/chartState?id=${configId}`, {
          method: 'PUT',
          body: JSON.stringify(config)
        });
      } else {
        // Create new config
        const response = await fetchJson<ChartConfig>('/api/chartState', {
          method: 'POST',
          body: JSON.stringify(config)
        });

        setConfigId(response.id ?? null);
      }
    } catch (error) {
      console.error('Error saving chart configuration:', error);
    }
  }, [
    user,
    symbol,
    timeframe,
    chartType,
    indicators,
    showVolume,
    showGrid,
    resolvedTheme,
    configId
  ]);

  // Debounced save of chart configuration
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      saveChartConfig();
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeframe, chartType, indicators, showVolume, showGrid, saveChartConfig, user]);

  // Handle indicator actions
  const handleToggleIndicator = (id: string, active: boolean) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === id ? { ...ind, isActive: active } : ind))
    );
  };

  const handleRemoveIndicator = (id: string) => {
    setIndicators(prev => prev.filter(ind => ind.id !== id));
  };

  const handleConfigureIndicator = (id: string) => {
    const indicator = indicators.find(ind => ind.id === id);
    if (indicator) {
      setSelectedIndicator(indicator);
      setIsIndicatorSettingsOpen(true);
    }
  };

  const handleAddIndicator = (indicator: IndicatorConfig) => {
    setIndicators(prev => [...prev, indicator]);
  };

  const handleSaveIndicatorSettings = (updatedConfig: IndicatorConfig) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === updatedConfig.id ? updatedConfig : ind))
    );
  };

  // Handle chart type change
  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    setIsChartTypeDropdownOpen(false);
  };

  // Handle timeframe change
  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    setIsTimeframeDropdownOpen(false);

    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Add default indicators (examples)
  const addDefaultIndicators = () => {
    const hasMovingAverages = indicators.some(
      ind => ind.name === 'SMA' || ind.name === 'EMA'
    );

    const newIndicators: IndicatorConfig[] = [];

    if (!hasMovingAverages) {
      // Add a 20-period SMA
      const sma = createIndicatorConfig('SMA');
      if (sma) {
        sma.options.period = 20;
        newIndicators.push(sma);
      }

      // Add a 50-period EMA
      const ema = createIndicatorConfig('EMA');
      if (ema) {
        ema.options.period = 50;
        newIndicators.push(ema);
      }
    }

    // Add a MACD if not present
    if (!indicators.some(ind => ind.name === 'MACD')) {
      const macd = createIndicatorConfig('MACD');
      if (macd) {
        newIndicators.push(macd);
      }
    }

    if (newIndicators.length > 0) {
      setIndicators(prev => [...prev, ...newIndicators]);
    }
  };

  return (
    <div className={twMerge(
      'flex flex-col rounded-xl bg-white dark:bg-gray-900 shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800',
      isFullscreen ? 'fixed inset-0 z-50' : '',
      className
    )}>
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {symbol}
          </h3>

          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
              className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {timeframeOptions.find(t => t.id === timeframe)?.label || timeframe}
              <ChevronDownIcon className="ml-1 w-4 h-4" />
            </button>

            {isTimeframeDropdownOpen && (
              <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                <ul className="py-1">
                  {timeframeOptions.map(option => (
                    <li key={option.id}>
                      <button
                        onClick={() => handleTimeframeChange(option.id)}
                        className={twMerge(
                          'block w-full text-left px-4 py-2 text-sm',
                          option.id === timeframe
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Chart Type Selector */}
          <div className="relative">
            <button
              onClick={() => setIsChartTypeDropdownOpen(!isChartTypeDropdownOpen)}
              className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {chartTypes.find(t => t.id === chartType)?.label || 'Chart Type'}
              <ChevronDownIcon className="ml-1 w-4 h-4" />
            </button>

            {isChartTypeDropdownOpen && (
              <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                <ul className="py-1">
                  {chartTypes.map(type => (
                    <li key={type.id}>
                      <button
                        onClick={() => handleChartTypeChange(type.id)}
                        className={twMerge(
                          'block w-full text-left px-4 py-2 text-sm',
                          type.id === chartType
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}
                      >
                        {type.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle Volume Button */}
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={twMerge(
              'px-2 py-1 text-xs font-medium rounded-md',
              showVolume
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            )}
          >
            Volume
          </button>

          {/* Toggle Grid Button */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={twMerge(
              'px-2 py-1 text-xs font-medium rounded-md',
              showGrid
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            )}
          >
            Grid
          </button>

          {/* Add Default Indicators Button */}
          <button
            onClick={addDefaultIndicators}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
            title="Add default indicators"
          >
            <PlusIcon className="w-5 h-5" />
          </button>

          {/* Toggle Fullscreen Button */}
          {allowFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 overflow-hidden">
          <PriceChart
            symbol={symbol}
            data={data}
            indicators={indicators}
            chartType={chartType}
            timeframe={timeframe}
            height={isFullscreen ? window.innerHeight - 150 : height}
            isFullscreen={isFullscreen}
            showVolume={showVolume}
            showGrid={showGrid}
            theme={resolvedTheme as 'light' | 'dark' | 'system'}
            isLoading={isLoading}
            onRealtimeUpdate={onRealtimeUpdate ? (callback) => onRealtimeUpdate : undefined}
          />
        </div>

        {/* Indicator Panel */}
        <div className="w-64 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
          <IndicatorLegend
            indicators={indicators}
            onToggleIndicator={handleToggleIndicator}
            onRemoveIndicator={handleRemoveIndicator}
            onConfigureIndicator={handleConfigureIndicator}
            onAddIndicator={handleAddIndicator}
            className="h-full border-0"
          />
        </div>
      </div>

      {/* Indicator Settings Modal */}
      {selectedIndicator && (
        <IndicatorSettings
          indicator={selectedIndicator}
          isOpen={isIndicatorSettingsOpen}
          onClose={() => setIsIndicatorSettingsOpen(false)}
          onSave={handleSaveIndicatorSettings}
        />
      )}
    </div>
  );
};

export default AdvancedChartContainer; 