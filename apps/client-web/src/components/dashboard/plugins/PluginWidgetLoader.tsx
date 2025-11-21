import React from 'react';

export const PluginWidgetLoader = ({ widgetId, widgetRegistry, ...props }) => {
  const Widget = widgetRegistry[widgetId]?.component;
  if (!Widget) return null;
  return <Widget {...props} />;
}; 