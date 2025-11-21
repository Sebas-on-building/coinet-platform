import { useState } from 'react';
import { Widget as WidgetComponent } from './Widget';
import { useAnalyticsStore } from '../../state/store';
import type { Widget } from '../../state/store';

export function AnalyticsCanvas() {
  const { widgets, addWidget, moveWidget } = useAnalyticsStore();

  return (
    <div className="relative flex-1 bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] rounded-3xl shadow-2xl p-8 overflow-auto">
      {widgets.map((widget: Widget) => (
        <WidgetComponent key={widget.id} {...widget} />
      ))}
      {/* Drag-and-drop logic, add widget button, etc. */}
    </div>
  );
} 