import { adminDb } from '../firebase-config.ts';

export type TestType = 'hook' | 'creative' | 'audience';

export interface AdVariant {
  id: string;
  name: string;
  metrics: {
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
  };
}

export interface TestResult {
  test_type: TestType;
  variants: AdVariant[];
  winner: string | null;
  performance: any;
  status: 'active' | 'concluded';
  created_at: string;
}

export class TestingEngine {
  /**
   * Evaluates a set of variants to determine which one is performing best.
   * Logic:
   * 1. Calculate CTR (Clicks/Impressions)
   * 2. Calculate CPA (Spend/Conversions)
   * 3. Calculate CVR (Conversions/Clicks)
   * 4. Winner is chosen based on lowest CPA if conversions > 0, otherwise highest CTR.
   */
  static evaluateVariants(type: TestType, variants: AdVariant[]): TestResult {
    if (variants.length === 0) {
      throw new Error('Cannot evaluate empty variants list');
    }

    const performance = variants.map(v => {
      const ctr = v.metrics.impressions > 0 ? (v.metrics.clicks / v.metrics.impressions) : 0;
      const cpa = v.metrics.conversions > 0 ? (v.metrics.spend / v.metrics.conversions) : 0;
      const cvr = v.metrics.clicks > 0 ? (v.metrics.conversions / v.metrics.clicks) : 0;

      return {
        id: v.id,
        name: v.name,
        ctr,
        cpa,
        cvr,
        metrics: v.metrics
      };
    });

    // Strategy for winner selection
    let winnerId: string | null = null;
    
    // Filter variants with significant data (at least 500 impressions)
    const validVariants = performance.filter(p => p.metrics.impressions >= 500);

    if (validVariants.length > 1) {
      // Sort by CPA (ascending) if there are conversions
      const withConvs = validVariants.filter(v => v.metrics.conversions > 0);
      if (withConvs.length > 0) {
        withConvs.sort((a, b) => a.cpa - b.cpa);
        winnerId = withConvs[0].id;
      } else {
        // Fallback to CTR
        validVariants.sort((a, b) => b.ctr - a.ctr);
        winnerId = validVariants[0].id;
      }
    }

    return {
      test_type: type,
      variants,
      winner: winnerId,
      performance: performance,
      status: winnerId ? 'concluded' : 'active',
      created_at: new Date().toISOString()
    };
  }

  /**
   * Automatically groups ads in a workspace by name patterns to find A/B tests.
   * e.g. "Campaign - Hook A", "Campaign - Hook B"
   */
  static async runAutomatedTests(workspaceId: string) {
    console.log(`[TestingEngine] 🧪 Running automated A/B tests for workspace ${workspaceId}`);
    
    try {
      const snapshot = await adminDb.collection('workspaces').doc(workspaceId).collection('ads').get();
      const ads = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Simple heuristic: Group by adset name and look for variants
      const groups: Record<string, any[]> = {};
      
      ads.forEach(ad => {
        if (!ad.meta_data || !ad.metrics) return;
        const groupKey = ad.meta_data.adset_name || 'default';
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(ad);
      });

      for (const [groupName, groupAds] of Object.entries(groups)) {
        if (groupAds.length < 2) continue;

        // Determine test type based on name variations
        let type: TestType = 'creative';
        if (groupAds.some(a => a.meta_data.name.toLowerCase().includes('hook'))) type = 'hook';
        if (groupAds.some(a => a.meta_data.name.toLowerCase().includes('aud'))) type = 'audience';

        const variants: AdVariant[] = groupAds.map(a => ({
          id: a.meta_id,
          name: a.meta_data.name,
          metrics: a.metrics
        }));

        const result = this.evaluateVariants(type, variants);
        
        // Save result
        await adminDb.collection('workspaces').doc(workspaceId).collection('tests').add(result);
        console.log(`[TestingEngine] ✅ Concluded ${type} test for ${groupName}. Winner: ${result.winner}`);
      }
    } catch (error: any) {
      console.error(`[TestingEngine] ❌ Error running tests:`, error.message);
    }
  }
}
