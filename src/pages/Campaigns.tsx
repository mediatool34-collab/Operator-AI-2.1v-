import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Target,
  Image as ImageIcon,
  Folder,
  Crosshair,
  Sparkles,
  TrendingUp,
  Layers,
  ShieldAlert,
  X,
  RefreshCw,
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

type ScaleDecisionType =
  | 'VERTICAL_SCALE'
  | 'HORIZONTAL_SCALE'
  | 'CREATIVE_SCALE'
  | 'HOLD_AND_OPTIMIZE'
  | 'PAUSE_AND_REBUILD';

interface SmartScaleAudit {
  campaignContext: {
    productOrOffer: string;
    funnelStage: string;
    campaignStructure: 'CBO' | 'ABO';
    currency: string;
    structureAnalysis: string;
    summary: string;
  };
  scalingVerdict: {
    decision: ScaleDecisionType;
    decisionLabel: string;
    canIncreaseBudgetNow: boolean;
    recommendedBudgetAction: string;
    confidence: 'High' | 'Medium' | 'Low';
    executiveReason: string;
  };
  adSetAudits: Array<{
    adsetId: string;
    adsetName: string;
    segmentationSummary: string;
    anglesUsed: string[];
    creativeAudienceFit: 'High' | 'Medium' | 'Mismatch';
    fitExplanation: string;
    recommendedScaleType: ScaleDecisionType;
    decisionLabel: string;
    reasoning: string;
    actionSteps: string[];
    suggestedNewAngles: string[];
    apiEditNote?: string;
  }>;
  postScaleOptimization: {
    monitoringWindow: string;
    guardrails: Array<{
      metric: string;
      threshold: string;
      action: string;
    }>;
    optimizationSteps: string[];
  };
}

