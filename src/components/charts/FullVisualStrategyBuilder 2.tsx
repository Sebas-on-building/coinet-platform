/**
 * Full Visual Strategy Builder
 * 
 * Advanced drag-and-drop interface for creating trading strategies using ReactFlow.
 * Design inspired by Canva, Apple, TradingView, and Solana - combining intuitive UX
 * with powerful finance capabilities.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  Node,
  Edge,
  Connection,
  NodeTypes,
  MarkerType,
  NodeToolbar,
  useReactFlow,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';

// Node components
import IndicatorNode from './strategy-nodes/IndicatorNode';
import ConditionNode from './strategy-nodes/ConditionNode';
import ActionNode from './strategy-nodes/ActionNode';
import OutputNode from './strategy-nodes/OutputNode';

// Strategy Compiler 
import { validateStrategy, generateStrategyCode, getStrategyDescription } from '@/lib/strategy/strategyCompiler';

// Icons
import {
  PlusIcon,
  ChartBarIcon,
  CogIcon,
  ArrowSmRightIcon,
  DocumentTextIcon,
  TrashIcon,
  RefreshIcon,
  CheckCircleIcon,
  XCircleIcon,
  SaveIcon,
  InformationCircleIcon
} from '@heroicons/react/outline';

// Custom styles
import './VisualStrategyBuilder.css';

// Define node types
const nodeTypes: NodeTypes = {
  indicatorNode: IndicatorNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  outputNode: OutputNode
};

// Helper function for generating unique node IDs
const getId = () => `node_${Math.random().toString(36).substr(2, 9)}`;

// Interface definitions
interface FullVisualStrategyBuilderProps {
  onCodeGenerate: (code: string) => void;
  onStrategyChange?: (valid: boolean) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  className?: string;
}

interface NodeData {
  id: string;
  label: string;
  params?: Record<string, any>;
  onChange?: (id: string, data: any) => void;
}

// Node template definitions
const nodeTemplates = {
  indicators: [
    { id: 'sma', label: 'Simple Moving Average', params: { period: 20 } },
    { id: 'ema', label: 'Exponential Moving Average', params: { period: 20 } },
    { id: 'rsi', label: 'Relative Strength Index', params: { period: 14 } },
    { id: 'macd', label: 'MACD', params: { fast: 12, slow: 26, signal: 9 } },
    { id: 'bollingerBands', label: 'Bollinger Bands', params: { period: 20, stdDev: 2 } },
    { id: 'ichimoku', label: 'Ichimoku Cloud', params: { conversionPeriod: 9, basePeriod: 26, laggingSpanPeriod: 52, displacement: 26 } },
  ],
  conditions: [
    { id: 'crossOver', label: 'Cross Over' },
    { id: 'crossUnder', label: 'Cross Under' },
    { id: 'greaterThan', label: 'Greater Than', params: { value: 0 } },
    { id: 'lessThan', label: 'Less Than', params: { value: 0 } },
    { id: 'between', label: 'Between', params: { min: 0, max: 100 } },
    { id: 'equalTo', label: 'Equal To', params: { value: 0, tolerance: 0.01 } },
  ],
  actions: [
    { id: 'buyMarket', label: 'Buy Market', params: { size: 100 } },
    { id: 'sellMarket', label: 'Sell Market', params: { size: 100 } },
    { id: 'setStopLoss', label: 'Set Stop Loss', params: { percent: 5 } },
    { id: 'setTakeProfit', label: 'Set Take Profit', params: { percent: 10 } },
    { id: 'buyLimit', label: 'Buy Limit', params: { price: 0, size: 100 } },
    { id: 'sellLimit', label: 'Sell Limit', params: { price: 0, size: 100 } },
  ],
  outputs: [
    { id: 'signalOutput', label: 'Signal Output' },
    { id: 'alertOutput', label: 'Alert Output', params: { message: 'Alert triggered', level: 'info' } },
    { id: 'logOutput', label: 'Log Output', params: { message: 'Strategy executed' } },
    { id: 'notificationOutput', label: 'Notification', params: { title: 'Strategy Alert', message: 'Your strategy condition was met' } },
  ]
};

// Edge style definitions - inspired by design systems
const edgeTypes = {
  default: {
    animated: true,
    style: {
      stroke: '#64748b',
      strokeWidth: 2
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#64748b',
    },
  },
  success: {
    animated: true,
    style: {
      stroke: '#10b981',
      strokeWidth: 2
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#10b981',
    },
  },
  warning: {
    animated: true,
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#f59e0b',
    },
  }
};

/**
 * Full Visual Strategy Builder Component
 * 
 * Advanced implementation using ReactFlow for a professional node-based
 * strategy building experience with Apple-inspired design aesthetics.
 */
