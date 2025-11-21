import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import {
  Play,
  Pause,
  StopCircle,
  FastForward,
  RotateCcw,
  Settings,
  TestTube,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  Code,
  FileText,
  Save,
} from 'lucide-react';
import { CustomAgent } from '@/types/agents';
import { toast } from 'sonner';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  marketConditions: {
    trend: 'bull' | 'bear' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume: 'low' | 'medium' | 'high';
  };
  testData: any[];
}

const testScenarios: TestScenario[] = [
  {
    id: 'bull-run',
    name: 'Bull Run',
    description: 'Strong upward trend with high volume',
    marketConditions: { trend: 'bull', volatility: 'medium', volume: 'high' },
    testData: [],
  },
  {
    id: 'bear-market',
    name: 'Bear Market',
    description: 'Downward trend with panic selling',
    marketConditions: { trend: 'bear', volatility: 'high', volume: 'high' },
    testData: [],
  },
  {
    id: 'sideways',
    name: 'Sideways Market',
    description: 'Range-bound trading with low volatility',
    marketConditions: { trend: 'sideways', volatility: 'low', volume: 'medium' },
    testData: [],
  },
  {
    id: 'flash-crash',
    name: 'Flash Crash',
    description: 'Sudden sharp decline followed by recovery',
    marketConditions: { trend: 'bear', volatility: 'high', volume: 'high' },
    testData: [],
  },
];

interface TestResult {
  timestamp: number;
  action: string;
  success: boolean;
  message: string;
  metrics?: Record<string, any>;
}

interface AgentTestingSandboxProps {
  agent: CustomAgent;
  onSaveTest: (results: any) => void;
  className?: string;
}

