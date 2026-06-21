import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { isRedisAvailable, REDIS_URL, REDIS_OPTIONS } from './queue.ts';
import { syncCampaignsProcessor } from './jobs/sync_campaigns.ts';
import { analyzeCampaignProcessor } from './jobs/analyze_campaign.ts';
import { urlAnalysisProcessor } from './jobs/url_analysis.ts';

if (isRedisAvailable) {
  const connection = new IORedis(REDIS_URL!, REDIS_OPTIONS);

  connection.on('error', (err: any) => {
    if (err.message && (err.message.includes('max requests limit exceeded') || err.message.includes('Connection is closed'))) {
      if (err.message.includes('max requests limit exceeded')) connection?.disconnect();
      return;
    }
    console.error('[Worker Redis] Connection Error:', err.message);
  });

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
    concurrency: 1, // Minimize concurrent requests
    lockDuration: 900000,   // 15 minutes lock
    stalledInterval: 900000, // 15 minutes stalled check
    maxStalledCount: 1,
    drainDelay: 300000,     // WAIT 5 MINUTES when queue is empty (Aggressive Upstash optimization)
    limiter: {
      max: 5,
      duration: 60000       // MAX 5 JOBS per minute
    }
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} (${job.name}) completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  let workerStopping = false;
  worker.on('error', async (err) => {
    if (err.message && (err.message.includes('max requests limit exceeded') || err.message.includes('Connection is closed'))) {
      if (err.message.includes('max requests limit exceeded') && !workerStopping) {
        workerStopping = true;
        try { await worker.close(); } catch (e) {}
      }
      return;
    }
    console.error(`[Worker] BullMQ Error:`, err.message);
  });

  console.log('[Worker] Jobs worker initialized and listening for tasks...');
} else {
  console.warn('[Worker] ⚠️ REDIS_URL not found. Background workers NOT started. Jobs will run in-memory fallback mode.');
}
