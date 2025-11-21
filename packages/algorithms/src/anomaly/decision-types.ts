export type TradingDecision = {
  id: string; createdAt: number; asset: string;
  action: 'buy' | 'sell' | 'hold'; size: number; confidence: number;
  rationale: string;
  risk?: { var?: number; cvar?: number; sharpe?: number; maxDrawdown?: number };
  execution?: { strategy: 'market' | 'limit' | 'twap' | 'vwap' | 'iceberg'; timeHorizonMs?: number; slippageBps?: number };
  compliance?: { restricted?: boolean; requiresApproval?: boolean };
};
