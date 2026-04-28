import { adminDb } from '../firebase-config.ts';

export interface CreativeAnalysis {
  ad_id: string;
  creative_score: number;
  fatigue_score: number;
  hooks_analysis: string;
  visual_patterns: string[];
  improvement_suggestions: string[];
  frequency: number;
  analyzed_at: string;
}

export class CreativeEngine {
  /**
   * Analyzes an ad's creative performance using live metrics.
   * Detects fatigue, effectiveness, and patterns.
   */
  static analyzeAd(ad: any): CreativeAnalysis {
    const metrics = ad.metrics || { spend: 0, clicks: 0, impressions: 0 };
    const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) : 0;
    
    // Frequency heuristic (usually comes from platform, but we can estimate or use stored value)
    const frequency = ad.meta_data?.frequency || Math.max(1, Math.min(5, metrics.impressions / 2000));

    // Intelligence Logic:
    // 1. Creative Score (0-100): Based on CTR benchmarked against industry standard (~1%)
    const creativeScore = Math.min(100, (ctr / 0.015) * 100);

    // 2. Fatigue Score (0-100): Increases with frequency and decreasing CTR
    const fatigueScore = Math.min(100, (frequency > 2.5 ? (frequency - 2.5) * 30 : 0) + (creativeScore < 30 ? 20 : 0));

    // 3. Visual & Hook Patterns (Heuristic based on name/body if available)
    const patterns = [];
    if (ad.meta_data?.name?.toLowerCase().includes('video')) patterns.push('Motion/Video Content');
    if (ad.meta_data?.name?.toLowerCase().includes('static')) patterns.push('Static Image');
    
    const hooks = ad.meta_data?.body ? `Analysis of: ${ad.meta_data.body.substring(0, 50)}...` : 'No text available for analysis';

    // 4. Improvement Suggestions
    const suggestions = [];
    if (fatigueScore > 60) suggestions.push('Refresh creative - fatigue detected');
    if (creativeScore < 40) suggestions.push('A/B test a stronger hook/headline');
    if (frequency > 3) suggestions.push('Broaden target audience to lower frequency');
    if (suggestions.length === 0) suggestions.push('Scaling potential - performance is stable');

    return {
      ad_id: ad.id,
      creative_score: Math.round(creativeScore),
      fatigue_score: Math.round(fatigueScore),
      hooks_analysis: hooks,
      visual_patterns: patterns,
      improvement_suggestions: suggestions,
      frequency: parseFloat(frequency.toFixed(2)),
      analyzed_at: new Date().toISOString()
    };
  }

  /**
   * Scans a workspace and generates intelligence for all active ads.
   */
  static async runIntelligenceCycle(workspaceId: string) {
    console.log(`[CreativeEngine] 🧠 Running intelligence analysis for workspace ${workspaceId}`);
    
    try {
      const snapshot = await adminDb.collection('workspaces').doc(workspaceId).collection('ads').get();
      const ads = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      for (const ad of ads) {
        if (!ad.metrics) continue;

        const analysis = this.analyzeAd(ad);
        
        // Save intel to subcollection
        const intelRef = adminDb.collection('workspaces').doc(workspaceId).collection('creative_intel');
        
        // We add new doc for historical tracking
        await intelRef.add(analysis);
        
        console.log(`[CreativeEngine] ✅ Analyzed Ad ${ad.id}: Score ${analysis.creative_score}, Fatigue ${analysis.fatigue_score}`);
      }
    } catch (error: any) {
      console.error(`[CreativeEngine] ❌ Error in intelligence cycle:`, error.message);
    }
  }
}
