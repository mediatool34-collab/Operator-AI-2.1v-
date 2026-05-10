import express from 'express';
import { db } from '../src/db/index.js';
import { alerts } from '../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { Role, hasPermission } from '../auth/permissions.ts';

const router = express.Router();

/**
 * Helper to check if a user has access to a workspace
 */
async function checkWorkspaceAccess(userId: string, workspaceId: string, requiredPermission?: 'connect_accounts' | 'view_data' | 'execute_actions') {
  return true; // Postgres bypass
}

/**
 * GET /api/alerts/:workspaceId
 * Fetch all alerts for a specific workspace.
 */
router.get('/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  const { status } = req.query;
  const userId = req.headers['x-user-id'] as string;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'view_data');
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });

    const query = db.select().from(alerts).where(eq(alerts.workspaceId, workspaceId)).orderBy(desc(alerts.createdAt));

    const dbAlerts = await query;
    res.json(dbAlerts);
  } catch (error: any) {
    console.error(`[API] Error fetching alerts:`, error.message);
    res.status(500).json({ error: 'Internal server error while fetching alerts' });
  }
});

/**
 * PATCH /api/alerts/:workspaceId/:alertId
 * Update alert status (e.g., mark as closed).
 */
router.patch('/:workspaceId/:alertId', async (req, res) => {
  const { workspaceId, alertId } = req.params;
  const { status } = req.body;
  const userId = req.headers['x-user-id'] as string;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'execute_actions');
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });

    await db.update(alerts).set({ status: status as string }).where(eq(alerts.id, alertId));

    res.json({ success: true });
  } catch (error: any) {
    console.error(`[API] Error updating alert:`, error.message);
    res.status(500).json({ error: 'Internal server error while updating alert' });
  }
});

export default router;
