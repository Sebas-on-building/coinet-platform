/**
 * Advanced Parameter Controls
 * 
 * A sophisticated UI component for configuring strategy parameters
 * with real-time visual feedback and interactive controls.
 * Inspired by professional trading platforms like TradingView.
 */

import React, { useState, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import {
  ChevronDownIcon,
  InformationCircleIcon,
  ArrowPathIcon as RefreshIcon,
  BoltIcon as LightningBoltIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon as ArrowsExpandIcon,
  XMarkIcon as XIcon
} from '@heroicons/react/24/outline';
import { debounce } from 'lodash';

// Parameter type definitions
export type ParameterType = 'number' | 'boolean' | 'select' | 'range' | 'multi-select' | 'color';

export interface ParameterOption {
  label: string;
  value: string | number;
}

export interface Parameter {
  id: string;
  name: string;
  type: ParameterType;
  value: any;
  defaultValue?: any;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption[];
  category?: string;
  advanced?: boolean;
  visible?: boolean;
  unit?: string;
  dependsOn?: string;
  dependsValue?: any;
  theme?: 'primary' | 'secondary' | 'tertiary';
}

export interface ParameterGroup {
  id: string;
  name: string;
  description?: string;
  expanded?: boolean;
  parameters: Parameter[];
}

interface AdvancedParameterControlsProps {
  groups: ParameterGroup[];
  onChange: (parameterId: string, value: any) => void;
  onReset?: () => void;
  onApply?: () => void;
  compact?: boolean;
  showAdvanced?: boolean;
  className?: string;
}

export const AdvancedParameterControls: React.FC<AdvancedParameterControlsProps> = ({
  groups,
  onChange,
  onReset,
  onApply,
  compact = false,
  showAdvanced = false,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(showAdvanced);
  const [touchedParams, setTouchedParams] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detachedMode, setDetachedMode] = useState<boolean>(false);

  // Initialize expanded state
  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    groups.forEach(group => {
      initialState[group.id] = group.expanded !== false;
    });
    setExpandedGroups(initialState);
  }, [groups]);

  // Handle search and filtering
  const getFilteredGroups = () => {
    if (!searchQuery) return groups;

    return groups.map(group => ({
      ...group,
      parameters: group.parameters.filter(param =>
        param.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        param.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.parameters.length > 0);
  };

  // Handle parameter visibility based on dependencies
  const isParameterVisible = (param: Parameter, allParams: Parameter[]) => {
    // If parameter depends on another parameter's value
    if (param.dependsOn) {
      const dependentParam = allParams.find(p => p.id === param.dependsOn);
      if (dependentParam && dependentParam.value !== param.dependsValue) {
        return false;
      }
    }

    // Hide advanced parameters unless specifically shown
    if (param.advanced && !showAdvancedParams) {
      return false;
    }

    return param.visible !== false;
  };

  // Flatten parameters for dependency checking
  const allParams = groups.flatMap(group => group.parameters);

  // Debounced change handler to prevent too many updates
  const debouncedOnChange = debounce(onChange, 300);

  // Handle parameter change
  const handleChange = (param: Parameter, value: any) => {
    // Record this parameter as touched
    setTouchedParams(prev => new Set(prev).add(param.id));

    // Call the onChange handler
    debouncedOnChange(param.id, value);
  };

  // Reset to default values
  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    setTouchedParams(new Set());
  };

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Render parameter controls based on type
  const renderParameterControl = (param: Parameter) => {
    const isChanged = touchedParams.has(param.id);

    switch (param.type) {
      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              id={param.id}
              value={param.value}
              min={param.min}
              max={param.max}
              step={param.step || 1}
              onChange={(e) => handleChange(param, Number(e.target.value))}
              className={twMerge(
                "block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100 text-sm py-1.5 px-3 focus:outline-none focus:ring-2",
                "focus:ring-blue-500 dark:focus:ring-blue-400 transition-all",
                isChanged ? "border-blue-500 dark:border-blue-400" : ""
              )}
            />
            {param.unit && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{param.unit}</span>
            )}
          </div>
        );

      case 'range':
        return (
          <div className="space-y-1">
            <div className="flex items-center">
              <input
                type="range"
                id={param.id}
                value={param.value}
                min={param.min}
                max={param.max}
                step={param.step || 1}
                onChange={(e) => handleChange(param, Number(e.target.value))}
                className={twMerge(
                  "block w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none",
                  "cursor-pointer accent-blue-500 dark:accent-blue-400 transition-all",
                  isChanged ? "bg-blue-100 dark:bg-blue-900/30" : ""
                )}
              />
              <span className="ml-2 w-12 text-sm text-gray-900 dark:text-gray-100">
                {param.value}{param.unit}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{param.min}{param.unit}</span>
              <span>{param.max}{param.unit}</span>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id={param.id}
                checked={param.value}
                onChange={(e) => handleChange(param, e.target.checked)}
                className="sr-only peer"
              />
              <div className={twMerge(
                "w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2",
                "peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer",
                "peer-checked:after:translate-x-full peer-checked:after:border-white",
                "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
                "after:bg-white after:border-gray-300 after:border after:rounded-full",
                "after:h-5 after:w-5 after:transition-all",
                "peer-checked:bg-blue-600 transition-all",
                isChanged ? "border border-blue-500 dark:border-blue-400" : ""
              )}></div>
            </label>
          </div>
        );

      case 'select':
        return (
          <div className="relative">
            <select
              id={param.id}
              value={param.value}
              onChange={(e) => handleChange(param, e.target.value)}
              className={twMerge(
                "block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100 text-sm py-1.5 pl-3 pr-10 focus:outline-none focus:ring-2",
                "focus:ring-blue-500 dark:focus:ring-blue-400 appearance-none transition-all",
                isChanged ? "border-blue-500 dark:border-blue-400" : ""
              )}
            >
              {param.options?.map(option => (
                <option key={option.value.toString()} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-1">
            {param.options?.map(option => (
              <div key={option.value.toString()} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${param.id}-${option.value}`}
                  checked={(param.value || []).includes(option.value)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...(param.value || []), option.value]
                      : (param.value || []).filter((v: any) => v !== option.value);
                    handleChange(param, newValue);
                  }}
                  className={twMerge(
                    "h-4 w-4 rounded border-gray-300 dark:border-gray-700",
                    "text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400",
                    isChanged ? "border-blue-500 dark:border-blue-400" : ""
                  )}
                />
                <label
                  htmlFor={`${param.id}-${option.value}`}
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="color"
              id={param.id}
              value={param.value}
              onChange={(e) => handleChange(param, e.target.value)}
              className={twMerge(
                "h-8 w-12 border rounded-md cursor-pointer p-0",
                isChanged ? "border-blue-500 dark:border-blue-400" : "border-gray-300 dark:border-gray-700"
              )}
            />
            <input
              type="text"
              value={param.value}
              onChange={(e) => handleChange(param, e.target.value)}
              className="block w-24 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100 text-sm py-1.5 px-3 focus:outline-none focus:ring-2
                focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        );

      default:
        return <div>Unsupported parameter type</div>;
    }
  };

  // Render parameter with label and description
  const renderParameter = (param: Parameter) => {
    if (!isParameterVisible(param, allParams)) return null;

    const colorClasses = {
      primary: "text-blue-600 dark:text-blue-400",
      secondary: "text-purple-600 dark:text-purple-400",
      tertiary: "text-emerald-600 dark:text-emerald-400",
    };

    const labelColor = param.theme ? colorClasses[param.theme] : "text-gray-700 dark:text-gray-300";

    const isChanged = touchedParams.has(param.id);

    return (
      <div className="mb-3">
        <div className="flex justify-between items-start mb-1">
          <label
            htmlFor={param.id}
            className={twMerge(
              "block text-sm font-medium",
              labelColor,
              isChanged ? "font-semibold" : ""
            )}
          >
            {param.name}
            {param.advanced && (
              <span className="ml-1 px-1 py-0.5 text-xs font-normal bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-sm">
                Advanced
              </span>
            )}
          </label>

          {param.description && (
            <div className="relative group">
              <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute z-10 right-0 -top-2 hidden group-hover:block w-64 p-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                {param.description}
                {param.defaultValue !== undefined && (
                  <div className="mt-1 text-gray-500 dark:text-gray-400">
                    Default: {typeof param.defaultValue === 'boolean'
                      ? (param.defaultValue ? 'On' : 'Off')
                      : param.defaultValue}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {renderParameterControl(param)}
      </div>
    );
  };

  // Main render
  const filteredGroups = getFilteredGroups();

  return (
    <div
      className={twMerge(
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all",
        detachedMode ? "fixed z-30 top-16 right-4 w-80 shadow-xl" : "",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
          Parameters
        </h3>

        <div className="flex items-center space-x-1">
          {touchedParams.size > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full px-2 py-0.5">
              {touchedParams.size} changed
            </span>
          )}

          <button
            onClick={() => setDetachedMode(!detachedMode)}
            title={detachedMode ? "Dock panel" : "Detach panel"}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowsExpandIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and controls */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search parameters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 
                      rounded-md py-1 pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex items-center ml-2">
          <button
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className={twMerge(
              "text-xs px-2 py-1 rounded-md border",
              showAdvancedParams
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            )}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Parameter groups */}
      <div className={twMerge(
        "divide-y divide-gray-200 dark:divide-gray-800 overflow-auto transition-all",
        compact ? "max-h-80" : "max-h-96"
      )}>
        {filteredGroups.map(group => (
          <div key={group.id} className="transition-all">
            {/* Group header */}
            <div
              onClick={() => toggleGroup(group.id)}
              className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {group.name}
                </h4>
                {group.description && (
                  <div className="relative group ml-1">
                    <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                    <div className="absolute z-10 left-0 -top-2 hidden group-hover:block w-64 p-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                      {group.description}
                    </div>
                  </div>
                )}
              </div>
              <ChevronDownIcon
                className={twMerge(
                  "w-5 h-5 text-gray-500 transition-transform",
                  expandedGroups[group.id] ? "transform rotate-180" : ""
                )}
              />
            </div>

            {/* Group parameters */}
            {expandedGroups[group.id] && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                {group.parameters
                  .filter(param => isParameterVisible(param, allParams))
                  .map(param => (
                    <React.Fragment key={param.id}>
                      {renderParameter(param)}
                    </React.Fragment>
                  ))}

                {group.parameters.filter(param => isParameterVisible(param, allParams)).length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No parameters to display
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
            No parameters match your search
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-between bg-gray-50 dark:bg-gray-800/50">
        <button
          onClick={handleReset}
          disabled={touchedParams.size === 0}
          className={twMerge(
            "text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700",
            "text-gray-700 dark:text-gray-300 transition-colors",
            touchedParams.size > 0
              ? "hover:bg-gray-100 dark:hover:bg-gray-800"
              : "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshIcon className="w-4 h-4 inline mr-1" />
          Reset
        </button>

        {onApply && (
          <button
            onClick={onApply}
            disabled={touchedParams.size === 0}
            className={twMerge(
              "text-sm px-3 py-1.5 rounded-md transition-colors",
              touchedParams.size > 0
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-300 dark:bg-blue-800 text-white cursor-not-allowed"
            )}
          >
            <LightningBoltIcon className="w-4 h-4 inline mr-1" />
            Apply Changes
          </button>
        )}
      </div>
    </div>
  );
};

export default AdvancedParameterControls; 