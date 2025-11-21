import React, { useState } from "react";

/**
 * Checkbox component
 * - Features: ARIA, analytics event on change, a11y, microinteractions
 */
export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  analyticsEvent?: string; // Analytics event name
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onCheckedChange,
  disabled,
  className = "",
  children,
  analyticsEvent,
}) => {
  const [hasChanged, setHasChanged] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasChanged && analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, { label: id });
      setHasChanged(true);
    }
    onCheckedChange?.(e.target.checked);
  };
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className={`h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${className}`}
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={id}
      />
      {children}
    </div>
  );
};
