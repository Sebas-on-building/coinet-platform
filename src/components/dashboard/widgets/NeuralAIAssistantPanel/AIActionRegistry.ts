export type AIAction = {
  id: string;
  label: string;
  description?: string;
  apply: (context: any) => void;
};

export const AIActionRegistry: Record<string, AIAction> = {
  'increase-font-size': {
    id: 'increase-font-size',
    label: 'Increase Font Size',
    description: 'Make chart text larger for readability.',
    apply: (context) => {
      // Implement chart font size increase logic here
      if (context?.setFontSize) context.setFontSize((size: number) => size + 2);
    },
  },
  'highlight-outliers': {
    id: 'highlight-outliers',
    label: 'Highlight Outliers',
    description: 'Visually emphasize outlier data points.',
    apply: (context) => {
      // Implement outlier highlighting logic here
      if (context?.highlightOutliers) context.highlightOutliers();
    },
  },
  'reset-zoom': {
    id: 'reset-zoom',
    label: 'Reset Zoom',
    description: 'Reset chart zoom to default.',
    apply: (context) => {
      if (context?.resetZoom) context.resetZoom();
    },
  },
  'toggle-dark-mode': {
    id: 'toggle-dark-mode',
    label: 'Toggle Dark Mode',
    description: 'Switch between light and dark chart themes.',
    apply: (context) => {
      if (context?.toggleDarkMode) context.toggleDarkMode();
    },
  },
  'add-moving-average': {
    id: 'add-moving-average',
    label: 'Add Moving Average',
    description: 'Overlay a moving average indicator on the chart.',
    apply: (context) => {
      if (context?.addMovingAverage) context.addMovingAverage();
    },
  },
  'annotate-chart': {
    id: 'annotate-chart',
    label: 'Annotate Chart',
    description: 'Add a custom annotation to the chart.',
    apply: (context) => {
      if (context?.annotateChart) context.annotateChart();
    },
  },
  'export-as-image': {
    id: 'export-as-image',
    label: 'Export as Image',
    description: 'Export the current chart view as an image.',
    apply: (context) => {
      if (context?.exportAsImage) context.exportAsImage();
    },
  },
  'show-hide-grid': {
    id: 'show-hide-grid',
    label: 'Show/Hide Grid',
    description: 'Toggle the chart grid visibility.',
    apply: (context) => {
      if (context?.toggleGrid) context.toggleGrid();
    },
  },
  // Add more actions as needed
}; 