/**
 * Portfolio Optimizer
 * 
 * Implements modern portfolio theory algorithms to find optimal asset allocations
 * based on historical return data. Supports Markowitz efficient frontier calculation,
 * maximum Sharpe ratio portfolios, and minimum variance portfolios.
 */

import { Matrix, EigenvalueDecomposition } from 'ml-matrix';

export interface AssetData {
  symbol: string;
  returns: number[];  // Historical returns as decimals (e.g., 0.05 for 5%)
  expectedReturn?: number; // Annualized expected return
  volatility?: number;     // Annualized volatility/standard deviation
  weight?: number;         // Portfolio weight
}

export interface PortfolioStats {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  weights: { [symbol: string]: number };
}

export interface OptimizationParams {
  riskFreeRate?: number;  // Annual risk-free rate as decimal
  targetReturn?: number;  // Target portfolio return (for min variance given return)
  targetRisk?: number;    // Target portfolio risk (for max return given risk)
  constraints?: {
    minWeight?: number;   // Minimum weight per asset
    maxWeight?: number;   // Maximum weight per asset
  }
}

/**
 * Calculate optimal portfolio weights using modern portfolio theory
 */
export function optimizePortfolio(
  assets: AssetData[],
  optimizationTarget: 'maxSharpe' | 'minVariance' | 'efficientFrontier' = 'maxSharpe',
  params: OptimizationParams = {}
): PortfolioStats | PortfolioStats[] {

  // Default parameters
  const riskFreeRate = params.riskFreeRate ?? 0.02; // 2% default
  const constraints = params.constraints ?? { minWeight: 0, maxWeight: 1 };

  // Calculate expected returns and volatility for each asset if not provided
  const preparedAssets = assets.map(asset => {
    if (asset.expectedReturn === undefined) {
      const meanReturn = calculateMean(asset.returns);
      asset.expectedReturn = annualize(meanReturn, asset.returns.length);
    }

    if (asset.volatility === undefined) {
      const stdDev = calculateStdDev(asset.returns);
      asset.volatility = annualize(stdDev, asset.returns.length);
    }

    return asset;
  });

  // Calculate covariance matrix
  const covMatrix = calculateCovarianceMatrix(preparedAssets.map(a => a.returns));
  const expectedReturns = preparedAssets.map(a => a.expectedReturn!);

  // Optimize based on target
  switch (optimizationTarget) {
    case 'maxSharpe':
      return findMaxSharpeRatioPortfolio(preparedAssets, covMatrix, expectedReturns, riskFreeRate, constraints);

    case 'minVariance':
      return findMinVariancePortfolio(preparedAssets, covMatrix, expectedReturns, constraints);

    case 'efficientFrontier':
      return calculateEfficientFrontier(preparedAssets, covMatrix, expectedReturns, 20, constraints);

    default:
      throw new Error(`Unknown optimization target: ${optimizationTarget}`);
  }
}

/**
 * Find the portfolio weights that maximize the Sharpe ratio
 */
function findMaxSharpeRatioPortfolio(
  assets: AssetData[],
  covMatrix: number[][],
  expectedReturns: number[],
  riskFreeRate: number,
  constraints: { minWeight?: number, maxWeight?: number }
): PortfolioStats {
  const n = assets.length;

  // Convert to matrices for easier calculation
  const covMatrixObj = new Matrix(covMatrix);
  const inverse = covMatrixObj.inverse();

  // Calculate weights for maximum Sharpe ratio
  const excessReturns = expectedReturns.map(r => r - riskFreeRate);
  const excessReturnsMatrix = Matrix.columnVector(excessReturns);

  // Calculate unconstrained weights
  const numerator = inverse.mmul(excessReturnsMatrix);
  const sumWeights = numerator.sum();

  // Normalize weights to sum to 1
  let weights = numerator.to1DArray().map(w => w / sumWeights);

  // Apply constraints
  weights = applyConstraints(weights, constraints);

  // Calculate portfolio statistics
  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioRisk = calculatePortfolioRisk(weights, covMatrix);
  const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioRisk;

  // Create weight map
  const weightMap: { [symbol: string]: number } = {};
  assets.forEach((asset, i) => {
    weightMap[asset.symbol] = weights[i];
  });

  return {
    expectedReturn: portfolioReturn,
    volatility: portfolioRisk,
    sharpeRatio,
    weights: weightMap
  };
}

