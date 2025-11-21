/**
 * Multi-Source Overlay Chart Component
 * 
 * This component allows overlaying multiple data series from different sources
 * on a unified timeline chart. It supports sources like:
 * - Coinet's own price data
 * - On-chain metrics from Glassnode
 * - Economic data from FRED
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, ReferenceLine, ReferenceArea, Label
} from 'recharts';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { useTheme } from 'next-themes';
import {
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  ShareIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Types for series configuration
export interface SeriesConfig {
  source: 'price' | 'glassnode' | 'fred' | 'tradingview';
  // Common fields
  name?: string;
  color?: string;
  visible?: boolean;
  // Price source fields
  symbol?: string;
  timeframe?: string;
  // Glassnode fields
  metric?: string;
  asset?: string;
  frequency?: string;
  // FRED fields
  seriesId?: string;
  // TradingView fields
  interval?: string;
}

export interface OverlayChartProps {
  series: SeriesConfig[];
  from?: string;
  to?: string;
  title?: string;
  height?: number;
  showControls?: boolean;
  onSaveTemplate?: (templateData: any) => void;
  templateId?: string;
  className?: string;
}

// Color scheme for series
const SERIES_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
];

// Annotation interface
interface Annotation {
  id: string;
  type: 'line' | 'area' | 'point';
  x1: number;
  x2?: number;
  y1?: number;
  y2?: number;
  color: string;
  label?: string;
}

/**
 * The OverlayChart component
 */
