import { useState, useEffect } from "react";

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetSettings {
  id: string;
  title: string;
  type: string;
  position: WidgetPosition;
  isVisible: boolean;
  refreshInterval?: number;
  config?: Record<string, any>;
}

interface UseWidgetSettingsProps {
  defaultSettings?: WidgetSettings[];
  storageKey?: string;
}

export function useWidgetSettings({
  defaultSettings = [],
  storageKey = "dashboard_widget_settings",
}: UseWidgetSettingsProps = {}) {
  const [settings, setSettings] = useState<WidgetSettings[]>(() => {
    if (typeof window === "undefined") return defaultSettings;

    const savedSettings = localStorage.getItem(storageKey);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  const updateWidget = (id: string, updates: Partial<WidgetSettings>) => {
    setSettings((prev) =>
      prev.map((widget) =>
        widget.id === id ? { ...widget, ...updates } : widget,
      ),
    );
  };

  const addWidget = (widget: WidgetSettings) => {
    setSettings((prev) => [...prev, widget]);
  };

  const removeWidget = (id: string) => {
    setSettings((prev) => prev.filter((widget) => widget.id !== id));
  };

  const updateWidgetPosition = (
    id: string,
    position: Partial<WidgetPosition>,
  ) => {
    const currentWidget = settings.find((w) => w.id === id);
    if (currentWidget) {
      const updatedPosition: WidgetPosition = {
        ...currentWidget.position,
        ...position,
      };
      updateWidget(id, { position: updatedPosition });
    }
  };

  const toggleWidgetVisibility = (id: string) => {
    const widget = settings.find((w) => w.id === id);
    if (widget) {
      updateWidget(id, { isVisible: !widget.isVisible });
    }
  };

  const updateWidgetConfig = (id: string, config: Record<string, any>) => {
    const widget = settings.find((w) => w.id === id);
    if (widget) {
      updateWidget(id, {
        config: { ...widget.config, ...config },
      });
    }
  };

  const resetToDefault = () => {
    setSettings(defaultSettings);
  };

  const reorderWidgets = (newOrder: string[]) => {
    const orderedSettings = newOrder
      .map((id) => settings.find((widget) => widget.id === id))
      .filter((widget): widget is WidgetSettings => widget !== undefined);

    setSettings(orderedSettings);
  };

  return {
    settings,
    updateWidget,
    addWidget,
    removeWidget,
    updateWidgetPosition,
    toggleWidgetVisibility,
    updateWidgetConfig,
    resetToDefault,
    reorderWidgets,
  };
}
