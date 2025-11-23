/**
 * Visual Strategy Builder
 * 
 * A drag-and-drop interface for creating trading strategies.
 * This is a wrapper that conditionally loads either the full React Flow 
 * implementation or a simplified version based on availability.
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Directly import the simplified version
const SimpleVisualStrategyBuilder = dynamic(
  () => import('./SimpleVisualStrategyBuilder'),
  { ssr: false, loading: () => <div className="w-full h-[600px] flex items-center justify-center">Loading strategy builder...</div> }
);

interface VisualStrategyBuilderProps {
  onCodeGenerate: (code: string) => void;
  onStrategyChange?: (valid: boolean) => void;
  initialNodes?: any[];
  initialEdges?: any[];
  className?: string;
}

/**
 * Visual Strategy Builder Component
 * 
 * This component will use the simplified version until the full implementation 
 * is available.
 */
const VisualStrategyBuilder: React.FC<VisualStrategyBuilderProps> = (props) => {
  return <SimpleVisualStrategyBuilder {...props} />;
};

export default VisualStrategyBuilder; 