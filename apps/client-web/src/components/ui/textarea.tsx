import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, minHeight = 80, maxHeight = 200, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.MutableRefObject<HTMLTextAreaElement>) || internalRef;

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) return;

      // Only adjust if content overflows or if we can shrink significantly
      const currentHeight = textarea.clientHeight;
      const scrollHeight = textarea.scrollHeight;
      
      // Needs to grow: scrollHeight exceeds current height
      // Can shrink: scrollHeight is much smaller than current height (more than one line worth)
      const needsResize = scrollHeight > currentHeight || scrollHeight < currentHeight - 24;
      
      if (needsResize) {
        requestAnimationFrame(() => {
          // Reset to min height first to get accurate scrollHeight
          textarea.style.height = `${minHeight}px`;
          const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
          textarea.style.height = `${newHeight}px`;
        });
      }
    }, [autoResize, minHeight, maxHeight]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    }, [adjustHeight, onChange]);

    // Initial height adjustment
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        adjustHeight();
      }
    }, [autoResize, adjustHeight]);

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          autoResize && "transition-[height] duration-100 ease-in-out overflow-hidden",
          className
        )}
        ref={textareaRef}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
