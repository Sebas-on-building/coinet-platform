import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  X, 
  Settings, 
  Info, 
  Save, 
  RotateCcw,
  Zap,
  BarChart3,
  Database,
  Brain,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Node } from '@xyflow/react';

interface BlockConfigurationPanelProps {
  node: Node;
  onClose: () => void;
  onUpdate: (node: Node) => void;
}

export const BlockConfigurationPanel: React.FC<BlockConfigurationPanelProps> = ({
  node,
  onClose,
  onUpdate
}) => {
  const [config, setConfig] = useState(node.data);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setConfig(node.data);
    setIsDirty(false);
    setValidationErrors([]);
  }, [node]);

  const handleSave = () => {
    // Validate configuration
    const errors = validateConfiguration(config, node.type);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Update the node
    const updatedNode = {
      ...node,
      data: config
    };
    onUpdate(updatedNode);
    setIsDirty(false);
    setValidationErrors([]);
  };

  const handleReset = () => {
    setConfig(node.data);
    setIsDirty(false);
    setValidationErrors([]);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const validateConfiguration = (config: any, nodeType: string): string[] => {
    const errors: string[] = [];
    
    switch (nodeType) {
      case 'trigger':
        if (!config.threshold && !nodeType.includes('time')) {
          errors.push('Threshold value is required');
        }
        break;
      case 'condition':
        if (!config.operator) {
          errors.push('Comparison operator is required');
        }
        break;
      case 'action':
        if (!config.actionType) {
          errors.push('Action type must be specified');
        }
        break;
    }
    
    return errors;
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'trigger': return <Zap className="h-4 w-4" />;
      case 'condition': return <BarChart3 className="h-4 w-4" />;
      case 'action': return <Settings className="h-4 w-4" />;
      case 'data': return <Database className="h-4 w-4" />;
      case 'ai': return <Brain className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'text-blue-600';
      case 'condition': return 'text-orange-600';
      case 'action': return 'text-green-600';
      case 'data': return 'text-purple-600';
      case 'ai': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const renderBasicConfiguration = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Block Name</Label>
        <Input
          id="label"
          value={String(config.label || '')}
          onChange={(e) => updateConfig('label', e.target.value)}
          placeholder="Enter block name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={String(config.description || '')}
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Describe what this block does"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={config.enabled !== false}
          onCheckedChange={(checked) => updateConfig('enabled', checked)}
        />
        <Label htmlFor="enabled">Enable this block</Label>
      </div>
    </div>
  );

  const renderTriggerConfiguration = () => (
    <div className="space-y-4">
      {config.thresholdType && (
        <div className="space-y-2">
          <Label>Threshold Type</Label>
          <Select 
            value={String(config.thresholdType || 'percentage')} 
            onValueChange={(value) => updateConfig('thresholdType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="absolute">Absolute Value</SelectItem>
              <SelectItem value="ratio">Ratio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Threshold Value</Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[Number(config.threshold) || 5]}
            onValueChange={(value) => updateConfig('threshold', value[0])}
            max={100}
            min={0.1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">
            {Number(config.threshold) || 5}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Time Window</Label>
        <Select 
          value={String(config.timeWindow || '1h')} 
          onValueChange={(value) => updateConfig('timeWindow', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1 Minute</SelectItem>
            <SelectItem value="5m">5 Minutes</SelectItem>
            <SelectItem value="15m">15 Minutes</SelectItem>
            <SelectItem value="1h">1 Hour</SelectItem>
            <SelectItem value="4h">4 Hours</SelectItem>
            <SelectItem value="1d">1 Day</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderConditionConfiguration = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Comparison Operator</Label>
        <Select 
          value={String(config.operator || 'greater_than')} 
          onValueChange={(value) => updateConfig('operator', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
            <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
            <SelectItem value="equal_to">Equal To (=)</SelectItem>
            <SelectItem value="greater_equal">Greater or Equal (&gt;=)</SelectItem>
            <SelectItem value="less_equal">Less or Equal (&lt;=)</SelectItem>
            <SelectItem value="between">Between</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target Value</Label>
        <Input
          type="number"
          value={String(config.targetValue || '')}
          onChange={(e) => updateConfig('targetValue', parseFloat(e.target.value))}
          placeholder="Enter target value"
        />
      </div>

          {Array.isArray(config.indicators) && (
        <div className="space-y-2">
          <Label>Technical Indicator</Label>
          <Select 
            value={String(config.selectedIndicator || config.indicators[0])} 
            onValueChange={(value) => updateConfig('selectedIndicator', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.indicators.map((indicator: string) => (
                <SelectItem key={indicator} value={indicator}>
                  {indicator}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Period</Label>
        <Input
          type="number"
          value={String(config.period || 14)}
          onChange={(e) => updateConfig('period', parseInt(e.target.value))}
          placeholder="Period (e.g., 14)"
        />
      </div>
    </div>
  );

  const renderActionConfiguration = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Action Type</Label>
        <Select 
          value={String(config.actionType || 'buy')} 
          onValueChange={(value) => updateConfig('actionType', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">Buy Order</SelectItem>
            <SelectItem value="sell">Sell Order</SelectItem>
            <SelectItem value="notify">Send Notification</SelectItem>
            <SelectItem value="stop_loss">Set Stop Loss</SelectItem>
            <SelectItem value="take_profit">Set Take Profit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {Array.isArray(config.orderTypes) && (
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select 
            value={String(config.selectedOrderType || config.orderTypes[0])} 
            onValueChange={(value) => updateConfig('selectedOrderType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.orderTypes.map((orderType: string) => (
                <SelectItem key={orderType} value={orderType}>
                  {orderType.charAt(0).toUpperCase() + orderType.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Position Size (%)</Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[Number(config.positionSize) || 1]}
            onValueChange={(value) => updateConfig('positionSize', value[0])}
            max={100}
            min={0.1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">
            {Number(config.positionSize) || 1}%
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="riskManagement"
          checked={config.riskManagement !== false}
          onCheckedChange={(checked) => updateConfig('riskManagement', checked)}
        />
        <Label htmlFor="riskManagement">Enable risk management</Label>
      </div>
    </div>
  );

  const renderAdvancedConfiguration = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Priority Level</Label>
        <Select 
          value={String(config.priority || 'normal')} 
          onValueChange={(value) => updateConfig('priority', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low Priority</SelectItem>
            <SelectItem value="normal">Normal Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="critical">Critical Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Retry Configuration</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Max Retries</Label>
            <Input
              type="number"
              value={String(config.maxRetries || 3)}
              onChange={(e) => updateConfig('maxRetries', parseInt(e.target.value))}
              min={0}
              max={10}
            />
          </div>
          <div>
            <Label className="text-xs">Retry Delay (s)</Label>
            <Input
              type="number"
              value={String(config.retryDelay || 1)}
              onChange={(e) => updateConfig('retryDelay', parseInt(e.target.value))}
              min={1}
              max={60}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeout (seconds)</Label>
        <Input
          type="number"
          value={String(config.timeout || 30)}
          onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
          placeholder="Execution timeout"
        />
      </div>

      <div className="space-y-2">
        <Label>Custom Parameters (JSON)</Label>
        <Textarea
          value={config.customParams ? JSON.stringify(config.customParams, null, 2) : '{}'}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              updateConfig('customParams', parsed);
            } catch (error) {
              // Handle JSON parse error silently
            }
          }}
          rows={4}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );

  return (
    <Card className="h-full rounded-none border-0 border-l">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-muted ${getNodeColor(node.type || '')}`}>
              {getNodeIcon(node.type || '')}
            </div>
            <div>
              <CardTitle className="text-lg">Block Configuration</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{node.type} Block</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Configuration Issues</span>
            </div>
            <ul className="text-sm text-destructive space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {isDirty && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">You have unsaved changes</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="specific">Specific</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(100vh-16rem)] mt-4">
            <TabsContent value="basic" className="space-y-4">
              {renderBasicConfiguration()}
            </TabsContent>
            
            <TabsContent value="specific" className="space-y-4">
              {node.type === 'trigger' && renderTriggerConfiguration()}
              {node.type === 'condition' && renderConditionConfiguration()}
              {node.type === 'action' && renderActionConfiguration()}
              {(node.type === 'data' || node.type === 'ai') && (
                <div className="text-center text-muted-foreground py-8">
                  <Database className="h-8 w-8 mx-auto mb-2" />
                  <p>Data source configuration coming soon</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              {renderAdvancedConfiguration()}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <Separator />
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <div className="space-x-2">
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || validationErrors.length > 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};