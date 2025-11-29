/**
 * Simple Visual Strategy Builder
 * 
 * A simplified version of the visual strategy builder that serves as
 * an initial implementation while we develop the more complex version.
 */

import React, { useState, useCallback } from 'react';
import {
  ChartBarIcon,
  CogIcon,
  ArrowSmallRightIcon as ArrowSmRightIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  BoltIcon as LightningBoltIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Sample strategy template
const strategyTemplate = `/**
 * Auto-generated Trading Strategy
 * Created with Coinet Visual Strategy Builder
 */

import { OHLCV, Signal, Strategy, StrategyContext } from '@/lib/strategy/types';
import { calculateSMA, calculateRSI, crossOver } from '@/lib/indicators';

export class GeneratedStrategy implements Strategy {
  private signals: Signal[] = [];
  
  constructor() {
    // Initialize strategy
    this.reset();
  }

  reset(): void {
    this.signals = [];
  }

  /**
   * Execute the strategy on each candle update
   */
  update(context: StrategyContext): void {
    const { ohlcv, time } = context;
    
    // Clear previous signals
    this.signals = [];
    
    // Calculate indicators
    const sma20 = calculateSMA(ohlcv.close, 20);
    const sma50 = calculateSMA(ohlcv.close, 50);
    const rsi = calculateRSI(ohlcv.close, 14);
    
    // Get current price
    const currentPrice = ohlcv.close[ohlcv.close.length - 1];
    
    // Strategy logic
    const isSMA20CrossAboveSMA50 = crossOver(sma20, sma50);
    const isRSIOverSold = rsi < 30;
    
    // Generate buy signal on SMA cross and oversold RSI
    if (isSMA20CrossAboveSMA50 && isRSIOverSold) {
      this.signals.push({
        type: 'buy',
        price: currentPrice,
        time,
        size: 100,
        reason: 'SMA20 crossed above SMA50 with oversold RSI'
      });
      
      // Set stop loss 5% below entry
      this.signals.push({
        type: 'stopLoss',
        price: currentPrice * 0.95,
        time,
        reason: 'Stop loss 5%'
      });
      
      // Set take profit 15% above entry
      this.signals.push({
        type: 'takeProfit',
        price: currentPrice * 1.15,
        time,
        reason: 'Take profit 15%'
      });
    }
  }
  
  /**
   * Get generated trading signals
   */
  getSignals(): Signal[] {
    return this.signals;
  }
}`;

interface SimpleVisualStrategyBuilderProps {
  onCodeGenerate: (code: string) => void;
  onStrategyChange?: (valid: boolean) => void;
}

const SimpleVisualStrategyBuilder: React.FC<SimpleVisualStrategyBuilderProps> = ({
  onCodeGenerate,
  onStrategyChange
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [nodes, setNodes] = useState<Array<{ id: string, type: string, label: string }>>([]);

  // Add a node to the strategy
  const addNode = (type: string, label: string) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      label
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    setActiveNode(newNode.id);

    // Mark as valid if we have at least one of each type
    const hasIndicator = [...nodes, newNode].some(n => n.type === 'indicator');
    const hasCondition = [...nodes, newNode].some(n => n.type === 'condition');
    const hasAction = [...nodes, newNode].some(n => n.type === 'action');

    const valid = hasIndicator && hasCondition && hasAction;
    setIsValid(valid);

    if (onStrategyChange) {
      onStrategyChange(valid);
    }
  };

  // Remove a node from the strategy
  const removeNode = (id: string) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== id));

    if (activeNode === id) {
      setActiveNode(null);
    }

    // Update validity
    const remainingNodes = nodes.filter(node => node.id !== id);
    const hasIndicator = remainingNodes.some(n => n.type === 'indicator');
    const hasCondition = remainingNodes.some(n => n.type === 'condition');
    const hasAction = remainingNodes.some(n => n.type === 'action');

    const valid = hasIndicator && hasCondition && hasAction;
    setIsValid(valid);

    if (onStrategyChange) {
      onStrategyChange(valid);
    }
  };

  // Generate code
  const generateCode = useCallback(() => {
    // In the real implementation, this would generate code based on the nodes
    // For now, we'll just return the template
    onCodeGenerate(strategyTemplate);
  }, [onCodeGenerate]);

  // Clear the strategy
  const clearStrategy = () => {
    if (window.confirm('Are you sure you want to clear the strategy?')) {
      setNodes([]);
      setActiveNode(null);
      setIsValid(false);

      if (onStrategyChange) {
        onStrategyChange(false);
      }
    }
  };

  return (
    <div className="flex h-[600px] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Sidebar with building blocks */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm p-4 overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Strategy Blocks</h3>

        {/* Indicators */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <ChartBarIcon className="w-4 h-4 mr-1" />
            Indicators
          </h4>
          <div className="space-y-2">
            {[
              { id: 'sma', label: 'Simple Moving Average' },
              { id: 'ema', label: 'Exponential Moving Average' },
              { id: 'rsi', label: 'Relative Strength Index' },
              { id: 'macd', label: 'MACD' }
            ].map(indicator => (
              <button
                key={indicator.id}
                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800 
                         w-full text-left cursor-pointer flex items-center shadow-sm hover:shadow-md transition-shadow"
                onClick={() => addNode('indicator', indicator.label)}
              >
                <ChartBarIcon className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                <span className="text-sm">{indicator.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <CogIcon className="w-4 h-4 mr-1" />
            Conditions
          </h4>
          <div className="space-y-2">
            {[
              { id: 'crossOver', label: 'Cross Over' },
              { id: 'crossUnder', label: 'Cross Under' },
              { id: 'greaterThan', label: 'Greater Than' },
              { id: 'lessThan', label: 'Less Than' }
            ].map(condition => (
              <button
                key={condition.id}
                className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800 
                         w-full text-left cursor-pointer flex items-center shadow-sm hover:shadow-md transition-shadow"
                onClick={() => addNode('condition', condition.label)}
              >
                <CogIcon className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400" />
                <span className="text-sm">{condition.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <ArrowSmRightIcon className="w-4 h-4 mr-1" />
            Actions
          </h4>
          <div className="space-y-2">
            {[
              { id: 'buyMarket', label: 'Buy Market' },
              { id: 'sellMarket', label: 'Sell Market' },
              { id: 'setStopLoss', label: 'Set Stop Loss' },
              { id: 'setTakeProfit', label: 'Set Take Profit' }
            ].map(action => (
              <button
                key={action.id}
                className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800 
                         w-full text-left cursor-pointer flex items-center shadow-sm hover:shadow-md transition-shadow"
                onClick={() => addNode('action', action.label)}
              >
                <ArrowSmRightIcon className="w-4 h-4 mr-2 text-green-500 dark:text-green-400" />
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Output */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <DocumentTextIcon className="w-4 h-4 mr-1" />
            Outputs
          </h4>
          <div className="space-y-2">
            {[
              { id: 'signalOutput', label: 'Signal Output' },
              { id: 'alertOutput', label: 'Alert Output' }
            ].map(output => (
              <button
                key={output.id}
                className="p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-md border border-yellow-200 dark:border-yellow-800 
                         w-full text-left cursor-pointer flex items-center shadow-sm hover:shadow-md transition-shadow"
                onClick={() => addNode('output', output.label)}
              >
                <DocumentTextIcon className="w-4 h-4 mr-2 text-yellow-500 dark:text-yellow-400" />
                <span className="text-sm">{output.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800 p-4">
        {/* Action buttons */}
        <div className="mb-4 flex justify-between">
          <div className="flex space-x-2">
            <button
              onClick={clearStrategy}
              className="px-3 py-1 bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 
                      rounded-md shadow-sm border border-gray-300 dark:border-gray-700 text-sm flex items-center"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Clear
            </button>

            <button
              onClick={() => generateCode()}
              disabled={!isValid}
              className={`px-3 py-1 rounded-md shadow-sm border text-sm flex items-center ${isValid
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                }`}
            >
              <LightningBoltIcon className="w-4 h-4 mr-1" />
              Generate Code
            </button>
          </div>

          <div className={`flex items-center px-3 py-1 rounded-md text-sm font-medium ${isValid
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
            {isValid ? (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Strategy Valid
              </>
            ) : (
              <>
                <InformationCircleIcon className="w-4 h-4 mr-1" />
                {nodes.length === 0 ? 'Add components to build a strategy' : 'Strategy incomplete'}
              </>
            )}
          </div>
        </div>

        {/* Strategy building area */}
        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 overflow-auto p-4">
          {nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <PlusIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-center">Add components from the sidebar to build your strategy</p>
              <p className="text-sm mt-2 max-w-md text-center">Drag and drop functionality will be available in the full implementation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group nodes by type */}
              {['indicator', 'condition', 'action', 'output'].map(groupType => {
                const groupNodes = nodes.filter(node => node.type === groupType);
                if (groupNodes.length === 0) return null;

                return (
                  <div key={groupType} className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                      {groupType}s
                    </h3>
                    <div className="space-y-2">
                      {groupNodes.map(node => (
                        <div
                          key={node.id}
                          className={`p-3 rounded-md border flex items-center justify-between ${activeNode === node.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                          onClick={() => setActiveNode(node.id)}
                        >
                          <div className="flex items-center">
                            {node.type === 'indicator' && <ChartBarIcon className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />}
                            {node.type === 'condition' && <CogIcon className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400" />}
                            {node.type === 'action' && <ArrowSmRightIcon className="w-4 h-4 mr-2 text-green-500 dark:text-green-400" />}
                            {node.type === 'output' && <DocumentTextIcon className="w-4 h-4 mr-2 text-yellow-500 dark:text-yellow-400" />}
                            <span className="text-sm text-gray-700 dark:text-gray-300">{node.label}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNode(node.id);
                            }}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info message */}
        <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs rounded-md">
          Note: This is a simplified version of the strategy builder. The full implementation will include
          drag-and-drop node connections, parameter editing, and real-time validation.
        </div>
      </div>
    </div>
  );
};

export default SimpleVisualStrategyBuilder; 