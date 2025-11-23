import React, { createContext, useContext, useRef, useCallback } from 'react';

export interface ChartContextType {
  resetZoom: () => void;
  toggleDarkMode: () => void;
  addMovingAverage: () => void;
  annotateChart: (annotation?: any) => void;
  exportAsImage: () => void;
  toggleGrid: () => void;
  setFontSize: (fn: (size: number) => number) => void;
  highlightOutliers: () => void;
  // Add more chart actions as needed
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // These would be implemented with refs to the actual chart instance
  const fontSizeRef = useRef(14);

  const resetZoom = useCallback(() => {
    // Implement chart zoom reset
    // chartRef.current?.resetZoom();
  }, []);

  const toggleDarkMode = useCallback(() => {
    // Implement theme toggle
    // themeContext.toggle();
  }, []);

  const addMovingAverage = useCallback(() => {
    // Implement adding a moving average indicator
    // chartRef.current?.addIndicator('ma');
  }, []);

  const annotateChart = useCallback((annotation?: any) => {
    // Implement annotation logic
    // chartRef.current?.addAnnotation(annotation);
  }, []);

  const exportAsImage = useCallback(() => {
    // Implement export as image
    // chartRef.current?.exportAsImage();
  }, []);

  const toggleGrid = useCallback(() => {
    // Implement grid toggle
    // chartRef.current?.toggleGrid();
  }, []);

  const setFontSize = useCallback((fn: (size: number) => number) => {
    fontSizeRef.current = fn(fontSizeRef.current);
    // chartRef.current?.setFontSize(fontSizeRef.current);
  }, []);

  const highlightOutliers = useCallback(() => {
    // Implement outlier highlighting
    // chartRef.current?.highlightOutliers();
  }, []);

  const value: ChartContextType = {
    resetZoom,
    toggleDarkMode,
    addMovingAverage,
    annotateChart,
    exportAsImage,
    toggleGrid,
    setFontSize,
    highlightOutliers,
  };

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
};

export function useChartContext() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChartContext must be used within a ChartProvider');
  return ctx;
} 