import axios from 'axios';
import NodeCache from 'node-cache';
import { db } from '../src/db/index.js';
import { campaigns, creatives, campaignMetrics } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { AlertEngine } from '../alerts/alertEngine.ts';
import { TestingEngine } from '../testing/testingEngine.ts';
import { CreativeEngine } from '../intel/creativeEngine.ts';

const cache = new NodeCache({ stdTTL: 60 }); // 60 seconds cache

export class MetaSyncService {
  /**
   * Fetches all ads from a specific Meta Ad Account and updates the local database.
   */
  static async syncAdsForAccount(workspace_id: string, ad_account_id: string, accessToken: string) {
    const cacheKey = `meta_sync_${ad_account_id}`;
    
    if (cache.get(cacheKey)) {
      console.log(`[MetaSync] ⚡ Skipping sync for ${ad_account_id} - cached (60s)`);
      return { status: 'cached' };
    }

    console.log(`[MetaSync] 🔄 Starting sync for Ad Account: ${ad_account_id}`);

    try {
      const fields = 'id,name,status,campaign{id,name},adset{id,name},creative{id,body,image_url,video_data},insights{impressions,spend,clicks,conversions,purchase_roas}';
      
      const response = await axios.get(`https://graph.facebook.com/v21.0/${ad_account_id}/ads`, {
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

      for (const ad of ads) {
        const insights = ad.insights?.data?.[0] || {};
        
        // This is a naive translation that only tracks new metrics for now.
        // Alert Engine currently expects to fetch previous metrics, so this would need to pull from PostgreSQL.
        const spendVal = parseFloat(insights.spend || 0);
        const impressionsVal = parseInt(insights.impressions || 0, 10);
        const clicksVal = parseInt(insights.clicks || 0, 10);
        
        let roasVal = 0;
        if (insights.purchase_roas && Array.isArray(insights.purchase_roas)) {
          const roasObj = insights.purchase_roas.find((r: any) => r.action_type === 'omni_purchase') || insights.purchase_roas[0];
          roasVal = parseFloat(roasObj?.value || 0);
        }
        const revenueVal = spendVal * roasVal;
        
        if (ad.campaign?.id) {
          // Check if campaign exists
          const existingCampaignInfo = await db.select().from(campaigns).where(eq(campaigns.id, ad.campaign.id)).limit(1);
          if (existingCampaignInfo.length === 0) {
            await db.insert(campaigns).values({
              id: ad.campaign.id,
              workspaceId: workspace_id,
              name: ad.campaign.name || 'Untitled Campaign',
              status: ad.status || 'UNKNOWN'
            });
          }
          
          await db.insert(campaignMetrics).values({
            id: `metric_${ad.id}_${Date.now()}`,
            campaignId: ad.campaign.id,
            date: new Date(),
            spend: spendVal,
            impressions: impressionsVal,
            clicks: clicksVal,
            revenue: revenueVal,
          });
        }
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

  static async getWorkspacesToSync() {
    // We are currently returning a blank array since we are waiting on further DB migrations.
    // Replace with Drizzle query if you end up persisting Meta API integration data.
    return [];
  }
}

