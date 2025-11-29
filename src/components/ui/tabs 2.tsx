"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { twMerge } from 'tailwind-merge';

/**
 * Tabs component
 * - Features: ARIA, analytics event on tab change, a11y, microinteractions
 */
// Context for managing tabs
const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: "",
  onValueChange: () => { },
});

// Types for our components
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  analyticsEvent?: string; // Analytics event name
  tabs?: TabItem[];  // Added tabs prop
  activeTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'segmented' | 'contained';
  contentClassName?: string;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export interface TabItem {
  id: string;
  label: string;
  icon: JSX.Element | null;
}

const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  analyticsEvent,
  tabs,
  activeTab: externalActiveTab,
  onChange,
  variant = 'underline',
  contentClassName = '',
}: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState<string>(externalActiveTab || (tabs && tabs.length > 0 ? tabs[0].id : ''));

  // Support for both React children and tabs prop
  const hasChildrenTabs = React.Children.count(children) > 0;

  // Update active tab if external control changes
  React.useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  const handleValueChange = (val: string) => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, { label: val });
    }
    if (onValueChange) onValueChange(val);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  const getTabStyles = (variant: string, isActive: boolean) => {
    switch (variant) {
      case 'pills':
        return twMerge(
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-300'
        );
      case 'segmented':
        return twMerge(
          'px-3 py-1.5 text-sm font-medium flex-1 transition-colors border-y border-r first:border-l first:rounded-l-lg last:rounded-r-lg',
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
        );
      case 'contained':
        return twMerge(
          'px-3 py-1.5 text-sm font-medium transition-colors border-b-2',
          isActive
            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 border-blue-500'
            : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-transparent'
        );
      case 'underline':
      default:
        return twMerge(
          'px-3 py-2 text-sm font-medium transition-colors border-b-2',
          isActive
            ? 'text-blue-600 dark:text-blue-300 border-blue-500'
            : 'text-gray-700 dark:text-gray-300 border-transparent hover:text-blue-600 dark:hover:text-blue-300 hover:border-gray-300 dark:hover:border-gray-700'
        );
    }
  };

  const renderTabsFromProps = () => {
    if (!tabs || tabs.length === 0) return null;

    return (
      <div className={`flex ${variant === 'segmented' ? 'p-1 bg-gray-100 dark:bg-gray-800 rounded-lg' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={getTabStyles(variant, tab.id === activeTab)}
            onClick={() => handleTabClick(tab.id)}
            aria-selected={tab.id === activeTab}
            role="tab"
          >
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderTabsFromChildren = () => {
    if (!hasChildrenTabs) return null;

    return (
      <div className={`flex ${variant === 'segmented' ? 'p-1 bg-gray-100 dark:bg-gray-800 rounded-lg' : ''}`}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;

          const id = child.props.id || '';
          const label = child.props.label || '';
          const icon = child.props.icon || null;

          return (
            <button
              key={id}
              className={getTabStyles(variant, id === activeTab)}
              onClick={() => handleTabClick(id)}
              aria-selected={id === activeTab}
              role="tab"
            >
              {icon && <span className="mr-1.5">{icon}</span>}
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (hasChildrenTabs) {
      return React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;

        const id = child.props.id || '';

        if (id !== activeTab) return null;

        return (
          <div key={id} role="tabpanel" className={contentClassName}>
            {child}
          </div>
        );
      });
    } else if (React.isValidElement(children)) {
      return <div role="tabpanel" className={contentClassName}>{children}</div>;
    }

    return null;
  };

  return (
    <div className={className}>
      {tabs ? renderTabsFromProps() : renderTabsFromChildren()}
      {renderContent()}
    </div>
  );
};

// Radix UI based tabs components
// Root component that wraps the Radix Tabs
const RadixTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={cn("w-full", className)}
    {...props}
  />
));
RadixTabs.displayName = TabsPrimitive.Root.displayName;

// Tabs list component
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
    role="presentation"
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

// Tabs trigger component
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
    role="tab"
    aria-selected={props["aria-selected"] ?? false}
    tabIndex={0}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// Tabs content component
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
    role="tabpanel"
    tabIndex={0}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// Export both implementations
export {
  Tabs,
  RadixTabs as Tabs2,
  TabsList,
  TabsTrigger,
  TabsContent
};
