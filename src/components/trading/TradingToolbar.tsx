import React, { useState } from 'react';
import { motion } from '@/lib/motion';
import { twMerge } from 'tailwind-merge';
import {
  ChartBarIcon,
  PencilIcon,
  ChartPieIcon,
  Square3Stack3DIcon,
  CameraIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// Types
interface ChartType {
  id: string;
  label: string;
}

interface TradingToolbarProps {
  chartTypes: ChartType[];
  selectedType: ChartType;
  onSelectType: (chartType: ChartType) => void;
  showAnalysis?: boolean;
  onToggleAnalysis?: () => void;
  onReset?: () => void;
  onTakeScreenshot?: () => void;
  onSaveTemplate?: () => void;
  onSettings?: () => void;
  onAiPredict?: () => void;
}

const TradingToolbar: React.FC<TradingToolbarProps> = ({
  chartTypes,
  selectedType,
  onSelectType,
  showAnalysis = false,
  onToggleAnalysis,
  onReset,
  onTakeScreenshot,
  onSaveTemplate,
  onSettings,
  onAiPredict,
}) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [showChartTypes, setShowChartTypes] = useState(false);

  // Group 1: Chart type and drawing tools
  const primaryTools = [
    {
      id: 'chartType',
      icon: <ChartBarIcon className="w-4 h-4" />,
      label: 'Chart Type',
      action: () => setShowChartTypes(!showChartTypes),
      active: showChartTypes,
    },
    {
      id: 'drawingTools',
      icon: <PencilIcon className="w-4 h-4" />,
      label: 'Drawing Tools',
      action: () => console.log('Drawing tools'),
      active: false,
    },
    {
      id: 'indicators',
      icon: <ChartPieIcon className="w-4 h-4" />,
      label: 'Indicators',
      action: () => console.log('Indicators'),
      active: false,
    },
    {
      id: 'templates',
      icon: <Square3Stack3DIcon className="w-4 h-4" />,
      label: 'Templates',
      action: onSaveTemplate,
      active: false,
    },
  ];

  // Group 2: Analysis and utilities
  const secondaryTools = [
    {
      id: 'analysis',
      icon: <SparklesIcon className="w-4 h-4" />,
      label: 'AI Analysis',
      action: onAiPredict,
      active: showAnalysis,
    },
    {
      id: 'screenshot',
      icon: <CameraIcon className="w-4 h-4" />,
      label: 'Screenshot',
      action: onTakeScreenshot,
      active: false,
    },
    {
      id: 'refresh',
      icon: <ArrowPathIcon className="w-4 h-4" />,
      label: 'Refresh',
      action: onReset,
      active: false,
    },
    {
      id: 'settings',
      icon: <Cog6ToothIcon className="w-4 h-4" />,
      label: 'Settings',
      action: onSettings,
      active: false,
    },
  ];

  // Tool button component
  const ToolButton = ({ tool }: { tool: typeof primaryTools[0] }) => (
    <button
      className={twMerge(
        'p-1.5 rounded-md transition-all duration-200 relative',
        tool.active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
      )}
      onClick={tool.action}
      title={tool.label}
      onMouseEnter={() => setHoveredButton(tool.id)}
      onMouseLeave={() => setHoveredButton(null)}
    >
      {tool.icon}

      {/* Tooltip */}
      {hoveredButton === tool.id && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow pointer-events-none whitespace-nowrap">
          {tool.label}
        </div>
      )}
    </button>
  );

  return (
    <div className="flex items-center">
      {/* Chart type selector dropdown */}
      {showChartTypes && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="absolute mt-2 right-0 top-full z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
        >
          <div className="space-y-1 min-w-[120px]">
            {chartTypes.map((type) => (
              <button
                key={type.id}
                className={twMerge(
                  'flex items-center px-3 py-2 w-full text-left rounded-md text-sm transition-colors',
                  selectedType.id === type.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                onClick={() => {
                  onSelectType(type);
                  setShowChartTypes(false);
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Primary tools */}
      <div className="flex items-center p-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {primaryTools.map((tool) => (
          <ToolButton key={tool.id} tool={tool} />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />

      {/* Secondary tools */}
      <div className="flex items-center p-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {secondaryTools.map((tool) => {
          // Skip rendering tools without handlers
          if (
            (tool.id === 'analysis' && !onToggleAnalysis) ||
            (tool.id === 'screenshot' && !onTakeScreenshot) ||
            (tool.id === 'refresh' && !onReset) ||
            (tool.id === 'settings' && !onSettings) ||
            (tool.id === 'aiPredict' && !onAiPredict)
          ) {
            return null;
          }

          // Special case for analysis toggle
          if (tool.id === 'analysis' && onToggleAnalysis) {
            return (
              <button
                key={tool.id}
                className={twMerge(
                  'p-1.5 rounded-md transition-all duration-200 relative',
                  showAnalysis
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                )}
                onClick={onToggleAnalysis}
                title={showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
                onMouseEnter={() => setHoveredButton(tool.id)}
                onMouseLeave={() => setHoveredButton(null)}
              >
                {tool.icon}

                {/* Tooltip */}
                {hoveredButton === tool.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow pointer-events-none whitespace-nowrap">
                    {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
                  </div>
                )}
              </button>
            );
          }

          return <ToolButton key={tool.id} tool={tool} />;
        })}
      </div>
    </div>
  );
};

export default TradingToolbar; 