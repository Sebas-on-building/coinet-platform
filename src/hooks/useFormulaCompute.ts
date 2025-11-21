/**
 * useFormulaCompute Hook
 * 
 * A custom React hook that handles formula computation in a web worker
 * to prevent UI blocking for complex or lengthy calculations.
 */

import { useState, useEffect, useRef } from 'react';
import { Candle } from '@/lib/indicators/types';
import { createDataFromCandles } from '@/lib/formula';

interface ComputeOptions {
  formula: string;
  data: Candle[];
  autoCompute?: boolean;
}

interface ComputeResult {
  result: number[] | null;
  error: string | null;
  isComputing: boolean;
  compute: () => void;
}

/**
 * React hook for computing formulas in a web worker
 * 
 * @param options - Formula and data configuration
 * @returns Computation state and control function
 */
export function useFormulaCompute(options: ComputeOptions): ComputeResult {
  const { formula, data, autoCompute = true } = options;

  const [result, setResult] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);

  // Use ref to avoid recreating worker on every render
  const workerRef = useRef<Worker | null>(null);

  // Function to trigger computation
  const compute = () => {
    if (!formula || !data.length) {
      setError('Formula or data is empty');
      return;
    }

    setIsComputing(true);
    setError(null);

    // Convert candles to data series for formula computation
    const dataSeries = createDataFromCandles(data);

    // If worker doesn't exist or was terminated, create a new one
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/formulaWorker.ts', import.meta.url)
      );
    }

    // Set up message listener
    const handleMessage = (e: MessageEvent) => {
      setIsComputing(false);

      if (e.data.error) {
        setError(e.data.error);
        setResult(null);
      } else {
        setResult(e.data.result);
        setError(null);
      }
    };

    workerRef.current.addEventListener('message', handleMessage);

    // Send data to worker
    workerRef.current.postMessage({
      formula,
      data: dataSeries
    });

    // Return cleanup function to remove listener
    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener('message', handleMessage);
      }
    };
  };

  // Auto-compute when formula or data changes
  useEffect(() => {
    if (autoCompute) {
      const cleanup = compute();

      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [formula, data, autoCompute]);

  // Clean up worker when component unmounts
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    result,
    error,
    isComputing,
    compute
  };
} 