export function Campaigns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, snapchatToken, platform, metaSubPlatform, adAccounts, sendTargetToPreFunnel } = useFilters();
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<{action: string, item: any}[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [scaleAuditTarget, setScaleAuditTarget] = useState<{ campaign: any; focusAdsetId?: string } | null>(null);
  const [scaleAuditData, setScaleAuditData] = useState<{ audit: SmartScaleAudit; telemetryMeta?: any } | null>(null);
  const [scaleAuditLoading, setScaleAuditLoading] = useState(false);
  const [scaleAuditError, setScaleAuditError] = useState<string | null>(null);
  const [preScaleGuard, setPreScaleGuard] = useState<{
    item: any;
    isCampaign: boolean;
    reasons: string[];
    hasWhatsAppLock: boolean;
  } | null>(null);

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    if (platform === 'snapchat') return snapchatToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken, snapchatToken]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 6000 : 3500);
  }, []);

  const expandToProblem = useCallback((campaignId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const strCampaignId = String(campaignId);
    const newSet = new Set(expandedItems);
    newSet.add(strCampaignId);
    
    // Find adsets with problems
    const campaignAdsets = adsets.filter(a => String(a.campaignId) === strCampaignId);
    campaignAdsets.forEach(adset => {
      const adsetProblems = adset.analysis?.problems || [];
      
      let hasAdProblem = false;
      const adsetAds = ads.filter(a => String(a.adsetId) === String(adset.id));
      adsetAds.forEach(ad => {
        const adProblems = ad.analysis?.problems || [];
        if (adProblems.length > 0) {
          hasAdProblem = true;
        }
      });

      if (adsetProblems.length > 0 || hasAdProblem) {
        newSet.add(String(adset.id));
      }
    });

    setExpandedItems(newSet);
  }, [expandedItems, adsets, ads]);

  const openSmartScaleAudit = useCallback(async (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCampaign = !item.campaignId;
    const parentCampaign = isCampaign
      ? item
      : campaigns.find(c => String(c.id) === String(item.campaignId)) || {
          id: item.campaignId,
          name: item.name,
          status: item.status,
          metrics: item.metrics,
        };

    const focusAdsetId = isCampaign ? undefined : String(item.id);
    const campAdsets = adsets.filter(a => String(a.campaignId) === String(parentCampaign.id));
    const campAds = ads.filter(ad => String(ad.campaignId) === String(parentCampaign.id) || campAdsets.some(as => String(as.id) === String(ad.adsetId)));

    setPreScaleGuard(null);
    setScaleAuditTarget({ campaign: parentCampaign, focusAdsetId });
    setScaleAuditData(null);
    setScaleAuditError(null);
    setScaleAuditLoading(true);

    try {
      const token = getToken();
      const res = await fetch('/api/campaigns/smart-scale-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.uid,
          ...(token ? { [`x-${platform}-token`]: token } : {}),
        },
        body: JSON.stringify({
          campaignId: parentCampaign.id,
          focusAdsetId,
          accountId: selectedAccountId,
          platform,
          datePreset,
          metaToken: platform === 'meta' ? token : undefined,
          language: 'ar',
          itemsSnapshot: {
            campaign: parentCampaign,
            adsets: campAdsets,
            ads: campAds,
          },
        }),
      });
      const data = await safeJson(res);
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate Smart Scale Audit');
      }
      setScaleAuditData(data);
    } catch (err: any) {
      setScaleAuditError(err?.message || 'Failed to analyze campaign scaling strategy');
    } finally {
      setScaleAuditLoading(false);
    }
  }, [campaigns, adsets, ads, getToken, user, platform, selectedAccountId, datePreset]);

  const handleAction = useCallback(async (action: string, item: any, e?: React.MouseEvent, fromQueue = false, forceScale = false) => {
    if (e) e.stopPropagation();
    const itemId = String(item.id);
    const isCampaign = !item.campaignId;
    
    if (!isOnline && !fromQueue) {
      setOfflineQueue(prev => [...prev, { action, item }]);
      showToast(`You are offline. Action queued.`, 'info');
      return;
    }

    if (action === 'Analyze') {
      expandToProblem(itemId);
      showToast(`Analysis complete for ${item.name}. See details below.`, 'info');
      return;
    }

    if (action === 'Scale' && !forceScale && !fromQueue) {
      const problems: string[] = item.analysis?.problems || [];
      const m = item.metrics || {};
      const hasWhatsAppLock =
        platform === 'meta' &&
        !isCampaign &&
        item.raw?.destination_type === 'WHATSAPP' &&
        !item.raw?.promoted_object?.page_id;

      const reasons: string[] = [];
      if (hasWhatsAppLock) {
        reasons.push('إعلان واتساب مقفول من جهة Meta API (لازم تأكيد صفحة الفيسبوك أو عمل Duplicate للـ Ad Set جوه Meta Ads Manager قبل تعديل الميزانية برمجياً).');
      }
      if (problems.length > 0) {
        reasons.push(`يوجد مشاكل أداء مرصودة: (${problems.join('، ')}).`);
      }
      if ((m.ctr || 0) > 0 && m.ctr < 1.0 && (m.spend || 0) > 25) {
        reasons.push(`نسبة النقر CTR منخفضة (${m.ctr.toFixed(2)}%) — زيادة الميزانية الآن قد ترفع التكلفة بدلاً من زيادة النتائج.`);
      }
      if ((m.roas || 0) > 0 && m.roas < 1.3 && (m.spend || 0) > 50) {
        reasons.push(`العائد ROAS ضعيف (${m.roas.toFixed(2)}x) — الأفضل مراجعة الزاوية التسويقية (Creative/Horizontal Scale) قبل ضخ ميزانية إضافية.`);
      }

      if (reasons.length > 0) {
        setPreScaleGuard({
          item,
          isCampaign,
          reasons,
          hasWhatsAppLock,
        });
        return;
      }
    }

    setActionLoading(itemId);
    try {
      const token = getToken();
      let successMessage = '';
      let reason = '';

      // Define internal execution function for retries/self-healing
      const executeUpdate = async (targetId: string, payload: any): Promise<any> => {
        const fetchPayload = { ...payload, metaToken: token || '', snapchatToken: token || '', tiktokToken: token || '' };
        const res = await fetch('/api/campaigns/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user!.uid },
          body: JSON.stringify(fetchPayload)
        });
        
        return await safeJson(res);
      };

      const scaleAdSetsAutomatically = async (campId: string, mult: number) => {
        const childAdsets = adsets.filter(a => String(a.campaignId) === campId);
        if (childAdsets.length === 0) throw new Error("Auto-Healing failed: No Ad Sets found to scale for this campaign.");
        
        showToast(`Auto-Healing: Scaling ${childAdsets.length} Ad Sets instead of Campaign...`, 'info');
        
        const results = await Promise.all(childAdsets.map(async (adset) => {
          const adsetDaily = adset.raw?.daily_budget || adset.daily_budget;
          const adsetLifetime = adset.raw?.lifetime_budget || adset.lifetime_budget;
          const adsetPayload: any = { 
            objectId: adset.id, 
            platform,
            type: 'adset',
            multiplier: mult
          };
          
          let bType = '';
          let bAmount = 0;

          if (adsetDaily && Number(adsetDaily) > 0) {
            bAmount = Math.round(Number(adsetDaily) * mult);
            adsetPayload.dailyBudget = platform === 'meta' ? bAmount / 100 : bAmount;
            bType = 'daily';
          } else if (adsetLifetime && Number(adsetLifetime) > 0) {
            bAmount = Math.round(Number(adsetLifetime) * mult);
            adsetPayload.lifetimeBudget = platform === 'meta' ? bAmount / 100 : bAmount;
            bType = 'lifetime';
          }

          if (bAmount > 0 || platform === 'meta') {
            try {
              const d = await executeUpdate(adset.id, adsetPayload);
              return {
                id: adset.id,
                success: !d.error,
                error: d.error,
                newBudget: d.updatedBudgetMinor || bAmount,
                budgetType: d.budgetType || bType || 'daily'
              };
            } catch (e: any) {
              return { id: adset.id, success: false, error: e.message };
            }
          }
          return { id: adset.id, success: false, error: 'No budget fields present' };
        }));

        const successCount = results.filter(r => r.success).length;
        if (successCount === 0) throw new Error(results[0]?.error || 'Ad Sets could not be updated');

        setAdsets(prev => prev.map(a => {
          const res = results.find(r => String(r.id) === String(a.id));
          if (res && res.success) {
            return { 
              ...a, 
              [res.budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget']: res.newBudget,
              raw: { ...a.raw, [res.budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget']: res.newBudget }
            };
          }
          return a;
        }));
        
        return `Successfully scaled ${successCount} Ad Sets (Campaign ABO auto-fallback)`;
      };

      let appliedBudgetMinor: number | null = null;
      let appliedBudgetType: 'daily' | 'lifetime' | null = null;

      if (action === 'Scale' || action === 'Reduce') {
        const multiplier = action === 'Scale' ? 1.2 : 0.8;
        const rawDaily = item.raw?.daily_budget || item.daily_budget;
        const rawLifetime = item.raw?.lifetime_budget || item.lifetime_budget;

        try {
          if (rawDaily && Number(rawDaily) > 0) {
            const newAmount = Math.round(Number(rawDaily) * multiplier);
            const data = await executeUpdate(itemId, { 
              objectId: itemId, 
              dailyBudget: platform === 'meta' ? newAmount / 100 : newAmount, 
              multiplier,
              platform,
              type: isCampaign ? 'campaign' : 'adset'
            });
            
            if (data.error) {
              if (isCampaign && (data.code === 'ABO_CAMPAIGN' || data.error.includes('daily_budget') || data.error.includes('parameter') || data.error.includes('CBO'))) {
                successMessage = await scaleAdSetsAutomatically(itemId, multiplier);
              } else {
                throw new Error(data.error);
              }
            } else {
              appliedBudgetMinor = data.updatedBudgetMinor || newAmount;
              appliedBudgetType = data.budgetType || 'daily';
              successMessage = `Successfully ${action === 'Scale' ? 'increased' : 'decreased'} budget for ${item.name} by 20%`;
            }
          } else if (rawLifetime && Number(rawLifetime) > 0) {
            const newAmount = Math.round(Number(rawLifetime) * multiplier);
            const data = await executeUpdate(itemId, { 
              objectId: itemId, 
              lifetimeBudget: platform === 'meta' ? newAmount / 100 : newAmount, 
              multiplier,
              platform,
              type: isCampaign ? 'campaign' : 'adset'
            });
            
            if (data.error) {
              if (isCampaign && (data.code === 'ABO_CAMPAIGN' || data.error.includes('lifetime_budget') || data.error.includes('parameter') || data.error.includes('CBO'))) {
                successMessage = await scaleAdSetsAutomatically(itemId, multiplier);
              } else {
                throw new Error(data.error);
              }
            } else {
              appliedBudgetMinor = data.updatedBudgetMinor || newAmount;
              appliedBudgetType = data.budgetType || 'lifetime';
              successMessage = `Successfully ${action === 'Scale' ? 'increased' : 'decreased'} budget for ${item.name} by 20%`;
            }
          } else if (isCampaign) {
            successMessage = await scaleAdSetsAutomatically(itemId, multiplier);
          } else if (platform === 'meta') {
            // Let server inspect live Meta adset in case local raw budget fields were absent
            const data = await executeUpdate(itemId, {
              objectId: itemId,
              multiplier,
              platform,
              type: 'adset'
            });
            if (data.error) throw new Error(data.error);
            appliedBudgetMinor = data.updatedBudgetMinor || null;
            appliedBudgetType = data.budgetType || null;
            successMessage = `Successfully ${action === 'Scale' ? 'increased' : 'decreased'} budget for ${item.name} by 20%`;
          } else {
            const hasCboParent = adsets.find(a => a.id === itemId)?.raw?.campaign_id;
            throw new Error(hasCboParent 
              ? "No budget found to modify on this Ad Set. This campaign likely uses CBO. Please scale the parent Campaign instead."
              : "No budget found to modify. Please check if this item has a daily or lifetime budget set.");
          }
        } catch (err: any) {
          // Final catch-all for ABO campaign fallback if main logic fails
          if (isCampaign && (err.message.includes('CBO') || err.message.includes('ABO') || err.message.includes('parameter'))) {
            successMessage = await scaleAdSetsAutomatically(itemId, multiplier);
          } else {
            throw err;
          }
        }
        
        reason = `Manual ${action.toLowerCase()} triggered by user (Resilience System)`;
      } else if (action === 'Pause') {
        const data = await executeUpdate(itemId, { 
          objectId: itemId, 
          status: 'PAUSED', 
          platform,
          type: isCampaign ? 'campaign' : 'adset'
        });
        if (data.error) throw new Error(data.error);

        reason = 'Manual pause triggered by user';
        successMessage = `Successfully paused ${item.name}`;
      }

      // Log to Intelligence Engine
      fetch('/api/intelligence/log-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'OPTIMIZATION',
          payload: { campaignId: itemId, campaignName: item.name, action: action.toUpperCase(), reason }
        })
      }).then(res => safeJson(res)).catch(e => console.error("Logging failed", e));

      // Update local state for single item updates (non-recursive)
      if (action === 'Pause') {
        const setter = isCampaign ? setCampaigns : setAdsets;
        setter(prev => prev.map(c => String(c.id) === itemId ? { ...c, status: 'PAUSED' } : c));
      } else if (action === 'Scale' || action === 'Reduce') {
        if (appliedBudgetMinor && appliedBudgetType) {
          const setter = isCampaign ? setCampaigns : setAdsets;
          const fieldKey = appliedBudgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';
          setter(prev => prev.map(c => {
            if (String(c.id) === itemId) {
              return { 
                ...c, 
                [fieldKey]: appliedBudgetMinor,
                raw: { ...c.raw, [fieldKey]: appliedBudgetMinor }
              };
            }
            return c;
          }));
        }
      }

      showToast(successMessage);
    } catch (err: any) {
      console.warn(`Action ${action} blocked or rejected:`, err?.message || err);
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [isOnline, showToast, expandToProblem, user, platform, getToken, setAdsets, setCampaigns, adsets]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        showToast(`Reconnected. Processing ${offlineQueue.length} queued actions...`, 'info');
        // Process queue
        offlineQueue.forEach(q => {
          handleAction(q.action, q.item, null as any, true);
        });
        setOfflineQueue([]);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue, showToast, handleAction]);

  const fetchAll = useCallback(async () => {
    const token = getToken();
    if (!token || !selectedAccountId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    const headers = {
      'x-user-id': user!.uid,
      [`x-${platform}-token`]: token
    };

    try {
      const q = `accountId=${selectedAccountId}&platform=${platform}&subPlatform=${metaSubPlatform}`;
      const [campRes, adsetRes, adRes, campInsightRes, adsetInsightRes, adInsightRes] = await Promise.all([
        fetch(`/api/campaigns?${q}`, { headers }),
        fetch(`/api/adsets?${q}`, { headers }),
        fetch(`/api/ads?${q}`, { headers }),
        fetch(`/api/insights?${q}&level=campaign&datePreset=${datePreset}`, { headers }),
        fetch(`/api/insights?${q}&level=adset&datePreset=${datePreset}`, { headers }),
        fetch(`/api/insights?${q}&level=ad&datePreset=${datePreset}`, { headers })
      ]);

      const [campData, adsetData, adData, campInsightData, adsetInsightData, adInsightData] = await Promise.all([
        safeJson(campRes), safeJson(adsetRes), safeJson(adRes), safeJson(campInsightRes), safeJson(adsetInsightRes), safeJson(adInsightRes)
      ]);

      if (campData.error) throw new Error(campData.error);
      if (adsetData.error) throw new Error(adsetData.error);
      if (adData.error) throw new Error(adData.error);
      if (campInsightData.error) throw new Error(campInsightData.error);
      if (adsetInsightData.error) throw new Error(adsetInsightData.error);
      if (adInsightData.error) throw new Error(adInsightData.error);

      setCampaigns(campData.campaigns || []);
      setAdsets(adsetData.adsets || []);
      setAds(adData.ads || []);
      
      const allInsights = [
        ...(campInsightData.insights || []),
        ...(adsetInsightData.insights || []),
        ...(adInsightData.insights || [])
      ];

      const itemsToAnalyze = [
        ...(campData.campaigns || []).map((c: any) => {
          const metrics = allInsights.find(i => i.id === c.id)?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
          const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
          const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
          const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
          const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
          return { ...c, type: 'campaign', metrics: { ...metrics, ctr, cpa, roas, cvr, cpm } };
        }),
        ...(adsetData.adsets || []).map((a: any) => {
          const metrics = allInsights.find(i => i.id === a.id)?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
          const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
          const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
          const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
          const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
          return { ...a, type: 'adset', metrics: { ...metrics, ctr, cpa, roas, cvr, cpm } };
        }),
        ...(adData.ads || []).map((a: any) => {
          const metrics = allInsights.find(i => i.id === a.id)?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
          const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
          const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
          const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
          const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
          return { ...a, type: 'ad', metrics: { ...metrics, ctr, cpa, roas, cvr, cpm } };
        })
      ];

      const analysisRes = await fetch(`/api/analysis?accountId=${selectedAccountId}&platform=${platform}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAnalyze })
      });
      const analysisData = await safeJson(analysisRes);
      
      if (analysisData.error) throw new Error(analysisData.error);

      const analyzedCampaigns = analysisData.analyzedItems.filter((i: any) => i.type === 'campaign');
      const analyzedAdsets = analysisData.analyzedItems.filter((i: any) => i.type === 'adset');
      const analyzedAds = analysisData.analyzedItems.filter((i: any) => i.type === 'ad');

      setCampaigns(analyzedCampaigns);
      setAdsets(analyzedAdsets);
      setAds(analyzedAds);
      setInsights(allInsights);
      setIsMock(campData.isMock || adsetData.isMock || adData.isMock || false);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, platform, metaSubPlatform, datePreset, getToken]);

  useEffect(() => {
    fetchAll();
  }, [selectedAccountId, platform, metaSubPlatform, datePreset, fetchAll]);

  const toggleExpand = (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const strId = String(id);
    const newSet = new Set(expandedItems);
    if (newSet.has(strId)) newSet.delete(strId);
    else newSet.add(strId);
    setExpandedItems(newSet);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
        <div className="text-gray-400 font-medium animate-pulse">Analyzing campaigns...</div>
      </div>
    );
  }

  const token = getToken();
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Not Connected</h2>
          <p className="text-gray-400 mb-6">Connect your {platform.charAt(0).toUpperCase() + platform.slice(1)} account to view and monitor campaigns.</p>
          <NavLink
            to="/connections"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
          >
            Go to Connections Hub
          </NavLink>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl border-red-500/20 max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Fetching Data</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button onClick={fetchAll} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Campaigns Found</h2>
          <p className="text-gray-400 mb-6">We couldn't find any campaigns for the selected account and date range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Campaign Audit</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              const curAcc = adAccounts.find(a => a.id === selectedAccountId);
              sendTargetToPreFunnel({
                type: 'account',
                platform: platform as any,
                accountId: selectedAccountId || 'all',
                accountName: curAcc?.name || `${platform.toUpperCase()} Campaigns`,
              });
              navigate('/pre-funnel');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-all"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Analyze in Pre-Funnel Intel
          </button>
          {isMock && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3" />
              <div className="flex items-center gap-2 group relative">
                <div className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest rounded-full cursor-help">
                  Limited Account Sync
                </div>
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 border border-white/10 rounded-xl text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl text-right">
                  Showing representative sample data. To unlock real-time live account metrics, your Meta App requires "Ads Library API" approval from Meta.
                </div>
              </div>
            </div>
          )}
          <button onClick={fetchAll} className="glass-panel text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
            Sync Data
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-[#111827]/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Name</div>
          <div className="col-span-1 text-right">Spend</div>
          <div className="col-span-1 text-right">ROAS</div>
          <div className="col-span-1 text-right">CPA</div>
          <div className="col-span-1 text-right">CTR</div>
          <div className="col-span-1 text-center">Issues</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        <div className="divide-y divide-white/5">
          {campaigns.map(campaign => (
            <CampaignRow 
              key={campaign.id} 
              campaign={campaign} 
              adsets={adsets.filter(a => a.campaignId === campaign.id)}
              ads={ads}
              insights={insights}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              expandToProblem={expandToProblem}
              handleAction={handleAction}
              openSmartScaleAudit={openSmartScaleAudit}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      </div>

      {/* Pre-Scale Safety Guard Modal */}
      {preScaleGuard && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreScaleGuard(null)}>
          <div className="glass-panel max-w-lg w-full rounded-2xl border border-amber-500/30 p-6 space-y-5 shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">تنبيه نظام السكال قبل رفع الميزانية</h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs" title={preScaleGuard.item.name}>
                    {preScaleGuard.item.name}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setPreScaleGuard(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-300 mb-2">لماذا لا يُنصح بالضغط على Scale (+20%) مباشرة الآن؟</p>
              {preScaleGuard.reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-gray-200 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => openSmartScaleAudit(preScaleGuard.item)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                تشغيل نظام السكال الذكي (تحليل المنتج + الزوايا + نوع السكال)
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = preScaleGuard.item;
                    setPreScaleGuard(null);
                    handleAction('Pause', target);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-colors"
                >
                  إيقاف (Pause)
                </button>
                {!preScaleGuard.hasWhatsAppLock && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = preScaleGuard.item;
                      setPreScaleGuard(null);
                      handleAction('Scale', target, undefined, false, true);
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold transition-colors"
                  >
                    تنفيذ +20% على أي حال
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Scale Architect Drawer */}
      {scaleAuditTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end" onClick={() => setScaleAuditTarget(null)}>
          <div
            className="w-full max-w-3xl h-full bg-[#090D16] border-l border-white/10 overflow-y-auto p-6 space-y-6 shadow-2xl"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Smart Scale Decision System
                </div>
                <h2 className="text-xl font-bold text-white">{scaleAuditTarget.campaign.name}</h2>
                {scaleAuditTarget.focusAdsetId && (
                  <p className="text-xs text-blue-300">
                    تركيز التحليل على Ad Set محدد ضمن الحملة
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openSmartScaleAudit(scaleAuditTarget.campaign)}
                  disabled={scaleAuditLoading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-40 transition-colors"
                  title="إعادة التحليل"
                >
                  <RefreshCw className={cn("w-4 h-4", scaleAuditLoading && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={() => setScaleAuditTarget(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {scaleAuditLoading && (
              <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-white">جاري قراءة الحملة بالكامل وبناء قرار السكال...</p>
                  <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                    يتم الآن فحص المنتج والعرض، هيكل الحملة (CBO / ABO)، استهداف كل Ad Set، نصوص وزوايا الإعلانات، وتحديد نوع السكال المناسب وقواعد التحسين بعد السكال.
                  </p>
                </div>
              </div>
            )}

            {scaleAuditError && !scaleAuditLoading && (
              <div className="glass-panel p-6 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  تعذر إتمام تحليل السكال الذكي
                </div>
                <p className="text-xs text-red-200 leading-relaxed">{scaleAuditError}</p>
                <button
                  type="button"
                  onClick={() => openSmartScaleAudit(scaleAuditTarget.campaign)}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-colors"
                >
                  حاول مرة أخرى
                </button>
              </div>
            )}

            {scaleAuditData?.audit && !scaleAuditLoading && (
              <div className="space-y-6 pb-8">
                {/* 1. Product & Structure Context */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Layers className="w-4 h-4 text-blue-400" />
                      1. فهم المنتج وهيكلة الحملة (Structure & Offer)
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/25">
                        {scaleAuditData.audit.campaignContext.campaignStructure}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                        {scaleAuditData.telemetryMeta?.adsetsAnalyzed || scaleAuditData.audit.adSetAudits?.length || 0} Ad Sets • {scaleAuditData.telemetryMeta?.adsAnalyzed || 0} Ads
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                      <span className="text-gray-400 block text-[11px]">المنتج / العرض المستنتج</span>
                      <p className="text-white font-semibold leading-relaxed">{scaleAuditData.audit.campaignContext.productOrOffer}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                      <span className="text-gray-400 block text-[11px]">مرحلة الفانل والهدف</span>
                      <p className="text-white font-semibold leading-relaxed">{scaleAuditData.audit.campaignContext.funnelStage}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{scaleAuditData.audit.campaignContext.structureAnalysis}</p>
                  <p className="text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3">{scaleAuditData.audit.campaignContext.summary}</p>
                </div>

                {/* 2. Master Scaling Verdict */}
                {(() => {
                  const v = scaleAuditData.audit.scalingVerdict;
                  const badgeMap: Record<ScaleDecisionType, string> = {
                    VERTICAL_SCALE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    HORIZONTAL_SCALE: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                    CREATIVE_SCALE: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                    HOLD_AND_OPTIMIZE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    PAUSE_AND_REBUILD: 'bg-red-500/15 text-red-300 border-red-500/30',
                  };
                  return (
                    <div className={cn('glass-panel p-5 rounded-2xl border space-y-3', badgeMap[v.decision] || 'border-white/10')}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <TrendingUp className="w-4 h-4" />
                          2. قرار السكال الرئيسي (Scaling Verdict)
                        </div>
                        <span className={cn('px-3 py-1 rounded-xl text-xs font-bold border', badgeMap[v.decision])}>
                          {v.decisionLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-black/25 border border-white/10">
                          <span className="text-gray-400 block text-[11px]">هل نرفع الميزانية الآن؟</span>
                          <p className={cn('font-bold mt-1', v.canIncreaseBudgetNow ? 'text-emerald-400' : 'text-amber-300')}>
                            {v.canIncreaseBudgetNow ? 'نعم — جاهز لرفع الميزانية' : 'لا — ممنوع ضخ ميزانية الآن'}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-black/25 border border-white/10">
                          <span className="text-gray-400 block text-[11px]">إجراء الميزانية المقترح</span>
                          <p className="text-white font-bold mt-1">{v.recommendedBudgetAction}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-100 leading-relaxed">{v.executiveReason}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {v.canIncreaseBudgetNow && (
                          <button
                            type="button"
                            onClick={() => handleAction('Scale', scaleAuditTarget.campaign, undefined, false, true)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                          >
                            تنفيذ Vertical Scale (+20%) على الحملة
                          </button>
                        )}
                        {v.decision === 'PAUSE_AND_REBUILD' && (
                          <button
                            type="button"
                            onClick={() => handleAction('Pause', scaleAuditTarget.campaign)}
                            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                          >
                            إيقاف الحملة فوراً (Pause)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Per-AdSet Deep Audit */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Target className="w-4 h-4 text-indigo-400" />
                    3. تحليل كل Ad Set (الجمهور + الزوايا + توافق الكرياتيف + نوع السكال)
                  </div>
                  {(scaleAuditData.audit.adSetAudits || []).map((asAudit, i) => {
                    const matchedAdset = adsets.find(a => String(a.id) === String(asAudit.adsetId));
                    const isFocused = scaleAuditTarget.focusAdsetId && String(scaleAuditTarget.focusAdsetId) === String(asAudit.adsetId);
                    const fitClass =
                      asAudit.creativeAudienceFit === 'High'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : asAudit.creativeAudienceFit === 'Medium'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-red-500/15 text-red-300 border-red-500/30';

                    return (
                      <div
                        key={asAudit.adsetId || i}
                        className={cn(
                          'glass-panel p-4 rounded-2xl border space-y-3',
                          isFocused ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              {asAudit.adsetName}
                              {isFocused && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  المحدد
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-1">{asAudit.segmentationSummary}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold border', fitClass)}>
                              توافق الكرياتيف: {asAudit.creativeAudienceFit}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {asAudit.decisionLabel}
                            </span>
                          </div>
                        </div>

                        {asAudit.anglesUsed?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-400">الزوايا المستخدمة:</span>
                            {asAudit.anglesUsed.map((ang, k) => (
                              <span key={k} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-200">
                                {ang}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
                          <p><span className="text-gray-400 font-semibold">تشخيص التوافق:</span> {asAudit.fitExplanation}</p>
                          <p><span className="text-gray-400 font-semibold">سبب القرار:</span> {asAudit.reasoning}</p>
                        </div>

                        {asAudit.apiEditNote && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>{asAudit.apiEditNote}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <span className="text-[11px] font-bold text-blue-300 block">خطوات التنفيذ:</span>
                            <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                              {(asAudit.actionSteps || []).map((step, sIdx) => (
                                <li key={sIdx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/15 space-y-1.5">
                            <span className="text-[11px] font-bold text-purple-300 block">زوايا إعلانية مقترحة (Creative Angles):</span>
                            <ul className="space-y-1 text-xs text-gray-200 list-disc list-inside">
                              {(asAudit.suggestedNewAngles || []).map((hook, hIdx) => (
                                <li key={hIdx}>{hook}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {matchedAdset && (
                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            {asAudit.recommendedScaleType === 'VERTICAL_SCALE' && (
                              <button
                                type="button"
                                onClick={() => handleAction('Scale', matchedAdset, undefined, false, true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                              >
                                تنفيذ +20% لهذا الـ Ad Set
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAction('Reduce', matchedAdset)}
                              className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 text-[11px] font-bold"
                            >
                              تقليل الميزانية -20%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction('Pause', matchedAdset)}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold"
                            >
                              إيقاف (Pause)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 4. Post-Scale Optimization */}
                <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      4. خطة المتابعة والتحسين بعد السكال (Post-Scale Optimization)
                    </div>
                  </div>
                  <p className="text-xs text-emerald-300 font-medium">
                    نافذة المراقبة: {scaleAuditData.audit.postScaleOptimization.monitoringWindow}
                  </p>
                  <div className="space-y-2">
                    {(scaleAuditData.audit.postScaleOptimization.guardrails || []).map((g, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs items-center">
                        <div className="col-span-3 font-bold text-white">{g.metric}</div>
                        <div className="col-span-4 text-amber-300 font-medium">{g.threshold}</div>
                        <div className="col-span-5 text-gray-300">{g.action}</div>
                      </div>
                    ))}
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside pt-1">
                    {(scaleAuditData.audit.postScaleOptimization.optimizationSteps || []).map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            "px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border backdrop-blur-md",
            toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" :
            toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
            "bg-blue-500/10 border-blue-500/20 text-blue-400"
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Activity className="w-5 h-5" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function formatNumber(value: number, decimals = 2) {
  return (value || 0).toFixed(decimals);
}

const CampaignRow: React.FC<{ 
  campaign: any, 
  adsets: any[], 
  ads: any[], 
  insights: any[],
  expandedItems: Set<string>,
  toggleExpand: (id: string | number, e?: React.MouseEvent) => void,
  expandToProblem: (id: string | number, e?: React.MouseEvent) => void,
  handleAction: (action: string, item: any, e: React.MouseEvent) => void,
  openSmartScaleAudit: (item: any, e: React.MouseEvent) => void,
  actionLoading: string | null
}> = ({ campaign, adsets, ads, insights, expandedItems, toggleExpand, expandToProblem, handleAction, openSmartScaleAudit, actionLoading }) => {
  const isExpanded = expandedItems.has(String(campaign.id));
  const metrics = campaign.metrics || {};
  const problems = campaign.analysis?.problems || [];
  const hasProblems = problems.length > 0;
  const isLoading = actionLoading === String(campaign.id);

  return (
    <div>
      <div 
        className={cn(
          "grid grid-cols-12 gap-4 p-4 hover:bg-white/5 cursor-pointer items-center transition-colors group",
          hasProblems && "bg-red-500/5 hover:bg-red-500/10"
        )}
        onClick={() => toggleExpand(campaign.id)}
      >
        <div className="col-span-3 flex items-center gap-2 font-medium text-white truncate">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <Folder className={cn("w-4 h-4 flex-shrink-0", hasProblems ? "text-red-400" : "text-blue-400")} />
          <span className={cn("truncate", hasProblems && "text-red-400")} title={campaign.name}>{campaign.name}</span>
        </div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.spend)}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.roas)}x</div>
        <div className="col-span-1 text-right text-gray-400">{metrics.cpa > 0 ? formatCurrency(metrics.cpa) : '-'}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.ctr)}%</div>
        <div className="col-span-1 flex justify-center">
          {hasProblems ? (
            <button 
              type="button"
              onClick={(e) => expandToProblem(campaign.id, e)}
              className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
              title={problems.join(', ')}
            >
              <AlertTriangle className="w-3 h-3" />
              {problems.length}
            </button>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </div>
        <div className="col-span-1 flex justify-center">
          <StatusBadge status={campaign.status} />
        </div>
        <div className="col-span-3 flex items-center justify-end gap-2 transition-opacity">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <>
              <button type="button" onClick={(e) => openSmartScaleAudit(campaign, e)} className="px-2.5 py-1.5 text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-colors flex items-center gap-1" title="نظام السكال الذكي">
                <Sparkles className="w-3 h-3" />
                Smart Scale
              </button>
              <button type="button" onClick={(e) => handleAction('Scale', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors">+20%</button>
              <button type="button" onClick={(e) => handleAction('Reduce', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors">Reduce</button>
              <button type="button" onClick={(e) => handleAction('Pause', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">Pause</button>
              <button type="button" onClick={(e) => handleAction('Analyze', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors">Analyze</button>
            </>
          )}
        </div>
      </div>
      
      {isExpanded && adsets && (
        <div className="bg-[#0B0F19]/50 border-t border-white/5 divide-y divide-white/5">
          {adsets.map((adset: any) => (
            <AdSetRow 
              key={adset.id} 
              adset={adset} 
              ads={ads.filter(a => a.adsetId === adset.id)}
              insights={insights}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              handleAction={handleAction}
              openSmartScaleAudit={openSmartScaleAudit}
              actionLoading={actionLoading}
            />
          ))}
          {adsets.length === 0 && (
            <div className="p-4 pl-10 text-sm text-gray-500">No ad sets found for this campaign.</div>
          )}
        </div>
      )}
    </div>
  );
}

const AdSetRow: React.FC<{ 
  adset: any, 
  ads: any[], 
  insights: any[],
  expandedItems: Set<string>,
  toggleExpand: (id: string | number, e?: React.MouseEvent) => void,
  handleAction: (action: string, item: any, e: React.MouseEvent) => void,
  openSmartScaleAudit: (item: any, e: React.MouseEvent) => void,
  actionLoading: string | null
}> = ({ adset, ads, insights, expandedItems, toggleExpand, handleAction, openSmartScaleAudit, actionLoading }) => {
  const isExpanded = expandedItems.has(String(adset.id));
  const metrics = adset.metrics || {};
  const problems = adset.analysis?.problems || [];
  const hasProblems = problems.length > 0;
  const isLoading = actionLoading === String(adset.id);

  return (
    <div>
      <div 
        className={cn(
          "grid grid-cols-12 gap-4 p-3 pl-8 hover:bg-white/5 cursor-pointer items-center transition-colors text-sm",
          hasProblems && "bg-red-500/5 hover:bg-red-500/10"
        )}
        onClick={() => toggleExpand(adset.id)}
      >
        <div className="col-span-4 flex items-center gap-2 font-medium text-gray-300 truncate">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <Target className={cn("w-4 h-4 flex-shrink-0", hasProblems ? "text-red-400" : "text-indigo-400")} />
          <span className={cn("truncate", hasProblems && "text-red-400")} title={adset.name}>{adset.name}</span>
        </div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.spend)}</div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.conversionValue)}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.roas)}x</div>
        <div className="col-span-1 text-right text-gray-400">{metrics.cpa > 0 ? formatCurrency(metrics.cpa) : '-'}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.ctr)}%</div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.cpm)}</div>
        <div className="col-span-1 flex justify-center">
          {hasProblems ? (
            <span className="flex items-center gap-1 text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20" title={problems.join(', ')}>
              <AlertTriangle className="w-3 h-3" />
              {problems[0]}
            </span>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </div>
        <div className="col-span-1 flex justify-center">
          <StatusBadge status={adset.status} />
        </div>
        <div className="col-span-3 flex items-center justify-end gap-2 transition-opacity">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <button type="button" onClick={(e) => openSmartScaleAudit(adset, e)} className="px-2 py-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-md hover:bg-emerald-500/25 transition-colors uppercase tracking-widest flex items-center gap-1" title="تشخيص السكال والزوايا">
                <Sparkles className="w-2.5 h-2.5" />
                AI Scale
              </button>
              <button type="button" onClick={(e) => handleAction('Scale', adset, e)} className="px-2 py-1 text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/10 rounded-md hover:bg-green-500/20 transition-colors uppercase tracking-widest">Scale</button>
              <button type="button" onClick={(e) => handleAction('Reduce', adset, e)} className="px-2 py-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 rounded-md hover:bg-yellow-500/20 transition-colors uppercase tracking-widest">Reduce</button>
              <button type="button" onClick={(e) => handleAction('Pause', adset, e)} className="px-2 py-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/10 rounded-md hover:bg-red-500/20 transition-colors uppercase tracking-widest">Pause</button>
            </>
          )}
        </div>
      </div>

      {isExpanded && ads && (
        <div className="bg-[#111827]/30 border-t border-white/5 divide-y divide-white/5">
          {ads.map((ad: any) => (
            <AdRow key={ad.id} ad={ad} insights={insights} />
          ))}
          {ads.length === 0 && (
            <div className="p-3 pl-14 text-sm text-gray-500">No ads found for this ad set.</div>
          )}
        </div>
      )}
    </div>
  );
}

const AdRow: React.FC<{ ad: any, insights: any[] }> = ({ ad, insights }) => {
  const metrics = ad.metrics || {};
  const problems = ad.analysis?.problems || [];
  const hasProblems = problems.length > 0;

  return (
    <div className={cn(
      "grid grid-cols-12 gap-4 p-3 pl-12 hover:bg-white/5 items-center transition-colors text-sm",
      hasProblems && "bg-red-500/5 hover:bg-red-500/10"
    )}>
      <div className="col-span-4 flex items-center gap-2 text-gray-400 truncate">
        <ImageIcon className={cn("w-4 h-4 flex-shrink-0 ml-6", hasProblems ? "text-red-400" : "text-blue-400")} />
        <span className={cn("truncate", hasProblems && "text-red-400")} title={ad.name}>{ad.name}</span>
      </div>
      <div className="col-span-1 text-right text-gray-500">{formatCurrency(metrics.spend)}</div>
      <div className="col-span-1 text-right text-gray-500">{formatCurrency(metrics.conversionValue)}</div>
      <div className="col-span-1 text-right text-gray-500">{formatNumber(metrics.roas)}x</div>
      <div className="col-span-1 text-right text-gray-500">{metrics.cpa > 0 ? formatCurrency(metrics.cpa) : '-'}</div>
      <div className="col-span-1 text-right text-gray-500">{formatNumber(metrics.ctr)}%</div>
      <div className="col-span-1 text-right text-gray-500">{formatCurrency(metrics.cpm)}</div>
      <div className="col-span-1 flex justify-center">
        {hasProblems ? (
          <span className="flex items-center gap-1 text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20" title={problems.join(', ')}>
            <AlertTriangle className="w-3 h-3" />
            {problems[0]}
          </span>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </div>
      <div className="col-span-1 flex justify-center">
        <StatusBadge status={ad.status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return <span title="Active"><CheckCircle2 className="w-4 h-4 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" /></span>;
  }
  if (status === 'PAUSED') {
    return <div className="w-4 h-4 rounded-full border-2 border-gray-500" title="Paused" />;
  }
  return <span title={status}><XCircle className="w-4 h-4 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /></span>;
}

