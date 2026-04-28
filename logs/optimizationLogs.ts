import { adminDb } from '../firebase-config.ts';

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
  private static COLLECTION = 'optimization_logs';

  /**
   * Logs an optimization action to Firestore
   */
  static async logAction(workspaceId: string, log: Omit<OptimizationLog, 'timestamp' | 'workspace_id'>) {
    try {
      const logEntry = {
        ...log,
        workspace_id: workspaceId,
        timestamp: new Date()
      };

      await adminDb
        .collection('workspaces')
        .doc(workspaceId)
        .collection(this.COLLECTION)
        .add(logEntry);

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
      let query: any = adminDb
        .collection('workspaces')
        .doc(workspaceId)
        .collection(this.COLLECTION)
        .orderBy('timestamp', 'desc');

      if (campaignId) {
        query = query.where('campaign_id', '==', campaignId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || doc.data().timestamp
      }));
    } catch (error: any) {
      console.error(`[OptimizationLogs] ❌ Failed to fetch history:`, error.message);
      return [];
    }
  }
}
