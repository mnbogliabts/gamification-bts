import { PoolClient } from 'pg';
import { getDatabasePool } from './connection';
import logger from '../../shared/logger';

/**
 * Execute a function within a database transaction
 * Automatically commits on success and rolls back on error
 * Requirement 14.2: Roll back all changes when any part of operation fails
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.warn('Transaction rolled back', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    client.release();
    logger.debug('Database client released');
  }
}

/**
 * Execute multiple operations in a transaction with cleanup on failure
 * Useful for operations that involve both database and file system changes
 */
export async function withTransactionAndCleanup<T>(
  callback: (client: PoolClient) => Promise<T>,
  onRollback?: () => Promise<void>
): Promise<T> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    logger.debug('Transaction with cleanup started');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction with cleanup committed');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.warn('Transaction rolled back, executing cleanup', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Execute cleanup function (e.g., delete uploaded files)
    if (onRollback) {
      try {
        await onRollback();
        logger.debug('Cleanup completed successfully');
      } catch (cleanupError) {
        logger.error('Cleanup failed after rollback', {
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }

    throw error;
  } finally {
    client.release();
    logger.debug('Database client released');
  }
}
