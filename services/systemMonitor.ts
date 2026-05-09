import { logger } from './logger.ts';
import { db } from '../src/db/index.js';
import { isRedisAvailable } from '../queue/queue.ts';

export interface SystemHealth {
  database: 'OK' | 'DEGRADED' | 'DOWN';
  redis: 'OK' | 'DOWN';
  queue: 'OK' | 'DEGRADED';
  metaApi: 'OK' | 'DEGRADED' | 'DOWN';
  workers: 'OK' | 'DOWN';
  failedJobsCount: number;
  lastCheckTime: string;
}

class SystemMonitorService {
  private static instance: SystemMonitorService;
  private health: SystemHealth = {
    database: 'OK',
    redis: isRedisAvailable ? 'OK' : 'DOWN',
    queue: 'OK',
    metaApi: 'OK',
    workers: isRedisAvailable ? 'OK' : 'DOWN',
    failedJobsCount: 0,
    lastCheckTime: new Date().toISOString()
  };

  private constructor() {}

  public static getInstance(): SystemMonitorService {
    if (!SystemMonitorService.instance) {
      SystemMonitorService.instance = new SystemMonitorService();
    }
    return SystemMonitorService.instance;
  }

  public getHealth(): SystemHealth {
    const logs = logger.getLogs();
    this.health.failedJobsCount = logs.summary.failedJobs;
    return this.health;
  }

  public async runHealthCheck() {
    try {
      // 1. Database Check
      try {
        await db.execute('SELECT 1');
        this.health.database = 'OK';
      } catch (err: any) {
        this.health.database = 'DOWN';
        logger.logError({
          type: 'BACKEND_CRASH',
          message: 'Database connection failed during health check',
          stack: err.stack
        });
      }

      // 2. Redis / Queue Check
      if (isRedisAvailable) {
        // Assume OK unless queue logs show high failure rate
        const logs = logger.getLogs();
        const recentFails = logs.queueLogs.filter(q => q.status === 'FAILED').length;
        if (recentFails > 10) {
          this.health.queue = 'DEGRADED';
        } else {
          this.health.queue = 'OK';
        }
      }

      // 3. Meta API Simulation / Connectivity Check
      // In a real scenario we might ping `graph.facebook.com`
      try {
        const res = await fetch('https://graph.facebook.com/v21.0/');
        if (res.status >= 500) {
           this.health.metaApi = 'DOWN';
        } else {
           this.health.metaApi = 'OK';
        }
      } catch (err: any) {
        this.health.metaApi = 'DOWN';
        logger.logError({
          type: 'API_FAILURE',
          message: 'Meta API completely unreachable',
          stack: err.stack
        });
      }

      // 4. Feature Verification Checks (Dry runs)
      await this.verifyIntelligenceFeatures();

      this.health.lastCheckTime = new Date().toISOString();
      if (logger.devMode) {
        console.log('[SystemMonitor] Health check completed.', this.health);
      }
    } catch (err: any) {
      console.error('[SystemMonitor] Critical failure in health check routine', err);
    }
  }

  private async verifyIntelligenceFeatures() {
    // Simulate feature checks - if math is broken, NaN is returned
    // Unified Performance Verify
    try {
      const { calculateMetrics } = await import('../server.ts');
      const testMetrics = calculateMetrics(100, 1000, 50, 5, 200);
      if (isNaN(testMetrics.roas) || isNaN(testMetrics.cpa)) {
        throw new Error('Metrics calculation returned NaN');
      }
    } catch (err: any) {
      logger.logError({
        type: 'AI_FAILURE',
        message: 'Unified Performance calculation self-test failed',
        stack: err.stack
      });
    }

    // You can add more checks here (e.g. Scraper tests)
  }

  public start() {
    console.log('[SystemMonitor] Started automated health monitoring and bug detection.');
    // Run every 60 seconds
    setInterval(() => this.runHealthCheck(), 60000);
    // Initial run
    this.runHealthCheck();
  }
}

export const systemMonitor = SystemMonitorService.getInstance();
