import { TokenManagementService } from '../../domain/services/TokenManagementService';

/**
 * Session cleanup job
 * Removes expired sessions from the database
 * Should be scheduled to run periodically (e.g., daily)
 * Requirements: 1.7
 */
export class SessionCleanupJob {
  constructor(private readonly tokenManagementService: TokenManagementService) {}

  /**
   * Execute the cleanup job
   * Returns the number of expired sessions deleted
   */
  async execute(): Promise<number> {
    try {
      const deletedCount = await this.tokenManagementService.cleanupExpiredSessions();
      console.log(`Session cleanup completed: ${deletedCount} expired sessions removed`);
      return deletedCount;
    } catch (error) {
      console.error('Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Schedule the cleanup job to run at a specific interval
   * @param intervalMs - Interval in milliseconds (default: 24 hours)
   */
  schedule(intervalMs: number = 24 * 60 * 60 * 1000): NodeJS.Timeout {
    console.log(`Scheduling session cleanup job to run every ${intervalMs / 1000 / 60 / 60} hours`);
    
    // Run immediately on startup
    this.execute().catch(error => {
      console.error('Initial session cleanup failed:', error);
    });

    // Schedule recurring execution
    return setInterval(() => {
      this.execute().catch(error => {
        console.error('Scheduled session cleanup failed:', error);
      });
    }, intervalMs);
  }
}
