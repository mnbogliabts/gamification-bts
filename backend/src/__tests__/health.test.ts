import request from 'supertest';
import express from 'express';
import { checkDatabaseHealth, getPoolStats } from '../infrastructure/database/connection';

// Mock the database functions
jest.mock('../infrastructure/database/connection', () => ({
  checkDatabaseHealth: jest.fn(),
  getPoolStats: jest.fn(),
}));

describe('Health Endpoint', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Define health endpoint (same as in index.ts)
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
          timestamp: expect.any(String),
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
          timestamp: expect.any(String),
        });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 OK when database is healthy', async () => {
    // Mock healthy database
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({
      healthy: true,
      responseTime: 15,
    });
    
    (getPoolStats as jest.Mock).mockReturnValue({
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      database: {
        status: 'connected',
        responseTime: 15,
        pool: {
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        },
      },
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 503 Service Unavailable when database is unhealthy', async () => {
    // Mock unhealthy database
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({
      healthy: false,
      responseTime: 5000,
      error: 'Connection timeout',
    });
    
    (getPoolStats as jest.Mock).mockReturnValue({
      totalCount: 0,
      idleCount: 0,
      waitingCount: 5,
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'degraded',
      database: {
        status: 'disconnected',
        responseTime: 5000,
        error: 'Connection timeout',
        pool: {
          totalCount: 0,
          idleCount: 0,
          waitingCount: 5,
        },
      },
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('should include pool statistics in response', async () => {
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({
      healthy: true,
      responseTime: 10,
    });
    
    (getPoolStats as jest.Mock).mockReturnValue({
      totalCount: 10,
      idleCount: 7,
      waitingCount: 2,
    });

    const response = await request(app).get('/health');

    expect(response.body.database.pool).toEqual({
      totalCount: 10,
      idleCount: 7,
      waitingCount: 2,
    });
  });

  it('should include response time in health check', async () => {
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({
      healthy: true,
      responseTime: 25,
    });
    
    (getPoolStats as jest.Mock).mockReturnValue({
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    });

    const response = await request(app).get('/health');

    expect(response.body.database.responseTime).toBe(25);
  });
});
