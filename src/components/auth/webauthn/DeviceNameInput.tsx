import React, { useRef } from 'react';

export const DeviceNameInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  error?: string;
  onEnter?: () => void;
  autoFocus?: boolean;
}> = ({ value, onChange, error, onEnter, autoFocus }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <label htmlFor="device-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Device Name
      </label>
      <input
        id="device-name"
        ref={inputRef}
        className={`w-64 px-4 py-2 rounded-lg border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white/80 dark:bg-slate-900/80 shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-400 outline-none text-lg text-center transition-all duration-200`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. MacBook Pro"
        aria-label="Device name"
        aria-invalid={!!error}
        aria-describedby={error ? 'device-name-error' : undefined}
        autoFocus={autoFocus}
        maxLength={32}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      />
      {error && (
        <span id="device-name-error" className="text-xs text-red-500" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}; 