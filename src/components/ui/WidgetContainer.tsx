// @ts-nocheck
import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

/**
 * WidgetContainer component
 * - Features: ARIA role, keyboard a11y, analytics event, microinteractions
 */
interface WidgetContainerProps {
  widget: any;
  config: any;
  onConfigChange: (newConfig: any) => void;
  children?: React.ReactNode;
  analyticsEvent?: string; // Analytics event name
}

export function WidgetContainer({
  widget,
  config,
  onConfigChange,
  children,
  analyticsEvent,
}: WidgetContainerProps) {
  const [configOpen, setConfigOpen] = useState(false);

  // Analytics event on config open
  const handleConfigOpen = () => {
    setConfigOpen(true);
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: widget?.name || "widget",
      });
    }
  };

  return (
    <div
      className="rounded-2xl shadow-magic bg-card-light dark:bg-card-dark p-4 relative group hover:scale-105 transition-transform"
      role="region"
      aria-label={widget?.name || "Widget"}
      tabIndex={0}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <Button
          size="sm"
          onClick={handleConfigOpen}
          aria-label={`Configure ${widget?.name || "widget"}`}
          tabIndex={0}
        >
          ⚙️
        </Button>
      </div>
      {children}
      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title={`Configure ${widget.name}`}
        analyticsEvent={analyticsEvent ? analyticsEvent + "_config" : undefined}
      >
        {/* Config form goes here */}
        <div className="text-gray-700 dark:text-gray-200">
          Widget config UI for {widget.name} (to be implemented)
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setConfigOpen(false)}
          className="mt-4"
        >
          Save
        </Button>
      </Modal>
    </div>
  );
}
