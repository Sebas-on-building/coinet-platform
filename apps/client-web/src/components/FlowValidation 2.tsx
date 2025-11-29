import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  ChevronDown, 
  ChevronRight,
  Lightbulb,
  Play,
  Bug,
  BarChart3
} from 'lucide-react';

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

interface FlowValidationProps {
  results: ValidationResult;
}

export const FlowValidation: React.FC<FlowValidationProps> = ({ results }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  const handleRunTest = () => {
    setIsTestMode(true);
    // Simulate test execution
    setTimeout(() => {
      setIsTestMode(false);
    }, 3000);
  };

  const getValidationIcon = () => {
    if (results.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (results.warnings.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getValidationStatus = () => {
    if (results.isValid) return 'Valid Flow';
    if (results.warnings.length > 0) return 'Issues Found';
    return 'Invalid Flow';
  };

  const getStatusColor = () => {
    if (results.isValid) return 'bg-green-100 text-green-800';
    if (results.warnings.length > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="w-96 shadow-lg">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getValidationIcon()}
                <CardTitle className="text-sm">{getValidationStatus()}</CardTitle>
                <Badge className={getStatusColor()}>
                  {results.warnings.length} issues
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunTest();
                  }}
                  disabled={isTestMode}
                  className="h-7"
                >
                  {isTestMode ? (
                    <>
                      <Bug className="h-3 w-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Test
                    </>
                  )}
                </Button>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Validation Issues */}
            {results.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Issues to Address</span>
                </div>
                <div className="space-y-1">
                  {results.warnings.map((warning, index) => (
                    <div key={index} className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flow Health Check */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Flow Health</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Has trigger blocks</span>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Has action blocks</span>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Blocks are connected</span>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Risk management enabled</span>
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Performance Metrics</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 p-2 rounded text-center">
                  <div className="text-xs text-muted-foreground">Estimated Latency</div>
                  <div className="text-sm font-medium">~150ms</div>
                </div>
                <div className="bg-muted/50 p-2 rounded text-center">
                  <div className="text-xs text-muted-foreground">Cost per Execution</div>
                  <div className="text-sm font-medium">$0.003</div>
                </div>
                <div className="bg-muted/50 p-2 rounded text-center">
                  <div className="text-xs text-muted-foreground">Complexity Score</div>
                  <div className="text-sm font-medium">Medium</div>
                </div>
                <div className="bg-muted/50 p-2 rounded text-center">
                  <div className="text-xs text-muted-foreground">Reliability</div>
                  <div className="text-sm font-medium">94%</div>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {results.suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Optimization Suggestions</span>
                </div>
                <div className="space-y-1">
                  {results.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Results */}
            {isTestMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Test Results</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                    ✅ Trigger activation: Passed
                  </div>
                  <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                    ✅ Condition evaluation: Passed
                  </div>
                  <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                    ✅ Action execution: Passed
                  </div>
                  <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                    ⚠️ Performance: 180ms (target: &lt;150ms)
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Auto-Fix Issues
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Optimize Flow
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};