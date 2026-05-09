import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { isRedisAvailable, REDIS_URL, REDIS_OPTIONS } from './queue.ts';
import { syncCampaignsProcessor } from './jobs/sync_campaigns.ts';
import { analyzeCampaignProcessor } from './jobs/analyze_campaign.ts';
import { urlAnalysisProcessor } from './jobs/url_analysis.ts';
import { logger } from '../services/logger.ts';

if (isRedisAvailable) {
  const connection = new IORedis(REDIS_URL!, REDIS_OPTIONS);

  const worker = new Worker('jobs', async (job) => {
    console.log(`[Worker] Started job ${job.id} of type ${job.name}`);
    
    const { workspace_id } = job.data;
    
    if (!workspace_id) {
      throw new Error('Mandatory field "workspace_id" is missing in job data');
    }

    try {
      switch (job.name) {
        case 'sync_campaigns':
          return await syncCampaignsProcessor(job.data);
        case 'analyze_campaign':
          return await analyzeCampaignProcessor(job.data);
        case 'url_analysis':
          return await urlAnalysisProcessor(job.data);
        default:
          throw new Error(`Job type "${job.name}" is not recognized by this worker`);
      }
    } catch (error: any) {
      console.error(`[Worker] Error processing job ${job.id}:`, error.message);
      throw error;
    }
  }, {
    connection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 10000
    }
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} (${job.name}) completed successfully`);
    logger.logQueueEvent({
      jobId: job.id || 'unknown',
      jobName: job.name || 'unknown',
      status: 'COMPLETED',
      retryCount: job.attemptsMade || 0
    });
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} (${job?.name}) failed:`, err.message);
    logger.logQueueEvent({
      jobId: job?.id || 'unknown',
      jobName: job?.name || 'unknown',
      status: 'FAILED',
      retryCount: job?.attemptsMade || 0,
      reason: err.message
    });
  });

  console.log('[Worker] Jobs worker initialized and listening for tasks...');
} else {
  console.warn('[Worker] ⚠️ REDIS_URL not found. Background workers NOT started. Jobs will run in-memory fallback mode.');
}