const FullVisualStrategyBuilder: React.FC<FullVisualStrategyBuilderProps> = ({
  onCodeGenerate,
  onStrategyChange,
  initialNodes = [],
  initialEdges = [],
  className = ''
}) => {
  // Floating panel state
  const [floatingPanel, setFloatingPanel] = useState<{ visible: boolean, type: string, position: { x: number, y: number } }>({
    visible: false,
    type: 'indicators',
    position: { x: 0, y: 0 }
  });

  // React Flow instance
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.length > 0 ? initialNodes : []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges.length > 0 ? initialEdges : []);

  // Strategy validation state
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings?: string[];
  }>({ valid: false, errors: ['Strategy is empty. Add nodes to begin building.'] });

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEditingNodeParams, setIsEditingNodeParams] = useState(false);

  // Auto layout option - organized nodes for better presentation
  const [useAutoLayout, setUseAutoLayout] = useState(true);

  // Color mode (light/dark) - default to user preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Generate a color palette based on mode
  const colorPalette = isDarkMode ? {
    background: '#111827',
    panel: '#1f2937',
    panelLight: '#374151',
    text: '#f3f4f6',
    textMuted: '#9ca3af',
    accent: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    border: '#374151',
    indicatorNode: '#0c4a6e',
    conditionNode: '#4c1d95',
    actionNode: '#166534',
    outputNode: '#9a3412',
  } : {
    background: '#f8fafc',
    panel: '#ffffff',
    panelLight: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    accent: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    border: '#e2e8f0',
    indicatorNode: '#e0f2fe',
    conditionNode: '#f3e8ff',
    actionNode: '#dcfce7',
    outputNode: '#ffedd5',
  };

  // Strategy code state
  const [generatedCode, setGeneratedCode] = useState<string>('');

  // Detect dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setIsDarkMode(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Run validation when strategy changes
  useEffect(() => {
    if (nodes.length === 0) {
      setValidation({ valid: false, errors: ['Strategy is empty. Add nodes to begin building.'] });
      if (onStrategyChange) onStrategyChange(false);
      return;
    }

    const validationResult = validateStrategy(nodes, edges);
    setValidation(validationResult);

    if (onStrategyChange) {
      onStrategyChange(validationResult.valid);
    }
  }, [nodes, edges, onStrategyChange]);

  // Handle node parameter changes
  const handleNodeDataChange = useCallback((nodeId: string, newData: NodeData) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, [setNodes]);

  // Handle connection between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      // Check for valid connection types
      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // Determine edge type based on source and target
      let edgeType = 'default';
      if (sourceNode.type === 'conditionNode' && targetNode.type === 'actionNode') {
        edgeType = 'success';
      } else if (sourceNode.type === 'conditionNode' && targetNode.type === 'outputNode') {
        edgeType = 'warning';
      }

      const newEdge: Edge = {
        ...connection,
        id: `edge_${Math.random().toString(36).substr(2, 9)}`,
        type: edgeType,
        animated: true,
        data: {
          sourceType: sourceNode.type,
          targetType: targetNode.type
        }
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Clear node selection when clicking on canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setFloatingPanel(prev => ({ ...prev, visible: false }));
  }, []);

  // Creates a new node from template
  const createNodeFromTemplate = useCallback((template: any, type: string, position: { x: number, y: number }) => {
    const nodeId = getId();
    const nodeData = {
      id: template.id,
      label: template.label,
      params: template.params || {},
      onChange: handleNodeDataChange
    };

    const newNode: Node = {
      id: nodeId,
      type: `${type}Node`,
      position,
      data: nodeData,
    };

    setNodes((nds) => nds.concat(newNode));
    return newNode;
  }, [handleNodeDataChange, setNodes]);

  // Handle adding a node via the floating menu
  const handleAddNode = useCallback((template: any, type: string) => {
    // Add node in center of viewport if no specific position
    const position = {
      x: floatingPanel.position.x,
      y: floatingPanel.position.y
    };

    createNodeFromTemplate(template, type, position);
    setFloatingPanel(prev => ({ ...prev, visible: false }));
  }, [createNodeFromTemplate, floatingPanel]);

  // Handle node dragging state
  const onNodeDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const onNodeDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle showing add node panel
  const showAddNodePanel = useCallback((event: React.MouseEvent, type: string) => {
    // Get panel position relative to the flow container
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const position = reactFlowBounds
      ? reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })
      : { x: 0, y: 0 };

    setFloatingPanel({
      visible: true,
      type,
      position
    });
  }, [reactFlowInstance]);

  // Handle deleting a node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Auto-organize nodes for better layout
  const autoLayoutNodes = useCallback(() => {
    if (nodes.length === 0) return;

    // Simple layered layout algorithm
    const nodesByType = {
      indicatorNode: [] as Node[],
      conditionNode: [] as Node[],
      actionNode: [] as Node[],
      outputNode: [] as Node[]
    };

    // Group nodes by type
    nodes.forEach(node => {
      if (node.type && nodesByType[node.type as keyof typeof nodesByType]) {
        nodesByType[node.type as keyof typeof nodesByType].push(node);
      }
    });

    // Set positions in layers
    const columnWidth = 300;
    const rowHeight = 150;
    const margin = 20;

    // Update node positions
    const newNodes = [...nodes];

    // Position indicator nodes in the first column
    nodesByType.indicatorNode.forEach((node, index) => {
      const existingNode = newNodes.find(n => n.id === node.id);
      if (existingNode) {
        existingNode.position = {
          x: 100,
          y: 100 + index * (rowHeight + margin)
        };
      }
    });

    // Position condition nodes in the second column
    nodesByType.conditionNode.forEach((node, index) => {
      const existingNode = newNodes.find(n => n.id === node.id);
      if (existingNode) {
        existingNode.position = {
          x: 100 + columnWidth,
          y: 100 + index * (rowHeight + margin)
        };
      }
    });

    // Position action nodes in the third column
    nodesByType.actionNode.forEach((node, index) => {
      const existingNode = newNodes.find(n => n.id === node.id);
      if (existingNode) {
        existingNode.position = {
          x: 100 + columnWidth * 2,
          y: 100 + index * (rowHeight + margin)
        };
      }
    });

    // Position output nodes in the fourth column
    nodesByType.outputNode.forEach((node, index) => {
      const existingNode = newNodes.find(n => n.id === node.id);
      if (existingNode) {
        existingNode.position = {
          x: 100 + columnWidth * 3,
          y: 100 + index * (rowHeight + margin)
        };
      }
    });

    setNodes(newNodes);
  }, [nodes, setNodes]);

  // Generate code from the strategy
  const handleGenerateCode = useCallback(() => {
    if (!validation.valid) {
      alert('Please fix validation errors before generating code.');
      return;
    }

    try {
      const code = generateStrategyCode(nodes, edges);
      setGeneratedCode(code);
      onCodeGenerate(code);
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [nodes, edges, validation.valid, onCodeGenerate]);

  // Clear the entire strategy
  const handleClearStrategy = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the entire strategy? This action cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setGeneratedCode('');
    }
  }, [setNodes, setEdges]);

  // Use auto layout on first render if enabled
  useEffect(() => {
    if (useAutoLayout && nodes.length > 0) {
      autoLayoutNodes();
    }
  }, [useAutoLayout, autoLayoutNodes, nodes.length]);

  // Render add node panel - beautiful floating panel inspired by Canva/Apple
  const renderAddNodePanel = () => {
    if (!floatingPanel.visible) return null;

    const templates = nodeTemplates[floatingPanel.type as keyof typeof nodeTemplates] || [];
    const panelType = floatingPanel.type;

    // Map panel type to its icon and title
    const panelInfo = {
      indicators: { icon: <ChartBarIcon className="w-5 h-5" />, title: 'Add Indicator' },
      conditions: { icon: <CogIcon className="w-5 h-5" />, title: 'Add Condition' },
      actions: { icon: <ArrowSmRightIcon className="w-5 h-5" />, title: 'Add Action' },
      outputs: { icon: <DocumentTextIcon className="w-5 h-5" />, title: 'Add Output' }
    };

    // Map panel type to node type
    const nodeTypeMap = {
      indicators: 'indicator',
      conditions: 'condition',
      actions: 'action',
      outputs: 'output'
    };

    const nodeType = nodeTypeMap[panelType as keyof typeof nodeTypeMap];
    const { icon, title } = panelInfo[panelType as keyof typeof panelInfo];

    return (
      <div
        className="node-panel"
        style={{
          position: 'absolute',
          left: floatingPanel.position.x,
          top: floatingPanel.position.y,
          zIndex: 10,
          backgroundColor: colorPalette.panel,
          border: `1px solid ${colorPalette.border}`,
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          width: '240px',
          overflow: 'hidden',
        }}
      >
        <div
          className="node-panel-header"
          style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${colorPalette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colorPalette.panelLight,
          }}
        >
          <div className="flex items-center">
            <span className="mr-2" style={{ color: colorPalette.accent }}>{icon}</span>
            <span style={{ fontWeight: 500, color: colorPalette.text }}>{title}</span>
          </div>
          <button
            onClick={() => setFloatingPanel(prev => ({ ...prev, visible: false }))}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: colorPalette.textMuted,
              cursor: 'pointer'
            }}
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>

        <div
          className="node-panel-content"
          style={{
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {templates.map((template) => (
            <div
              key={template.id}
              className="node-template"
              onClick={() => handleAddNode(template, nodeType)}
              style={{
                padding: '8px 12px',
                margin: '4px 0',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: colorPalette.panelLight,
                color: colorPalette.text,
                fontSize: '13px',
                fontWeight: 450,
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colorPalette.accent;
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colorPalette.panelLight;
                e.currentTarget.style.color = colorPalette.text;
              }}
            >
              <span className="mr-2" style={{ color: 'inherit' }}>{icon}</span>
              {template.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={reactFlowWrapper}
      className={`strategy-builder ${className}`}
      style={{
        width: '100%',
        height: '600px',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: colorPalette.background
      }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: colorPalette.accent, strokeWidth: 2 }}
          defaultEdgeOptions={{
            type: 'default',
            animated: true
          }}
        >
          {/* Background pattern */}
          <Background
            variant={BackgroundVariant.Dots}
            color={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
            gap={20}
            size={1}
          />

          {/* Render floating add node menu */}
          {renderAddNodePanel()}

          {/* Node toolbar for node actions */}
          {selectedNode && (
            <NodeToolbar
              nodeId={selectedNode.id}
              position="top"
              className="node-toolbar"
              style={{
                backgroundColor: colorPalette.panel,
                border: `1px solid ${colorPalette.border}`,
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <button
                onClick={() => setIsEditingNodeParams(!isEditingNodeParams)}
                className="toolbar-button"
                style={{
                  backgroundColor: isEditingNodeParams ? colorPalette.accent : 'transparent',
                  color: isEditingNodeParams ? '#fff' : colorPalette.text,
                  border: `1px solid ${isEditingNodeParams ? colorPalette.accent : colorPalette.border}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <CogIcon className="w-4 h-4 mr-1" />
                Edit
              </button>

              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="toolbar-button"
                style={{
                  backgroundColor: 'transparent',
                  color: colorPalette.error,
                  border: `1px solid ${colorPalette.error}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colorPalette.error;
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colorPalette.error;
                }}
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                Delete
              </button>
            </NodeToolbar>
          )}

          {/* Control panel for adding nodes */}
          <Panel position="top-right" className="control-panel">
            <div
              style={{
                backgroundColor: colorPalette.panel,
                border: `1px solid ${colorPalette.border}`,
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div className="panel-title" style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: colorPalette.text
              }}>
                Add Node
              </div>

              <div className="panel-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={(e) => showAddNodePanel(e, 'indicators')}
                  style={{
                    backgroundColor: colorPalette.indicatorNode,
                    color: isDarkMode ? '#e0f2fe' : '#0c4a6e',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover:shadow-md"
                >
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Indicator
                </button>

                <button
                  onClick={(e) => showAddNodePanel(e, 'conditions')}
                  style={{
                    backgroundColor: colorPalette.conditionNode,
                    color: isDarkMode ? '#f3e8ff' : '#4c1d95',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover:shadow-md"
                >
                  <CogIcon className="w-4 h-4 mr-2" />
                  Condition
                </button>

                <button
                  onClick={(e) => showAddNodePanel(e, 'actions')}
                  style={{
                    backgroundColor: colorPalette.actionNode,
                    color: isDarkMode ? '#dcfce7' : '#166534',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover:shadow-md"
                >
                  <ArrowSmRightIcon className="w-4 h-4 mr-2" />
                  Action
                </button>

                <button
                  onClick={(e) => showAddNodePanel(e, 'outputs')}
                  style={{
                    backgroundColor: colorPalette.outputNode,
                    color: isDarkMode ? '#ffedd5' : '#9a3412',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover:shadow-md"
                >
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  Output
                </button>
              </div>
            </div>
          </Panel>

          {/* Action buttons panel at the bottom */}
          <Panel position="bottom-center" className="action-panel">
            <div
              style={{
                backgroundColor: colorPalette.panel,
                border: `1px solid ${colorPalette.border}`,
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <button
                onClick={handleGenerateCode}
                disabled={!validation.valid}
                style={{
                  backgroundColor: validation.valid ? colorPalette.accent : colorPalette.panelLight,
                  color: validation.valid ? 'white' : colorPalette.textMuted,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 500,
                  cursor: validation.valid ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                Generate Code
              </button>

              <button
                onClick={autoLayoutNodes}
                style={{
                  backgroundColor: 'transparent',
                  color: colorPalette.text,
                  border: `1px solid ${colorPalette.border}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <RefreshIcon className="w-4 h-4 mr-2" />
                Auto Layout
              </button>

              <button
                onClick={handleClearStrategy}
                style={{
                  backgroundColor: 'transparent',
                  color: colorPalette.error,
                  border: `1px solid ${colorPalette.error}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Clear All
              </button>

              {/* Validation status indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  backgroundColor: validation.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  color: validation.valid ? colorPalette.success : colorPalette.error,
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {validation.valid ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Strategy Valid
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-4 h-4 mr-2" />
                    {validation.errors.length > 0 ? validation.errors[0] : 'Invalid Strategy'}
                  </>
                )}
              </div>
            </div>
          </Panel>

          {/* Zoom controls */}
          <Controls
            showInteractive={false}
            style={{
              border: `1px solid ${colorPalette.border}`,
              borderRadius: '8px',
              backgroundColor: colorPalette.panel,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default FullVisualStrategyBuilder; 