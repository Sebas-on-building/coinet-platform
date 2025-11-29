/**
 * Parameter Form Component
 * 
 * A reusable form component for editing node parameters in the strategy builder.
 * Features a clean, minimal interface inspired by Apple design principles.
 */

import React from 'react';

// Parameter type definitions
export interface Parameter {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string, value: any }>;
  description?: string;
}

interface ParameterFormProps {
  parameters: Parameter[];
  values: Record<string, any>;
  onChange: (paramId: string, value: any) => void;
  isDarkMode?: boolean;
}

/**
 * Parameter Form Component
 */
const ParameterForm: React.FC<ParameterFormProps> = ({
  parameters,
  values,
  onChange,
  isDarkMode = false
}) => {
  // Get the current value or default
  const getValue = (param: Parameter) => {
    // Use the current value if available, otherwise fall back to default
    return values[param.id] !== undefined
      ? values[param.id]
      : param.defaultValue;
  };

  // Handle parameter changes
  const handleChange = (param: Parameter, event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value: any = event.target.value;

    // Convert value based on parameter type
    if (param.type === 'number') {
      value = parseFloat(value);
    } else if (param.type === 'boolean') {
      value = (event.target as HTMLInputElement).checked;
    }

    onChange(param.id, value);
  };

  // Styles for form inputs
  const inputStyle = {
    backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255, 255, 255, 0.8)',
    color: isDarkMode ? 'rgb(186, 230, 253)' : '#0c4a6e',
    border: isDarkMode ? '1px solid rgb(2, 132, 199)' : '1px solid rgb(224, 242, 254)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    width: '100%',
    outline: 'none'
  };

  // Render parameter input based on type
  const renderParameterInput = (param: Parameter) => {
    const value = getValue(param);

    switch (param.type) {
      case 'number':
        return (
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium">{param.name}</label>
              <span className="text-xs opacity-80">{value}</span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={value}
              onChange={(e) => handleChange(param, e)}
              style={{
                ...inputStyle,
                padding: '0',
                height: '6px',
                appearance: 'none',
                backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.2)' : 'rgba(224, 242, 254, 0.8)',
              }}
              className="accent-sky-500"
            />
            <div className="flex justify-between text-[10px] opacity-60 mt-1">
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium">{param.name}</label>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleChange(param, e)}
                className="sr-only peer"
                id={`param-${param.id}`}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-sky-500"></div>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="mb-2">
            <label className="block text-xs font-medium mb-1">{param.name}</label>
            <select
              value={value}
              onChange={(e) => handleChange(param, e)}
              style={inputStyle}
              className="appearance-none cursor-pointer bg-no-repeat bg-right pr-6"
            >
              {param.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return (
          <div className="mb-2">
            <label className="block text-xs font-medium mb-1">{param.name}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(param, e)}
              style={inputStyle}
            />
          </div>
        );
    }
  };

  // Render the form
  return (
    <form className="w-full">
      {parameters.map((param) => (
        <div key={param.id}>
          {renderParameterInput(param)}
        </div>
      ))}

      {parameters.length === 0 && (
        <div className="text-xs opacity-60 text-center py-1">
          No configurable parameters
        </div>
      )}
    </form>
  );
};

export default ParameterForm; 