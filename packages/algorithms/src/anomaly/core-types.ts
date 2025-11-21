export enum AnomalyType { BENIGN = 'benign', EMERGING_THREAT = 'emerging_threat', OPPORTUNITY = 'opportunity', CRITICAL = 'critical' }
export enum AnomalySeverity { CRITICAL = 'critical', HIGH = 'high', MEDIUM = 'medium', LOW = 'low' }
export enum DataSource { TRADING_VOLUME = 'trading_volume', SENTIMENT = 'sentiment', WALLET_ACTIVITY = 'wallet_activity', PRICE = 'price' }
export type DataPoint = { timestamp: number; source: DataSource; value: number; meta?: Record<string, unknown> };
export type Baseline = { source: DataSource; mean: number; stdDev: number; windowMs: number };
export type Anomaly = { id: string; type: AnomalyType; severity: AnomalySeverity; source: DataSource; score: number; at: number; context?: Record<string, unknown> };
