import { useState, useEffect } from 'react';

export function useWidgetRegistry(defaultWidgets) {
  const [widgetRegistry, setWidgetRegistry] = useState(
    Object.fromEntries(defaultWidgets.map(w => [w.id, w]))
  );
  const registerWidget = widget => setWidgetRegistry(r => ({ ...r, [widget.id]: widget }));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.CoinetDashboard = window.CoinetDashboard || {};
      window.CoinetDashboard.registerWidget = registerWidget;
    }
  }, [registerWidget]);

  return { widgetRegistry, registerWidget };
} 