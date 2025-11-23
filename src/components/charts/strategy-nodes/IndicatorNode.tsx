/**
 * Indicator Node Component
 * 
 * A visual node representing a technical indicator in the strategy builder.
 * Uses Apple-inspired design principles for a clean, modern interface.
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChartBarIcon, AdjustmentsIcon, InformationCircleIcon } from '@heroicons/react/outline';

// Parameter form component for customizing the indicator
import ParameterForm from './common/ParameterForm';

// Node styles - Using Apple-inspired design
const nodeStyle = {
  backgroundColor: 'rgb(240, 249, 255)',
  border: '1px solid rgb(186, 230, 253)',
  borderRadius: '10px',
  padding: '10px',
  width: '220px',
  fontSize: '12px',
  color: '#0c4a6e',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
};

const darkNodeStyle = {
  backgroundColor: 'rgb(7, 89, 133)',
  border: '1px solid rgb(14, 116, 144)',
  color: 'rgb(186, 230, 253)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
};

// Handle styles
const handleStyle = {
  width: '8px',
  height: '8px',
  background: '#0ea5e9',
  borderRadius: '50%',
  border: '1px solid #0c4a6e',
};

// Parameter definitions for each indicator type
const parameterDefinitions = {
  sma: [
    { id: 'period', name: 'Period', type: 'number', min: 2, max: 200, step: 1, defaultValue: 20 }
  ],
  ema: [
    { id: 'period', name: 'Period', type: 'number', min: 2, max: 200, step: 1, defaultValue: 20 }
  ],
  rsi: [
    { id: 'period', name: 'Period', type: 'number', min: 2, max: 50, step: 1, defaultValue: 14 }
  ],
  macd: [
    { id: 'fast', name: 'Fast Period', type: 'number', min: 2, max: 50, step: 1, defaultValue: 12 },
    { id: 'slow', name: 'Slow Period', type: 'number', min: 5, max: 100, step: 1, defaultValue: 26 },
    { id: 'signal', name: 'Signal Period', type: 'number', min: 2, max: 50, step: 1, defaultValue: 9 }
  ]
};

// Node descriptions for help tooltips
const nodeDescriptions = {
  sma: 'Simple Moving Average calculates the arithmetic mean of prices over a specified period.',
  ema: 'Exponential Moving Average gives more weight to recent prices, making it more responsive to new information.',
  rsi: 'Relative Strength Index measures the speed and change of price movements, used to identify overbought/oversold conditions.',
  macd: 'Moving Average Convergence Divergence shows the relationship between two moving averages of a security\'s price, useful for trend following and momentum.'
};

/**
 * Indicator Node Component
 */
const IndicatorNode: React.FC<NodeProps> = ({ data, selected, id }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [params, setParams] = useState<Record<string, any>>(data.params || {});
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);

    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // Get parameters based on indicator type
  const getParameters = () => {
    const indicatorType = data.id;
    return parameterDefinitions[indicatorType as keyof typeof parameterDefinitions] || [];
  };

  // Update parameter value
  const handleParameterChange = (paramId: string, value: any) => {
    setParams(prevParams => ({
      ...prevParams,
      [paramId]: value
    }));

    // Update the node data
    data.onChange?.(id, {
      ...data,
      params: {
        ...params,
        [paramId]: value
      }
    });
  };

  // Toggle parameter editing panel
  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  // Get node description
  const getDescription = () => {
    const indicatorType = data.id;
    return nodeDescriptions[indicatorType as keyof typeof nodeDescriptions] || 'Technical indicator';
  };

  return (
    <div
      style={{
        ...nodeStyle,
        ...(isDarkMode ? darkNodeStyle : {}),
        ...(selected ? { boxShadow: `0 0 0 2px ${isDarkMode ? '#0ea5e9' : '#0284c7'}` } : {})
      }}
    >
      {/* Source handle - output connection point */}
      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
        isConnectable={true}
      />

      {/* Indicator header with icon */}
      <div className="flex items-center mb-1">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-md mr-2"
          style={{
            backgroundColor: isDarkMode ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.1)'
          }}
        >
          <ChartBarIcon className="w-4 h-4" style={{ color: '#0ea5e9' }} />
        </div>
        <div className="flex-1 font-medium text-xs">{data.label}</div>

        {/* Help tooltip */}
        <div className="relative group">
          <InformationCircleIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 opacity-80 cursor-help" />
          <div
            className="absolute hidden group-hover:block right-0 z-10 w-48 p-2 text-xs rounded-md"
            style={{
              top: '-6px',
              backgroundColor: isDarkMode ? 'rgb(12, 74, 110)' : 'rgb(240, 249, 255)',
              border: isDarkMode ? '1px solid rgb(14, 116, 144)' : '1px solid rgb(186, 230, 253)',
              color: isDarkMode ? 'rgb(186, 230, 253)' : '#0c4a6e',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
            }}
          >
            {getDescription()}
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={toggleEditing}
          className="ml-1 opacity-80 hover:opacity-100 transition-opacity"
          style={{ color: '#0ea5e9' }}
        >
          <AdjustmentsIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Parameter display - compact view */}
      <div className="text-xs opacity-80">
        {Object.entries(params).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span>{key}:</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Parameter editing panel */}
      {isEditing && (
        <div
          className="mt-2 p-2 rounded-md"
          style={{
            backgroundColor: isDarkMode ? 'rgba(7, 89, 133, 0.8)' : 'rgba(240, 249, 255, 0.8)',
            border: isDarkMode ? '1px solid rgb(14, 116, 144)' : '1px solid rgb(186, 230, 253)',
          }}
        >
          <ParameterForm
            parameters={getParameters()}
            values={params}
            onChange={handleParameterChange}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  );
};

export default IndicatorNode; 