import { SelectHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Select component
 * - Features: ARIA, analytics event on focus, a11y, microinteractions
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  analyticsEvent?: string; // Analytics event name
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, analyticsEvent, ...props }, ref) => {
    const [hasFocused, setHasFocused] = useState(false);
    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      if (!hasFocused && analyticsEvent && (window as any)?.gtag) {
        (window as any).gtag("event", analyticsEvent, {
          label: props["aria-label"] || props.name,
        });
        setHasFocused(true);
      }
      if (props.onFocus) props.onFocus(e);
    };
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        aria-label={props["aria-label"] || props.name}
        aria-invalid={props["aria-invalid"]}
        aria-required={props["aria-required"]}
        {...props}
        onFocus={handleFocus}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";

export { Select };