export function AgentTestingSandbox({ agent, onSaveTest, className }: AgentTestingSandboxProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>(testScenarios[0]);
  const [testSpeed, setTestSpeed] = useState(1);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Test Configuration
  const [config, setConfig] = useState({
    initialCapital: 10000,
    maxPositionSize: 0.1,
    stopLoss: 0.05,
    takeProfit: 0.1,
    enableRiskManagement: true,
    logVerbosity: 'normal',
  });

  const handleStartTest = () => {
    setIsRunning(true);
    setIsPaused(false);
    setTestResults([]);
    setLogs([]);
    triggerHaptic('medium');

    addLog('🚀 Starting test simulation...');
    addLog(`Scenario: ${selectedScenario.name}`);
    addLog(`Initial Capital: $${config.initialCapital}`);
    addLog('---');

    // Simulate test execution
    simulateTest();
  };

  const handlePauseTest = () => {
    setIsPaused(!isPaused);
    addLog(isPaused ? '▶️ Test resumed' : '⏸️ Test paused');
    triggerHaptic('light');
  };

  const handleStopTest = () => {
    setIsRunning(false);
    setIsPaused(false);
    addLog('🛑 Test stopped');
    triggerHaptic('medium');
    toast.info('Test stopped');
  };

  const handleResetTest = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTestResults([]);
    setLogs([]);
    triggerHaptic('light');
  };

  const simulateTest = () => {
    // Simulate test results
    setTimeout(() => {
      const mockResults: TestResult[] = [
        {
          timestamp: Date.now(),
          action: 'Market Analysis',
          success: true,
          message: 'Analyzed market conditions successfully',
          metrics: { volatility: 0.32, trend: 'bullish' },
        },
        {
          timestamp: Date.now() + 1000,
          action: 'Entry Signal',
          success: true,
          message: 'Generated buy signal at $45,230',
          metrics: { price: 45230, confidence: 0.85 },
        },
        {
          timestamp: Date.now() + 2000,
          action: 'Position Opened',
          success: true,
          message: 'Opened long position (0.5 BTC)',
          metrics: { quantity: 0.5, value: 22615 },
        },
        {
          timestamp: Date.now() + 3000,
          action: 'Risk Check',
          success: true,
          message: 'Position within risk parameters',
          metrics: { risk: 'acceptable', exposure: 0.226 },
        },
        {
          timestamp: Date.now() + 4000,
          action: 'Exit Signal',
          success: true,
          message: 'Generated sell signal at $47,120',
          metrics: { price: 47120, profit: 945 },
        },
      ];

      setTestResults(mockResults);
      mockResults.forEach((result) => {
        addLog(
          `${result.success ? '✅' : '❌'} ${result.action}: ${result.message}`
        );
      });

      addLog('---');
      addLog('✨ Test completed successfully');
      setIsRunning(false);
      toast.success('Test completed!');
    }, 5000);
  };

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleSaveResults = () => {
    onSaveTest({
      agent: agent.id,
      scenario: selectedScenario.id,
      results: testResults,
      logs,
      timestamp: Date.now(),
    });
    toast.success('Test results saved!');
    triggerHaptic('success');
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="w-6 h-6 text-primary" />
            Testing Sandbox
          </h2>
          <p className="text-muted-foreground">
            Test {agent.name} in simulated market conditions
          </p>
        </div>

        <Button variant="outline" onClick={handleSaveResults} disabled={testResults.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          Save Results
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scenario Selection */}
              <div className="space-y-2">
                <Label>Market Scenario</Label>
                <Select
                  value={selectedScenario.id}
                  onValueChange={(id) =>
                    setSelectedScenario(testScenarios.find((s) => s.id === id)!)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testScenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedScenario.description}
                </p>
              </div>

              {/* Market Conditions */}
              <div className="space-y-2">
                <Label>Market Conditions</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Badge variant="outline" className="justify-center">
                    {selectedScenario.marketConditions.trend}
                  </Badge>
                  <Badge variant="outline" className="justify-center">
                    {selectedScenario.marketConditions.volatility}
                  </Badge>
                  <Badge variant="outline" className="justify-center">
                    {selectedScenario.marketConditions.volume}
                  </Badge>
                </div>
              </div>

              {/* Initial Capital */}
              <div className="space-y-2">
                <Label>Initial Capital ($)</Label>
                <Input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) =>
                    setConfig({ ...config, initialCapital: parseInt(e.target.value) })
                  }
                />
              </div>

              {/* Test Speed */}
              <div className="space-y-2">
                <Label>Test Speed: {testSpeed}x</Label>
                <Slider
                  value={[testSpeed]}
                  onValueChange={([value]) => setTestSpeed(value)}
                  min={0.5}
                  max={10}
                  step={0.5}
                />
              </div>

              {/* Risk Management */}
              <div className="flex items-center justify-between">
                <Label>Risk Management</Label>
                <Switch
                  checked={config.enableRiskManagement}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, enableRiskManagement: checked })
                  }
                />
              </div>

              {/* Advanced Settings */}
              <Button variant="outline" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {!isRunning ? (
                <Button className="w-full" onClick={handleStartTest}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Test
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handlePauseTest}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleStopTest}
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    Stop Test
                  </Button>
                </>
              )}

              <Button variant="outline" className="w-full" onClick={handleResetTest}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="live" className="flex-1">
                <Activity className="w-4 h-4 mr-2" />
                Live View
              </TabsTrigger>
              <TabsTrigger value="results" className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Results
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="code" className="flex-1">
                <Code className="w-4 h-4 mr-2" />
                Code
              </TabsTrigger>
            </TabsList>

            {/* Live View */}
            <TabsContent value="live">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Test Execution</CardTitle>
                    {isRunning && (
                      <Badge variant="default" className="animate-pulse">
                        <Activity className="w-3 h-3 mr-1" />
                        Running
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {testResults.length === 0 && !isRunning && (
                        <div className="text-center py-12 text-muted-foreground">
                          <TestTube className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No test running</p>
                          <p className="text-sm mt-1">Configure and start a test to see results</p>
                        </div>
                      )}

                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 rounded-lg border border-border"
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                              result.success
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {result.success ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{result.action}</div>
                            <div className="text-sm text-muted-foreground">
                              {result.message}
                            </div>
                            {result.metrics && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {Object.entries(result.metrics).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-success">
                        {testResults.filter((r) => r.success).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Successful</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-destructive">
                        {testResults.filter((r) => !r.success).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {testResults.length > 0
                          ? ((testResults.filter((r) => r.success).length / testResults.length) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">2.5s</div>
                      <div className="text-xs text-muted-foreground">Avg. Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Execution Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="font-mono text-xs space-y-1">
                      {logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          No logs yet
                        </div>
                      ) : (
                        logs.map((log, index) => (
                          <div key={index} className="text-muted-foreground">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Code Tab */}
            <TabsContent value="code">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agent Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <pre className="text-xs font-mono text-muted-foreground">
                      {JSON.stringify(
                        {
                          name: agent.name,
                          triggers: agent.triggers,
                          strategies: agent.strategies,
                          performance: agent.performance,
                          config: config,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
