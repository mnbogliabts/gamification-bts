import { SessionCleanupJob } from '../sessionCleanup';
import { TokenManagementService } from '../../../domain/services/TokenManagementService';

describe('SessionCleanupJob', () => {
  let sessionCleanupJob: SessionCleanupJob;
  let mockTokenManagementService: jest.Mocked<TokenManagementService>;

  beforeEach(() => {
    mockTokenManagementService = {
      cleanupExpiredSessions: jest.fn(),
    } as any;

    sessionCleanupJob = new SessionCleanupJob(mockTokenManagementService);

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should call cleanupExpiredSessions and return deleted count', async () => {
      mockTokenManagementService.cleanupExpiredSessions.mockResolvedValue(10);

      const result = await sessionCleanupJob.execute();

      expect(result).toBe(10);
      expect(mockTokenManagementService.cleanupExpiredSessions).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Session cleanup completed: 10 expired sessions removed'
      );
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Database connection failed');
      mockTokenManagementService.cleanupExpiredSessions.mockRejectedValue(error);

      await expect(sessionCleanupJob.execute()).rejects.toThrow('Database connection failed');
      expect(console.error).toHaveBeenCalledWith('Session cleanup failed:', error);
    });

    it('should return 0 when no expired sessions exist', async () => {
      mockTokenManagementService.cleanupExpiredSessions.mockResolvedValue(0);

      const result = await sessionCleanupJob.execute();

      expect(result).toBe(0);
      expect(console.log).toHaveBeenCalledWith(
        'Session cleanup completed: 0 expired sessions removed'
      );
    });
  });

  describe('schedule', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute cleanup immediately on startup', async () => {
      mockTokenManagementService.cleanupExpiredSessions.mockResolvedValue(5);

      sessionCleanupJob.schedule(1000);

      // Wait for the immediate execution promise to resolve
      await Promise.resolve();

      expect(mockTokenManagementService.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
    });

    it('should schedule recurring cleanup at specified interval', async () => {
      mockTokenManagementService.cleanupExpiredSessions.mockResolvedValue(3);

      const intervalMs = 1000; // 1 second for testing
      sessionCleanupJob.schedule(intervalMs);

      // Wait for initial execution
      await Promise.resolve();
      expect(mockTokenManagementService.cleanupExpiredSessions).toHaveBeenCalledTimes(1);

      // Advance time by interval
      jest.advanceTimersByTime(intervalMs);
      await Promise.resolve();
      expect(mockTokenManagementService.cleanupExpiredSessions).toHaveBeenCalledTimes(2);

      // Advance time by interval again
      jest.advanceTimersByTime(intervalMs);
      await Promise.resolve();
      expect(mockTokenManagementService.cleanupExpiredSessions).toHaveBeenCalledTimes(3);
    });

    it('should log scheduling information', () => {
      sessionCleanupJob.schedule(24 * 60 * 60 * 1000);

      expect(console.log).toHaveBeenCalledWith(
        'Scheduling session cleanup job to run every 24 hours'
      );
    });

    it('should handle errors during scheduled execution', async () => {
      const error = new Error('Cleanup failed');
      mockTokenManagementService.cleanupExpiredSessions.mockRejectedValue(error);

      sessionCleanupJob.schedule(1000);

      // Wait for initial execution to fail
      await Promise.resolve();
      await Promise.resolve();

      expect(console.error).toHaveBeenCalledWith('Initial session cleanup failed:', error);
    });

    it('should return interval timer', () => {
      const timer = sessionCleanupJob.schedule(1000);

      expect(timer).toBeDefined();
      expect(typeof timer).toBe('object');
      
      clearInterval(timer);
    });
  });
});
