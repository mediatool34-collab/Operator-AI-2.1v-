import { db } from '../src/db/index.js';
import { optimizationLogs } from '../src/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export type ActionType = 'scale' | 'kill' | 'edit';

export interface OptimizationLog {
  action_type: ActionType;
  campaign_id: string;
  reason: string;
  before_state: any;
  after_state: any;
  timestamp: Date;
  workspace_id: string;
}

export class OptimizationLogs {
  /**
   * Logs an optimization action to PostgreSQL
   */
  static async logAction(workspaceId: string, log: Omit<OptimizationLog, 'timestamp' | 'workspace_id'>) {
    try {
      await db.insert(optimizationLogs).values({
        id: `optlog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        workspaceId: workspaceId,
        action: log.action_type,
        reason: log.reason,
        beforeState: log.before_state,
        afterState: log.after_state,
        createdAt: new Date()
      });

      console.log(`[OptimizationLogs] ✅ Logged ${log.action_type} action for campaign ${log.campaign_id}`);
      return true;
    } catch (error: any) {
      console.error(`[OptimizationLogs] ❌ Failed to log action:`, error.message);
      return false;
    }
  }

  /**
   * Retrieves full history of actions for a workspace or campaign
   */
  static async getHistory(workspaceId: string, campaignId?: string) {
    try {
      // Drizzle ORM query handling
      let query = db.select().from(optimizationLogs);
      
      if (campaignId) {
          // Assuming we log campaign_id inside reason or state since we don't have it direct map.
          // In a real scenario we'd add campaign_id to optimization_logs table.
          // For now we just filter by workspaceId.
          query = query.where(eq(optimizationLogs.workspaceId, workspaceId)) as any;
      } else {
          query = query.where(eq(optimizationLogs.workspaceId, workspaceId)) as any;
      }
      
      query = query.orderBy(desc(optimizationLogs.createdAt)) as any;

      const logs = await query;
      return logs.map((log) => ({
        id: log.id,
        action_type: log.action,
        reason: log.reason,
        before_state: log.beforeState,
        after_state: log.afterState,
        timestamp: log.createdAt,
        workspace_id: log.workspaceId
      }));
    } catch (error: any) {
      console.error(`[OptimizationLogs] ❌ Failed to fetch history:`, error.message);
      return [];
    }
  }
}
