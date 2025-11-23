import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  Target,
  BarChart3,
  Clock,
  Wallet
} from 'lucide-react';
import { CustomAgent, AgentExecution } from '../types/agents';

interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  agentId: string;
  status: 'open' | 'closed';
  pnl?: number;
}

interface PaperTradingModeProps {
  agents: CustomAgent[];
}

export const PaperTradingMode: React.FC<PaperTradingModeProps> = ({ agents }) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  const [virtualBalance, setVirtualBalance] = useState(10000);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [config, setConfig] = useState({
    initialBalance: 10000,
    maxPositionSize: 1000,
    tradingFees: 0.1,
    riskPerTrade: 2
  });

  // Simulate real-time trading
  useEffect(() => {
    if (!isActive || !selectedAgent) return;

    const interval = setInterval(() => {
      // Simulate random trading opportunities
      if (Math.random() < 0.1) { // 10% chance per tick
        simulateTradeExecution();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, selectedAgent]);

  const simulateTradeExecution = () => {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = Math.random() * 1000 + 100;
    const quantity = Math.random() * 0.1 + 0.01;

    const newTrade: PaperTrade = {
      id: `trade-${Date.now()}`,
      symbol: randomSymbol,
      side,
      quantity,
      price,
      timestamp: Date.now(),
      agentId: selectedAgent,
      status: 'open'
    };

    const newExecution: AgentExecution = {
      id: `exec-${Date.now()}`,
      agentId: selectedAgent,
      timestamp: Date.now(),
      triggerType: 'market_signal',
      triggerData: { symbol: randomSymbol, price },
      action: `${side}_order`,
      result: 'success',
      executionTime: Math.random() * 200 + 50,
      metadata: { trade: newTrade }
    };

    setTrades(prev => [newTrade, ...prev.slice(0, 49)]);
    setExecutions(prev => [newExecution, ...prev.slice(0, 49)]);

    // Update balance (simplified)
    const tradeValue = quantity * price;
    const fee = tradeValue * (config.tradingFees / 100);
    setVirtualBalance(prev => prev - fee);
  };

  const handleStartTrading = () => {
    setIsActive(true);
    setVirtualBalance(config.initialBalance);
    setTrades([]);
    setExecutions([]);
  };

  const handleStopTrading = () => {
    setIsActive(false);
  };

  const openTrades = trades.filter(t => t.status === 'open');
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Trading Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Paper Trading Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-select">Trading Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initial-balance">Initial Balance ($)</Label>
              <Input
                id="initial-balance"
                type="number"
                value={config.initialBalance}
                onChange={(e) => setConfig(prev => ({...prev, initialBalance: Number(e.target.value)}))}
                disabled={isActive}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-position">Max Position Size ($)</Label>
              <Input
                id="max-position"
                type="number"
                value={config.maxPositionSize}
                onChange={(e) => setConfig(prev => ({...prev, maxPositionSize: Number(e.target.value)}))}
                disabled={isActive}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="risk-per-trade">Risk per Trade (%)</Label>
              <Input
                id="risk-per-trade"
                type="number"
                step="0.1"
                value={config.riskPerTrade}
                onChange={(e) => setConfig(prev => ({...prev, riskPerTrade: Number(e.target.value)}))}
                disabled={isActive}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-4">
            {!isActive ? (
              <Button 
                onClick={handleStartTrading}
                disabled={!selectedAgent}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Paper Trading
              </Button>
            ) : (
              <Button 
                onClick={handleStopTrading}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Trading
              </Button>
            )}
            
            {isActive && (
              <Badge variant="default" className="flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse" />
                Live Trading
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trading Dashboard */}
      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="h-5 w-5 text-blue-500" />
                <div className="text-right">
                  <div className="text-2xl font-bold">${virtualBalance.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Virtual Balance</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Target className="h-5 w-5 text-green-500" />
                <div className="text-right">
                  <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${totalPnL.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total P&L</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div className="text-right">
                  <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Zap className="h-5 w-5 text-orange-500" />
                <div className="text-right">
                  <div className="text-2xl font-bold">{openTrades.length}</div>
                  <div className="text-sm text-muted-foreground">Open Positions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trading Activity */}
      {isActive && (
        <Tabs defaultValue="trades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trades">Recent Trades</TabsTrigger>
            <TabsTrigger value="executions">Agent Executions</TabsTrigger>
            <TabsTrigger value="positions">Open Positions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No trades executed yet. Waiting for trading signals...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {trades.slice(0, 10).map(trade => (
                      <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {trade.side === 'buy' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">{trade.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {trade.side.toUpperCase()} {trade.quantity.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">${trade.price.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                          {trade.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="executions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agent Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No executions yet. Agent is monitoring for triggers...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {executions.slice(0, 10).map(execution => (
                      <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={execution.result === 'success' ? 'default' : 'destructive'}>
                            {execution.result}
                          </Badge>
                          <div>
                            <div className="font-medium">{execution.action}</div>
                            <div className="text-sm text-muted-foreground">
                              {execution.triggerType}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">{execution.executionTime.toFixed(0)}ms</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(execution.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {openTrades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No open positions currently.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {openTrades.map(trade => (
                      <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {trade.side === 'buy' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">{trade.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {trade.side.toUpperCase()} {trade.quantity.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">${trade.price.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">Entry Price</div>
                        </div>
                        
                        <Button size="sm" variant="outline">
                          Close Position
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};