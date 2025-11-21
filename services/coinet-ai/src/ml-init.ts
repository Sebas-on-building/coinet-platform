/**
 * 🚀 ML DEPLOYMENT INITIALIZATION
 *
 * Simple initialization script for the main application to bootstrap ML capabilities
 */

import { logger } from './utils/logger';
import { productionML } from './ml/production-deployment';

export async function initializeMLDeployment(): Promise<boolean> {
  try {
    logger.info('🚀 Initializing divine market intelligence ML deployment...');

    // Initialize the complete ML deployment
    await productionML.initialize();

    // Log deployment status
    const status = productionML.getDeploymentStatus();
    logger.info('✅ ML deployment initialized successfully');
    logger.info(`📊 Status: ${status.status}`);
    logger.info(`🧠 Psychology Model: ${status.models.psychology}`);
    logger.info(`🔮 Oracle Model: ${status.models.oracle}`);

    return true;

  } catch (error) {
    logger.error(`❌ Failed to initialize ML deployment: ${error}`);
    return false;
  }
}

export async function getPsychologyAnalysis(input: any): Promise<any> {
  try {
    return await productionML.processPsychologyAnalysis(input);
  } catch (error) {
    logger.error(`Psychology analysis failed: ${error}`);
    throw error;
  }
}

export async function getOracleAnalysis(input: any): Promise<any> {
  try {
    return await productionML.processOracleAnalysis(input);
  } catch (error) {
    logger.error(`Oracle analysis failed: ${error}`);
    throw error;
  }
}

export function getMLHealthStatus(): any {
  return productionML.getDeploymentStatus();
}

export function getMonitoringReport(timeWindow?: number): string {
  return productionML.generateMonitoringReport(timeWindow);
}

// Export the main deployment instance for direct access if needed
export { productionML };
