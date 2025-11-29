/**
 * ============================================
 * FUSION API
 * ============================================
 * 
 * HTTP API endpoints for the Fusion layer.
 * Exposes unified intelligence to external consumers.
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { UnifiedIntelligence, UnifiedView, DashboardData } from './unified-intelligence';
import { FusionAlert, PriceData, WhaleActivity, SentimentData, LiquidityData, TokenUnlockEvent } from './fusion-engine';
import { PricePrediction } from './predictive-linker';
import { CorrelationEvent } from './cross-api-correlator';

// =============================================================================
// FUSION API ROUTER
// =============================================================================

export function createFusionApiRouter(intelligence: UnifiedIntelligence): Router {
  const router = Router();

  // ===========================================================================
  // UNIFIED VIEW ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/fusion/:symbol
   * Get unified intelligence for a single symbol
   */
  router.get('/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const view = await intelligence.getUnifiedView(symbol.toUpperCase());
      
      res.json({
        success: true,
        data: view,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'GET /:symbol',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get unified view',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/fusion/dashboard
   * Get dashboard data for multiple symbols
   */
  router.post('/dashboard', async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body as { symbols: string[] };
      
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'symbols array is required',
        });
      }

      const dashboard = await intelligence.getDashboard(
        symbols.map(s => s.toUpperCase())
      );
      
      res.json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'POST /dashboard',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard',
        message: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // PREDICTION ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/fusion/:symbol/predict
   * Get AI predictions for a symbol
   */
  router.get('/:symbol/predict', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { timeframe } = req.query;
      
      const view = await intelligence.getUnifiedView(symbol.toUpperCase());
      
      // Get prediction with specified timeframe
      const linker = intelligence.getPredictiveLinker();
      const prediction = linker.predictPrice({
        symbol: symbol.toUpperCase(),
        priceChange24h: view.market.priceChange24h,
        volume24h: view.market.volume24h,
        whaleTransfers24h: view.whales.recentActivityCount,
        whaleVolumeUsd: Math.abs(view.whales.netFlow24h),
        sentimentScore: view.sentiment.score,
        upcomingUnlockPct: view.tokenomics.upcomingUnlocks.reduce((sum, u) => sum + u.percentOfSupply, 0),
        daysToUnlock: view.tokenomics.upcomingUnlocks[0]
          ? (new Date(view.tokenomics.upcomingUnlocks[0].date).getTime() - Date.now()) / 86400000
          : 999,
        liquidityDepth: view.liquidity.totalDepth,
      }, (timeframe as '1h' | '4h' | '24h' | '7d') || '24h');
      
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          prediction,
          recommendation: view.predictions.recommendation,
          reasoning: view.predictions.reasoning,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'GET /:symbol/predict',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate prediction',
        message: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // CORRELATION ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/fusion/correlations
   * Get recent cross-API correlations
   */
  router.get('/correlations', async (req: Request, res: Response) => {
    try {
      const { symbol, type, minStrength, limit } = req.query;
      
      const correlator = intelligence.getCorrelator();
      const correlations = correlator.getCorrelations({
        symbol: symbol as string | undefined,
        type: type as CorrelationEvent['type'] | undefined,
        minStrength: minStrength ? parseInt(minStrength as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      
      res.json({
        success: true,
        data: correlations,
        count: correlations.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'GET /correlations',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get correlations',
        message: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // ALERT ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/fusion/alerts
   * Get recent fusion alerts
   */
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const { symbol, type, severity, limit } = req.query;
      
      const engine = intelligence.getFusionEngine();
      const alerts = engine.getAlerts({
        symbol: symbol as string | undefined,
        type: type as FusionAlert['type'] | undefined,
        severity: severity as FusionAlert['severity'] | undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'GET /alerts',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get alerts',
        message: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // DATA INGESTION ENDPOINTS (for internal use / webhooks)
  // ===========================================================================

  /**
   * POST /api/fusion/ingest/price
   * Ingest price data from external sources
   */
  router.post('/ingest/price', async (req: Request, res: Response) => {
    try {
      const data = req.body as PriceData;
      
      if (!data.symbol || !data.price) {
        return res.status(400).json({
          success: false,
          error: 'symbol and price are required',
        });
      }

      const engine = intelligence.getFusionEngine();
      engine.ingestPrice({
        ...data,
        timestamp: new Date(data.timestamp),
      });
      
      res.json({
        success: true,
        message: 'Price data ingested',
        symbol: data.symbol,
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'POST /ingest/price',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to ingest price data',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/fusion/ingest/whale
   * Ingest whale activity from external sources
   */
  router.post('/ingest/whale', async (req: Request, res: Response) => {
    try {
      const data = req.body as WhaleActivity;
      
      if (!data.tokenSymbol || !data.valueUsd) {
        return res.status(400).json({
          success: false,
          error: 'tokenSymbol and valueUsd are required',
        });
      }

      const engine = intelligence.getFusionEngine();
      engine.ingestWhaleActivity({
        ...data,
        timestamp: new Date(data.timestamp),
      });
      
      res.json({
        success: true,
        message: 'Whale activity ingested',
        symbol: data.tokenSymbol,
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'POST /ingest/whale',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to ingest whale data',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/fusion/ingest/sentiment
   * Ingest sentiment data
   */
  router.post('/ingest/sentiment', async (req: Request, res: Response) => {
    try {
      const data = req.body as SentimentData;
      
      if (!data.symbol || data.score === undefined) {
        return res.status(400).json({
          success: false,
          error: 'symbol and score are required',
        });
      }

      const engine = intelligence.getFusionEngine();
      engine.ingestSentiment({
        ...data,
        timestamp: new Date(data.timestamp),
      });
      
      res.json({
        success: true,
        message: 'Sentiment data ingested',
        symbol: data.symbol,
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'POST /ingest/sentiment',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to ingest sentiment data',
        message: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // STATS & HEALTH
  // ===========================================================================

  /**
   * GET /api/fusion/stats
   * Get fusion system statistics
   */
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const stats = intelligence.getStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Fusion API error', { 
        component: 'FusionAPI', 
        error: (error as Error).message,
        endpoint: 'GET /stats',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get stats',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/fusion/health
   * Health check for fusion API
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'fusion-api',
      components: {
        fusionEngine: 'healthy',
        predictiveLinker: 'healthy',
        correlator: 'healthy',
      },
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

// =============================================================================
// STANDALONE FUSION API SERVER
// =============================================================================

export async function startFusionApiServer(port: number = 3001): Promise<void> {
  const express = await import('express');
  const app = express.default();
  
  app.use(express.json());
  
  // Create intelligence service
  const intelligence = new UnifiedIntelligence();
  
  // Mount fusion router
  app.use('/api/fusion', createFusionApiRouter(intelligence));
  
  // Root health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'fusion-api-server' });
  });
  
  app.listen(port, () => {
    logger.info(`Fusion API server started on port ${port}`, {
      component: 'FusionAPI',
      endpoints: [
        'GET /api/fusion/:symbol',
        'POST /api/fusion/dashboard',
        'GET /api/fusion/:symbol/predict',
        'GET /api/fusion/correlations',
        'GET /api/fusion/alerts',
        'POST /api/fusion/ingest/price',
        'POST /api/fusion/ingest/whale',
        'POST /api/fusion/ingest/sentiment',
        'GET /api/fusion/stats',
        'GET /api/fusion/health',
      ],
    });
  });
}

