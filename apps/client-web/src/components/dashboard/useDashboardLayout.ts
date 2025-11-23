import { useState, useEffect } from 'react';

export function useDashboardLayout(defaultWidgets) {
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboardLayout');
    return saved ? JSON.parse(saved) : defaultWidgets.map((w, i) => ({ id: w.id, x: 0, y: i, w: 1, h: 1 }));
  });

  useEffect(() => {
    localStorage.setItem('dashboardLayout', JSON.stringify(layout));
  }, [layout]);

  const addWidget = id => setLayout(l => [...l, { id, x: 0, y: l.length, w: 1, h: 1 }]);
  const removeWidget = id => setLayout(l => l.filter(w => w.id !== id));
  // TODO: Implement moveWidget, resizeWidget
  return { layout, addWidget, removeWidget };
} 