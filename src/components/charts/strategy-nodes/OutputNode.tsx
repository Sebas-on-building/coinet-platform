/**
 * Output Node Component
 * 
 * A visual node representing signal outputs in the strategy builder.
 * Uses Canva-inspired design with a modern, creative interface.
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  DocumentTextIcon,
  BellIcon,
  InformationCircleIcon,
  AdjustmentsIcon
} from '@heroicons/react/outline';

// Parameter form component
import ParameterForm from './common/ParameterForm';
import { Parameter } from './common/ParameterForm';

// Node styles - Using Canva-inspired design
const nodeStyle = {
  backgroundColor: 'rgb(255, 247, 237)',
  border: '1px solid rgb(255, 237, 213)',
  borderRadius: '10px',
  padding: '10px',
  width: '220px',
  fontSize: '12px',
  color: '#9a3412',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
};

const darkNodeStyle = {
  backgroundColor: 'rgb(154, 52, 18)',
  border: '1px solid rgb(234, 88, 12)',
  color: 'rgb(255, 247, 237)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
};

// Handle styles
const targetHandleStyle = {
  width: '8px',
  height: '8px',
  background: '#fb923c',
  borderRadius: '50%',
  border: '1px solid #9a3412',
};

// Parameter definitions for each output type
const parameterDefinitions: Record<string, Parameter[]> = {
  signalOutput: [],
  alertOutput: [
    { id: 'message', name: 'Alert Message', type: 'string', defaultValue: 'Alert triggered' },
    {
      id: 'level', name: 'Alert Level', type: 'select', defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' }
      ]
    }
  ]
};

// Node descriptions for help tooltips
const nodeDescriptions: Record<string, string> = {
  signalOutput: 'Generates a signal for visualization on the chart without executing a trade.',
  alertOutput: 'Sends an alert notification with a custom message when the condition is met.'
};

/**
 * Output Node Component
 */
const OutputNode: React.FC<NodeProps> = ({ data, selected, id }) => {
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

  // Get parameters based on output type
  const getParameters = () => {
    const outputType = data.id;
    return parameterDefinitions[outputType] || [];
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
    const outputType = data.id;
    return nodeDescriptions[outputType] || 'Output action';
  };

  // Get icon for the output type
  const getOutputIcon = () => {
    const outputType = data.id;

    switch (outputType) {
      case 'alertOutput':
        return <BellIcon className="w-4 h-4" style={{ color: '#ea580c' }} />;
      case 'signalOutput':
      default:
        return <DocumentTextIcon className="w-4 h-4" style={{ color: '#ea580c' }} />;
    }
  };

  // Get parameter summary for display
  const getParameterSummary = () => {
    const outputType = data.id;

    switch (outputType) {
      case 'alertOutput':
        const message = params.message || 'Alert triggered';
        const level = params.level || 'info';
        return (
          <div>
            <div className="flex items-center">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{
                  backgroundColor: level === 'error' ? '#ef4444' : level === 'warning' ? '#f59e0b' : '#0ea5e9'
                }}
              ></span>
              <span className="font-medium truncate" style={{ maxWidth: '160px' }}>
                {message}
              </span>
            </div>
            <div className="text-[10px] opacity-70 mt-1">
              Level: {level}
            </div>
          </div>
        );
      case 'signalOutput':
        return 'Chart signal output';
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        ...nodeStyle,
        ...(isDarkMode ? darkNodeStyle : {}),
        ...(selected ? { boxShadow: `0 0 0 2px ${isDarkMode ? '#fb923c' : '#ea580c'}` } : {})
      }}
    >
      {/* Target handle - input connection point */}
      <Handle
        type="target"
        position={Position.Left}
        style={targetHandleStyle}
        isConnectable={true}
      />

      {/* Output header with icon */}
      <div className="flex items-center mb-2">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-md mr-2"
          style={{
            backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.2)' : 'rgba(251, 146, 60, 0.1)'
          }}
        >
          {getOutputIcon()}
        </div>
        <div className="flex-1 font-medium text-xs">{data.label}</div>

        {/* Help tooltip */}
        <div className="relative group">
          <InformationCircleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400 opacity-80 cursor-help" />
          <div
            className="absolute hidden group-hover:block right-0 z-10 w-48 p-2 text-xs rounded-md"
            style={{
              top: '-6px',
              backgroundColor: isDarkMode ? 'rgb(154, 52, 18)' : 'rgb(255, 247, 237)',
              border: isDarkMode ? '1px solid rgb(234, 88, 12)' : '1px solid rgb(255, 237, 213)',
              color: isDarkMode ? 'rgb(255, 247, 237)' : '#9a3412',
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
            style={{ color: '#ea580c' }}
          >
            <AdjustmentsIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Parameter summary */}
      <div
        className="text-xs p-2 rounded-md"
        style={{
          backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.1)' : 'rgba(251, 146, 60, 0.1)'
        }}
      >
        {getParameterSummary()}
      </div>

      {/* Parameter editing panel */}
      {isEditing && (
        <div
          className="mt-2 p-2 rounded-md"
          style={{
            backgroundColor: isDarkMode ? 'rgba(154, 52, 18, 0.8)' : 'rgba(255, 247, 237, 0.8)',
            border: isDarkMode ? '1px solid rgb(234, 88, 12)' : '1px solid rgb(255, 237, 213)',
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

export default OutputNode; 