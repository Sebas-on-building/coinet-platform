import create from 'zustand';

export type Widget = {
  id: string;
  type: string;
  position?: { x: number; y: number };
  [key: string]: any;
};

type AnalyticsStore = {
  widgets: Widget[];
  addWidget: (widget: Widget) => void;
  moveWidget: (id: string, position: { x: number; y: number }) => void;
  // ... more actions
};

export const useAnalyticsStore = create<AnalyticsStore>(set => ({
  widgets: [],
  addWidget: (widget) => set(state => ({ widgets: [...state.widgets, widget] })),
  moveWidget: (id, position) => set(state => ({
    widgets: state.widgets.map(w => w.id === id ? { ...w, position } : w)
  })),
  // ... more actions
})); 