/**
 * Find the portfolio weights that minimize variance
 */
function findMinVariancePortfolio(
  assets: AssetData[],
  covMatrix: number[][],
  expectedReturns: number[],
  constraints: { minWeight?: number, maxWeight?: number }
): PortfolioStats {
  const n = assets.length;

  // Convert to matrices for easier calculation
  const covMatrixObj = new Matrix(covMatrix);
  const inverse = covMatrixObj.inverse();

  // Create a vector of ones
  const ones = Matrix.ones(n, 1);

  // Calculate global minimum variance portfolio
  const numerator = inverse.mmul(ones);
  const denominator = ones.transpose().mmul(inverse).mmul(ones).get(0, 0);

  // Calculate weights
  let weights = numerator.to1DArray().map(w => w / denominator);

  // Apply constraints
  weights = applyConstraints(weights, constraints);

  // Calculate portfolio statistics
  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioRisk = calculatePortfolioRisk(weights, covMatrix);
  const sharpeRatio = portfolioReturn / portfolioRisk; // Using portfolio return as excess return

  // Create weight map
  const weightMap: { [symbol: string]: number } = {};
  assets.forEach((asset, i) => {
    weightMap[asset.symbol] = weights[i];
  });

  return {
    expectedReturn: portfolioReturn,
    volatility: portfolioRisk,
    sharpeRatio,
    weights: weightMap
  };
}

/**
 * Calculate the efficient frontier - a series of portfolios with
 * different risk/return characteristics
 */
function calculateEfficientFrontier(
  assets: AssetData[],
  covMatrix: number[][],
  expectedReturns: number[],
  numPortfolios: number = 20,
  constraints: { minWeight?: number, maxWeight?: number }
): PortfolioStats[] {
  // Find min and max returns
  const minVarPortfolio = findMinVariancePortfolio(assets, covMatrix, expectedReturns, constraints);
  const minReturn = minVarPortfolio.expectedReturn;

  // Find max return
  const maxReturn = Math.max(...expectedReturns);

  // Generate portfolios along the efficient frontier
  const stepSize = (maxReturn - minReturn) / (numPortfolios - 1);
  const efficientFrontier: PortfolioStats[] = [];

  for (let i = 0; i < numPortfolios; i++) {
    const targetReturn = minReturn + stepSize * i;

    try {
      const portfolio = findEfficientPortfolio(
        assets, covMatrix, expectedReturns, targetReturn, constraints
      );
      efficientFrontier.push(portfolio);
    } catch (e) {
      console.warn(`Failed to find portfolio at target return ${targetReturn}:`, e);
      // Skip and continue
    }
  }

  return efficientFrontier;
}

/**
 * Find the minimum variance portfolio given a target return
 */
function findEfficientPortfolio(
  assets: AssetData[],
  covMatrix: number[][],
  expectedReturns: number[],
  targetReturn: number,
  constraints: { minWeight?: number, maxWeight?: number }
): PortfolioStats {
  const n = assets.length;

  // Use quadratic programming to find the minimum variance portfolio
  // This is a simplified implementation

  // Since quadratic programming is complex, we'll use a numerical approach
  // Start with equal weights and optimize
  let weights = new Array(n).fill(1 / n);
  const iterations = 1000;
  const learningRate = 0.01;

  for (let i = 0; i < iterations; i++) {
    const currentReturn = calculatePortfolioReturn(weights, expectedReturns);
    const currentRisk = calculatePortfolioRisk(weights, covMatrix);

    // Gradient of the risk with respect to weights
    const riskGradient = calculateRiskGradient(weights, covMatrix);

    // Gradient of the return constraint
    const returnGradient = expectedReturns.map(r => r - currentReturn);

    // Update weights to reduce risk while maintaining return
    for (let j = 0; j < n; j++) {
      weights[j] -= learningRate * (riskGradient[j] - returnGradient[j]);
    }

    // Normalize and ensure return constraint
    weights = normalizeWeights(weights);

    // Adjust to meet target return
    const returnDiff = targetReturn - calculatePortfolioReturn(weights, expectedReturns);
    if (Math.abs(returnDiff) > 0.0001) {
      for (let j = 0; j < n; j++) {
        weights[j] += 0.1 * returnDiff * expectedReturns[j] / Math.max(...expectedReturns);
      }
      weights = normalizeWeights(weights);
    }

    // Apply constraints
    weights = applyConstraints(weights, constraints);
  }

  // Final portfolio stats
  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioRisk = calculatePortfolioRisk(weights, covMatrix);
  const sharpeRatio = portfolioReturn / portfolioRisk;

  // Create weight map
  const weightMap: { [symbol: string]: number } = {};
  assets.forEach((asset, i) => {
    weightMap[asset.symbol] = weights[i];
  });

  return {
    expectedReturn: portfolioReturn,
    volatility: portfolioRisk,
    sharpeRatio,
    weights: weightMap
  };
}

