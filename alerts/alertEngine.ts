import { db } from '../src/db/index.js';
import { campaigns, campaignMetrics, alerts as alertsTable } from '../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface AdMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  updated_at: string;
}

export interface AlertConfig {
  ctrDropThreshold: number; // e.g., 0.3 (30%)
  cpaIncreaseThreshold: number; // e.g., 0.5 (50%)
  spendSpikeThreshold: number; // e.g., 1.0 (100%)
}

export class AlertEngine {
  static async checkPerformance(workspaceId: string, campaignId: string, currentMetrics: AdMetrics, previousMetrics: AdMetrics | null) {
    if (!previousMetrics) return;

    const alerts: any[] = [];

    // Calculation Helpers
    const getCTR = (m: AdMetrics) => m.impressions > 0 ? m.clicks / m.impressions : 0;
    const getCPA = (m: AdMetrics) => (m.conversions && m.conversions > 0) ? m.spend / m.conversions : 0;

    const currentCTR = getCTR(currentMetrics);
    const previousCTR = getCTR(previousMetrics);
    
    const currentCPA = getCPA(currentMetrics);
    const previousCPA = getCPA(previousMetrics);

    // 1. CTR Drop > 30%
    if (previousCTR > 0) {
      const ctrDrop = (previousCTR - currentCTR) / previousCTR;
      if (ctrDrop > 0.3) {
        alerts.push({
          type: 'CTR_DROP',
          severity: 'high',
          details: `CTR dropped by ${(ctrDrop * 100).toFixed(1)}% (from ${(previousCTR * 100).toFixed(2)}% to ${(currentCTR * 100).toFixed(2)}%)`
        });
      }
    }

    // 2. CPA Increase > 50%
    if (previousCPA > 0 && currentCPA > 0) {
      const cpaIncrease = (currentCPA - previousCPA) / previousCPA;
      if (cpaIncrease > 0.5) {
        alerts.push({
          type: 'CPA_INCREASE',
          severity: 'high',
          details: `CPA increased by ${(cpaIncrease * 100).toFixed(1)}% (from $${previousCPA.toFixed(2)} to $${currentCPA.toFixed(2)})`
        });
      }
    }

    // 3. Spend Spike Anomaly (> 100% increase and spend > $10)
    if (previousMetrics.spend > 10) {
      const spendIncrease = (currentMetrics.spend - previousMetrics.spend) / previousMetrics.spend;
      if (spendIncrease > 1.0) {
        alerts.push({
          type: 'SPEND_SPIKE',
          severity: 'medium',
          details: `Spend spiked by ${(spendIncrease * 100).toFixed(1)}% (from $${previousMetrics.spend.toFixed(2)} to $${currentMetrics.spend.toFixed(2)})`
        });
      }
    }

    // Store alerts in PostgreSQL
    for (const alert of alerts) {
      await db.insert(alertsTable).values({
        id: `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        workspaceId,
        type: alert.type,
        severity: alert.severity,
        details: alert.details,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`[AlertEngine] ⚠️ Alert triggered: ${alert.type} for workspace ${workspaceId}`);
    }
  }

  /**
   * Main entry point to evaluate metrics for a workspace.
   */
  static async evaluateWorkspace(workspaceId: string) {
    try {
      console.log(`[AlertEngine] 🧐 Evaluating alerts for workspace: ${workspaceId}`);
      
      const dbCampaigns = await db.select().from(campaigns).where(eq(campaigns.workspaceId, workspaceId));
      
      for (const campaign of dbCampaigns) {
        // Fetch the last two metrics to compare
        const metrics = await db.select().from(campaignMetrics)
                                .where(eq(campaignMetrics.campaignId, campaign.id))
                                .orderBy(desc(campaignMetrics.date))
                                .limit(2);
                                
        if (metrics.length >= 2) {
            const current = {
                spend: metrics[0].spend || 0,
                impressions: metrics[0].impressions || 0,
                clicks: metrics[0].clicks || 0,
                updated_at: metrics[0].date.toISOString()
            };
            const previous = {
                spend: metrics[1].spend || 0,
                impressions: metrics[1].impressions || 0,
                clicks: metrics[1].clicks || 0,
                updated_at: metrics[1].date.toISOString()
            };
            await this.checkPerformance(workspaceId, campaign.id, current, previous);
        }
      }
    } catch (error) {
      console.error(`[AlertEngine] Error evaluating workspace ${workspaceId}:`, error);
    }
  }
}
