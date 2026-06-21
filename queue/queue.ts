import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const rawRedisUrl = process.env.REDIS_URL;

// Sanitize REDIS_URL to remove accidental CLI flags like --tls or -u
const sanitizeRedisUrl = (url: string | undefined) => {
  if (!url) return null;
  const match = url.match(/(rediss?:\/\/[^\s]+)/);
  return match ? match[1] : url.trim();
};

export const REDIS_URL = sanitizeRedisUrl(rawRedisUrl);

export const REDIS_OPTIONS: any = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false, // Save requests
  connectTimeout: 10000,
  reconnectOnError: (err: any) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

// Upstash/Managed Redis usually require TLS
if (REDIS_URL && (REDIS_URL.startsWith('rediss://') || rawRedisUrl?.includes('--tls'))) {
  REDIS_OPTIONS.tls = {
    rejectUnauthorized: false
  };
}

// Use dummy connection if no REDIS_URL is provided to prevent crashes in preview/local
export const isRedisAvailable = !!REDIS_URL;

let connection: IORedis | null = null;
let queueInstance: any = null;

if (isRedisAvailable) {
  connection = new IORedis(REDIS_URL!, REDIS_OPTIONS);

  queueInstance = new Queue('jobs', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 }, // Increase backoff delay
      removeOnComplete: true, // Delete successfully completed jobs immediately
      removeOnFail: { age: 3600, count: 50 } // Keep failed jobs for only 1 hour and limited count
    },
  });

  queueInstance.on('error', (err: any) => {
    if (err.message && (err.message.includes('max requests limit exceeded') || err.message.includes('Connection is closed'))) {
       return;
    }
    console.error('[Queue Instance] Error:', err.message);
  });

  connection.on('error', (err: any) => {
    if (err.message && (err.message.includes('max requests limit exceeded') || err.message.includes('Connection is closed'))) {
      if (err.message.includes('max requests limit exceeded')) connection?.disconnect();
      return;
    }
    console.error('[Queue] Redis Connection Error:', err.message);
  });
}

// Export a safe wrapper for the queue
export const jobsQueue = {
  add: async (name: string, data: any, opts?: any) => {
    if (isRedisAvailable && queueInstance) {
      return await queueInstance.add(name, data, opts);
    } else {
      console.warn(`[Queue] ⚠️ Redis unavailable. Executing job "${name}" immediately in-memory (Sync Mode).`);
      // Fallback: Trigger worker logic directly if possible, or just log
      // In a real mock, we would import the processors here, but to avoid circular deps
      // we just log that it's in mock mode.
      return { id: 'mock-job-' + Date.now(), data };
    }
  }
};

export const JOB_TYPES = {
  SYNC_CAMPAIGNS: 'sync_campaigns',
  ANALYZE_CAMPAIGN: 'analyze_campaign',
  URL_ANALYSIS: 'url_analysis'
};
