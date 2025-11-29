import React, { useState } from 'react';
import { WidgetDraggable } from './WidgetDraggable';
import { spacing } from 'src/styles/tokens/spacing';

export const WidgetPanelDnD: React.FC<{
  widgets: { id: string; type: string }[];
  onReorder: (widgets: { id: string; type: string }[]) => void;
  renderWidget: (type: string, id: string) => React.ReactNode;
}> = ({ widgets, onReorder, renderWidget }) => {
  const [dragged, setDragged] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDragged(id);
  const handleDrop = (id: string) => {
    if (!dragged || dragged === id) return;
    const from = widgets.findIndex(w => w.id === dragged);
    const to = widgets.findIndex(w => w.id === id);
    const reordered = [...widgets];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onReorder(reordered);
    setDragged(null);
  };

  return (
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
      {widgets.map((w, i) => (
        <div
          key={w.id}
          draggable
          onDragStart={() => handleDragStart(w.id)}
          onDragOver={e => { e.preventDefault(); }}
          onDrop={() => handleDrop(w.id)}
          style={{
            opacity: dragged === w.id ? 0.5 : 1,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <WidgetDraggable>
            {renderWidget(w.type, w.id)}
          </WidgetDraggable>
        </div>
      ))}
    </div>
  );
}; 