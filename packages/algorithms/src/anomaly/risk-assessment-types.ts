export type RiskAssessment = {
  id: string; generatedAt: number; asset: string; horizon: 'intraday' | 'swing' | 'position';
  metrics: { var?: number; cvar?: number; volatility?: number; beta?: number; corrToMarket?: number; sharpe?: number; sortino?: number };
  scenarios?: Array<{ name: string; probability?: number; pnlImpact?: number }>;
  stressTests?: Array<{ name: string; pnlImpact?: number }>;
  hedging?: { recommended?: boolean; instruments?: Array<'futures' | 'options' | 'spot-hedge'>; targetExposure?: number };
};
