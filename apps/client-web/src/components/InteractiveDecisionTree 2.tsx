import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisionNode } from "@/types/naturalLanguage";
import { 
  GitBranch, 
  Database, 
  Zap, 
  Settings2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from "lucide-react";

interface InteractiveDecisionTreeProps {
  decisionNodes: DecisionNode[];
  className?: string;
}

const nodeTypes = {
  decision: ({ data }: { data: any }) => (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-card border-2 min-w-[200px] ${
      data.selected ? 'border-primary' : 'border-border'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {data.type === "condition" && <GitBranch className="h-4 w-4 text-blue-500" />}
        {data.type === "action" && <Zap className="h-4 w-4 text-green-500" />}
        {data.type === "data" && <Database className="h-4 w-4 text-purple-500" />}
        {data.type === "logic" && <Settings2 className="h-4 w-4 text-orange-500" />}
        <Badge variant="outline" className="text-xs">
          {data.type}
        </Badge>
      </div>
      <div className="font-medium text-sm mb-1">{data.label}</div>
      <div className="text-xs text-muted-foreground">{data.description}</div>
      {data.metadata && (
        <div className="mt-2 text-xs">
          {data.metadata.priority && (
            <Badge variant="secondary" className="mr-1">
              Priority: {data.metadata.priority}
            </Badge>
          )}
          {data.metadata.threshold && (
            <Badge variant="outline" className="mr-1">
              Threshold: {data.metadata.threshold}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
};

export function InteractiveDecisionTree({ decisionNodes, className = "" }: InteractiveDecisionTreeProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [simulationActive, setSimulationActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Convert decision nodes to React Flow format
  const createFlowNodes = (): Node[] => {
    return decisionNodes.map((node, index) => ({
      id: node.id,
      type: 'decision',
      position: { 
        x: index * 250, 
        y: Math.floor(index / 3) * 150 
      },
      data: {
        ...node,
        selected: selectedNode === node.id
      }
    }));
  };

  const createFlowEdges = (): Edge[] => {
    const edges: Edge[] = [];
    decisionNodes.forEach(node => {
      node.children.forEach(childId => {
        edges.push({
          id: `${node.id}-${childId}`,
          source: node.id,
          target: childId,
          type: 'smoothstep',
          animated: simulationActive,
          style: { stroke: simulationActive ? 'hsl(var(--primary))' : 'hsl(var(--border))' }
        });
      });
    });
    return edges;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(createFlowNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(createFlowEdges());

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          selected: n.id === node.id
        }
      }))
    );
  }, [setNodes]);

  const startSimulation = () => {
    setSimulationActive(true);
    setCurrentStep(0);
    
    // Simulate step-by-step execution
    const interval = setInterval(() => {
      setCurrentStep((step) => {
        if (step >= decisionNodes.length - 1) {
          clearInterval(interval);
          setSimulationActive(false);
          return 0;
        }
        
        // Highlight current node
        setSelectedNode(decisionNodes[step + 1].id);
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: {
              ...n.data,
              selected: n.id === decisionNodes[step + 1].id
            }
          }))
        );
        
        return step + 1;
      });
    }, 1500);
  };

  const selectedNodeData = selectedNode 
    ? decisionNodes.find(n => n.id === selectedNode)
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Interactive Decision Flow</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startSimulation}
                disabled={simulationActive}
              >
                {simulationActive ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] border rounded-lg bg-background">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.1 }}
            >
              <Controls />
              <Background />
              <MiniMap 
                nodeColor={(n) => {
                  switch (n.data?.type) {
                    case 'condition': return '#192CFC';
                    case 'action': return '#10B981';
                    case 'data': return '#8B5CF6';
                    case 'logic': return '#F59E0B';
                    default: return '#6B7280';
                  }
                }}
                className="bg-background"
              />
              <Panel position="top-right">
                <div className="bg-card p-3 rounded-lg border shadow-lg">
                  <div className="text-sm font-medium mb-2">Legend</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3 text-blue-500" />
                      <span>Condition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-green-500" />
                      <span>Action</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3 text-purple-500" />
                      <span>Data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-3 w-3 text-orange-500" />
                      <span>Logic</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {selectedNodeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedNodeData.type === "condition" && <GitBranch className="h-5 w-5 text-blue-500" />}
              {selectedNodeData.type === "action" && <Zap className="h-5 w-5 text-green-500" />}
              {selectedNodeData.type === "data" && <Database className="h-5 w-5 text-purple-500" />}
              {selectedNodeData.type === "logic" && <Settings2 className="h-5 w-5 text-orange-500" />}
              Node Details: {selectedNodeData.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedNodeData.description}</p>
              </div>

              {selectedNodeData.metadata && Object.keys(selectedNodeData.metadata).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedNodeData.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <Badge variant="outline">{String(value)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Flow Connections</h4>
                <div className="space-y-2">
                  {selectedNodeData.parent && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span>Triggers from:</span>
                      <Badge variant="secondary">{selectedNodeData.parent}</Badge>
                    </div>
                  )}
                  {selectedNodeData.children.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Triggers:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNodeData.children.map(child => (
                          <Badge key={child} variant="outline" className="text-xs">
                            {child}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {simulationActive && selectedNode === selectedNodeData.id && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Clock className="h-4 w-4 animate-spin" />
                    Currently Executing
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}