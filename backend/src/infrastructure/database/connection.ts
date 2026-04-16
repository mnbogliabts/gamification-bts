import { Pool, PoolConfig } from 'pg';
import logger from '../../shared/logger';

let pool: Pool | null = null;

/**
 * Parse DATABASE_URL connection string into PoolConfig
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(url: string): PoolConfig {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: parsed.pathname.slice(1), // Remove leading slash
      user: parsed.username,
      password: parsed.password,
    };
  } catch (error) {
    logger.error('Failed to parse DATABASE_URL', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Invalid DATABASE_URL format');
  }
}

/**
 * Database connection configuration with connection pooling
 * 
 * Pool Configuration:
 * - max: Maximum number of clients in the pool (default: 20)
 * - idleTimeoutMillis: How long a client can remain idle before being closed (default: 30s)
 * - connectionTimeoutMillis: Maximum time to wait for a connection (default: 5s)
 * 
 * Supports both individual environment variables and DATABASE_URL connection string
 * 
 * Requirements: 18.1, 19.1
 */
export function createDatabasePool(config?: PoolConfig): Pool {
  let baseConfig: PoolConfig;

  if (config) {
    // Use provided config (for testing)
    baseConfig = config;
  } else if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL if provided (Docker/production)
    baseConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    logger.info('Using DATABASE_URL for connection');
  } else {
    // Use individual environment variables (development)
    baseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'training_platform',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };
    logger.info('Using individual DB environment variables for connection');
  }

  // Merge with connection pooling configuration
  const poolConfig: PoolConfig = {
    ...baseConfig,
    // Connection pooling configuration - environment-based
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool size
    min: parseInt(process.env.DB_POOL_MIN || '2'), // Minimum pool size
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'), // 5 seconds
    // Allow pool to gracefully handle connection errors
    allowExitOnIdle: false,
  };

  pool = new Pool(poolConfig);

  // Log pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
  });

  // Log pool connection events for monitoring
  pool.on('connect', () => {
    logger.debug('New client connected to database pool');
  });

  pool.on('remove', () => {
    logger.debug('Client removed from database pool');
  });

  // Log pool configuration (without sensitive data)
  logger.info('Database pool created', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
    maxConnections: poolConfig.max,
    minConnections: poolConfig.min,
  });

  return pool;
}

/**
 * Get the database pool instance
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createDatabasePool first.');
  }
  return pool;
}

/**
 * Connect to database with retry logic and exponential backoff
 * Requirement 18.1: Retry connection up to 3 times with exponential backoff
 */
export async function connectWithRetry(maxRetries: number = 3): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const dbPool = getDatabasePool();
      await dbPool.query('SELECT 1');
      logger.info('Database connection established successfully');
      return;
    } catch (error) {
      retries++;
      const delay = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s

      logger.warn(
        `Database connection failed (attempt ${retries}/${maxRetries}). Retrying in ${delay}ms...`,
        { error: error instanceof Error ? error.message : String(error) }
      );

      if (retries >= maxRetries) {
        logger.error('Max retries reached. Could not connect to database.');
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

/**
 * Health check for database connection
 * Tests connectivity and returns detailed status
 * Requirements: 18.1, 19.1
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const dbPool = getDatabasePool();
    await dbPool.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Database health check failed', {
      error: errorMessage,
      responseTime,
    });
    
    return {
      healthy: false,
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Simple boolean health check (backward compatible)
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  const result = await checkDatabaseHealth();
  return result.healthy;
}

/**
 * Get database pool statistics for monitoring
 * Provides insights into connection pool usage
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  if (!pool) {
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
