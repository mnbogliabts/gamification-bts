import express from 'express';
import dotenv from 'dotenv';
import passport from 'passport';
import { createDatabasePool, connectWithRetry, checkDatabaseHealth, getPoolStats } from './infrastructure/database/connection';
import logger from './shared/logger';
import {
  createHelmetMiddleware,
  createCorsMiddleware,
  sanitizeInput,
  createRateLimiter,
  errorHandler,
} from './presentation/middleware';
import apiRoutes from './presentation/routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(createHelmetMiddleware());
app.use(createCorsMiddleware());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(createRateLimiter());

// Passport initialization (for Google OAuth)
app.use(passport.initialize());

// Health check endpoint with database connectivity check
app.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const poolStats = getPoolStats();
  
  if (dbHealth.healthy) {
    res.status(200).json({ 
      status: 'ok', 
      database: {
        status: 'connected',
        responseTime: dbHealth.responseTime,
        pool: poolStats,
      },
      timestamp: new Date().toISOString() 
    });
  } else {
    res.status(503).json({ 
      status: 'degraded', 
      database: {
        status: 'disconnected',
        responseTime: dbHealth.responseTime,
        error: dbHealth.error,
        pool: poolStats,
      },
      timestamp: new Date().toISOString() 
    });
  }
});

// Mount API routes
app.use('/api', apiRoutes);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Create database pool
    logger.info('Initializing database connection pool...');
    createDatabasePool();
    
    // Connect with retry logic
    await connectWithRetry(3);
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
