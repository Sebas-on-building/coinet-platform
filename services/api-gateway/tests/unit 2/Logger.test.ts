/**
 * Unit Tests - Logger
 * Testing logging functionality, levels, and error handling
 */

import { Logger } from '../../src/utils/Logger';
import winston from 'winston';

describe('Logger', () => {
  let logger: Logger;
  let mockWinstonLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    // Mock winston logger
    mockWinstonLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      level: 'info'
    } as any;

    // Mock winston.createLogger
    jest.spyOn(winston, 'createLogger').mockReturnValue(mockWinstonLogger);

    logger = new Logger('TestContext');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create logger with correct context', () => {
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: expect.objectContaining({
            service: 'api-gateway',
            context: 'TestContext'
          })
        })
      );
    });

    it('should use environment LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'debug';
      new Logger('DebugContext');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });

    it('should default to info level when LOG_LEVEL not set', () => {
      delete process.env.LOG_LEVEL;
      new Logger('DefaultContext');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info'
        })
      );
    });
  });

  describe('Logging Methods', () => {
    it('should log error messages with error details', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      
      logger.error('Error occurred', error, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error: 'Test error',
          stack: error.stack,
          userId: '123',
          action: 'test'
        })
      );
    });

    it('should log error messages without error object', () => {
      const context = { userId: '123' };
      
      logger.error('Simple error', undefined, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Simple error',
        expect.objectContaining({
          userId: '123'
        })
      );
    });

    it('should log warning messages', () => {
      const context = { operation: 'test' };
      
      logger.warn('Warning message', context);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'Warning message',
        context
      );
    });

    it('should log info messages', () => {
      const context = { feature: 'test' };
      
      logger.info('Info message', context);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Info message',
        context
      );
    });

    it('should log debug messages', () => {
      const context = { debug: true };
      
      logger.debug('Debug message', context);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        'Debug message',
        context
      );
    });

    it('should handle generic log method', () => {
      const context = { level: 'warn' };
      
      logger.log('warn', 'Generic log message', context);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'warn',
        'Generic log message',
        context
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects', () => {
      const errorLike = { message: 'Not an Error object' };
      
      logger.error('Custom error', errorLike);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Custom error',
        expect.objectContaining({
          error: { message: 'Not an Error object' }
        })
      );
    });

    it('should handle string errors', () => {
      logger.error('String error', 'Simple error string');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'String error',
        expect.objectContaining({
          error: 'Simple error string'
        })
      );
    });

    it('should handle null context', () => {
      logger.info('Message without context');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Message without context',
        undefined
      );
    });
  });

  describe('Level Management', () => {
    it('should set log level', () => {
      logger.setLevel('debug');

      expect(mockWinstonLogger.level).toBe('debug');
    });

    it('should handle all valid log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        logger.setLevel(level as any);
        expect(mockWinstonLogger.level).toBe(level);
      });
    });
  });

  describe('Context Validation', () => {
    it('should preserve original context object', () => {
      const context = { immutable: true };
      const originalContext = { ...context };
      
      logger.info('Test message', context);

      expect(context).toEqual(originalContext);
    });

    it('should handle complex context objects', () => {
      const complexContext = {
        nested: { data: { value: 123 } },
        array: [1, 2, 3],
        date: new Date(),
        function: () => 'test'
      };
      
      logger.info('Complex context', complexContext);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Complex context',
        complexContext
      );
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency logging', async () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        logger.info(`Message ${i}`, { iteration: i });
      }

      const duration = Date.now() - start;
      
      expect(mockWinstonLogger.info).toHaveBeenCalledTimes(iterations);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not block on logging calls', () => {
      const start = Date.now();
      
      logger.error('Non-blocking error', new Error('Test'));
      logger.warn('Non-blocking warning');
      logger.info('Non-blocking info');
      logger.debug('Non-blocking debug');

      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10); // Should be nearly instant
    });
  });
}); 