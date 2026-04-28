import express from 'express';
import { adminDb } from '../firebase-config.ts';
import { Role, hasPermission } from '../auth/permissions.ts';

const router = express.Router();

/**
 * Helper to check if a user has access to a workspace
 */
async function checkWorkspaceAccess(userId: string, workspaceId: string, requiredPermission?: 'connect_accounts' | 'view_data' | 'execute_actions') {
  try {
    const memberDoc = await adminDb.collection('workspaces').doc(workspaceId).collection('members').doc(userId).get();
    if (!memberDoc.exists) return false;
    
    if (requiredPermission) {
      const role = memberDoc.data()?.role as Role;
      return hasPermission(role, requiredPermission);
    }
    return true;
  } catch (err) {
    console.error('[RBAC] Access check failed:', err);
    return false;
  }
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

    let query = adminDb.collection('workspaces').doc(workspaceId).collection('alerts').orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', '==', status) as any;
    }

    const snapshot = await query.get();
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(alerts);
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

    const alertRef = adminDb.collection('workspaces').doc(workspaceId).collection('alerts').doc(alertId);
    await alertRef.update({
      status,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error(`[API] Error updating alert:`, error.message);
    res.status(500).json({ error: 'Internal server error while updating alert' });
  }
});

export default router;
