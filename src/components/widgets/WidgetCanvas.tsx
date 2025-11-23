import React, { useState } from 'react';
import { widgetRegistry } from './WidgetRegistry';
import styles from './WidgetCanvas.module.css';

export const WidgetCanvas: React.FC = () => {
  const [widgets, setWidgets] = useState<{ key: string; id: string }[]>([]);
  const addWidget = (key: string) => setWidgets(w => [...w, { key, id: Math.random().toString(36).slice(2) }]);
  return (
    <div className={styles.canvas}>
      <div className={styles.palette}>
        {widgetRegistry.map(w => (
          <button key={w.key} onClick={() => addWidget(w.key)} className={styles.paletteBtn}>
            {w.icon} {w.title}
          </button>
        ))}
      </div>
      <div className={styles.widgets}>
        {widgets.map(w => {
          const widget = widgetRegistry.find(reg => reg.key === w.key);
          return widget ? <div key={w.id}>{widget.render()}</div> : null;
        })}
      </div>
    </div>
  );
}; 