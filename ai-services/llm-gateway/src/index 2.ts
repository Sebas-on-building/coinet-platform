import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { chatRoutes } from './routes/chat';
import { healthRoutes } from './routes/health';
import { LLMOrchestrator } from './services/LLMOrchestrator';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 8001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGINS']?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'),
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Redis client
const redisClient = createClient({
  url: process.env['REDIS_URL'] || 'redis://localhost:6379'
});

// Initialize LLM Orchestrator
const llmOrchestrator = new LLMOrchestrator();

// Routes
app.use('/health', healthRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist.`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }

  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Initialize LLM services
    await llmOrchestrator.initialize();
    logger.info('LLM Orchestrator initialized');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 LLM Gateway server running on port ${PORT}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🤖 Chat API: http://localhost:${PORT}/api/chat`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { app, redisClient, llmOrchestrator };

// Start server if not in test environment
if (process.env['NODE_ENV'] !== 'test') {
  startServer();
} 