/**
 * Position Sizing Strategies
 * 
 * Provides various position sizing algorithms for backtesting and trading,
 * allowing for sophisticated risk management approaches.
 */

/**
 * Options for the various position sizing strategies
 */
export interface PositionSizingOptions {
  capital: number;              // Available capital
  price: number;                // Current asset price
  riskPercent?: number;         // Percentage of capital to risk (for fixed risk)
  stopLossPercent?: number;     // Stop loss percentage from entry (for fixed risk)
  fixedAmount?: number;         // Fixed position size in base currency
  fixedUnits?: number;          // Fixed number of units
  targetRisk?: number;          // Target volatility risk in currency
  volatility?: number;          // Asset volatility measure (e.g. ATR or std dev)
  kelly?: number;               // Fraction of Kelly criterion to use (0.5 = half Kelly)
  winRate?: number;             // Estimated win rate for Kelly criterion
  avgWin?: number;              // Average win percentage
  avgLoss?: number;             // Average loss percentage
  positionLimit?: number;       // Maximum position size as percentage of capital
  maxPositions?: number;        // Maximum number of simultaneous positions
  activePositions?: number;     // Current number of active positions
  equityCurve?: number[];       // Historical equity curve for adaptive sizing
  leverageLimit?: number;       // Maximum allowed leverage
  marginRequirement?: number;   // Margin requirement percentage
  portfolioHeatPercent?: number;// Current portfolio heat (sum of risk exposures)
  maxHeatPercent?: number;      // Maximum allowed portfolio heat
}

/**
 * Result of position sizing calculation
 */
export interface PositionSizeResult {
  units: number;               // Number of units/shares/contracts
  positionValue: number;       // Position value in base currency
  riskAmount: number;          // Amount of capital at risk
  riskPercent: number;         // Percentage of capital at risk
  leverage: number;            // Implied leverage (if applicable)
  marginRequired?: number;     // Required margin (if applicable)
}

/**
 * Calculate position size based on fixed percentage of capital
 */
export function fixedPercentPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const { capital, price, riskPercent = 1 } = options;

  // Calculate position value
  const positionValue = capital * (riskPercent / 100);

  // Calculate units
  const units = positionValue / price;

  return {
    units,
    positionValue,
    riskAmount: positionValue,
    riskPercent,
    leverage: 1
  };
}

/**
 * Calculate position size based on fixed risk amount
 */
export function fixedRiskPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    riskPercent = 1,
    stopLossPercent = 2,
    positionLimit = 20
  } = options;

  if (!stopLossPercent || stopLossPercent === 0) {
    throw new Error('Stop loss percentage must be provided and not zero');
  }

  // Calculate risk amount
  const riskAmount = capital * (riskPercent / 100);

  // Calculate risk per unit
  const riskPerUnit = price * (stopLossPercent / 100);

  // Calculate units based on risk
  let units = riskAmount / riskPerUnit;

  // Check against position limit
  const maxPositionValue = capital * (positionLimit / 100);
  const maxUnits = maxPositionValue / price;

  if (units > maxUnits) {
    units = maxUnits;
  }

  // Calculate final position value
  const positionValue = units * price;

  // Calculate actual risk percentage
  const actualRiskPercent = (positionValue * (stopLossPercent / 100)) / capital * 100;

  return {
    units,
    positionValue,
    riskAmount: positionValue * (stopLossPercent / 100),
    riskPercent: actualRiskPercent,
    leverage: 1
  };
}

/**
 * Calculate position size using volatility-based sizing (like ATR)
 */
