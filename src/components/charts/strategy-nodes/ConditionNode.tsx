/**
 * Condition Node Component
 * 
 * A visual node representing a trading condition in the strategy builder.
 * Uses TradingView-inspired design principles for a professional trading platform look.
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CogIcon, SwitchHorizontalIcon, InformationCircleIcon } from '@heroicons/react/outline';

// Parameter form component
import ParameterForm from './common/ParameterForm';

// Node styles - Using TradingView-inspired design
const nodeStyle = {
  backgroundColor: 'rgb(243, 242, 255)',
  border: '1px solid rgb(216, 180, 254)',
  borderRadius: '10px',
  padding: '10px',
  width: '220px',
  fontSize: '12px',
  color: '#581c87',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
};

const darkNodeStyle = {
  backgroundColor: 'rgb(91, 33, 182)',
  border: '1px solid rgb(147, 51, 234)',
  color: 'rgb(233, 213, 255)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
};

// Handle styles
const sourceHandleStyle = {
  width: '8px',
  height: '8px',
  background: '#8b5cf6',
  borderRadius: '50%',
  border: '1px solid #4c1d95',
};

const targetHandleStyle = {
  width: '8px',
  height: '8px',
  background: '#c4b5fd',
  borderRadius: '50%',
  border: '1px solid #4c1d95',
};

// Parameter definitions for each condition type
const parameterDefinitions = {
  crossOver: [],
  crossUnder: [],
  greaterThan: [
    { id: 'value', name: 'Value', type: 'number', min: -100, max: 100, step: 1, defaultValue: 0 }
  ],
  lessThan: [
    { id: 'value', name: 'Value', type: 'number', min: -100, max: 100, step: 1, defaultValue: 0 }
  ]
};

// Node descriptions for help tooltips
const nodeDescriptions = {
  crossOver: 'Triggers when the first input crosses above the second input.',
  crossUnder: 'Triggers when the first input crosses below the second input.',
  greaterThan: 'Triggers when the input is greater than the specified value or second input.',
  lessThan: 'Triggers when the input is less than the specified value or second input.'
};

/**
 * Condition Node Component
 */
const ConditionNode: React.FC<NodeProps> = ({ data, selected, id }) => {
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

  // Get parameters based on condition type
  const getParameters = () => {
    const conditionType = data.id;
    return parameterDefinitions[conditionType as keyof typeof parameterDefinitions] || [];
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
    const conditionType = data.id;
    return nodeDescriptions[conditionType as keyof typeof nodeDescriptions] || 'Trading condition';
  };

  // Calculate how many target handles to display
  const getTargetHandleCount = () => {
    const conditionType = data.id;
    return ['crossOver', 'crossUnder'].includes(conditionType) ? 2 : 1;
  };

  // Generate input labels
  const getInputLabels = () => {
    const conditionType = data.id;

    switch (conditionType) {
      case 'crossOver':
      case 'crossUnder':
        return ['Input 1', 'Input 2'];
      case 'greaterThan':
        return ['Value to check'];
      case 'lessThan':
        return ['Value to check'];
      default:
        return ['Input'];
    }
  };

  const targetHandleCount = getTargetHandleCount();
  const inputLabels = getInputLabels();

  return (
    <div
      style={{
        ...nodeStyle,
        ...(isDarkMode ? darkNodeStyle : {}),
        ...(selected ? { boxShadow: `0 0 0 2px ${isDarkMode ? '#8b5cf6' : '#7c3aed'}` } : {})
      }}
    >
      {/* Target handles - input connection points */}
      {Array.from({ length: targetHandleCount }).map((_, i) => (
        <Handle
          key={`target-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          style={{
            ...targetHandleStyle,
            top: `${30 + (i * 22)}%`
          }}
          isConnectable={true}
        />
      ))}

      {/* Source handle - output connection point */}
      <Handle
        type="source"
        position={Position.Right}
        style={sourceHandleStyle}
        isConnectable={true}
      />

      {/* Condition header with icon */}
      <div className="flex items-center mb-2">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-md mr-2"
          style={{
            backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'
          }}
        >
          {data.id.includes('cross') ? (
            <SwitchHorizontalIcon className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          ) : (
            <CogIcon className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          )}
        </div>
        <div className="flex-1 font-medium text-xs">{data.label}</div>

        {/* Help tooltip */}
        <div className="relative group">
          <InformationCircleIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 opacity-80 cursor-help" />
          <div
            className="absolute hidden group-hover:block right-0 z-10 w-48 p-2 text-xs rounded-md"
            style={{
              top: '-6px',
              backgroundColor: isDarkMode ? 'rgb(91, 33, 182)' : 'rgb(243, 242, 255)',
              border: isDarkMode ? '1px solid rgb(147, 51, 234)' : '1px solid rgb(216, 180, 254)',
              color: isDarkMode ? 'rgb(233, 213, 255)' : '#581c87',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
            }}
          >
            {getDescription()}
          </div>
        </div>

        {/* Settings button (if parameters available) */}
        {getParameters().length > 0 && (
          <button
            onClick={toggleEditing}
            className="ml-1 opacity-80 hover:opacity-100 transition-opacity"
            style={{ color: '#8b5cf6' }}
          >
            <CogIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input labels */}
      <div>
        {inputLabels.map((label, i) => (
          <div
            key={`label-${i}`}
            className="flex items-center my-1 text-[11px] opacity-80"
            style={{ height: '18px' }}
          >
            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#c4b5fd' }}></div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Parameter display - for value conditions */}
      {['greaterThan', 'lessThan'].includes(data.id) && (
        <div className="text-xs mt-2 p-1 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(243, 242, 255, 0.8)' }}>
          <div className="flex justify-between">
            <span>Comparison:</span>
            <span className="font-medium">{data.id === 'greaterThan' ? '>' : '<'} {params.value ?? 0}</span>
          </div>
        </div>
      )}

      {/* Parameter editing panel */}
      {isEditing && (
        <div
          className="mt-2 p-2 rounded-md"
          style={{
            backgroundColor: isDarkMode ? 'rgba(91, 33, 182, 0.8)' : 'rgba(243, 242, 255, 0.8)',
            border: isDarkMode ? '1px solid rgb(147, 51, 234)' : '1px solid rgb(216, 180, 254)',
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

export default ConditionNode; 