const OverlayChart: React.FC<OverlayChartProps> = ({
  series,
  from,
  to,
  title = 'Multi-Source Data Overlay',
  height = 500,
  showControls = true,
  onSaveTemplate,
  templateId,
  className
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // State for chart data
  const [mergedData, setMergedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for user interaction
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null);

  // Load data from API
  useEffect(() => {
    if (series.length === 0) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post('/api/overlay', {
          series: series.map(s => ({
            ...s,
            // Ensure fields are only included for the correct source
            ...(s.source === 'price' ? { symbol: s.symbol, timeframe: s.timeframe } : {}),
            ...(s.source === 'glassnode' ? { metric: s.metric, asset: s.asset, frequency: s.frequency } : {}),
            ...(s.source === 'fred' ? { seriesId: s.seriesId } : {}),
            ...(s.source === 'tradingview' ? { symbol: s.symbol, interval: s.interval } : {})
          })),
          from,
          to,
          sampleCount: 1000 // Request up to 1000 data points
        });

        setMergedData(response.data.series);

        // Initialize visibility state for all series
        const initialVisibility: Record<string, boolean> = {};
        if (response.data.series.length > 0) {
          Object.keys(response.data.series[0])
            .filter(key => key !== 'time')
            .forEach(key => {
              initialVisibility[key] = true;
            });
        }
        setVisibleSeries(initialVisibility);
      } catch (err: any) {
        console.error('Failed to fetch overlay data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [series, from, to]);

  // Memoize series keys that should be displayed
  const seriesKeys = useMemo(() => {
    if (mergedData.length === 0) return [];
    return Object.keys(mergedData[0])
      .filter(key => key !== 'time');
  }, [mergedData]);

  // Map series to y-axis assignment (left/right)
  const axisMap = useMemo(() => {
    const map: Record<string, number> = {};
    seriesKeys.forEach((key, idx) => {
      map[key] = idx % 2; // alternating between 0 (left) and 1 (right)
    });
    return map;
  }, [seriesKeys]);

  // Format date for tooltip and x-axis
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  // Handle annotation creation
  const handleAddAnnotation = () => {
    setIsAdding(true);
    setCurrentAnnotation({
      type: 'line',
      color: '#FFFFFF'
    });
  };

  // Handle data export
  const handleExportData = () => {
    // Convert data to CSV
    const headers = ['time', ...seriesKeys];
    const csv = [
      headers.join(','),
      ...mergedData.map(row => {
        return headers.map(key => {
          if (key === 'time') {
            return formatDate(row[key]);
          }
          return row[key] === null ? '' : row[key];
        }).join(',');
      })
    ].join('\n');

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `overlay-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save as template
  const handleSaveTemplate = () => {
    if (onSaveTemplate) {
      onSaveTemplate({
        id: templateId,
        series,
        from,
        to,
        annotations
      });
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{formatDate(label)}</p>
        {payload
          .filter((entry: any) => visibleSeries[entry.dataKey])
          .map((entry: any, index: number) => (
            <div
              key={`tooltip-${index}`}
              className="flex items-center gap-2 mb-1"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {entry.name || entry.dataKey}:
                <span className="ml-1 font-semibold">
                  {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, {
                    maximumFractionDigits: 4
                  }) : entry.value}
                </span>
              </span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className={twMerge(
      "rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden",
      className
    )}>
      {/* Chart header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>

        {showControls && (
          <div className="flex gap-2">
            <button
              onClick={handleAddAnnotation}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
              title="Add annotation"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleExportData}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
              title="Export data as CSV"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleSaveTemplate}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
              title="Save as template"
              disabled={!onSaveTemplate}
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
              title="Chart settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Chart body */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">
            <div className="text-lg font-medium mb-2">Error loading data</div>
            <div className="text-sm">{error}</div>
          </div>
        ) : mergedData.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-lg font-medium mb-2">No data available</div>
            <div className="text-sm">Select data sources to display</div>
          </div>
        ) : (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mergedData}
                margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />

                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatDate}
                  stroke={isDark ? '#9ca3af' : '#6b7280'}
                />

                {/* Left Y-Axis */}
                <YAxis
                  yAxisId={0}
                  orientation="left"
                  stroke={isDark ? '#9ca3af' : '#6b7280'}
                />

                {/* Right Y-Axis (if needed) */}
                {seriesKeys.some(key => axisMap[key] === 1) && (
                  <YAxis
                    yAxisId={1}
                    orientation="right"
                    stroke={isDark ? '#9ca3af' : '#6b7280'}
                  />
                )}

                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  onClick={(entry) => {
                    if (entry && typeof entry.dataKey === 'string') {
                      setVisibleSeries(prev => ({
                        ...prev,
                        [entry.dataKey]: !prev[entry.dataKey]
                      }));
                    }
                  }}
                />

                {/* Render a line for each series */}
                {seriesKeys.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    dot={false}
                    yAxisId={axisMap[key]}
                    name={series[idx]?.name || key}
                    hide={visibleSeries[key] === false}
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                ))}

                {/* Time range brush */}
                <Brush
                  dataKey="time"
                  height={30}
                  stroke={isDark ? '#6b7280' : '#9ca3af'}
                  tickFormatter={formatDate}
                  fill={isDark ? '#1f2937' : '#f9fafb'}
                  fillOpacity={0.3}
                />

                {/* Render annotations */}
                {annotations.map(annotation => {
                  if (annotation.type === 'line') {
                    return (
                      <ReferenceLine
                        key={annotation.id}
                        x={annotation.x1}
                        stroke={annotation.color}
                        strokeDasharray="3 3"
                      >
                        {annotation.label && (
                          <Label value={annotation.label} position="insideTopRight" />
                        )}
                      </ReferenceLine>
                    );
                  } else if (annotation.type === 'area') {
                    return (
                      <ReferenceArea
                        key={annotation.id}
                        x1={annotation.x1}
                        x2={annotation.x2}
                        fill={annotation.color}
                        fillOpacity={0.2}
                        stroke={annotation.color}
                        strokeOpacity={0.5}
                      >
                        {annotation.label && (
                          <Label value={annotation.label} position="insideTopRight" />
                        )}
                      </ReferenceArea>
                    );
                  }
                  return null;
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Series legend and controls - will be implemented in a more detailed version */}
    </div>
  );
};

export default OverlayChart; 