export function volatilityBasedPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    targetRisk = 1,
    volatility = 0,
    positionLimit = 20
  } = options;

  if (!volatility || volatility === 0) {
    throw new Error('Volatility must be provided and not zero');
  }

  // Calculate risk amount
  const riskAmount = capital * (targetRisk / 100);

  // Calculate units based on volatility
  let units = riskAmount / volatility;

  // Check against position limit
  const maxPositionValue = capital * (positionLimit / 100);
  const maxUnits = maxPositionValue / price;

  if (units > maxUnits) {
    units = maxUnits;
  }

  // Calculate final position value
  const positionValue = units * price;

  // Calculate actual risk percentage
  const actualRiskPercent = (positionValue * (volatility / price)) / capital * 100;

  return {
    units,
    positionValue,
    riskAmount: positionValue * (volatility / price),
    riskPercent: actualRiskPercent,
    leverage: 1
  };
}

/**
 * Calculate position size using Kelly Criterion
 */
export function kellyPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    kelly = 0.5,
    winRate = 0,
    avgWin = 0,
    avgLoss = 0,
    positionLimit = 20
  } = options;

  if (!winRate || winRate === 0 || !avgWin || avgWin === 0 || !avgLoss || avgLoss === 0) {
    throw new Error('Win rate, average win, and average loss must be provided and not zero');
  }

  // Calculate full Kelly fraction
  // Kelly = (winRate * (avgWin / avgLoss) - (1 - winRate)) / (avgWin / avgLoss)
  const winLossRatio = avgWin / avgLoss;
  const fullKelly = (winRate * winLossRatio - (1 - winRate)) / winLossRatio;

  // Apply Kelly fraction and ensure it's positive
  let kellyFraction = Math.max(0, fullKelly * kelly);

  // Apply position limit
  kellyFraction = Math.min(kellyFraction, positionLimit / 100);

  // Calculate position value
  const positionValue = capital * kellyFraction;

  // Calculate units
  const units = positionValue / price;

  // Calculate risk amount (assuming avgLoss is the risk)
  const riskAmount = positionValue * (avgLoss / 100);

  return {
    units,
    positionValue,
    riskAmount,
    riskPercent: kellyFraction * 100,
    leverage: 1
  };
}

/**
 * Calculate position size for margin/leveraged trading
 */
export function leveragedPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    riskPercent = 1,
    stopLossPercent = 2,
    leverageLimit = 5,
    marginRequirement = 20,
    positionLimit = 50
  } = options;

  // Calculate maximum position value based on margin
  const maxPositionValue = capital * leverageLimit;

  // Calculate risk amount
  const riskAmount = capital * (riskPercent / 100);

  // Calculate risk per unit
  const riskPerUnit = price * (stopLossPercent / 100);

  // Calculate units based on risk
  let units = riskAmount / riskPerUnit;

  // Check position value against leverage limit
  let positionValue = units * price;

  if (positionValue > maxPositionValue) {
    units = maxPositionValue / price;
    positionValue = units * price;
  }

  // Check against position limit
  const maxPositionByLimit = capital * (positionLimit / 100);
  if (positionValue > maxPositionByLimit) {
    units = maxPositionByLimit / price;
    positionValue = units * price;
  }

  // Calculate required margin
  const marginRequired = positionValue * (marginRequirement / 100);

  // Calculate leverage
  const leverage = positionValue / marginRequired;

  // Calculate actual risk percentage
  const actualRiskPercent = (positionValue * (stopLossPercent / 100)) / capital * 100;

  return {
    units,
    positionValue,
    riskAmount: positionValue * (stopLossPercent / 100),
    riskPercent: actualRiskPercent,
    leverage,
    marginRequired
  };
}

/**
 * Calculate position size using portfolio heat approach
 * (limits overall portfolio risk exposure)
 */
