import { jobsQueue, JOB_TYPES, isRedisAvailable } from '../queue/queue.ts';
import { MetaSyncService } from '../services/metaSyncService.ts';

/**
 * Meta Sync Scheduler
 * Responsible for triggering background sync jobs for all active workspaces.
 */
export async function startMetaSyncScheduler() {
  console.log('[Scheduler] 🕒 Initializing Meta Sync Scheduler...');

  // 1. Initial check: If Redis is unavailable, scheduler won't work correctly with BullMQ
  if (!isRedisAvailable) {
    console.warn('[Scheduler] ⚠️ Redis unavailable. Scheduler will run in simplified local mode.');
  }

  // 2. Define the scheduling interval (10 minutes)
  const SYNC_INTERVAL_MS = 10 * 60 * 1000;

  const runSyncCycle = async () => {
    try {
      console.log('[Scheduler] 🔍 Identifying workspaces for Meta Sync...');
      const workspaces = await MetaSyncService.getWorkspacesToSync();

      if (workspaces.length === 0) {
        console.log('[Scheduler] 😴 No workspaces with active Meta integration found.');
        return;
      }

      console.log(`[Scheduler] 🚀 Queuing sync jobs for ${workspaces.length} workspaces...`);

      for (const ws of workspaces) {
        if (!ws.meta_account_id) continue;

        // Add to the job queue (BullMQ handles persistence and worker distribution)
        await jobsQueue.add(JOB_TYPES.SYNC_CAMPAIGNS, {
          workspace_id: ws.id,
          ad_account_id: ws.meta_account_id,
          access_token: ws.access_token
        }, {
          jobId: `sync_meta_${ws.id}_${Math.floor(Date.now() / (1000 * 60 * 60))}` // Uniqueness per hour
        });
      }

    } catch (error: any) {
      console.error('[Scheduler] ❌ Error in sync cycle:', error.message);
      if (error.stack) console.error(error.stack);
    }
  };

  // Run immediately on start
  runSyncCycle();

  // Schedule next runs
  setInterval(runSyncCycle, SYNC_INTERVAL_MS);
}
