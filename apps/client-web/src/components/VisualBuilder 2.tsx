import { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Zap,
  TrendingUp,
  DollarSign,
  Shield,
  Bell,
  Target
} from "lucide-react";

// Custom Node Components
const TriggerNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
      <div className="flex items-center">
        <div className="rounded-full w-3 h-3 bg-blue-500 mr-2"></div>
        <div className="text-sm font-bold">{data.label}</div>
      </div>
      <div className="text-xs text-gray-500">{data.type}</div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500" />
    </div>
  );
};

const ConditionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-500">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-yellow-500" />
      <div className="flex items-center">
        <div className="rounded-full w-3 h-3 bg-yellow-500 mr-2"></div>
        <div className="text-sm font-bold">{data.label}</div>
      </div>
      <div className="text-xs text-gray-500">{data.condition}</div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-yellow-500" />
    </div>
  );
};

const ActionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-500">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-green-500" />
      <div className="flex items-center">
        <div className="rounded-full w-3 h-3 bg-green-500 mr-2"></div>
        <div className="text-sm font-bold">{data.label}</div>
      </div>
      <div className="text-xs text-gray-500">{data.description}</div>
    </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: { label: 'Price Alert', type: 'Market Data' },
  },
  {
    id: '2',
    type: 'condition',
    position: { x: 300, y: 100 },
    data: { label: 'RSI < 30', condition: 'Technical Indicator' },
  },
  {
    id: '3',
    type: 'action',
    position: { x: 500, y: 100 },
    data: { label: 'Buy Order', description: 'Execute Trade' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

interface BlockTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  nodeType: string;
}

const blockTemplates: BlockTemplate[] = [
  {
    id: 'price-trigger',
    name: 'Price Movement',
    category: 'Triggers',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Trigger on price changes',
    nodeType: 'trigger'
  },
  {
    id: 'volume-trigger',
    name: 'Volume Spike',
    category: 'Triggers',
    icon: <Zap className="w-4 h-4" />,
    description: 'Trigger on volume changes',
    nodeType: 'trigger'
  },
  {
    id: 'rsi-condition',
    name: 'RSI Condition',
    category: 'Conditions',
    icon: <Target className="w-4 h-4" />,
    description: 'RSI technical indicator',
    nodeType: 'condition'
  },
  {
    id: 'buy-action',
    name: 'Buy Order',
    category: 'Actions',
    icon: <DollarSign className="w-4 h-4" />,
    description: 'Execute buy order',
    nodeType: 'action'
  },
  {
    id: 'sell-action',
    name: 'Sell Order',
    category: 'Actions',
    icon: <DollarSign className="w-4 h-4" />,
    description: 'Execute sell order',
    nodeType: 'action'
  },
  {
    id: 'notification',
    name: 'Send Alert',
    category: 'Actions',
    icon: <Bell className="w-4 h-4" />,
    description: 'Send notification',
    nodeType: 'action'
  },
  {
    id: 'stop-loss',
    name: 'Stop Loss',
    category: 'Risk Management',
    icon: <Shield className="w-4 h-4" />,
    description: 'Risk management',
    nodeType: 'condition'
  },
];

interface VisualBuilderProps {
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export function VisualBuilder({ onSave }: VisualBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addNode = (template: BlockTemplate) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: template.nodeType,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: template.name, 
        type: template.category,
        description: template.description 
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges);
    }
  };

  const categories = Array.from(new Set(blockTemplates.map(t => t.category)));
  const filteredTemplates = selectedCategory === 'all' 
    ? blockTemplates 
    : blockTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visual Strategy Builder</h2>
          <p className="text-muted-foreground">
            Drag and drop blocks to create your trading logic
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm">
            <Play className="w-4 h-4 mr-2" />
            Test
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Block Library */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Block Library</CardTitle>
            <CardDescription>
              Drag blocks to the canvas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => addNode(template)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {template.icon}
                    <span className="font-medium text-sm">{template.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {template.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Strategy Canvas</CardTitle>
            <CardDescription>
              Connect blocks to build your trading logic flow
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ width: '100%', height: '600px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                style={{ backgroundColor: "#F7F9FB" }}
              >
                <Controls />
                <MiniMap />
                <Background />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Strategy Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Triggers</h4>
              <p className="text-2xl font-bold">
                {nodes.filter(n => n.type === 'trigger').length}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Conditions</h4>
              <p className="text-2xl font-bold">
                {nodes.filter(n => n.type === 'condition').length}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Actions</h4>
              <p className="text-2xl font-bold">
                {nodes.filter(n => n.type === 'action').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}