// Helper functions

/**
 * Calculate the mean of an array of numbers
 */
function calculateMean(data: number[]): number {
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calculate the standard deviation of an array of numbers
 */
function calculateStdDev(data: number[]): number {
  const mean = calculateMean(data);
  const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  return Math.sqrt(variance);
}

/**
 * Calculate the covariance matrix for multiple return series
 */
function calculateCovarianceMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length; // Number of assets
  const periods = returnSeries[0].length; // Number of time periods

  // Initialize covariance matrix
  const covMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  // Calculate means
  const means = returnSeries.map(series => calculateMean(series));

  // Calculate covariances
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let t = 0; t < periods; t++) {
        sum += (returnSeries[i][t] - means[i]) * (returnSeries[j][t] - means[j]);
      }
      covMatrix[i][j] = sum / periods;
    }
  }

  return covMatrix;
}

/**
 * Calculate portfolio return given weights and expected returns
 */
function calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
  return weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
}

/**
 * Calculate portfolio risk (standard deviation) given weights and covariance matrix
 */
function calculatePortfolioRisk(weights: number[], covMatrix: number[][]): number {
  let variance = 0;
  const n = weights.length;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }

  return Math.sqrt(variance);
}

/**
 * Calculate the gradient of the portfolio risk with respect to weights
 */
function calculateRiskGradient(weights: number[], covMatrix: number[][]): number[] {
  const n = weights.length;
  const gradient = new Array(n).fill(0);
  const portfolioRisk = calculatePortfolioRisk(weights, covMatrix);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += weights[j] * covMatrix[i][j];
    }
    gradient[i] = sum / portfolioRisk;
  }

  return gradient;
}

/**
 * Normalize weights to sum to 1
 */
function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => w / sum);
}

/**
 * Apply minimum and maximum weight constraints
 */
function applyConstraints(
  weights: number[],
  constraints: { minWeight?: number, maxWeight?: number }
): number[] {
  const { minWeight = 0, maxWeight = 1 } = constraints;

  // Apply min and max constraints
  let constrained = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)));

  // Re-normalize
  return normalizeWeights(constrained);
}

/**
 * Annualize a return or volatility value
 */
function annualize(value: number, periods: number, periodsPerYear = 252): number {
  // For returns: (1 + r)^252 - 1
  // For volatility: σ * sqrt(252)
  if (Math.abs(value) < 0.1) { // Likely a daily return
    return value * Math.sqrt(periodsPerYear);
  } else {
    return Math.pow(1 + value, periodsPerYear / periods) - 1;
  }
}

/**
 * Generate random portfolios for Monte Carlo simulation
 */
export function generateRandomPortfolios(
  assets: AssetData[],
  numPortfolios: number = 1000
): PortfolioStats[] {
  const n = assets.length;
  const portfolios: PortfolioStats[] = [];

  // Calculate expected returns and covariance matrix
  const expectedReturns = assets.map(a => a.expectedReturn ??
    annualize(calculateMean(a.returns), a.returns.length));
  const covMatrix = calculateCovarianceMatrix(assets.map(a => a.returns));

  // Generate random portfolios
  for (let i = 0; i < numPortfolios; i++) {
    // Generate random weights
    let weights = new Array(n).fill(0).map(() => Math.random());
    weights = normalizeWeights(weights);

    // Calculate portfolio statistics
    const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
    const portfolioRisk = calculatePortfolioRisk(weights, covMatrix);
    const sharpeRatio = portfolioReturn / portfolioRisk;

    // Create weight map
    const weightMap: { [symbol: string]: number } = {};
    assets.forEach((asset, j) => {
      weightMap[asset.symbol] = weights[j];
    });

    portfolios.push({
      expectedReturn: portfolioReturn,
      volatility: portfolioRisk,
      sharpeRatio,
      weights: weightMap
    });
  }

  return portfolios;
} 