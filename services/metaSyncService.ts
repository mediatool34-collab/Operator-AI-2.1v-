import axios from 'axios';
import NodeCache from 'node-cache';
import { adminDb } from '../firebase-config.ts';
import { AlertEngine } from '../alerts/alertEngine.ts';
import { TestingEngine } from '../testing/testingEngine.ts';
import { CreativeEngine } from '../intel/creativeEngine.ts';

const cache = new NodeCache({ stdTTL: 60 }); // 60 seconds cache

export class MetaSyncService {
  /**
   * Fetches all ads from a specific Meta Ad Account and updates the local database.
   * Uses batch fetching (fields parameter) to minimize requests.
   */
  static async syncAdsForAccount(workspace_id: string, ad_account_id: string, accessToken: string) {
    const cacheKey = `meta_sync_${ad_account_id}`;
    
    if (cache.get(cacheKey)) {
      console.log(`[MetaSync] ⚡ Skipping sync for ${ad_account_id} - cached (60s)`);
      return { status: 'cached' };
    }

    console.log(`[MetaSync] 🔄 Starting sync for Ad Account: ${ad_account_id}`);

    try {
      // Step 1: Fetch ads with specific fields from Meta Graph API
      const fields = 'id,name,status,campaign{id,name},adset{id,name},creative{id,body,image_url,video_data},insights{impressions,spend,clicks,conversions}';
      
      const response = await axios.get(`https://graph.facebook.com/v19.0/${ad_account_id}/ads`, {
        params: {
          fields,
          access_token: accessToken,
          limit: 100
        }
      });

      const ads = response.data.data;

      if (!ads || ads.length === 0) {
        console.log(`[MetaSync] ℹ️ No ads found for account ${ad_account_id}`);
        return { status: 'empty' };
      }

      // Step 2: Update metrics in Database
      for (const ad of ads) {
        const insights = ad.insights?.data?.[0] || {};
        const adRef = adminDb.collection('workspaces').doc(workspace_id).collection('ads').doc(ad.id);
        
        // Fetch existing metrics for Alert Engine
        const existingDoc = await adRef.get();
        const previousMetrics = existingDoc.exists ? existingDoc.data()?.metrics : null;

        const currentMetrics = {
          spend: parseFloat(insights.spend || 0),
          impressions: parseInt(insights.impressions || 0),
          clicks: parseInt(insights.clicks || 0),
          updated_at: new Date().toISOString()
        };

        // Run Alert Engine
        if (previousMetrics) {
          await AlertEngine.checkPerformance(workspace_id, ad.campaign?.id, currentMetrics, previousMetrics);
        }
        
        await adRef.set({
          meta_id: ad.id,
          meta_data: {
            name: ad.name,
            status: ad.status,
            campaign_id: ad.campaign?.id,
            campaign_name: ad.campaign?.name,
            adset_id: ad.adset?.id,
            adset_name: ad.adset?.name,
          },
          metrics: currentMetrics,
          old_metrics: previousMetrics // Store for historical reference if needed
        }, { merge: true });
      }

      cache.set(cacheKey, true);
      console.log(`[MetaSync] ✅ Synced ${ads.length} ads for account ${ad_account_id}`);
      
      // Run A/B Testing Engine after sync
      await TestingEngine.runAutomatedTests(workspace_id);
      
      // Run Creative Intelligence Engine
      await CreativeEngine.runIntelligenceCycle(workspace_id);

      return { status: 'success', count: ads.length };

    } catch (error: any) {
      console.error(`[MetaSync] ❌ Error syncing Meta Ads:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Identifies all active workspace ad accounts that need syncing.
   */
  static async getWorkspacesToSync() {
    console.log('[MetaSync] 🔍 Fetching workspaces to sync...');
    try {
      const workspacesRef = adminDb.collection('workspaces');
      const snapshot = await workspacesRef.where('integrations.meta.active', '==', true).get();
      console.log(`[MetaSync] found ${snapshot.size} active workspaces`);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        meta_account_id: doc.data().integrations?.meta?.ad_account_id,
        access_token: doc.data().integrations?.meta?.access_token
      }));
    } catch (err: any) {
      if (err.code === 5 || err.message?.includes('NOT_FOUND')) {
        console.warn('[MetaSync] ⚠️ Workspaces collection not found or database not initialized. Skipping sync.');
        return [];
      }
      console.error('[MetaSync] ❌ Failed to fetch workspaces:', err.message);
      throw err;
    }
  }
}
