import { MetaSyncService } from '../../services/metaSyncService.ts';

/**
 * Sync Campaigns Processor
 * Handles Meta API data fetching in the background
 */
export async function syncCampaignsProcessor(data: any) {
  const { workspace_id, ad_account_id, access_token } = data;
  
  if (!ad_account_id || !access_token) {
    console.warn(`[Processor] ⚠️ Skipping sync for workspace ${workspace_id}: Missing account_id or token.`);
    return { status: 'skipped', reason: 'missing_credentials' };
  }

  return await MetaSyncService.syncAdsForAccount(workspace_id, ad_account_id, access_token);
}