export function portfolioHeatPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    riskPercent = 1,
    stopLossPercent = 2,
    portfolioHeatPercent = 0,
    maxHeatPercent = 6,
    positionLimit = 20
  } = options;

  // Calculate maximum additional heat allowed
  const remainingHeatPercent = maxHeatPercent - portfolioHeatPercent;

  // If portfolio is already at max heat, return zero position
  if (remainingHeatPercent <= 0) {
    return {
      units: 0,
      positionValue: 0,
      riskAmount: 0,
      riskPercent: 0,
      leverage: 0
    };
  }

  // Calculate risk amount (limited by remaining heat)
  const riskAmount = capital * (Math.min(riskPercent, remainingHeatPercent) / 100);

  // Calculate risk per unit
  const riskPerUnit = price * (stopLossPercent / 100);

  // Calculate units based on risk
  let units = riskAmount / riskPerUnit;

  // Check against position limit
  const maxPositionValue = capital * (positionLimit / 100);
  const maxUnits = maxPositionValue / price;

  if (units > maxUnits) {
    units = maxUnits;
  }

  // Calculate final position value
  const positionValue = units * price;

  // Calculate actual risk percentage
  const actualRiskPercent = (positionValue * (stopLossPercent / 100)) / capital * 100;

  return {
    units,
    positionValue,
    riskAmount: positionValue * (stopLossPercent / 100),
    riskPercent: actualRiskPercent,
    leverage: 1
  };
}

/**
 * Calculate position size using adaptive sizing based on recent performance
 */
export function adaptivePosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    riskPercent = 1,
    stopLossPercent = 2,
    equityCurve = [],
    positionLimit = 20
  } = options;

  if (!equityCurve || equityCurve.length < 10) {
    // Fall back to fixed risk if not enough equity data
    return fixedRiskPosition(options);
  }

  // Calculate performance metrics for the last 10 equity points
  const recentEquity = equityCurve.slice(-10);
  const returns: number[] = [];

  for (let i = 1; i < recentEquity.length; i++) {
    returns.push(recentEquity[i] / recentEquity[i - 1] - 1);
  }

  // Calculate average return and standard deviation
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Create a performance multiplier based on recent results
  let performanceMultiplier = 1;

  if (avgReturn > 0 && stdDev > 0) {
    // Sharpe-like ratio to scale position size
    const sharpeRatio = avgReturn / stdDev;

    // Scale the multiplier based on sharpe ratio (example scaling)
    performanceMultiplier = 1 + Math.min(1, Math.max(-0.5, sharpeRatio));
  } else if (avgReturn < 0) {
    // Reduce position size on negative performance
    performanceMultiplier = Math.max(0.5, 1 + avgReturn * 10);
  }

  // Apply the multiplier to the risk percentage
  const adjustedRiskPercent = riskPercent * performanceMultiplier;

  // Calculate using the adjusted risk
  return fixedRiskPosition({
    ...options,
    riskPercent: adjustedRiskPercent
  });
}

/**
 * Calculate position size for multi-asset/position portfolio
 */
export function multiAssetPosition(
  options: PositionSizingOptions
): PositionSizeResult {
  const {
    capital,
    price,
    riskPercent = 1,
    maxPositions = 5,
    activePositions = 0,
    positionLimit = 80, // Total portfolio exposure limit
    stopLossPercent = 2
  } = options;

  // If at max positions, return zero
  if (activePositions >= maxPositions) {
    return {
      units: 0,
      positionValue: 0,
      riskAmount: 0,
      riskPercent: 0,
      leverage: 0
    };
  }

  // Calculate available risk allocation per position
  const totalRiskPerPosition = riskPercent / maxPositions;

  // Calculate remaining positions including this one
  const remainingPositions = maxPositions - activePositions;

  // Allocate more risk to earlier positions (optional strategy)
  // This gives larger allocation to earlier positions, smaller to later ones
  const positionIndex = activePositions + 1;
  const weightFactor = (maxPositions - positionIndex + 1) /
    ((maxPositions * (maxPositions + 1)) / 2);

  const adjustedRiskPercent = totalRiskPerPosition * maxPositions * weightFactor;

  // Calculate position using fixed risk approach with the adjusted risk
  return fixedRiskPosition({
    capital,
    price,
    riskPercent: adjustedRiskPercent,
    stopLossPercent,
    positionLimit: positionLimit / maxPositions
  });
} 