import { Pool } from 'pg';
import {
  createDatabasePool,
  getDatabasePool,
  connectWithRetry,
  closeDatabasePool,
  checkDatabaseHealth,
  getPoolStats,
} from '../connection';
import logger from '../../../shared/logger';

// Mock pg Pool
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockEnd = jest.fn();
  const mockOn = jest.fn();

  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      end: mockEnd,
      on: mockOn,
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    })),
  };
});

// Mock logger
jest.mock('../../../shared/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('Database Connection', () => {
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool();
  });

  describe('createDatabasePool', () => {
    beforeEach(() => {
      // Clear DATABASE_URL for these tests
      delete process.env.DATABASE_URL;
    });

    it('should create a database pool with default configuration', () => {
      const pool = createDatabasePool();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'training_platform',
          user: 'postgres',
          password: 'postgres',
        })
      );
      expect(pool).toBeDefined();
    });

    it('should create a database pool with custom configuration', () => {
      const customConfig = {
        host: 'custom-host',
        port: 5433,
        database: 'custom_db',
        user: 'custom_user',
        password: 'custom_pass',
      };

      createDatabasePool(customConfig);

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining(customConfig)
      );
    });

    it('should register error handler on pool', () => {
      createDatabasePool();

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should use environment variables when available', () => {
      delete process.env.DATABASE_URL; // Ensure DATABASE_URL is not set
      process.env.DB_HOST = 'env-host';
      process.env.DB_PORT = '5434';
      process.env.DB_NAME = 'env_db';
      process.env.DB_USER = 'env_user';
      process.env.DB_PASSWORD = 'env_pass';

      createDatabasePool();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'env-host',
          port: 5434,
          database: 'env_db',
          user: 'env_user',
          password: 'env_pass',
        })
      );

      // Clean up
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
    });
  });

  describe('getDatabasePool', () => {
    it('should return the pool instance after creation', () => {
      createDatabasePool();
      const pool = getDatabasePool();

      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
      expect(pool.end).toBeDefined();
    });

    it('should throw error if pool not initialized', () => {
      // Reset module to clear pool
      jest.resetModules();
      const { getDatabasePool: getPool } = require('../connection');

      expect(() => getPool()).toThrow('Database pool not initialized');
    });
  });

  describe('connectWithRetry', () => {
    beforeEach(() => {
      createDatabasePool();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should connect successfully on first attempt', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await connectWithRetry();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(logger.info).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should retry on failure with exponential backoff', async () => {
      mockPool.query
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const connectPromise = connectWithRetry(3);

      // First retry after 2 seconds
      await jest.advanceTimersByTimeAsync(2000);
      // Second retry after 4 seconds
      await jest.advanceTimersByTimeAsync(4000);

      await connectPromise;

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should log retry attempts with delay information', async () => {
      mockPool.query
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const connectPromise = connectWithRetry(3);
      await jest.advanceTimersByTimeAsync(2000);
      await connectPromise;

      expect(logger.warn).toHaveBeenCalledWith(
        'Database connection failed (attempt 1/3). Retrying in 2000ms...',
        expect.objectContaining({ error: 'Connection failed' })
      );
    });
  });

  describe('closeDatabasePool', () => {
    it('should close the pool and set it to null', async () => {
      createDatabasePool();
      mockPool.end.mockResolvedValueOnce(undefined);

      await closeDatabasePool();

      expect(mockPool.end).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection pool closed');
    });

    it('should handle closing when pool is already null', async () => {
      await closeDatabasePool();

      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });

  describe('checkDatabaseHealth', () => {
    beforeEach(() => {
      createDatabasePool();
    });

    it('should return healthy status when database is healthy', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const health = await checkDatabaseHealth();

      expect(health.healthy).toBe(true);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return unhealthy status when database is unhealthy', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await checkDatabaseHealth();

      expect(health.healthy).toBe(false);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.error).toBe('Connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.objectContaining({ 
          error: 'Connection failed',
          responseTime: expect.any(Number),
        })
      );
    });

    it('should measure response time', async () => {
      mockPool.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [{ '?column?': 1 }] }), 10))
      );

      const health = await checkDatabaseHealth();

      expect(health.healthy).toBe(true);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof health.responseTime).toBe('number');
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics when pool is initialized', () => {
      createDatabasePool();

      const stats = getPoolStats();

      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });
    });

    it('should return zero stats when pool is not initialized', () => {
      // Reset module to clear pool
      jest.resetModules();
      const { getPoolStats: getStats } = require('../connection');

      const stats = getStats();

      expect(stats).toEqual({
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      });
    });
  });

  describe('DATABASE_URL parsing', () => {
    it('should parse DATABASE_URL correctly', () => {
      process.env.DATABASE_URL = 'postgresql://testuser:testpass@testhost:5433/testdb';

      createDatabasePool();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'testhost',
          port: 5433,
          database: 'testdb',
          user: 'testuser',
          password: 'testpass',
        })
      );

      delete process.env.DATABASE_URL;
    });

    it('should prefer DATABASE_URL over individual env variables', () => {
      process.env.DATABASE_URL = 'postgresql://urluser:urlpass@urlhost:5433/urldb';
      process.env.DB_HOST = 'ignored-host';
      process.env.DB_USER = 'ignored-user';

      createDatabasePool();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'urlhost',
          user: 'urluser',
        })
      );

      delete process.env.DATABASE_URL;
      delete process.env.DB_HOST;
      delete process.env.DB_USER;
    });

    it('should handle DATABASE_URL without port', () => {
      process.env.DATABASE_URL = 'postgresql://testuser:testpass@testhost/testdb';

      createDatabasePool();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'testhost',
          port: 5432, // Default port
          database: 'testdb',
        })
      );

      delete process.env.DATABASE_URL;
    });
  });
});
