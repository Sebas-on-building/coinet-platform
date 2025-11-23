import React from 'react';
import { WidgetDraggable } from './WidgetDraggable';
import { spacing } from 'src/styles/tokens/spacing';

export const WidgetPanel: React.FC<{ widgets: React.ReactNode[] }> = ({ widgets }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: spacing.lg,
      padding: spacing.lg,
    }}
    role="list"
    aria-label="Dashboard widgets"
  >
    {widgets.map((widget, i) => (
      <WidgetDraggable key={i}>{widget}</WidgetDraggable>
    ))}
  </div>
); 