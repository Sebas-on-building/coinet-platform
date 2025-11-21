/**
 * Action Node Component
 * 
 * A visual node representing a trading action in the strategy builder.
 * Uses Solana-inspired design principles for a modern, clean interface.
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowSmRightIcon, CashIcon, ShieldCheckIcon, InformationCircleIcon, AdjustmentsIcon } from '@heroicons/react/outline';

// Parameter form component
import ParameterForm from './common/ParameterForm';
import { Parameter } from './common/ParameterForm';

// Node styles - Using Solana-inspired design
const nodeStyle = {
  backgroundColor: 'rgb(240, 253, 244)',
  border: '1px solid rgb(134, 239, 172)',
  borderRadius: '10px',
  padding: '10px',
  width: '220px',
  fontSize: '12px',
  color: '#166534',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
};

const darkNodeStyle = {
  backgroundColor: 'rgb(22, 101, 52)',
  border: '1px solid rgb(34, 197, 94)',
  color: 'rgb(220, 252, 231)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
};

// Handle styles
const targetHandleStyle = {
  width: '8px',
  height: '8px',
  background: '#4ade80',
  borderRadius: '50%',
  border: '1px solid #166534',
};

// Parameter definitions for each action type
const parameterDefinitions: Record<string, Parameter[]> = {
  buyMarket: [
    { id: 'size', name: 'Position Size', type: 'number', min: 1, max: 1000, step: 1, defaultValue: 100 }
  ],
  sellMarket: [
    { id: 'size', name: 'Position Size', type: 'number', min: 1, max: 1000, step: 1, defaultValue: 100 }
  ],
  setStopLoss: [
    { id: 'percent', name: 'Percentage', type: 'number', min: 0.1, max: 20, step: 0.1, defaultValue: 5 }
  ],
  setTakeProfit: [
    { id: 'percent', name: 'Percentage', type: 'number', min: 0.1, max: 50, step: 0.1, defaultValue: 10 }
  ]
};

// Node descriptions for help tooltips
const nodeDescriptions: Record<string, string> = {
  buyMarket: 'Executes a market buy order with the specified size.',
  sellMarket: 'Executes a market sell order with the specified size.',
  setStopLoss: 'Sets a stop loss at the specified percentage below the current price.',
  setTakeProfit: 'Sets a take profit at the specified percentage above the current price.'
};

/**
 * Action Node Component
 */
const ActionNode: React.FC<NodeProps> = ({ data, selected, id }) => {
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

  // Get parameters based on action type
  const getParameters = () => {
    const actionType = data.id;
    return parameterDefinitions[actionType] || [];
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
    const actionType = data.id;
    return nodeDescriptions[actionType] || 'Trading action';
  };

  // Get icon for the action
  const getActionIcon = () => {
    const actionType = data.id;

    switch (actionType) {
      case 'buyMarket':
      case 'sellMarket':
        return <CashIcon className="w-4 h-4" style={{ color: '#16a34a' }} />;
      case 'setStopLoss':
      case 'setTakeProfit':
        return <ShieldCheckIcon className="w-4 h-4" style={{ color: '#16a34a' }} />;
      default:
        return <ArrowSmRightIcon className="w-4 h-4" style={{ color: '#16a34a' }} />;
    }
  };

  // Get parameter summary for display
  const getParameterSummary = () => {
    const actionType = data.id;

    switch (actionType) {
      case 'buyMarket':
        return `Buy ${params.size || 100} units`;
      case 'sellMarket':
        return `Sell ${params.size || 100} units`;
      case 'setStopLoss':
        return `Stop loss: ${params.percent || 5}%`;
      case 'setTakeProfit':
        return `Take profit: ${params.percent || 10}%`;
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        ...nodeStyle,
        ...(isDarkMode ? darkNodeStyle : {}),
        ...(selected ? { boxShadow: `0 0 0 2px ${isDarkMode ? '#4ade80' : '#16a34a'}` } : {})
      }}
    >
      {/* Target handle - input connection point */}
      <Handle
        type="target"
        position={Position.Left}
        style={targetHandleStyle}
        isConnectable={true}
      />

      {/* Action header with icon */}
      <div className="flex items-center mb-2">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-md mr-2"
          style={{
            backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.2)' : 'rgba(74, 222, 128, 0.1)'
          }}
        >
          {getActionIcon()}
        </div>
        <div className="flex-1 font-medium text-xs">{data.label}</div>

        {/* Help tooltip */}
        <div className="relative group">
          <InformationCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 opacity-80 cursor-help" />
          <div
            className="absolute hidden group-hover:block right-0 z-10 w-48 p-2 text-xs rounded-md"
            style={{
              top: '-6px',
              backgroundColor: isDarkMode ? 'rgb(22, 101, 52)' : 'rgb(240, 253, 244)',
              border: isDarkMode ? '1px solid rgb(34, 197, 94)' : '1px solid rgb(134, 239, 172)',
              color: isDarkMode ? 'rgb(220, 252, 231)' : '#166534',
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
          style={{ color: '#16a34a' }}
        >
          <AdjustmentsIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Parameter summary */}
      <div
        className="text-xs p-2 rounded-md flex items-center"
        style={{
          backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.1)' : 'rgba(74, 222, 128, 0.1)'
        }}
      >
        <span className="font-medium">{getParameterSummary()}</span>
      </div>

      {/* Parameter editing panel */}
      {isEditing && (
        <div
          className="mt-2 p-2 rounded-md"
          style={{
            backgroundColor: isDarkMode ? 'rgba(22, 101, 52, 0.8)' : 'rgba(240, 253, 244, 0.8)',
            border: isDarkMode ? '1px solid rgb(34, 197, 94)' : '1px solid rgb(134, 239, 172)',
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

export default ActionNode; 