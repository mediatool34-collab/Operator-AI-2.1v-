import React, { useState, useEffect } from 'react';
import JSON5 from 'json5';
import { 
  Search, Globe, Target, TrendingUp, Lightbulb, AlertTriangle, 
  CheckCircle2, Crosshair, Zap, Shield, BarChart3, Presentation, 
  Sparkles, ArrowRight, ExternalLink, Eye, Layout, MessageSquare, 
  Megaphone, Gauge, ChevronRight, Info, AlertCircle, Rocket,
  RefreshCw, Image as ImageIcon, Activity, DollarSign, Users, Play, Repeat,
  PenTool, Copy, Check, Download, FileText, Calendar, Code2, MousePointerClick, PhoneCall, Store, Layers, Link2
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useAiSettings } from '../hooks/useAiSettings';
import { usePersistedState } from '../hooks/usePersistedState';
import { useFilters, PRE_FUNNEL_PENDING_TARGET_KEY, SupportedPlatform } from '../lib/FilterContext';
import { analyzeWithGemini } from '../lib/gemini';
import { CRO_AND_AOV_INTELLIGENCE_DIRECTIVE } from '../lib/operatorDirectives';
import { EXPLORE_TEAM_STRATEGY, EXPLORE_TEAM_LONG_TERM_STRATEGY } from '../data/exploreTeamStrategy';

type TabType = 'audit' | 'analysis' | 'competitors' | 'trends' | 'funnel' | 'creative' | 'roadmap' | 'content';
type AnalysisSourceType = 'url' | 'account' | 'platform' | 'store';

export function PreFunnelIntelligence() {
  const { provider: aiProvider } = useAiSettings();
  const [url, setUrl] = usePersistedState('pre_funnel_url', 'https://explore-sa.com');
  const [language, setLanguage] = usePersistedState('pre_funnel_language', 'Arabic');
  const [currency, setCurrency] = usePersistedState('pre_funnel_currency', 'SAR (ر.س)');
  const [customCompetitors, setCustomCompetitors] = usePersistedState('pre_funnel_custom_competitors', '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = usePersistedState<TabType>('pre_funnel_active_tab', 'analysis');
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = usePersistedState<any>('pre_funnel_strategy', EXPLORE_TEAM_STRATEGY);
  const [contentAnalysis, setContentAnalysis] = usePersistedState<any>('pre_funnel_content', null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [copiedAdId, setCopiedAdId] = useState<string | null>(null);
  const [copiedRoadmap, setCopiedRoadmap] = useState(false);
  const [roadmapDutyFilter, setRoadmapDutyFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [longTermStrategy, setLongTermStrategy] = usePersistedState<string | null>('pre_funnel_long_term', null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = usePersistedState<number | null>('pre_funnel_last_analyzed', null);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [roadmapStep, setRoadmapStep] = useState<string>('');
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [customBudget, setCustomBudget] = usePersistedState<string>('pre_funnel_custom_budget', '');

  const {
    allConnectedAccounts,
    connectedStores,
    connectedPlatformsStatus,
    monitoringSummary,
    datePreset,
    getTokenForPlatform,
    refreshMonitoring,
  } = useFilters();

  const [sourceType, setSourceType] = usePersistedState<AnalysisSourceType>('pre_funnel_source_type', 'url');
  const [targetPlatform, setTargetPlatform] = usePersistedState<SupportedPlatform>('pre_funnel_target_platform', 'meta');
  const [targetAccountId, setTargetAccountId] = usePersistedState<string>('pre_funnel_target_account_id', '');
  const [targetStoreId, setTargetStoreId] = usePersistedState<string>('pre_funnel_target_store_id', '');
  const [targetPageUrl, setTargetPageUrl] = usePersistedState<string>('pre_funnel_target_page_url', '');

  const handleCopyRoadmap = () => {
    if (!longTermStrategy) return;
    navigator.clipboard.writeText(longTermStrategy);
    setCopiedRoadmap(true);
    setTimeout(() => setCopiedRoadmap(false), 2500);
  };

  const handleDownloadRoadmap = () => {
    if (!longTermStrategy) return;
    const element = document.createElement("a");
    const file = new Blob([longTermStrategy], {type: 'text/markdown;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `90-day-growth-plan-${(strategy?.businessSummary?.name || 'brand').replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Robust JSON cleaner and parser
  const safeParseJSON = (text: string) => {
    if (!text || typeof text !== 'string') return null;
    try {
      // First attempt to parse directly
      return JSON.parse(text);
    } catch (directError) {
      try {
        let sanitized = text.trim();
        
        // 1. Remove markdown code blocks if present
        if (sanitized.includes('```')) {
          sanitized = sanitized.replace(/```json/g, '').replace(/```/g, '').trim();
        }
        
        // 2. Extract only the content between the first { and last }
        const firstBrace = sanitized.indexOf('{');
        const lastBrace = sanitized.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          sanitized = sanitized.substring(firstBrace, lastBrace + 1);
          return JSON5.parse(sanitized);
        }

        console.warn('safeParseJSON: no valid JSON block found in response text');
        return null;
      } catch (e: any) {
        console.warn('JSON parse failed after cleanup:', e.message);
        return null;
      }
    }
  };

  const [selectedPlatform, setSelectedPlatform] = usePersistedState<string>('pre_funnel_selected_platform', '');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sharedBudgetContext] = usePersistedState<any>('budget_planner_context', null);
  const [sharedFunnelContext, setSharedFunnelContext] = usePersistedState<any>('pre_funnel_context', null);

  useEffect(() => {
    if (strategy?.funnelStrategy?.platforms && strategy.funnelStrategy.platforms.length > 0) {
      const platformExists = strategy.funnelStrategy.platforms.some((p: any) => p.platform === selectedPlatform);
      if (!platformExists) {
        setSelectedPlatform(strategy.funnelStrategy.platforms[0].platform);
      }
    }
  }, [strategy, selectedPlatform, setSelectedPlatform]);

  useEffect(() => {
    // If URL changes in URL mode, clear previous longTermStrategy and contentAnalysis so they don't leak across brands
    if (sourceType === 'url' && url && strategy && strategy._analyzedUrl) {
      try {
        const cleanU = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);
        const uCurrent = new URL(cleanU(url)).hostname.replace(/^www\./i, '');
        const uAnalyzed = new URL(cleanU(strategy._analyzedUrl)).hostname.replace(/^www\./i, '');
        if (uCurrent !== uAnalyzed) {
          setContentAnalysis(null);
          setLongTermStrategy(null);
        }
      } catch (e) {}
    }

    // Never keep Explore Team demo strategy visible when user switches to Connected Account / Platform / Store mode
    if (sourceType !== 'url' && strategy?.businessSummary?.name === 'Explore Team') {
      setStrategy(null);
      setContentAnalysis(null);
      setLongTermStrategy(null);
    }

    // Default explore-sa.com roadmap initialization ONLY in URL mode for explore-sa.com
    if (sourceType === 'url' && (url === 'https://explore-sa.com' || url === 'explore-sa.com') && !longTermStrategy) {
      setLongTermStrategy(EXPLORE_TEAM_LONG_TERM_STRATEGY);
    }
  }, [sourceType, url, strategy, longTermStrategy, setStrategy, setContentAnalysis, setLongTermStrategy]);

  // Pick up handoff target sent from Connections, Dashboard, or Campaigns
  useEffect(() => {
    try {
      const rawPending = localStorage.getItem(PRE_FUNNEL_PENDING_TARGET_KEY);
      if (rawPending) {
        const pending = JSON.parse(rawPending);
        localStorage.removeItem(PRE_FUNNEL_PENDING_TARGET_KEY);
        if (pending.type) setSourceType(pending.type);
        if (pending.platform) setTargetPlatform(pending.platform);
        if (pending.accountId) setTargetAccountId(pending.accountId);
        if (pending.storeId) setTargetStoreId(pending.storeId);
        if (pending.storeUrl) {
          setUrl(pending.storeUrl);
          setTargetPageUrl(pending.storeUrl);
        } else if (pending.type === 'account' || pending.type === 'platform') {
          setTargetPageUrl('');
        }
        if (pending.currency) setCurrency(pending.currency);
      }
    } catch {}
  }, [setSourceType, setTargetPlatform, setTargetAccountId, setTargetStoreId, setUrl, setTargetPageUrl, setCurrency]);

  // Keep default selections aligned with connected accounts/stores
  useEffect(() => {
    if (sourceType === 'account' && !targetAccountId && allConnectedAccounts.length > 0) {
      setTargetAccountId(allConnectedAccounts[0].id);
      if (allConnectedAccounts[0].platform) setTargetPlatform(allConnectedAccounts[0].platform);
    }
    if (sourceType === 'store' && !targetStoreId && connectedStores.length > 0) {
      const st = connectedStores[0];
      setTargetStoreId(st.id);
      if (st.storeUrl) setUrl(st.storeUrl);
      if (st.currency) setCurrency(st.currency);
    }
  }, [sourceType, targetAccountId, targetStoreId, allConnectedAccounts, connectedStores, setTargetAccountId, setTargetPlatform, setTargetStoreId, setUrl, setCurrency]);

  const mapAccountCurrencyLabel = (code?: string): string | null => {
    if (!code) return null;
    const upper = code.toUpperCase();
    if (upper === 'EGP') return 'EGP (ج.م)';
    if (upper === 'SAR') return 'SAR (ر.س)';
    if (upper === 'AED') return 'AED (د.إ)';
    if (upper === 'USD') return 'USD ($)';
    if (upper === 'EUR') return 'EUR (€)';
    if (upper === 'GBP') return 'GBP (£)';
    if (upper === 'AUD') return 'AUD ($)';
    if (upper === 'CAD') return 'CAD ($)';
    return null;
  };

  const buildConnectedTelemetry = async (): Promise<{
    contextText: string;
    sourceMeta: { type: AnalysisSourceType; label: string; platform?: string; accountId?: string; storeUrl?: string };
    resolvedUrl: string;
    detectedCurrency: string | null;
    telemetryStats: any | null;
    telemetryDetails: { campaigns: any[]; ads: any[]; pages: any[] } | null;
  }> => {
    if (sourceType === 'url') {
      return {
        contextText: '',
        sourceMeta: { type: 'url', label: url.trim() },
        resolvedUrl: url.trim(),
        detectedCurrency: null,
        telemetryStats: null,
        telemetryDetails: null,
      };
    }

    const latestSummary = monitoringSummary;
    if (!latestSummary && user) {
      await refreshMonitoring();
    }

    const fetchDeepTelemetry = async (plat: string, accId: string) => {
      if (!user) return null;
      const tok = getTokenForPlatform(plat) || `manual_${plat}`;
      try {
        const q = `platform=${encodeURIComponent(plat)}&accountId=${encodeURIComponent(accId)}&datePreset=${encodeURIComponent(datePreset || 'maximum')}`;
        const res = await fetch(`/api/account/deep-telemetry?${q}`, {
          headers: {
            'x-user-id': user.uid,
            [`x-${plat}-token`]: tok,
          },
        });
        const data = await safeJson(res);
        if (data && !data.error) return data;
      } catch (err) {
        console.warn('Deep telemetry fetch failed:', err);
      }
      return null;
    };

    if (sourceType === 'store') {
      const st = connectedStores.find(s => s.id === targetStoreId);
      const resolvedUrl = (st?.storeUrl || targetPageUrl || url || '').trim();
      let deepLinkedData: any = null;
      if (st?.linkedAdAccountId && st?.linkedPlatform) {
        deepLinkedData = await fetchDeepTelemetry(st.linkedPlatform, st.linkedAdAccountId);
      }

      const contextText = st
        ? `CONNECTED STORE TELEMETRY (FROM WORKSPACE):
- Store Name: ${st.name}
- E-commerce Platform: ${st.platform}
- Store URL: ${st.storeUrl}
- Currency: ${st.currency}
- Monthly Revenue: ${st.monthlyRevenue}
- Target ROAS: ${st.targetRoas}x | Target CPA: ${st.targetCpa}
- Linked Ad Account: ${st.linkedAdAccountId ? `${st.linkedAdAccountId} (${st.linkedPlatform})` : 'None'}
${deepLinkedData?.telemetryText ? `\n${deepLinkedData.telemetryText}` : ''}`
        : '';

      return {
        contextText,
        sourceMeta: {
          type: 'store',
          label: st ? `${st.name} (${st.platform.toUpperCase()})` : 'Connected Store',
          platform: st?.linkedPlatform || st?.platform,
          accountId: st?.linkedAdAccountId || undefined,
          storeUrl: resolvedUrl,
        },
        resolvedUrl,
        detectedCurrency: st?.currency || mapAccountCurrencyLabel(deepLinkedData?.account?.currency),
        telemetryStats: deepLinkedData?.stats
          ? { ...deepLinkedData.stats, currency: deepLinkedData.account?.currency || st?.currency }
          : null,
        telemetryDetails: deepLinkedData
          ? {
              campaigns: deepLinkedData.campaigns || [],
              ads: deepLinkedData.ads || [],
              pages: deepLinkedData.pages || [],
            }
          : null,
      };
    }

    if (sourceType === 'platform') {
      const plat = targetPlatform || 'meta';
      const deepData = await fetchDeepTelemetry(plat, 'all');
      const platSummary = latestSummary?.platforms?.find((p: any) => p.platform === plat);
      const fallbackText = `CONNECTED AD PLATFORM LIVE TELEMETRY (${plat.toUpperCase()}):
- Platform: ${plat.toUpperCase()}
- Accounts Connected: ${platSummary?.accountsCount ?? allConnectedAccounts.filter(a => a.platform === plat).length}
- Total Campaigns: ${platSummary?.campaignsCount ?? 0} (Active: ${platSummary?.activeCampaigns ?? 0})
- Total Spend: ${Number(platSummary?.spend || 0).toFixed(2)} | Est. Revenue: ${Number(platSummary?.revenue || 0).toFixed(2)}
- Blended ROAS: ${Number(platSummary?.roas || 0).toFixed(2)}x | CTR: ${Number(platSummary?.ctr || 0).toFixed(2)}%`;

      const resolvedUrl = (
        targetPageUrl.trim() ||
        deepData?.discoveredWebsiteUrl ||
        deepData?.facebookPageUrl ||
        ''
      ).trim();

      return {
        contextText: deepData?.telemetryText || fallbackText,
        sourceMeta: { type: 'platform', label: `${plat.toUpperCase()} Platform`, platform: plat },
        resolvedUrl,
        detectedCurrency: mapAccountCurrencyLabel(deepData?.account?.currency),
        telemetryStats: deepData?.stats
          ? { ...deepData.stats, currency: deepData.account?.currency || 'USD' }
          : null,
        telemetryDetails: deepData
          ? {
              campaigns: deepData.campaigns || [],
              ads: deepData.ads || [],
              pages: deepData.pages || [],
            }
          : null,
      };
    }

    // sourceType === 'account'
    const selectedAcc =
      allConnectedAccounts.find(a => a.id === targetAccountId) ||
      latestSummary?.accounts?.find((a: any) => a.id === targetAccountId);
    const accPlat = (selectedAcc?.platform || targetPlatform || 'meta') as SupportedPlatform;
    const accId = selectedAcc?.id || targetAccountId || 'all';
    const deepData = await fetchDeepTelemetry(accPlat, accId);

    const resolvedUrl = (
      targetPageUrl.trim() ||
      deepData?.discoveredWebsiteUrl ||
      deepData?.facebookPageUrl ||
      ''
    ).trim();

    const fallbackContext = `CONNECTED AD ACCOUNT LIVE TELEMETRY:
- Platform: ${accPlat.toUpperCase()}
- Account Name: ${selectedAcc?.name || accId}
- Account ID: ${accId}`;

    return {
      contextText: deepData?.telemetryText || fallbackContext,
      sourceMeta: {
        type: 'account',
        label: deepData?.account?.name || selectedAcc?.name || `${accPlat.toUpperCase()} (${accId})`,
        platform: accPlat,
        accountId: accId,
      },
      resolvedUrl,
      detectedCurrency: mapAccountCurrencyLabel(deepData?.account?.currency),
      telemetryStats: deepData?.stats
        ? { ...deepData.stats, currency: deepData.account?.currency || 'USD' }
        : null,
      telemetryDetails: deepData
        ? {
            campaigns: deepData.campaigns || [],
            ads: deepData.ads || [],
            pages: deepData.pages || [],
          }
        : null,
    };
  };

  const canRunAnalyze =
    sourceType === 'url'
      ? Boolean(url && url.trim())
      : sourceType === 'store'
      ? Boolean(targetStoreId)
      : sourceType === 'platform'
      ? Boolean(targetPlatform)
      : Boolean(targetAccountId);

  const handleAnalyze = async () => {
    if (!canRunAnalyze) return;

    setLoading(true);
    setError(null);
    setStrategy(null);
    setAnalysisStep('جاري جمع بيانات الحساب / المتجر وبدء الفحص التكتيكي...');

    try {
      const {
        contextText: telemetryContext,
        sourceMeta,
        resolvedUrl,
        detectedCurrency,
        telemetryStats,
        telemetryDetails,
      } = await buildConnectedTelemetry();

      const effectiveCurrency = detectedCurrency || currency;
      if (detectedCurrency && detectedCurrency !== currency) {
        setCurrency(detectedCurrency);
      }

      const hasValidUrl = Boolean(resolvedUrl && resolvedUrl.trim());
      const formattedUrl = hasValidUrl
        ? /^https?:\/\//i.test(resolvedUrl.trim())
          ? resolvedUrl.trim()
          : `https://${resolvedUrl.trim()}`
        : '';

      if (sourceType === 'url' && formattedUrl && formattedUrl !== url) {
        setUrl(formattedUrl);
      } else if ((sourceType === 'account' || sourceType === 'platform') && formattedUrl && !targetPageUrl) {
        setTargetPageUrl(formattedUrl);
      }

      setAnalysisStep('Surveying real account campaigns, creatives, page data & market ecosystem...');

      // 1. SCRAPE via Backend (if an actual website URL is present; skip FB/IG URLs because Graph API already extracts rich Page/IG profile & posts)
      const isSocialWallUrl = /https?:\/\/(www\.|m\.)?(facebook\.com|fb\.com|instagram\.com)\//i.test(formattedUrl);
      let hasScrapedWebsite = false;
      let scrapeData: any = {
        content: '',
        title: sourceMeta.label || 'Connected Target',
      };

      if (formattedUrl && !isSocialWallUrl) {
        const scrapeResponse = await fetch('/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || 'anonymous'
          },
          body: JSON.stringify({ url: formattedUrl, options: { timeout: 20000 } })
        });

        const contentType = scrapeResponse.headers.get('content-type');
        if (scrapeResponse.ok && contentType && contentType.includes('application/json')) {
          const scraped = await scrapeResponse.json();
          const scrapedText = (scraped?.content || '').trim();
          const isLoginWall = /log in to facebook|log into facebook|create new account|login • instagram/i.test(scrapedText.slice(0, 400));
          if (scrapedText.length > 80 && !isLoginWall) {
            scrapeData = scraped;
            hasScrapedWebsite = true;
          }
        } else {
          console.warn('Scraping failed, falling back to connected telemetry / URL-only analysis');
        }
      }

      setAnalysisStep('Performing broader market and competitor research...');
      
      const isArabic = (language || '').toLowerCase().includes('arab') || language === 'العربية';
      const isEgyptAccount =
        effectiveCurrency.includes('EGP') ||
        telemetryContext.includes('Locations: EG') ||
        telemetryContext.includes('Africa/Cairo') ||
        formattedUrl.toLowerCase().includes('.eg');
      const isSaudiDomain =
        !isEgyptAccount &&
        (formattedUrl.toLowerCase().includes('.sa') ||
          effectiveCurrency.includes('SAR') ||
          effectiveCurrency.includes('ر.س') ||
          telemetryContext.includes('Locations: SA') ||
          telemetryContext.includes('Asia/Riyadh'));

      const marketRegionLabel = isEgyptAccount
        ? 'جمهورية مصر العربية (السوق المصري)'
        : isSaudiDomain
        ? 'المملكة العربية السعودية (السوق السعودي)'
        : 'السوق المحلي المستهدف من بيانات الحساب والموقع';

      const targetDescriptor = formattedUrl
        ? `${sourceMeta.label} (${formattedUrl})`
        : sourceMeta.label || 'Connected Target';

      let marketResearchContext = '';
      try {
        if (aiProvider === 'gemini') {
          const searchPrompt = isArabic ? `أنت خبير ميديا باير ومحلل نمو واستخبارات منافسين في السوق المحلي (Senior Local Competitor Intelligence & Media Buyer).
مهمتك: فحص وتحليل النشاط التجاري التالي بناءً على بياناته الفعلية، واستخراج 3 إلى 4 منافسين حقيقيين ومباشرين ينشطون في نفس السوق والدولة (${marketRegionLabel}).

بيانات النشاط التجاري المستهدف (${sourceMeta.type.toUpperCase()}):
الهدف: ${targetDescriptor}
العملة الرسمية للحساب: ${effectiveCurrency}
${telemetryContext ? `\nبيانات الأداء الحية والحملات والإعلانات والصفحة المرتبطة:\n${telemetryContext}\n` : ''}
محتوى الموقع/الصفحة المستخرج: ${hasScrapedWebsite ? (scrapeData.content || '').substring(0, 5000) : 'يتم التحليل استناداً إلى بيانات الحساب الإعلاني والحملات والكرياتفز والصفحة المرتبطة أعلاه.'}

${customCompetitors?.trim() ? `المنافسون المحددون مسبقاً من قِبل المستخدم (التزم بهؤلاء فقط بدقة وابحث عن بياناتهم الحقيقية):
"${customCompetitors}"` : `قواعد استخراج المنافسين (صارمة جداً):
1. حدد نوع وطبيعة النشاط بدقة بالغة من الإعلانات والصفحة والاسم التجاري، واستخرج 3 إلى 4 منافسين حقيقيين مرخصين وناشطين في نفس الدولة (${marketRegionLabel}).
2. استبعد الوسطاء والمنصات العامة غير المتخصصة والمتاجر العشوائية.
3. تأكد من أن كل منافس فريد ولا تكرر أي اسم، وتحقق من وجودهم الفعلي.`}

المطلوب استخراجه لكل منافس باللغة العربية للانتقال من تحليل المنافسين إلى التفوق عليهم:
1. الاسم الدقيق ورابط الموقع وروابط صفحات التواصل الاجتماعي.
2. استراتيجية الإعلانات: المنصات النشطة (Meta, TikTok, Google Search, LinkedIn) مع أهداف الحملات ونوع المحتوى الإعلاني وتحديد أي منصة هي الأكثر تحويلاً للعملاء.
3. المنافسون ينشرون ماذا والمحتوى الذي يحقق لهم تفاعلاً حقيقياً.
4. نقاط القوة والضعف عند كل منافس مقارنةً بالنشاط المستهدف (${targetDescriptor}).
5. الكلمات المفتاحية التي يبحث عنها الناس وموقعنا/صفحتنا غير ظاهرة فيها (Missing Keyword Gaps).
6. الخدمة أو المنتج الأكثر طلباً ومبيعاً لديهم ومتوسط قيمة الطلب بالعملة المحلية (${effectiveCurrency}).
7. التكاليف التقديرية الواقعية للميديا باينج في ${marketRegionLabel}: CPA، CPL، وتكلفة المحادثة (بالعملة ${effectiveCurrency}).

          لا تستخدم الحشو. استخدم الأرقام القياسية (0, 1, 2, 3...) لجميع الأرقام والأسعار.` : `As a senior local market analyst (Media Buyer), investigate the following target business and find 3 to 4 REAL direct competitors for it in its primary country/market (${isEgyptAccount ? 'Egypt' : isSaudiDomain ? 'Saudi Arabia' : 'target local market'}).

TARGET BUSINESS DATA (${sourceMeta.type.toUpperCase()}):
TARGET: ${targetDescriptor}
ACCOUNT CURRENCY: ${effectiveCurrency}
${telemetryContext ? `\nLIVE CONNECTED ACCOUNT, ADS, TARGETING & PAGE TELEMETRY:\n${telemetryContext}\n` : ''}
WEBSITE CONTENT: ${hasScrapedWebsite ? (scrapeData.content || '').substring(0, 5000) : 'Analyzed directly from connected ad account campaigns, ad creatives, and linked page telemetry above.'}

${customCompetitors?.trim() ? `CRITICAL - THE USER HAS EXPLICITLY PROVIDED THE DIRECT COMPETITORS:
"${customCompetitors}"` : `COMPETITOR RESEARCH RULES:
1. Identify the exact core industry, business model, and target country from the live ads/page telemetry.
2. Use Google Search to find 3 to 4 REAL, STRONG DIRECT COMPETITORS in the same country and industry.
3. NO DUPLICATES and NO HALLUCINATIONS.`}

Provide details for each: exact names, websites/social links, engaging content, strengths & weaknesses vs ${targetDescriptor}, missing keywords, Google/AI visibility, ad platforms, top offer, estimated CPA/CPL/Cost per message benchmarks in ${effectiveCurrency}. Use standard digits (0, 1, 2, 3...).`;

          marketResearchContext = await analyzeWithGemini(searchPrompt, false);
        }
      } catch (searchErr) {
        console.warn('Market research grounding pass failed:', searchErr);
      }

      setAnalysisStep('Generating tactical funnel blueprint...');

      // 2. ANALYZE
      const prompt = `
        Act as a SENIOR STRATEGIC ANALYST & GROWTH ARCHITECT (McKinsey/BCG level). 
        Your mission is to perform a DEEP-DIVE forensic audit of: ${targetDescriptor}.
        
        ${telemetryContext ? `=== MANDATORY REAL AD ACCOUNT, CAMPAIGNS, TARGETING, AD COPY & PAGE TELEMETRY ===
        ${telemetryContext}

        STRICT TELEMETRY GROUNDING RULES (DO NOT VIOLATE):
        1. You MUST analyze the ACTUAL numbers, historical campaigns, ad sets, geo/age/interest targeting, ad copy/headlines/CTAs/creatives, Meta actions breakdown, and Facebook/Instagram Page profile provided above.
        2. NEVER invent a different industry or unrelated business! The business MUST strictly match "${sourceMeta.label}" and the actual campaigns/creatives/products inside the telemetry above.
        3. NEVER claim 'no ad spend', 'zero ad spend', or 'no active ads' when Spend > 0 or campaigns/ads exist in the telemetry above! Quote the exact verified campaign names, exact ad creative copy/headlines, and exact verified figures (Spend in ${effectiveCurrency}, Impressions, Reach, Clicks, CTR, CPC, Results/Messages/Leads).
        4. Explicitly evaluate which historical campaigns and creatives performed best vs. weakest based on CTR, CPC, Spend, and Results, and build the new Funnel Strategy & Creative scripts directly to fix those specific weaknesses and scale the winning angles.
        5. Use ONLY the verified account currency (${effectiveCurrency}) for budgets, CPA, and estimates.
        ====================================================================================
        ` : ''}

        ${hasScrapedWebsite ? `DATA SOURCE (TARGET BUSINESS WEBSITE CONTENT):
        ${(scrapeData.content || '').substring(0, 20000)}` : `DATA SOURCE NOTE: No external website HTML was scraped; rely 100% on the verified ${sourceMeta.type.toUpperCase()} campaigns, ad creatives, targeting, and page data above for "${targetDescriptor}".`}

        LIVE FORENSIC DOM & CODE INSPECTION OF TARGET WEBSITE:
        ${scrapeData?.forensicSummary || 'N/A'}
        ${scrapeData?.forensicAudit ? JSON.stringify(scrapeData.forensicAudit) : ''}

        MARKET RESEARCH CONTEXT (COMPETITOR INTELLIGENCE FROM SEARCH GROUNDING):
        ${(marketResearchContext || '').substring(0, 6000)}

        ${CRO_AND_AOV_INTELLIGENCE_DIRECTIVE}
        
        CRITICAL INSTRUCTION FOR COMPETITOR INSIGHTS:
        You MUST ONLY use the real competitors from the market research context above. Formulate the "tier1" array with 3 to 4 top direct competitors strictly based on the real data provided in the context. Keep each JSON string concise, specific, and high-signal (1 to 2 sentences max) so the complete JSON finishes cleanly without truncation.
        
        ${sharedBudgetContext ? `
        BUDGET ORCHESTRATION CONTEXT:
        ${JSON.stringify(sharedBudgetContext)}
        Explain how this budget context influenced your funnel strategy in your executive summary.
        ` : ''}

        ${isArabic ? `
        ========================================================================
        ⚠️ شرط إلزامي صارم جداً للغة العربية (100% ARABIC REQUIRED):
        لقد اختار المستخدم اللغة العربية (Arabic).
        يجب أن تكون جميع النصوص والشروحات والتحليلات والعناوين داخل الـ JSON باللغة العربية الفصحى الاحترافية الخاصة بخبراء التسويق والاستراتيجية.
        ممنوع منعاً باتاً كتابة أي نص تحليلي أو ملخص أو بطاقة باللغة الإنجليزية.
        يشمل ذلك نصوص:
        - businessAudit (النموذج، الجمهور المستهدف، نبرة الصوت، عوائق التحويل، وتحليل الموقع الفني siteUiUxAudit)
        - businessSummary (اسم النشاط، نوع الخدمة/المنتج، العرض، الرسالة التسويقية، الموقع في السوق)
        - executiveSummary (أهم مفتاح للنمو keyUnlock، الحقيقة التسويقية theTruth، فرصة التوسع scaleOpportunity)
        - detectedProblems (المشاكل المكتشفة وتفاصيلها مبنية على أرقام الحملات والصفحة والإعلانات الفعلية)
        - competitorInsights (أسماء وتحليلات واستراتيجيات جميع المنافسين)
        - marketTrends (التريندات والزوايا الإعلانية الرابحة)
        - funnelStrategy (استراتيجية مسار التحويل TOF, MOF, BOF بالكامل)
        - creativeAndAdvantage و executionRoadmap
        مسموح فقط باستخدام الاختصارات التسويقية العالمية بين قوسين مثل (CPA, ROAS, LTV, B2B, Meta, CTR, CPC) بجانب الشرح العربي.
        ========================================================================
        ` : `
        CRITICAL OVERRIDE - LANGUAGE AND CURRENCY:
        - EVERY SINGLE text field in the JSON (except property keys) MUST be written in ${language}.
        `}
        
        - ALL numbers, percentages, and currencies MUST be written in ONLY standard English digits (e.g., 0, 1, 2, 3, 450, 1500). DO NOT use Eastern Arabic numerals (like ١, ٢, ٣).
        - ALL budget amounts, numeric estimates, and monetary values MUST be formatted using "${effectiveCurrency}".

        MANDATORY JSON RULES (CRITICAL):
        - Return ONLY valid JSON. No markdown blocks, no conversational filler.
        - JSON SAFETY: NEVER use raw double quotes (") inside a string value. Use single quotes (') instead.
        - Ensure the JSON is complete and not truncated.
        
        REQUIRED SCHEMA (STRICT):
        {
          "businessAudit": {
            "model": string,
            "targetAvatarSummary": string,
            "brandVoice": string,
            "conversionFriction": string,
            "siteUiUxAudit": {
              "heroSectionCritique": string,
              "ctaAnalysis": string,
              "formAndLeadCaptureFriction": string,
              "spellingAndContentBugs": string[],
              "mobileAndWhatsAppReadiness": string,
              "speedAndTechnicalScore": string,
              "immediateActionableFixes": string[]
            },
            "searchAndAiVisibility": {
              "googleRankStatus": string,
              "googleVisibilityScore": number,
              "chatgptVisibility": { "status": string, "score": number, "reason": string },
              "geminiVisibility": { "status": string, "score": number, "reason": string },
              "perplexityVisibility": { "status": string, "score": number, "reason": string },
              "howToRankInGoogleAndAI": string[]
            },
            "swotComparison": {
              "yourStrengths": string[],
              "yourWeaknesses": string[],
              "competitorAdvantages": string[],
              "howToOutperform": string[]
            }
          },
          "businessSummary": { "name": string, "productType": string, "offer": string, "messaging": string, "visualQuality": string, "targetAudience": string, "marketPositioning": string, "brandStrength": string, "priceLevel": string, "detectedPlatforms": string[] },
          "executiveSummary": { "keyUnlock": string, "theTruth": string, "scaleOpportunity": string, "budgetContextImpact": string },
          "detectedProblems": Array<{ issue: string, description: string, severity: "Critical" | "High" | "Medium" }>,
          "sharedFunnelContext": {
            "funnelScore": number,
            "readinessScore": number,
            "funnelComplexity": string,
            "recommendedTestingBudget": number,
            "scalingConfidence": string,
            "acquisitionDifficulty": string,
            "trustSignalScore": number,
            "rationale": string
          },
          "competitorInsights": {
            "topCompetitorName": string,
            "topCompetitorRationale": string,
            "rivalContentFormats": string[],
            "missingKeywords": Array<{ keyword: string, searchIntent: string, monthlyDemand: string, rankingCompetitor: string, actionTip: string }>,
            "tier1": Array<{ name: string, priceRange: string, adActivity: string, strengths: string[], weakness: string, primaryContent: string, engagingContent: string[], activeAdsCount: string, campaignsCount: string, platforms: Array<{ platformName: string, campaignObjective: string, contentFormats: string, isTopPurchaseDriver: boolean }>, topCampaignBreakdown: { targetRegions: string, targetAudience: string, estimatedDailyBudget: string, adTypes: string[], captionsAngles: string[] }, estimatedCostPerPurchase: string, estimatedCostPerLead: string, estimatedCostPerMessage: string, estimatedCPM: string, estimatedAOV: string, topWinningProduct: string, productCatalogs: string[], socialPages: string[], storeLinks: string[], seoKeywords: string[], seoBacklinksProfile: string, contentStrategy: string, topHooks: string[], gap: string }>,
            "marketBroad": Array<{ name: string, priceRange: string, adActivity: string }>
          },
          "marketTrends": { "winningHooks": string[], "creativeFormats": string[], "repeatedPatterns": string[], "missingInMarket": string[] },
          "funnelStrategy": {
            "platforms": Array<{
              "platform": string,
              "standaloneMonthlyBudget": string,
              "budgetRationale": string,
              "marketCompetitiveBasis": string,
              "tof": { 
                "strategy": string, 
                "adSetProfiles": Array<{ name: string, detail: string }>,
                "adSetDetails": string, 
                "creativeBreakdown": string[], 
                "contentCopy": string, 
                "adAngles": string[],
                "metaObjective": string,
                "metaBudgetType": string,
                "metaOptimizationGoal": string,
                "metaPlacements": string,
                "metaLocations": string,
                "metaAgeRange": string,
                "metaGender": string,
                "metaExclusions": string,
                "creativeFormat": string,
                "hooks": string[],
                "monthlyAmount": string,
                "budgetPercentWithinPlatform": number,
                "campaignSetup": string,
                "adSetCount": number,
                "adsPerSet": number,
                "rationale": string
              },
              "mof": { 
                "strategy": string, 
                "adSetProfiles": Array<{ name: string, detail: string }>,
                "adSetDetails": string, 
                "creativeBreakdown": string[], 
                "contentCopy": string, 
                "adAngles": string[],
                "metaObjective": string,
                "metaBudgetType": string,
                "metaOptimizationGoal": string,
                "metaPlacements": string,
                "metaLocations": string,
                "metaAgeRange": string,
                "metaGender": string,
                "metaExclusions": string,
                "creativeFormat": string,
                "hooks": string[],
                "monthlyAmount": string,
                "budgetPercentWithinPlatform": number,
                "campaignSetup": string,
                "adSetCount": number,
                "adsPerSet": number,
                "rationale": string
              },
              "bof": { 
                "strategy": string, 
                "adSetProfiles": Array<{ name: string, detail: string }>,
                "adSetDetails": string, 
                "creativeBreakdown": string[], 
                "contentCopy": string, 
                "adAngles": string[],
                "metaObjective": string,
                "metaBudgetType": string,
                "metaOptimizationGoal": string,
                "metaPlacements": string,
                "metaLocations": string,
                "metaAgeRange": string,
                "metaGender": string,
                "metaExclusions": string,
                "creativeFormat": string,
                "hooks": string[],
                "monthlyAmount": string,
                "budgetPercentWithinPlatform": number,
                "campaignSetup": string,
                "adSetCount": number,
                "adsPerSet": number,
                "rationale": string
              }
            }>
          },
          "creativeAndAdvantage": {
            "uniqueAngle": string,
            "contentPillars": string[],
            "brandVoice": string,
            "howToOutperform": string,
            "primaryHooks": string[],
            "visualScripts": string[],
            "recommendedTopics": Array<{ title: string, format: string, targetKeyword: string, goal: string }>
          },
          "executionRoadmap": {
            "problemSolutions": Array<{ problem: string, solution: string }>,
            "targetAudienceDetails": { "description": string },
            "campaignStrategy": { "upcomingTypes": Array<{ type: string, objective: string }> },
            "thirtyDayActionPlan": Array<{ week: string, focus: string, tasks: string[], expectedOutcome: string }>
          }
        }
      `;

      let aiResult = '';
      
      if (aiProvider === 'gemini') {
        aiResult = await analyzeWithGemini(prompt, true);
      } else {
        const response = await fetch('/api/intelligence/advanced-analysis', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || 'anonymous'
          },
          body: JSON.stringify({
            prompt,
            model: aiProvider
          })
        });

        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType || !contentType.includes('application/json')) {
           const errText = await response.text();
           throw new Error(`Server returned ${response.status}: ${errText.slice(0, 100)}`);
        }
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        aiResult = data.result;
      }

      setAnalysisStep('Finalizing tactical funnel blueprint...');
      
      const parsedStrategy = safeParseJSON(aiResult);
      if (!parsedStrategy || typeof parsedStrategy !== 'object') {
        throw new Error(
          isArabic
            ? 'تعذر قراءة استجابة التحليل بصيغة JSON صالحة. يرجى إعادة المحاولة.'
            : 'AI response could not be parsed as a valid strategy object. Please try again.'
        );
      }
      parsedStrategy._analyzedUrl = formattedUrl || sourceMeta.label;
      parsedStrategy._analyzedSource = sourceMeta;
      parsedStrategy._telemetryStats = telemetryStats;
      parsedStrategy._telemetryDetails = telemetryDetails;
      parsedStrategy._liveTelemetrySummary = telemetryContext;
      parsedStrategy._forensicSummary = scrapeData?.forensicSummary || '';
      parsedStrategy._forensicAudit = scrapeData?.forensicAudit || null;
      parsedStrategy._pageContentSample = hasScrapedWebsite ? (scrapeData?.content || '').substring(0, 5000) : '';

      // Ensure siteUiUxAudit & the 6 Outperform-Competitors pillars are populated cleanly
      if (!parsedStrategy.businessAudit) {
        parsedStrategy.businessAudit = {};
      }
      const audit = scrapeData?.forensicAudit;
      if (!parsedStrategy.businessAudit.siteUiUxAudit || typeof parsedStrategy.businessAudit.siteUiUxAudit !== 'object') {
        const typos: string[] = [];
        if (audit?.headings?.h2s?.some((h: string) => h.includes('الوكاله'))) {
          typos.push("خطأ إملائي في عنوان H2: 'الوكاله' بدلاً من 'الوكالة'");
        }
        if (audit?.headings?.h2s?.some((h: string) => h.includes('استراتجية'))) {
          typos.push("خطأ إملائي في عنوان H2: 'استراتجية' بدلاً من 'استراتيجية'");
        }
        if (audit?.navigation?.some((n: any) => n.href?.includes('/test/'))) {
          typos.push("رابط تجريبي ميت في القائمة الرئيسية: /services/test/");
        }
        if (audit?.channels?.emails?.some((e: string) => e.includes('@gmail.com'))) {
          typos.push(`استخدام بريد مجاني (${audit.channels.emails[0]}) يقلل ثقة عملاء B2B والشركات`);
        }

        parsedStrategy.businessAudit.siteUiUxAudit = {
          heroSectionCritique: `تقييم الواجهة والأصل الرقمي لـ ${targetDescriptor}: يحتاج العرض الرئيسي إلى إبراز القيمة التنافسية الفورية مع زر CTA عالي التباين يفتح مسار التأهيل أو التواصل المباشر بدون تمرير إجباري.`,
          ctaAnalysis: audit?.ctas?.length ? `تم رصد ${audit.ctas.length} أزرار CTA (${audit.ctas.slice(0, 2).map((c: any) => c.text).join('، ')})؛ تحسين تباين الأزرار وإزالة القفزات الداخلية يرفع التحويل.` : "غياب زر دعوة لاتخاذ إجراء بارز وعالي التباين فوق الطية (Above the Fold).",
          formAndLeadCaptureFriction: audit?.forms?.length ? `تم رصد ${audit.forms.length} نموذج في الصفحة؛ يُنصح بتقليص الحقول إلى 3 حقول أساسية أو ربطه بفحص فوري عبر واتساب.` : "غياب نموذج تأهيل ذكي سريع من خطوة واحدة أو تحويل فوري لواتساب.",
          spellingAndContentBugs: typos.length ? typos : ["مراجعة التناسق الإملائي للعناوين الفرعية H2/H3 وإزالة أي روابط تجريبية أو نصوص غير مكتملة."],
          mobileAndWhatsAppReadiness: audit?.channels?.whatsappLinks?.length ? `قناة واتساب نشطة (${audit.channels.whatsappLinks[0]})؛ يُوصى بتثبيتها عائماً مع رسالة تأهيل مسبقة.` : "يفضل إضافة زر واتساب عائم ومباشر مع رسالة ترحيب جاهزة لتقليل تسرب زوار الجوال.",
          speedAndTechnicalScore: `تحليل الصور والهيكل: تم رصد ${audit?.technical?.imagesTotal ?? 0} صورة منها ${audit?.technical?.imagesWithoutAlt ?? 0} صورة بدون Alt Tag. البيانات المنظمة Schema: ${audit?.technical?.schemaTypes?.length ? audit.technical.schemaTypes.join(', ') : 'غير مفعلة بالكامل'}.`,
          immediateActionableFixes: [
            "إبراز القيمة التنافسية وشارات الاعتماد فوق الطية (Above the Fold).",
            "تحسين تباين زر CTA الرئيسي وربطه بتأهيل فوري أو واتساب مباشر.",
            "إضافة نصوص Alt لجميع الصور وتفعيل بيانات Schema.org (Organization / FAQPage).",
            "استبدال أي بريد مجاني ببريد رسمي على نفس نطاق الموقع لتعزيز الموثوقية."
          ]
        };
      }

      if (!parsedStrategy.businessAudit.searchAndAiVisibility) {
        const hasSchema = Boolean(audit?.technical?.schemaTypes?.length);
        const hasMeta = Boolean(audit?.meta?.metaDesc);
        parsedStrategy.businessAudit.searchAndAiVisibility = {
          googleRankStatus: hasMeta ? "ظهور جيد على اسم العلامة التجارية لكنه غائب في الصفحة الأولى للكلمات التجارية التنافسية" : "ضعف الظهور في النتائج الأولى على Google بسبب نقص الوصف التعريفي وصفحات الهبوط المتخصصة",
          googleVisibilityScore: hasMeta ? 48 : 32,
          chatgptVisibility: {
            status: hasSchema ? "ظهور جزئي في الإجابات العامة" : "ظهور منخفض (غير مذكور كخيار أول)",
            score: hasSchema ? 42 : 24,
            reason: "نماذج ChatGPT تعتمد على الاستشهادات الخارجية، صفحات الأسئلة الشائعة الموثقة، والكيانات المذكورة في الأدلة الموثوقة."
          },
          geminiVisibility: {
            status: hasMeta ? "قابل للفهرسة لكنه ينافس بصعوبة" : "ظهور محدود في إجابات Gemini و AI Overviews",
            score: hasMeta ? 45 : 28,
            reason: "يربط Gemini بين ترتيب Google Search والبيانات المنظمة Schema.org وتكامل الكيان الرقمي عبر المنصات."
          },
          perplexityVisibility: {
            status: "استشهاد نادر كمصدر مرجعي",
            score: 22,
            reason: "يُفضل Perplexity المقالات التحليلية العميقة، الأرقام المحدثة، وجداول المقارنة القابلة للاقتباس المباشر."
          },
          howToRankInGoogleAndAI: [
            "إنشاء صفحات متخصصة لكل خدمة مع أسئلة شائعة (FAQPage Schema) بصيغة سؤال وجواب مباشر يسهل على ChatGPT وGemini اقتباسه.",
            "نشر أدلة شاملة محدثة بأرقام السوق والرسوم والخطوات ليعتمدها Perplexity كمصدر أول.",
            "بناء إشارات وعلاقات عامة رقمية (Brand Mentions & Backlinks) في المواقع الإخبارية وأدلة الأعمال المتخصصة."
          ]
        };
      }

      if (!parsedStrategy.businessAudit.swotComparison) {
        parsedStrategy.businessAudit.swotComparison = {
          yourStrengths: [
            parsedStrategy?.businessSummary?.brandStrength || "وضوح العرض الأساسي وسرعة التواصل المباشر",
            audit?.channels?.whatsappLinks?.length ? "تفعيل التواصل السريع عبر واتساب لخدمة العملاء" : "إمكانية تحويل الزوار عبر قناة اتصال مباشرة"
          ],
          yourWeaknesses: [
            parsedStrategy?.businessAudit?.conversionFriction || "غياب صفحات هبوط متخصصة للكلمات عالية النية الشرائية",
            "نقص المحتوى المعرفي الموثق (Schema & Guides) اللازم للظهور في Google و ChatGPT"
          ],
          competitorAdvantages: [
            "امتلاك المنافسين لمقالات متصدرة في بحث Google وصفحات مقارنة تجذب الباحثين مجاناً",
            "استمرار النشر التفاعلي عبر الريلز ودراسات الحالة لبناء الثقة المسبقة"
          ],
          howToOutperform: [
            parsedStrategy?.creativeAndAdvantage?.howToOutperform || "إطلاق مغناطيس جذب فوري (فحص أو تقييم مجاني قبل الدفع) مع تغطية شاملة للكلمات المفتاحية الناقصة"
          ]
        };
      }

      if (!parsedStrategy.competitorInsights) {
        parsedStrategy.competitorInsights = {};
      }
      if (!Array.isArray(parsedStrategy.competitorInsights.missingKeywords) || parsedStrategy.competitorInsights.missingKeywords.length === 0) {
        const compName = parsedStrategy?.competitorInsights?.topCompetitorName || "أبرز المنافسين";
        const brandTopic = parsedStrategy?.businessSummary?.productType || "الخدمات الأساسية";
        parsedStrategy.competitorInsights.missingKeywords = [
          {
            keyword: `أفضل ${brandTopic} في السوق المحلي`,
            searchIntent: "نية تجارية ومقارنة (Commercial)",
            monthlyDemand: "مرتفع",
            rankingCompetitor: compName,
            actionTip: "إنشاء صفحة مقارنة شاملة مع جدول مميزات واضح وإبراز الضمانات."
          },
          {
            keyword: `أسعار وتكلفة ${brandTopic}`,
            searchIntent: "نية شرائية مباشرة (Transactional)",
            monthlyDemand: "مرتفع جداً",
            rankingCompetitor: compName,
            actionTip: "إطلاق صفحة تسعير وباقات شفافة تتضمن حاسبة أو فحص مبدئي مجاني."
          },
          {
            keyword: `خطوات وشروط ${brandTopic} 2026`,
            searchIntent: "نية استكشافية تقود للطلب (Informational-to-Lead)",
            monthlyDemand: "متوسط - مرتفع",
            rankingCompetitor: compName,
            actionTip: "نشر دليل عملي محدث مدعوم بأسئلة شائعة FAQ Schema للظهور في Google و AI."
          }
        ];
      }

      if (!parsedStrategy.creativeAndAdvantage) {
        parsedStrategy.creativeAndAdvantage = {};
      }
      if (!Array.isArray(parsedStrategy.creativeAndAdvantage.recommendedTopics) || parsedStrategy.creativeAndAdvantage.recommendedTopics.length === 0) {
        const coreOffer = parsedStrategy?.businessSummary?.productType || "الخدمة الرئيسية";
        parsedStrategy.creativeAndAdvantage.recommendedTopics = [
          {
            title: `الدليل الشامل: كيف تختار وتنفذ ${coreOffer} بدون أخطاء مكلفة؟`,
            format: "مقال SEO طويل + FAQ Schema (لـ Google & ChatGPT)",
            targetKeyword: `شروط وخطوات ${coreOffer}`,
            goal: "تصدر نتائج البحث والاستشهاد به في محركات الذكاء الاصطناعي"
          },
          {
            title: `مقارنة الأسعار والباقات: كيف تحصل على أعلى عائد من ${coreOffer}؟`,
            format: "صفحة هبوط مقارنة + إنفوجرافيك",
            targetKeyword: `تكلفة وأسعار ${coreOffer}`,
            goal: "اصطياد الباحثين أصحاب النية الشرائية الجاهزة وتحويلهم لواتساب"
          },
          {
            title: `3 أخطاء شائعة يقع فيها العملاء وتؤدي إلى خسارة الوقت والميزانية`,
            format: "فيديو قصير Reels / TikTok + منشور تفاعلي",
            targetKeyword: `مشاكل وحلول ${coreOffer}`,
            goal: "مضاعفة التفاعل والوصول العضوي وجذب عملاء مؤهلين"
          }
        ];
      }

      if (!parsedStrategy.executionRoadmap) {
        parsedStrategy.executionRoadmap = {};
      }
      if (!Array.isArray(parsedStrategy.executionRoadmap.thirtyDayActionPlan) || parsedStrategy.executionRoadmap.thirtyDayActionPlan.length === 0) {
        parsedStrategy.executionRoadmap.thirtyDayActionPlan = [
          {
            week: "الأسبوع 1 (الأيام 1-7): إصلاح الموقع وأساسيات الظهور",
            focus: "معالجة أخطاء الـ UI/UX والـ Technical SEO",
            tasks: [
              "إصلاح الأخطاء الإملائية والروابط المعطلة وتحسين سرعة الصفحة الأولى",
              "إضافة بيانات Schema.org (Organization + FAQPage) وتعديل العنوان والوصف التعريفي",
              "تحديث زر الـ CTA الرئيسي وربطه مباشرة بمسار تأهيل فوري أو واتساب"
            ],
            expectedOutcome: "جاهزية الموقع لتحويل الزوار وبدء فهرسة Google و AI بشكل سليم"
          },
          {
            week: "الأسبوع 2 (الأيام 8-14): سد فجوات الكلمات والمحتوى التأسيسي",
            focus: "استهداف الكلمات التي يبحث عنها العملاء وموقعك غائب عنها",
            tasks: [
              "نشر أول صفحتي هبوط/دليلين للكلمات التجارية الأعلى بحثاً",
              "إضافة قسم أسئلة شائعة صريح يجاوب على أسئلة الأسعار والضمانات لالتقاط ChatGPT و Gemini",
              "تصوير ونشر 3 فيديوهات قصيرة بأقوى زوايا المنافسين مع عرض قيمة أقوى"
            ],
            expectedOutcome: "بدء الظهور في الكلمات عالية النية وتكوين أصول محتوى جذابة"
          },
          {
            week: "الأسبوع 3 (الأيام 15-21): تفوق المحتوى والتوزيع متعدد القنوات",
            focus: "تقليد وتطوير أفضل صيغ المحتوى تفاعلاً لدى المنافسين",
            tasks: [
              "نشر دراسة حالة حقيقية بالأرقام أو مقارنة شفافة مع البدائل التقليدية",
              "إطلاق حملات البحث والرسائل المستهدفة للكلمات عالية النية الشرائية",
              "بناء إشارات خارجية للعلامة (Brand Mentions) في أدلة ومنصات موثوقة لرفع ثقة Perplexity و Google"
            ],
            expectedOutcome: "تدفق عملاء محتملين مؤهلين يومياً وارتفاع نسبة التفاعل"
          },
          {
            week: "الأسبوع 4 (الأيام 22-30): التحسين، التوسع، وحصد العملاء",
            focus: "تحليل الأداء ومضاعفة القنوات الأعلى تحويلاً",
            tasks: [
              "مراجعة الكلمات التي حققت أعلى نقرات وظهور في Google Search Console وتقويتها",
              "إطلاق حملة إعادة استهداف (Retargeting) لزوار الموقع الذين لم يكملوا الطلب",
              "قياس تكلفة العميل المحتمل (CPL) وتثبيت خطة النشر الأسبوعية للشهر التالي"
            ],
            expectedOutcome: "تحسن ملحوظ في الظهور العضوي والذكاء الاصطناعي وزيادة عدد العملاء الجدد"
          }
        ];
      }

      setStrategy(parsedStrategy);
      if (parsedStrategy.sharedFunnelContext) {
        setSharedFunnelContext({
          ...parsedStrategy.sharedFunnelContext,
          updatedAt: Date.now()
        });
      }
      setLastAnalyzedAt(Date.now());
      setActiveTab('analysis');
      setAnalysisStep('');
    } catch (err: any) {
      console.error('Error analyzing URL:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit')) {
        setError('AI request limit reached. Please wait a few minutes and try again.');
      } else {
        setError(err.message || 'Failed to analyze business.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateWithBudget = async () => {
    if (!strategy || !customBudget) return;
    
    setUpdatingBudget(true);
    setAnalysisStep('Recalculating funnel dynamics with new budget...');
    
    try {
      const prompt = `
        Act as a HIGH-PRECISION MEDIA BUYER & GROWTH ARCHITECT.
        
        CONTEXT:
        You previously analyzed this business: ${url}
        Existing Analysis Context: ${JSON.stringify({
          businessSummary: strategy.businessSummary,
          competitorInsights: strategy.competitorInsights,
          marketTrends: strategy.marketTrends,
          creativeAndAdvantage: strategy.creativeAndAdvantage,
          funnelStrategy: strategy.funnelStrategy,
          sharedFunnelContext: strategy.sharedFunnelContext
        })}
        
        TASK:
        The client has changed their budget to: ${customBudget}.
        You MUST recalculate and optimize the funnel strategy strictly for this new budget.
        
        INSTRUCTIONS:
        1. Keep the business positioning and competitors the same.
        2. Redistribute the ${customBudget} across the platforms already identified.
        3. Update ALL numeric values (monthlyAmount, adSetCount, adsPerSet, budgetRationale) within the funnelStrategy.
        4. Adjust the "readinessScore", "funnelComplexity" and "recommendedTestingBudget" in sharedFunnelContext if the new budget changes the risk profile.
        
        CRITICAL OVERRIDE - LANGUAGE AND CURRENCY:
        - EVERY SINGLE text field in the JSON MUST be written in ${language}.
        - You may use essential English acronyms where appropriate, but the prose MUST be in ${language}.
        - Use exactly ${currency} for all budget or monetary amounts.
        
        MANDATORY JSON RULES (CRITICAL):
        - Return ONLY valid JSON. No markdown blocks, no conversational filler.
        - JSON SAFETY: NEVER use raw double quotes (") inside a string value. Use single quotes (') instead.
        - Example: "rationale": "This 'strategy' works best." (CORRECT) vs "rationale": "This "strategy" works best." (ERROR)
        - Ensure the JSON is complete and not truncated.
        
        RETURN ONLY THE UPDATED "funnelStrategy" and "sharedFunnelContext" in the following JSON format.
        
        REQUIRED SCHEMA (STRICT):
        {
          "funnelStrategy": {
            "platforms": [{
              "platform": "...",
              "standaloneMonthlyBudget": "...",
              "budgetRationale": "...",
              "marketCompetitiveBasis": "...",
              "tof": {
                "strategy": "...", "adSetProfiles": [{"name": "...", "detail": "..."}], "adSetDetails": "...", "creativeBreakdown": ["..."], "contentCopy": "...", "adAngles": ["..."],
                "metaObjective": "...", "metaBudgetType": "...", "metaOptimizationGoal": "...", "metaPlacements": "...", 
                "metaLocations": "...", "metaAgeRange": "...", "metaGender": "...", "metaExclusions": "...",
                "creativeFormat": "...",
                "hooks": ["..."],
                "monthlyAmount": "...", "budgetPercentWithinPlatform": 0, "campaignSetup": "...", "adSetCount": 0, "adsPerSet": 0, "rationale": "..."
              },
              "mof": {
                "strategy": "...", "adSetProfiles": [{"name": "...", "detail": "..."}], "adSetDetails": "...", "creativeBreakdown": ["..."], "contentCopy": "...", "adAngles": ["..."],
                "metaObjective": "...", "metaBudgetType": "...", "metaOptimizationGoal": "...", "metaPlacements": "...", 
                "metaLocations": "...", "metaAgeRange": "...", "metaGender": "...", "metaExclusions": "...",
                "creativeFormat": "...",
                "hooks": ["..."],
                "monthlyAmount": "...", "budgetPercentWithinPlatform": 0, "campaignSetup": "...", "adSetCount": 0, "adsPerSet": 0, "rationale": "..."
              },
              "bof": {
                "strategy": "...", "adSetProfiles": [{"name": "...", "detail": "..."}], "adSetDetails": "...", "creativeBreakdown": ["..."], "contentCopy": "...", "adAngles": ["..."],
                "metaObjective": "...", "metaBudgetType": "...", "metaOptimizationGoal": "...", "metaPlacements": "...", 
                "metaLocations": "...", "metaAgeRange": "...", "metaGender": "...", "metaExclusions": "...",
                "creativeFormat": "...",
                "hooks": ["..."],
                "monthlyAmount": "...", "budgetPercentWithinPlatform": 0, "campaignSetup": "...", "adSetCount": 0, "adsPerSet": 0, "rationale": "..."
              }
            }]
          },
          "sharedFunnelContext": {
            "funnelScore": 0,
            "readinessScore": 0,
            "funnelComplexity": "...",
            "recommendedTestingBudget": 0,
            "scalingConfidence": "...",
            "acquisitionDifficulty": "...",
            "trustSignalScore": 0,
            "rationale": "..."
          }
        }

        MANDATORY JSON RULES (CRITICAL):
        - Return ONLY valid JSON. No markdown blocks, no conversational filler.
        - JSON SAFETY: NEVER use raw double quotes (") inside a string value. Use single quotes (') instead.
        - Example: "rationale": "This 'strategy' works best." (CORRECT) vs "rationale": "This "strategy" works best." (ERROR)
        - Ensure the JSON is complete and not truncated.
      `;

      let aiResult = '';
      if (aiProvider === 'gemini') {
        aiResult = await analyzeWithGemini(prompt, true);
      } else {
        const response = await fetch('/api/intelligence/advanced-analysis', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || 'anonymous'
          },
          body: JSON.stringify({ prompt, model: aiProvider })
        });
        
        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType || !contentType.includes('application/json')) {
           const errText = await response.text();
           throw new Error(`Server returned ${response.status}: ${errText.slice(0, 100)}`);
        }
        const data = await response.json();
        aiResult = data.result;
      }

      const parsed = safeParseJSON(aiResult);
      if (parsed.funnelStrategy && parsed.sharedFunnelContext) {
        setStrategy({
          ...strategy,
          funnelStrategy: parsed.funnelStrategy,
          sharedFunnelContext: parsed.sharedFunnelContext
        });
        setSharedFunnelContext({
          ...parsed.sharedFunnelContext,
          updatedAt: Date.now()
        });
      }
    } catch (err: any) {
      console.error('Recalculation error:', err);
      setError('Failed to update funnel with new budget.');
    } finally {
      setUpdatingBudget(false);
      setAnalysisStep('');
    }
  };

  const runAiTextPass = async (partPrompt: string): Promise<string> => {
    if (aiProvider === 'gemini') {
      return await analyzeWithGemini(partPrompt, false);
    }
    const response = await fetch('/api/intelligence/advanced-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user?.uid || 'anonymous'
      },
      body: JSON.stringify({
        prompt: partPrompt,
        model: aiProvider || 'gemini'
      })
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok || !contentType || !contentType.includes('application/json')) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText.slice(0, 100)}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result || '';
  };

  const handleGenerateLongTermStrategy = async () => {
    if (!strategy) return;

    setGeneratingRoadmap(true);
    try {
      const isArabic = (language || '').toLowerCase().includes('arab') || language === 'العربية';
      const targetLabel =
        strategy?._analyzedUrl ||
        (sourceType === 'url' ? url?.trim() : strategy?._analyzedSource?.label) ||
        strategy?.businessSummary?.name ||
        'Brand';
      const brandName = strategy?.businessSummary?.name || targetLabel;

      const sharedContext = isArabic
        ? `سياق المشروع وبيانات التحليل الكاملة لموقع (${targetLabel} - ${brandName}):
${strategy?._liveTelemetrySummary ? `- بيانات الأداء الحية من الحساب/المنصة/المتجر المربوط:\n${strategy._liveTelemetrySummary}\n` : ''}- ملخص النشاط: ${JSON.stringify(strategy?.businessSummary || {})}
- الفحص الفني للموقع (DOM & UI/UX): ${strategy?._forensicSummary || JSON.stringify(strategy?.businessAudit?.siteUiUxAudit || {})}
- الظهور في Google وذكاء اصطناعي (ChatGPT / Gemini / Perplexity): ${JSON.stringify(strategy?.businessAudit?.searchAndAiVisibility || {})}
- مصفوفة القوة والضعف المقارنة (SWOT): ${JSON.stringify(strategy?.businessAudit?.swotComparison || {})}
- المشاكل المكتشفة: ${JSON.stringify(strategy?.detectedProblems || [])}
- المنافسون المباشرون والكلمات المفتاحية المفقودة: ${JSON.stringify(strategy?.competitorInsights || {})}
- استراتيجية القمع والميزانية: ${JSON.stringify(strategy?.funnelStrategy || {})}
- تريندات السوق والموضوعات المقترحة: ${JSON.stringify({ marketTrends: strategy?.marketTrends, creativeAndAdvantage: strategy?.creativeAndAdvantage })}`
        : `TARGET BUSINESS INTELLIGENCE CONTEXT (${targetLabel} - ${brandName}):
${strategy?._liveTelemetrySummary ? `- Live Connected Account/Platform/Store Telemetry:\n${strategy._liveTelemetrySummary}\n` : ''}- Business Summary: ${JSON.stringify(strategy?.businessSummary || {})}
- Live DOM & UI/UX Audit: ${strategy?._forensicSummary || JSON.stringify(strategy?.businessAudit?.siteUiUxAudit || {})}
- Search & AI Visibility: ${JSON.stringify(strategy?.businessAudit?.searchAndAiVisibility || {})}
- SWOT Comparison: ${JSON.stringify(strategy?.businessAudit?.swotComparison || {})}
- Competitor Insights & Missing Keywords: ${JSON.stringify(strategy?.competitorInsights || {})}
- Funnel Strategy & Budget: ${JSON.stringify(strategy?.funnelStrategy || {})}
- Market Trends & Topics: ${JSON.stringify({ marketTrends: strategy?.marketTrends, creativeAndAdvantage: strategy?.creativeAndAdvantage })}`;

      // PART 1: Sections 1, 2, 3
      setRoadmapStep(isArabic ? 'جاري بناء الجزء (1/3): تحليل السوق والمنافسين والفانل وأتمتة واتساب...' : 'Building Part (1/3): Market, Funnel & Automation...');
      const part1Prompt = isArabic
        ? `أنت كبير مسؤولي النمو (Chief Growth Officer) ومخطط استراتيجيات تنفيذية.
مهمتك الآن كتابة **الجزء الأول فقط (المحاور 1 و 2 و 3)** من خطة النمو والتسويق التنفيذية الشاملة لمدة 90 يوماً لمنصة **${brandName}** (${url}).

⚠️ قواعد صارمة غير قابلة للتفاوض:
- لا تكتب ملخصات أبداً! اكتب وثيقة تنفيذية عميقة ومفصلة جداً (1,400+ كلمة في هذا الجزء وحده).
- استخدم الجداول والسيناريوهات الرقمية والأمثلة والسكربتات المكتوبة بالكامل كلمة بكلمة.
- استخدم الأرقام القياسية (0, 1, 2, 3...) والعملة (${currency}).

${sharedContext}

اكتب الآن بصيغة Markdown احترافية تبدأ مباشرة بهذا العنوان:

# خطة النمو والتسويق التنفيذية الشاملة لمدة 90 يومًا — ${brandName}

## 1. تحليل السوق والمنافسين المتعددين وملف العميل المثالي (Market, Competitors & ICP Deep-Dive)
- **جدول مقارنة المنافسين الشامل:** جدول Markdown يضم كل منافس مرصود في البيانات مع الأعمدة: (المنافس | العرض الأساسي | AOV والسعر | القنوات الإعلانية | المحتوى الأكثر تفاعلاً | نقاط القوة | نقاط الضعف | تكلفة CPA/CPL التقديرية | كيف نتفوق عليه عملياً).
- **تحليل عميق لكل منافس على حدة:** فقرة تحليلية لكل منافس تشرح زاويته الإعلانية، أسباب تفاعل جمهوره، والثغرة التي سنخترقها.
- **الفجوات السوقية الثلاث الكبرى (Market Strategic Gaps):** شرح تفصيلي لكل فجوة مع آلية تحويلها إلى ميزة تنافسية.
- **ملف العميل المثالي المفصل (ICP + Psychology):**
  - الديموغرافيات والمناطق المستهدفة والقدرة الشرائية.
  - المخاوف والآلام النفسية الخفية قبل الشراء.
  - **مصفوفة الاعتراضات الخمسة الشائعة لدى العميل وكيفية الرد المقنع على كل اعتراض.**
  - عرض القيمة الفريد (UVP) ورسالة التموضع الجديدة.

## 2. معمارية النمو واقتصاديات القمع التسويقي (Growth Architecture & Funnel Economics)
- **نجم الشمال والأهداف الرقمية للـ 90 يوماً:** جدول يوضح خط الأساس (Baseline) مقابل الهدف في اليوم 30 واليوم 60 واليوم 90.
- **ثلاثة سيناريوهات مالية متوقعة للأيام التسعين (جدول المقارنة):** (السيناريو المحافظ / السيناريو الواقعي / السيناريو المتسارع) مع الميزانية الشهرية، عدد الليدز المتوقع، تكلفة الليد CPL، نسبة الإغلاق، تكلفة الاستحواذ CAC، الإيرادات المتوقعة، والعائد ROAS.
- **التفصيل التشغيلي لقمع المبيعات (TOF / MOF / BOF):**
  - **TOF (60%):** الجمهور الدقيق، الأهداف، نوع المحتوى، الميزانية، المؤشرات المستهدفة.
  - **MOF (25%):** آلية إعادة الاستهداف، مغناطيس الجذب، الإثبات الاجتماعي، الميزانية.
  - **BOF (15%):** محفزات الإغلاق السريع، الندرة والضمانات، التسعير والميزانية.

## 3. منظومة جذب العملاء وأتمتة واتساب ومسار المبيعات (Lead Gen Engine, WhatsApp Scripts & CRM)
- **تصميم المغناطيس التسويقي (High-Converting Lead Magnet):** خطوات تجربة العميل من النقر على الإعلان حتى استلام الفحص/التقييم، وما الذي يجب أن يحتويه التقرير المبدئي لتعظيم الثقة.
- **5 سكربتات محادثة واتساب مكتوبة بالكامل كلمة بكلمة (جاهزة للنسخ والربط بـ WhatsApp Business API):**
  1. رسالة الترحيب الفوري خلال 60 ثانية.
  2. تسلسل أسئلة التأهيل السريع (3 أسئلة حاسمة لفرز الجادين).
  3. سكربت معالجة اعتراض "السعر مرتفع" أو "سأفكر لاحقاً".
  4. رسالة المتابعة الذكية بعد 6 ساعات وبعد 48 ساعة.
  5. رسالة الإغلاق بعرض الضمان والندرة ورابط الدفع/الحجز.
- **هيكلة مسار الـ CRM واتفاقية مستوى الخدمة (SLA):** جدول يوضح المراحل الخمس في الـ CRM، الإجراء التلقائي عند كل مرحلة، المسؤول، وزمن الاستجابة الأقصى (< 3 دقائق).`
        : `You are a Chief Growth Officer. Write ONLY **PART 1 (Sections 1, 2, 3)** of an exhaustive, zero-fluff 90-day Growth & Marketing Masterplan for **${brandName}** (${url}).
STRICT RULES: Do NOT summarize. Write 1,400+ words with Markdown tables, unit economics scenarios, exact ICP objection-handling, and 5 word-for-word WhatsApp scripts. Use standard digits and currency ${currency}.

${sharedContext}

Output Markdown starting with:
# 90-Day Executive Growth & Marketing Masterplan — ${brandName}
## 1. Market, Multi-Competitor Matrix & Deep ICP Analysis (Competitor table, gap breakdown, 5 buyer objections & rebuttals, UVP)
## 2. Growth Architecture & Full-Funnel Economics (30/60/90-day numeric targets table, 3 financial scenarios Conservative/Base/Aggressive, detailed TOF/MOF/BOF breakdown)
## 3. Lead Generation Engine, 5 Word-for-Word WhatsApp Automation Scripts & CRM SLA Pipeline (Lead magnet flow, 5 complete scripts including objection handling & follow-ups, 5-stage CRM table with <3 min SLA)`;

      const part1Result = await runAiTextPass(part1Prompt);

      // PART 2: Sections 4, 5
      setRoadmapStep(isArabic ? 'جاري بناء الجزء (2/3): السيو والظهور في Google و AI والسكربتات والإعلانات...' : 'Building Part (2/3): SEO, Google/AI Visibility, Scripts & Paid Ads...');
      const part2Prompt = isArabic
        ? `أنت خبير سيو تقني (Technical SEO)، متخصص ظهور في محركات الذكاء الاصطناعي (GEO)، ومخرج إعلانات وميديا باير محترف.
أنت الآن تكمل **الجزء الثاني فقط (المحور 4 والمحور 5)** من خطة الـ 90 يوماً لمنصة **${brandName}** (${url}).

⚠️ قواعد صارمة:
- لا تكرر مقدمة أو عناوين الجزء الأول! ابدأ فوراً بـ \`## 4.\`.
- لا تختصر أبداً (اكتب 1,500+ كلمة في هذا الجزء وحده).
- أدرج جداول Markdown كاملة، و4 سكربتات فيديو كاملة بالمشاهد والحوار، وهيكلة إعلانات تفصيلية.

${sharedContext}

اكتب الآن باللغة العربية الفصحى:

## 4. تطوير الموقع، السيو، الظهور في Google و ChatGPT و Gemini و Perplexity، وتحسين التحويل (Technical SEO, GEO & CRO)
- **الفحص الفني وإصلاح مشاكل الموقع الحية (Live DOM Action List):** قائمة مرقمة ومحددة بكل مشكلة تم رصدها في الموقع مع التعديل المقترح حرفياً (العنوان الحالي مقابل العنوان المحسن، أزرار CTA، النماذج، البريد الرسمي، alt للصور، Core Web Vitals).
- **خطة التصدر في Google ومحركات الذكاء الاصطناعي (GEO Playbook for ChatGPT, Gemini & Perplexity):**
  - كيف يقرأ كل محرك (Google AI Overviews, ChatGPT, Perplexity) الموقع الآن ولماذا يقتبس المنافسين.
  - بنية البيانات المنظمة المطلوبة (\`Organization\`, \`FAQPage\`, \`Service/Product\`) ومواصفات الصفحات القابلة للاقتباس.
- **مصفوفة الكلمات المفتاحية الشاملة (12 إلى 15 كلمة مفتاحية مستهدفة في جدول Markdown):**
  الأعمدة: (الكلمة المفتاحية | نية البحث | حجم البحث التقديري | المنافس المتصدر حالياً | رابط الصفحة المستهدفة | عنوان SEO مقترح Title | وصف ميتا Meta Description | صيغة المحتوى المطلوبة).
- **خطة بناء الروابط الخلفية والسمعة الرقمية (Off-Page SEO & Authority Citations):** 5 مصادر عملية ومحددة في السوق المحلي لكسب الباكلينكس وإشارات العلامة.
- **مصفوفة اختبارات تحسين معدل التحويل (4 اختبارات A/B كاملة في جدول):** (العنصر المختبر | الفرضية | النسخة A الحالية | النسخة B المقترحة | مؤشر النجاح ونسبة التحسن المتوقعة).

## 5. استراتيجية المحتوى، خطة النشر الأسبوعية، سكربتات الفيديو، وهيكلية الحملات المدفوعة (Content & Paid Media Blueprint)
- **ركائز المحتوى وجدول النشر الأسبوعي المتكامل (Weekly Content Matrix):** جدول يوضح الأيام السبعة، المنصة، الصيغة، الركيزة، وهدف كل منشور.
- **4 سكربتات إعلانات فيديو مرئية كاملة (Full UGC & Authority Video Scripts):**
  لكل سكربت اكتب بالتفصيل: (الجمهور المستهدف، المدة، الخطاف البصري والصوتي في أول 0-3 ثوان، المشاهد مقسمة بالثواني مع التوجيه البصري Visual + النص المنطوق بالكامل باللهجة المحلية القريبة + CTA النهائي).
- **الهيكلة التشغيلية التفصيلية للحملات المدفوعة:**
  - **Meta Ads:** تقسيم الحملات (TOF Prospecting / MOF Engagement / BOF Retargeting)، عدد الـ Ad Sets، تفاصيل الاستهداف والاستبعادات (Exclusions)، ونوع الميزانية (ABO/CBO).
  - **Google Search Ads:** مجموعات الإعلانات (Ad Groups)، كلمات Exact Match و Phrase Match، وقائمة **10 كلمات سلبية (Negative Keywords)** لمنع هدر الميزانية.
  - **TikTok / LinkedIn (حسب ملاءمة النشاط):** إعدادات الاستهداف والمحتوى المتوافق مع الخوارزمية.`
        : `Write ONLY **PART 2 (Sections 4 and 5)** of the 90-day Growth & Marketing Masterplan for **${brandName}** (${url}).
STRICT RULES: Start directly with \`## 4.\`. Do NOT summarize. Write 1,500+ words including:
## 4. Website Audit Fixes, Technical SEO, Google & AI Visibility (GEO for ChatGPT/Gemini/Perplexity), 12-15 Keyword Markdown Matrix, Backlinks & 4 A/B CRO Tests Table.
## 5. Weekly Content Calendar Matrix, 4 Complete Scene-by-Scene UGC Video Scripts (0-3s hook, visual cues, full spoken dialogue, CTA), and Exact Paid Ads Architecture (Meta Ads sets/exclusions, Google Search exact/phrase + 10 negative keywords, TikTok/LinkedIn).

${sharedContext}`;

      const part2Result = await runAiTextPass(part2Prompt);

      // PART 3: Sections 6, 7
      setRoadmapStep(isArabic ? 'جاري بناء الجزء (3/3): مؤشرات الأداء وخطة الـ 12 أسبوعاً بالتفصيل...' : 'Building Part (3/3): KPIs & 12-Week Execution Roadmap...');
      const part3Prompt = isArabic
        ? `أنت مدير العمليات والنمو (VP of Growth & Operations).
أنت الآن تكمل **الجزء الثالث والأخير فقط (المحور 6 والمحور 7)** من خطة الـ 90 يوماً لمنصة **${brandName}** (${url}).

⚠️ قواعد صارمة:
- لا تكرر أجزاء سابقة! ابدأ فوراً بـ \`## 6.\`.
- ممنوع اختصار الأسابيع أو دمجها! يجب كتابة **جميع الأسابيع الاثني عشر (الأسبوع 1 إلى الأسبوع 12) واحداً تلو الآخر بالكامل** مع توزيع المهام على الأدوار الخمسة ومخرج واضح وKPI لكل أسبوع.
- استخدم الأرقام القياسية (0, 1, 2, 3...) والعملة (${currency}).

${sharedContext}

اكتب الآن:

## 6. لوحة مؤشرات الأداء وبروتوكولات اتخاذ القرار (Master KPI Dashboard & Optimization Rules)
- **جدول تطور مؤشرات الأداء خلال 90 يوماً:** جدول يقارن الأهداف الرقمية في (الشهر 1 / الشهر 2 / الشهر 3) لمؤشرات: CPL، تكلفة المحادثة، نسبة تأهيل الليدز SQL%، نسبة الإغلاق Close Rate، الـ CAC، العائد ROAS، الترافيك العضوي، وظهور العلامة في الذكاء الاصطناعي.
- **بروتوكولات وقواعد القرار اليومية والأسبوعية والشهرية (If/Then Playbook):**
  - متى نضاعف الميزانية (+20% كل 48 ساعة)؟
  - متى نوقف الإعلان فوراً (Kill Criteria)؟
  - متى نغير صفحة الهبوط أو نعدل العرض؟
  - قائمة الفحص اليومية والأسبوعية والشهرية لفريق التشغيل.

## 7. خطة العمل التنفيذية التفصيلية لمدة 90 يوماً — أسبوعاً بأسبوع (12-Week Operational Roadmap)

### 🗓️ الشهر الأول (الأيام 1–30): التأسيس، إصلاح الموقع، وإطلاق الاختبارات
- **الأسبوع 1 (أيام 1-7) — التأسيس التقني والتتبع:** اذكر المهام الدقيقة لـ (مدير النمو | الميديا باير | خبير SEO/CRO | صانع المحتوى | مسؤول المبيعات والـ CRM) + **المخرج النهائي للأسبوع** + **بوابة النجاح (KPI Gate)**.
- **الأسبوع 2 (أيام 8-14) — تجهيز الأصول والمحتوى وإطلاق الاختبار:** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 3 (أيام 15-21) — تفعيل السيو والفحص المبدئي وتحسين الاستجابة:** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 4 (أيام 22-30) — تصفية الزوايا الخاسرة وتقييم الشهر الأول:** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.

### 🗓️ الشهر الثاني (الأيام 31–60): تسريع التحويل، مضاعفة الزوايا الرابحة، والتوسع
- **الأسبوع 5 (أيام 31-37):** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 6 (أيام 38-44):** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 7 (أيام 45-51):** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 8 (أيام 52-60):** المهام الدقيقة للأدوار الخمسة + مراجعة منتصف الخطة + KPI Gate.

### 🗓️ الشهر الثالث (الأيام 61–90): السيطرة السوقية، الإحالات، واستدامة الأصول
- **الأسبوع 9 (أيام 61-67):** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 10 (أيام 68-74):** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 11 (أيام 75-81):** المهام الدقيقة للأدوار الخمسة + المخرج النهائي + KPI Gate.
- **الأسبوع 12 (أيام 82-90):** التقييم الختامي للربع، خطة الربع التالي، وتسليم لوحة القيادة المستقرة + KPI Gate.`
        : `Write ONLY **PART 3 (Sections 6 and 7)** of the 90-day Growth & Marketing Masterplan for **${brandName}** (${url}).
STRICT RULES: Start directly with \`## 6.\`. Do NOT merge or skip weeks! Write ALL 12 weeks individually (Week 1 through Week 12), detailing specific tasks per role (Growth Lead, Media Buyer, SEO/CRO, Content/Copy, Sales/CRM), exact Deliverables, and weekly KPI Gates.

${sharedContext}

## 6. Master KPI Dashboard & Decision Rules (Month 1/2/3 KPI table + If/Then scale/kill optimization playbook)
## 7. Full 12-Week Operational Roadmap (Weeks 1-4 Foundation, Weeks 5-8 Scaling & Optimization, Weeks 9-12 Dominance & Retention — every single week broken down by all 5 roles with Deliverables and KPI Gates).`;

      const part3Result = await runAiTextPass(part3Prompt);

      const combinedPlan = [part1Result.trim(), part2Result.trim(), part3Result.trim()]
        .filter(Boolean)
        .join('\n\n---\n\n');

      if (combinedPlan) {
        setLongTermStrategy(combinedPlan);
      }
    } catch (err: any) {
      console.error('Error generating long term strategy:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit')) {
        setLongTermStrategy(`**Error:** AI request limit reached. Please try again later.`);
      } else {
        setLongTermStrategy(`**Error:** ${err.message || 'Failed to generate strategy.'}`);
      }
    } finally {
      setGeneratingRoadmap(false);
      setRoadmapStep('');
    }
  };

  const handleGenerateContent = async () => {
    if (!strategy) return;
    
    setGeneratingContent(true);
    try {
      const activeTargetLabel =
        strategy?._analyzedUrl ||
        (sourceType === 'url' ? url?.trim() : strategy?._analyzedSource?.label) ||
        strategy?.businessSummary?.name ||
        'Target Business';

      const prompt = `
        Act as a WORLD-CLASS DIRECT-RESPONSE COPYWRITER and CONTENT ARCHITECT.
        
        GOAL: Generate a high-conversion ad copy suite for the business: ${activeTargetLabel} (${strategy?.businessSummary?.name || ''}).
        
        CRITICAL CONTENT STRUCTURE:
        - For EACH funnel phase (TOF, MOF, BOF), you MUST generate exactly 3 AD SETS.
        - AD SET 1: Core Target Audience (Demographics, locations, and interests strictly matching this business's market and country).
        - AD SET 2: Competitor & Niche Stack (Lookalikes / Competitor Interest targeting for this specific industry).
        - AD SET 3: Broad Audience (Open targeting within the target country for algorithm optimization).
        - Each Ad Set MUST contain at least 3 unique AD VARIATIONS, each with a distinct "angle" (e.g., FOMO, Benefit-driven, Social Proof).
        
        CONTEXT:
        ${strategy?._liveTelemetrySummary ? `- Verified Connected Account, Campaigns & Creatives Telemetry:\n${strategy._liveTelemetrySummary}\n` : ''}
        - Business Profile: ${JSON.stringify(strategy.businessSummary || {})}
        - Competitor Intelligence (BENCHMARK): ${JSON.stringify(strategy.competitorInsights?.tier1 || [])}
        - Market Trends: ${JSON.stringify(strategy.marketTrends || {})}
        - Funnel Strategy: ${JSON.stringify(strategy.funnelStrategy || {})}
        - Creative Philosophy: ${strategy.creativeAndAdvantage?.uniqueAngle || strategy.executiveSummary?.scaleOpportunity || 'Direct Response Value Proposition'}
        - Brand Voice: ${strategy.creativeAndAdvantage?.brandVoice || strategy.businessAudit?.brandVoice || 'Authoritative and Data-Driven'}
        
        CRITICAL COPYWRITING INSTRUCTIONS:
        1. HUMAN-FIRST WRITING: Avoid generic AI phrases. Use punchy, persuasive native ${language}.
        2. REAL CREATIVE EVOLUTION: Reference and improve upon the actual ads & messaging angles seen in the account's historical campaigns above, plus counter competitor "Top Hooks" and "Gaps" for ${activeTargetLabel}.
        3. DIVERSE PSYCHOLOGICAL ANGLES: For every Ad Set, vary the "angle" used in its ads (Urgency/FOMO, Emotional/Pain Point, Social Proof/Authority, Benefits-Driven, Pattern Interrupt).
        4. STRUCTURE: 
           - For each platform in the funnel, generate content for ALL 3 phases (TOF, MOF, BOF).
           - TOF: Focus on Problem Awareness & Curiosity.
           - MOF: Focus on Comparison, Trust, and Education.
           - BOF: Focus on Hard Offers, Urgency, and Objection Handling.
        
        REQUIRED SCHEMA (STRICT JSON):
        {
          "platforms": [
            {
              "platform": "string (e.g., Meta Ads)",
              "phases": [
                {
                  "name": "string (e.g., Top of Funnel)",
                  "adSets": [
                    {
                      "targetingProfile": "string (e.g., Core Decision Makers / Competitor Lookalike)",
                      "targetingDetails": {
                        "demographics": "string (Target age and gender relevant to the business)",
                        "locations": "string (Specific target cities or country)",
                        "interests": "string[] (Specific industry interests)",
                        "strategy": "string (Detailed Interests vs Broad Testing)"
                      },
                      "ads": [
                        {
                          "headline": "string (High-Impact)",
                          "primaryText": "string (Persuasive copy)",
                          "cta": "string (Action-Oriented)",
                          "angle": "string (FOMO, Emotional, Social Proof, etc.)"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
        
        MANDATORY JSON RULES (CRITICAL):
        - Return ONLY valid JSON.
        - JSON SAFETY: NEVER use raw double quotes (") inside a string value. Use single quotes (') instead.
        - Prose must be entirely in professional ${language}.
      `;

      let aiResult = '';
      if (aiProvider === 'gemini') {
        aiResult = await analyzeWithGemini(prompt, true);
      } else {
        const response = await fetch('/api/intelligence/advanced-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.uid || 'anonymous' },
          body: JSON.stringify({ prompt, model: aiProvider || 'gemini' })
        });
        
        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType || !contentType.includes('application/json')) {
           const errText = await response.text();
           throw new Error(`Server returned ${response.status}: ${errText.slice(0, 100)}`);
        }
        const data = await response.json();
        aiResult = data.result;
      }

      const parsed = safeParseJSON(aiResult);
      setContentAnalysis(parsed);
    } catch (err: any) {
      console.error('Error generating content:', err);
      setError('Failed to generate full ad content suite.');
    } finally {
      setGeneratingContent(false);
    }
  };

  const renderTabButton = (id: TabType, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300 border-b-2 whitespace-nowrap",
        activeTab === id 
          ? "border-blue-500 text-blue-400 bg-blue-500/5" 
          : "border-transparent text-muted-foreground hover:text-muted-foreground hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0F19] border border-white/10 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-indigo-600/5 blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight mb-6 leading-[1.1]">
              Pre-Funnel & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Competitor Intel</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed font-medium">
              The ultimate strategist's tool. Paste any URL to reverse-engineer their business model, detect market gaps, and generate a battle-tested funnel strategy.
            </p>
          </div>
          
          <div className="w-full lg:w-[460px]">
            <div className="glass-panel p-3 rounded-2xl flex flex-col gap-3 shadow-2xl border-white/20 bg-white/5 backdrop-blur-2xl">
              {/* Target Source Switcher: Website URL vs Connected Account vs Platform vs Store */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#0B0F19] border border-white/10 rounded-xl">
                {[
                  { id: 'url', label: 'Website URL', icon: Globe },
                  { id: 'account', label: 'Ad Account', icon: Target },
                  { id: 'platform', label: 'Platform', icon: Layers },
                  { id: 'store', label: 'Store', icon: Store },
                ].map(item => {
                  const Icon = item.icon;
                  const active = sourceType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSourceType(item.id as AnalysisSourceType)}
                      className={cn(
                        'py-2 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1 transition-all',
                        active
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic selector when analyzing a connected Ad Account / Platform / Store */}
              {sourceType === 'account' && (
                <div className="space-y-1.5">
                  <select
                    value={targetAccountId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTargetAccountId(id);
                      const found = allConnectedAccounts.find(a => a.id === id);
                      if (found?.platform) setTargetPlatform(found.platform);
                    }}
                    className="w-full px-3 py-3 bg-[#0B0F19] border border-blue-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white text-xs font-bold"
                  >
                    {allConnectedAccounts.length === 0 ? (
                      <option value="">No Ad Accounts linked yet — click Link below</option>
                    ) : (
                      allConnectedAccounts.map((acc: any) => (
                        <option key={`${acc.platform}_${acc.id}`} value={acc.id}>
                          [{String(acc.platform || 'ad').toUpperCase()}] {acc.name} ({acc.account_id || acc.id})
                        </option>
                      ))
                    )}
                  </select>
                  {allConnectedAccounts.length === 0 && (
                    <button
                      type="button"
                      onClick={() => navigate('/connections')}
                      className="w-full py-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-[11px] font-bold flex items-center justify-center gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Connect Ad Accounts in Connections Hub
                    </button>
                  )}
                </div>
              )}

              {sourceType === 'platform' && (
                <select
                  value={targetPlatform}
                  onChange={(e) => setTargetPlatform(e.target.value as SupportedPlatform)}
                  className="w-full px-3 py-3 bg-[#0B0F19] border border-indigo-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white text-xs font-bold"
                >
                  {(['meta', 'google', 'tiktok', 'snapchat'] as SupportedPlatform[]).map(plat => (
                    <option key={plat} value={plat}>
                      {plat.toUpperCase()} Ads {connectedPlatformsStatus[plat] ? '— Connected & Monitored' : '— Sandbox / Connect in Hub'}
                    </option>
                  ))}
                </select>
              )}

              {sourceType === 'store' && (
                <div className="space-y-1.5">
                  <select
                    value={targetStoreId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTargetStoreId(id);
                      const st = connectedStores.find(s => s.id === id);
                      if (st?.storeUrl) setUrl(st.storeUrl);
                      if (st?.currency) setCurrency(st.currency);
                    }}
                    className="w-full px-3 py-3 bg-[#0B0F19] border border-emerald-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white text-xs font-bold"
                  >
                    {connectedStores.length === 0 ? (
                      <option value="">No Stores linked yet — click Add Store below</option>
                    ) : (
                      connectedStores.map(st => (
                        <option key={st.id} value={st.id}>
                          [{st.platform.toUpperCase()}] {st.name} — {st.storeUrl}
                        </option>
                      ))
                    )}
                  </select>
                  {connectedStores.length === 0 && (
                    <button
                      type="button"
                      onClick={() => navigate('/connections')}
                      className="w-full py-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5"
                    >
                      <Store className="w-3.5 h-3.5" />
                      Connect Salla / Zid / Shopify Store
                    </button>
                  )}
                </div>
              )}

              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={
                    sourceType === 'url'
                      ? 'Paste Website or Social URL...'
                      : sourceType === 'store'
                      ? 'Store URL (auto-filled from Store)...'
                      : 'Optional: Brand Website or Facebook Page URL (auto-detected if empty)...'
                  }
                  value={sourceType === 'account' || sourceType === 'platform' ? targetPageUrl : url}
                  onChange={(e) =>
                    sourceType === 'account' || sourceType === 'platform'
                      ? setTargetPageUrl(e.target.value)
                      : setUrl(e.target.value)
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="w-full pl-12 pr-4 py-4 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-all font-medium text-xs sm:text-sm"
                />
              </div>
              <div className="flex gap-3">
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-1/2 px-3 py-3 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white text-sm"
                >
                  <option value="Arabic">Arabic</option>
                  <option value="English">English</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Spanish">Spanish</option>
                </select>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-1/2 px-3 py-3 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white text-sm"
                >
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="EGP (ج.م)">EGP (ج.م)</option>
                  <option value="SAR (ر.س)">SAR (ر.س)</option>
                  <option value="AED (د.إ)">AED (د.إ)</option>
                  <option value="GBP (£)">GBP (£)</option>
                  <option value="AUD ($)">AUD ($)</option>
                  <option value="CAD ($)">CAD ($)</option>
                </select>
              </div>
              
              <div className="relative">
                <Users className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                <textarea
                  placeholder="Optional: List specific competitors you want to enforce (names or links)..."
                  value={customCompetitors}
                  onChange={(e) => setCustomCompetitors(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-all font-medium min-h-[60px] text-xs resize-y"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || !canRunAnalyze}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                {loading ? (
                  <>
                    <Zap className="w-5 h-5 animate-pulse text-yellow-400" />
                    <span className="animate-pulse">{analysisStep || 'Analyzing Market Ecosystem...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Analyze & Build Strategy
                  </>
                )}
              </button>
              {lastAnalyzedAt && !loading && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Live Scan: {new Date(lastAnalyzedAt).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Deep Force Re-Analyze
                  </button>
                </div>
              )}
              <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">
                Analyzes Connected Accounts, Stores, Meta, TikTok & Market Trends
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Analysis Failed</h3>
              <p className="text-sm opacity-80">
                {error}
                <span className="block text-[10px] mt-1 opacity-60">If this persists, please refresh your browser.</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {strategy ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
          {/* Persistent Fixed Button for 90-Day Growth & Marketing Plan */}
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <button
              onClick={() => {
                setActiveTab('roadmap');
                handleGenerateLongTermStrategy();
              }}
              disabled={generatingRoadmap}
              className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.5)] border border-white/25 flex items-center gap-3 transition-all cursor-pointer disabled:opacity-50 text-sm md:text-base"
            >
              <Rocket className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span dir="rtl">{generatingRoadmap ? (roadmapStep || 'جاري إعداد خطة النمو والتسويق (90 يوماً)...') : '🚀 إعداد خطة النمو والتسويق التنفيذية (90 يوماً)'}</span>
            </button>
          </div>
          {strategy?._analyzedSource && strategy._analyzedSource.type !== 'url' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 text-blue-200 font-bold">
                <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Connected Telemetry Included: <strong className="text-white">{strategy._analyzedSource.label}</strong>
                </span>
                {strategy._telemetryStats && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black">
                    <span className="px-2 py-0.5 rounded-md bg-[#0B0F19] border border-white/10 text-emerald-300">
                      Spend: {Number(strategy._telemetryStats.spend || 0).toLocaleString()} {strategy._telemetryStats.currency || ''}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0B0F19] border border-white/10 text-blue-300">
                      Impr: {Number(strategy._telemetryStats.impressions || 0).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0B0F19] border border-white/10 text-indigo-300">
                      Campaigns: {strategy._telemetryStats.campaignsCount ?? 0} • Ads: {strategy._telemetryStats.adsCount ?? 0}
                    </span>
                    {strategy._telemetryStats.pageName && (
                      <span className="px-2 py-0.5 rounded-md bg-[#0B0F19] border border-white/10 text-amber-300">
                        Page: {strategy._telemetryStats.pageName}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/connections')}
                className="text-[11px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-wider shrink-0 self-start sm:self-center"
              >
                Manage Connections
              </button>
            </div>
          )}

          {/* Navigation Phases */}
          <div className="flex overflow-x-auto border-b border-white/5 no-scrollbar sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md z-30 justify-center">
            {renderTabButton('audit', 'Forensic Audit', <Search className="w-4 h-4" />)}
            {renderTabButton('analysis', 'Business Scan', <Shield className="w-4 h-4" />)}
            {renderTabButton('competitors', 'Competitor Intel', <Target className="w-4 h-4" />)}
            {renderTabButton('trends', 'Market Trends', <TrendingUp className="w-4 h-4" />)}
            {renderTabButton('funnel', 'Funnel Strategy', <Layout className="w-4 h-4" />)}
            {renderTabButton('creative', 'Creative & Advantage', <Zap className="w-4 h-4" />)}
            {renderTabButton('roadmap', 'Execution Roadmap', <Rocket className="w-4 h-4" />)}
            {renderTabButton('content', 'Content Architect', <PenTool className="w-4 h-4" />)}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'audit' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* 1. Core Architecture */}
                <div className="p-8 md:p-10 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                    <Search className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 space-y-8">
                    <div dir="auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-3">
                        <Shield className="w-3.5 h-3.5" />
                        Forensic Architecture
                      </div>
                      <h3 className="text-3xl font-black text-white tracking-tight mb-2">Forensic Business & Growth Model</h3>
                      <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
                        Deep structural audit of brand positioning, conversion mechanics, and market viability.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-left">Business Model Identification</p>
                        <p className="text-foreground font-bold leading-relaxed">{strategy?.businessAudit?.model}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-left">Brand Voice & Persona</p>
                        <p className="text-gray-200 font-bold leading-relaxed">{strategy?.businessAudit?.brandVoice}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-left">Target Avatar Profile</p>
                        <p className="text-gray-200 font-bold leading-relaxed">{strategy?.businessAudit?.targetAvatarSummary}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-left">Major Conversion Friction</p>
                        <p className="text-gray-200 font-bold leading-relaxed">{strategy?.businessAudit?.conversionFriction}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Live Website DOM OR Connected Account Campaigns & Creatives Audit */}
                {strategy?._forensicAudit ? (
                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] border-blue-500/20 bg-blue-500/5 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-3">
                        <Code2 className="w-3.5 h-3.5" />
                        Live DOM & Tech Crawler
                      </div>
                      <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
                        فحص الكود والـ DOM الحي للموقع
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm mt-1">
                        استخراج عناصر الصفحة الحقيقية، العناوين، أزرار الـ CTA، وقنوات التواصل المباشرة
                      </p>
                    </div>
                    {strategy?._analyzedUrl && (
                      <a 
                        href={strategy._analyzedUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-2 transition-colors shrink-0 self-start sm:self-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        {strategy._analyzedUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">عناوين H1 / H2</span>
                      <div className="text-2xl font-black text-blue-400">
                        {(strategy._forensicAudit?.headings?.h1s?.length || 0)} H1 / {(strategy._forensicAudit?.headings?.h2s?.length || 0)} H2
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">أزرار الـ CTA المرصودة</span>
                      <div className="text-2xl font-black text-emerald-400">
                        {strategy._forensicAudit?.ctas?.length || 0} أزرار تفاعلية
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">قناة واتساب مباشرة</span>
                      <div className="text-lg font-black text-teal-400 truncate">
                        {strategy._forensicAudit?.channels?.whatsappLinks?.[0]
                          ? strategy._forensicAudit.channels.whatsappLinks[0].replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)/i, '+')
                          : (strategy._forensicAudit?.channels?.phoneLinks?.[0] || 'غير مرصود')}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">صور بدون وسم ALT</span>
                      <div className="text-2xl font-black text-yellow-400">
                        {(strategy._forensicAudit?.technical?.imagesWithoutAlt ?? strategy._forensicAudit?.imagesWithoutAlt ?? 0)} من {(strategy._forensicAudit?.technical?.imagesTotal ?? strategy._forensicAudit?.imagesTotal ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Crawled Headings & Detected Live Typo Alerts */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                      الهيكلية الحقيقية للعناوين (Headings Hierarchy & Live Typos)
                    </h4>
                    <div className="p-6 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-4 text-right" dir="rtl">
                      {strategy._forensicAudit?.headings?.h1s?.map((h1: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <span className="px-2 py-0.5 rounded bg-blue-500 text-white font-black text-[10px]">H1</span>
                          <span className="font-bold text-white text-base">{h1}</span>
                        </div>
                      ))}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {(strategy._forensicAudit?.headings?.h2s || []).map((h2: string, idx: number) => {
                          const hasTypo = h2.includes('الوكاله') || h2.includes('استراتجية');
                          return (
                            <div 
                              key={idx} 
                              className={cn(
                                "flex items-start gap-2.5 p-3 rounded-xl border text-sm font-medium",
                                hasTypo ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-white/5 border-white/10 text-gray-300"
                              )}
                            >
                              <span className={cn(
                                "px-1.5 py-0.5 rounded font-black text-[9px] shrink-0 mt-0.5",
                                hasTypo ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"
                              )}>
                                H2 {hasTypo && '⚠️ خطأ إملائي'}
                              </span>
                              <div className="flex-1">
                                <span className={hasTypo ? "font-bold text-red-300" : ""}>{h2}</span>
                                {hasTypo && (
                                  <span className="block text-[11px] text-red-400 mt-1">
                                    {h2.includes('الوكاله') ? "← الصحيح: 'الوكالة' بالتاء المربوطة" : "← الصحيح: 'استراتيجية' بحرف الياء"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Crawled CTAs & Buttons */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                      أزرار الدعوة لاتخاذ إجراء المستخرجة (Live CTAs & Conversion Friction)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                      {(strategy._forensicAudit?.ctas || []).slice(0, 6).map((cta: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                              زر CTA #{idx + 1}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              class: {cta.className || 'btn'}
                            </span>
                          </div>
                          <div className="text-white font-bold text-base flex items-center gap-2">
                            <MousePointerClick className="w-4 h-4 text-emerald-400" />
                            "{cta.text}"
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1.5 font-mono">
                            <span className="text-gray-500">الرابط المستهدف:</span>
                            <span className={cta.href?.startsWith('#') ? 'text-amber-400' : 'text-blue-400'}>{cta.href}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Channels & Accreditations */}
                  <div className="p-6 rounded-2xl bg-[#0B0F19] border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 text-right" dir="rtl">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">قنوات التواصل والبريد</span>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>📱 واتساب / هاتف: <code className="text-teal-400">{strategy._forensicAudit?.channels?.whatsappLinks?.[0] || strategy._forensicAudit?.channels?.phoneLinks?.[0] || 'غير مرصود في الكود'}</code></div>
                        <div>✉️ البريد المستخرج: <code className="text-blue-300 font-bold">{strategy._forensicAudit?.channels?.emails?.[0] || 'غير ظاهر في الصفحة الرئيسية'}</code></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">شارات الثقة والاعتماد المرصودة</span>
                      <div className="text-xs text-emerald-400 font-bold">
                        {strategy._forensicAudit?.trustBadges?.length
                          ? `🛡️ ${strategy._forensicAudit.trustBadges[0]}`
                          : '🛡️ يُوصى بإبراز الاعتمادات والشهادات وضمان الخدمة في ترويسة الصفحة'}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        إبراز شارات الموثوقية فوق الطية (Above the Fold) يقلل تردد الزوار ويرفع معدل التحويل.
                      </p>
                    </div>
                  </div>
                </div>
                ) : strategy?._telemetryDetails ? (
                  <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] border-blue-500/20 bg-blue-500/5 space-y-8" dir="rtl">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-3">
                        <Activity className="w-3.5 h-3.5" />
                        Live Connected Account Campaigns & Creatives Audit
                      </div>
                      <h3 className="text-2xl font-black text-white">
                        الحملات والكرياتفز الفعلية المقروءة من الحساب الإعلاني
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm mt-1">
                        تم فحص هذه الحملات والإعلانات مباشرة من حسابك واستخدامها كأساس للتشخيص وبناء الخطة
                      </p>
                    </div>

                    {Array.isArray(strategy._telemetryDetails.campaigns) && strategy._telemetryDetails.campaigns.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                          الحملات ({strategy._telemetryDetails.campaigns.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {strategy._telemetryDetails.campaigns.slice(0, 8).map((c: any) => (
                            <div key={c.id} className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white text-sm truncate">{c.name}</span>
                                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-black shrink-0">{c.status}</span>
                              </div>
                              <div className="text-[11px] text-gray-400 flex flex-wrap gap-3">
                                <span>الهدف: {c.objective}</span>
                                <span>الإنفاق: <strong className="text-emerald-300">{Number(c.spend || 0).toFixed(2)} {strategy?._telemetryStats?.currency || ''}</strong></span>
                                <span>CTR: {Number(c.ctr || 0).toFixed(2)}%</span>
                                <span>النتائج: {c.conversions || 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Array.isArray(strategy._telemetryDetails.ads) && strategy._telemetryDetails.ads.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                          نصوص الإعلانات والكرياتفز ({strategy._telemetryDetails.ads.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {strategy._telemetryDetails.ads.slice(0, 8).map((ad: any) => (
                            <div key={ad.id} className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white text-xs truncate">{ad.name}</span>
                                <span className="text-[10px] text-emerald-300 font-bold shrink-0">
                                  {Number(ad.spend || 0).toFixed(2)} {strategy?._telemetryStats?.currency || ''}
                                </span>
                              </div>
                              {ad.headline && (
                                <div className="text-xs font-bold text-indigo-300">العنوان: {ad.headline}</div>
                              )}
                              {ad.body && (
                                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{ad.body}</p>
                              )}
                              <div className="text-[10px] text-gray-500 flex flex-wrap gap-3">
                                <span>CTR: {Number(ad.ctr || 0).toFixed(2)}%</span>
                                <span>النقرات: {ad.clicks || 0}</span>
                                <span>النتائج: {ad.conversions || 0}</span>
                                {ad.cta && <span>CTA: {ad.cta}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* 3. Deep UI/UX & CRO Audit Breakdown */}
                {strategy?.businessAudit?.siteUiUxAudit && (
                  <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] border-purple-500/20 bg-purple-500/5 space-y-8">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-3">
                        <Sparkles className="w-3.5 h-3.5" />
                        UI/UX & CRO Report
                      </div>
                      <h3 className="text-2xl font-black text-white">
                        تقرير تجربة المستخدم (UI/UX) وتحسين معدلات التحويل
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm mt-1">
                        تحليل نقاط الاحتكاك، أخطاء الهوية البصرية، وخطة التحسين الفورية
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right" dir="rtl">
                      <div className="p-6 rounded-3xl bg-[#0B0F19] border border-white/10 space-y-3">
                        <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 justify-end">
                          <Eye className="w-4 h-4" />
                          نقد وتطوير قسم البطل (Hero Section)
                        </h4>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                          {strategy.businessAudit.siteUiUxAudit.heroSectionCritique}
                        </p>
                      </div>

                      <div className="p-6 rounded-3xl bg-[#0B0F19] border border-white/10 space-y-3">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 justify-end">
                          <MousePointerClick className="w-4 h-4" />
                          تحليل أزرار الـ CTA والتباين البصري
                        </h4>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                          {strategy.businessAudit.siteUiUxAudit.ctaAnalysis}
                        </p>
                      </div>

                      <div className="p-6 rounded-3xl bg-[#0B0F19] border border-white/10 space-y-3">
                        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 justify-end">
                          <AlertTriangle className="w-4 h-4" />
                          عوائق التسجيل ونماذج جمع الليدز
                        </h4>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                          {strategy.businessAudit.siteUiUxAudit.formAndLeadCaptureFriction}
                        </p>
                      </div>

                      <div className="p-6 rounded-3xl bg-[#0B0F19] border border-white/10 space-y-3">
                        <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest flex items-center gap-2 justify-end">
                          <PhoneCall className="w-4 h-4" />
                          جاهزية الجوال ومسار واتساب
                        </h4>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                          {strategy.businessAudit.siteUiUxAudit.mobileAndWhatsAppReadiness}
                        </p>
                      </div>
                    </div>

                    {/* Spelling and Content Bugs */}
                    {strategy.businessAudit.siteUiUxAudit.spellingAndContentBugs?.length > 0 && (
                      <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-right space-y-3" dir="rtl">
                        <h4 className="text-sm font-black text-red-400 flex items-center gap-2 justify-end">
                          <AlertCircle className="w-4 h-4" />
                          أخطاء ومشاكل حية تم رصدها على الموقع (يجب إصلاحها فوراً لبناء الثقة)
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-xs text-red-200">
                          {strategy.businessAudit.siteUiUxAudit.spellingAndContentBugs.map((bug: string, bIdx: number) => (
                            <li key={bIdx} className="font-medium">{bug}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Immediate Actionable Fixes */}
                    {strategy.businessAudit.siteUiUxAudit.immediateActionableFixes?.length > 0 && (
                      <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-right space-y-4" dir="rtl">
                        <h4 className="text-sm font-black text-emerald-400 flex items-center gap-2 justify-end">
                          <CheckCircle2 className="w-4 h-4" />
                          خطة المعالجة الفورية الموصى بها (Top Actionable Fixes)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {strategy.businessAudit.siteUiUxAudit.immediateActionableFixes.map((fix: string, fIdx: number) => (
                            <div key={fIdx} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B0F19] border border-white/5 text-xs text-gray-200">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-[10px]">
                                {fIdx + 1}
                              </span>
                              <span className="font-medium">{fix}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Google Rank & AI Search Visibility (ChatGPT, Gemini, Perplexity) */}
                {strategy?.businessAudit?.searchAndAiVisibility && (
                  <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] border-emerald-500/20 bg-emerald-500/5 space-y-8">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
                        <Globe className="w-3.5 h-3.5" />
                        Google & AI Visibility (GEO)
                      </div>
                      <h3 className="text-2xl font-black text-white">
                        ترتيب موقعك في Google ومدى ظهوره في ChatGPT و Gemini و Perplexity
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm mt-1">
                        قياس جاهزية الموقع لمحركات البحث التقليدية ومحركات الإجابة بالذكاء الاصطناعي
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
                      <div className="p-5 rounded-2xl bg-[#0B0F19] border border-blue-500/20 space-y-2 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-400">Google Search</span>
                          <span className="text-lg font-black text-white">{strategy.businessAudit.searchAndAiVisibility.googleVisibilityScore ?? 45}%</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{strategy.businessAudit.searchAndAiVisibility.googleRankStatus}</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#0B0F19] border border-emerald-500/20 space-y-2 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-400">ChatGPT</span>
                          <span className="text-lg font-black text-white">{strategy.businessAudit.searchAndAiVisibility.chatgptVisibility?.score ?? 28}%</span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-300">{strategy.businessAudit.searchAndAiVisibility.chatgptVisibility?.status}</div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{strategy.businessAudit.searchAndAiVisibility.chatgptVisibility?.reason}</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#0B0F19] border border-indigo-500/20 space-y-2 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-400">Google Gemini</span>
                          <span className="text-lg font-black text-white">{strategy.businessAudit.searchAndAiVisibility.geminiVisibility?.score ?? 34}%</span>
                        </div>
                        <div className="text-[11px] font-bold text-indigo-300">{strategy.businessAudit.searchAndAiVisibility.geminiVisibility?.status}</div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{strategy.businessAudit.searchAndAiVisibility.geminiVisibility?.reason}</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#0B0F19] border border-purple-500/20 space-y-2 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-400">Perplexity AI</span>
                          <span className="text-lg font-black text-white">{strategy.businessAudit.searchAndAiVisibility.perplexityVisibility?.score ?? 24}%</span>
                        </div>
                        <div className="text-[11px] font-bold text-purple-300">{strategy.businessAudit.searchAndAiVisibility.perplexityVisibility?.status}</div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{strategy.businessAudit.searchAndAiVisibility.perplexityVisibility?.reason}</p>
                      </div>
                    </div>

                    {strategy.businessAudit.searchAndAiVisibility.howToRankInGoogleAndAI?.length > 0 && (
                      <div className="p-6 rounded-3xl bg-[#0B0F19] border border-white/10 text-right space-y-3" dir="rtl">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                          كيف تتصدر نتائج Google ومحركات الذكاء الاصطناعي (GEO Action Steps)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {strategy.businessAudit.searchAndAiVisibility.howToRankInGoogleAndAI.map((step: string, idx: number) => (
                            <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-200 leading-relaxed flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-[10px]">{idx + 1}</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Strengths & Weaknesses: You vs Competitors */}
                {strategy?.businessAudit?.swotComparison && (
                  <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] border-white/10 bg-white/5 space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
                        <Crosshair className="w-3.5 h-3.5" />
                        Competitive SWOT Matrix
                      </div>
                      <h3 className="text-2xl font-black text-white">
                        نقاط القوة والضعف عندك وعند منافسينك
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right" dir="rtl">
                      <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">نقاط القوة في موقعك</h4>
                        <ul className="space-y-2 text-xs text-gray-200">
                          {strategy.businessAudit.swotComparison.yourStrengths?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-3">
                        <h4 className="text-xs font-black text-red-400 uppercase tracking-widest">نقاط الضعف في موقعك</h4>
                        <ul className="space-y-2 text-xs text-gray-200">
                          {strategy.businessAudit.swotComparison.yourWeaknesses?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">بماذا يتفوق المنافسون حالياً؟</h4>
                        <ul className="space-y-2 text-xs text-gray-200">
                          {strategy.businessAudit.swotComparison.competitorAdvantages?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Target className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">كيف تتفوق عليهم وتكسر سيطرتهم؟</h4>
                        <ul className="space-y-2 text-xs text-gray-200">
                          {strategy.businessAudit.swotComparison.howToOutperform?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Executive Summary Dashboard - Now only on the first tab */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-panel p-6 rounded-3xl border-blue-500/20 bg-blue-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/20 shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="w-full text-right" dir="auto">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Growth Unlock</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy?.executiveSummary?.keyUnlock}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-3xl border-red-500/20 bg-red-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-red-500/20 shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="w-full text-right" dir="auto">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Survival Threat</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy?.executiveSummary?.theTruth}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="w-full text-right" dir="auto">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Scale Opportunity</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy?.executiveSummary?.scaleOpportunity || strategy?.creativeAndAdvantage?.uniqueAngle}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-panel p-8 rounded-[2rem] border-l-4 border-blue-500 relative overflow-hidden">
                      <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-blue-400" />
                        Business Audit
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-6">
                          <InfoItem label="Product Type" value={strategy?.businessSummary?.productType} />
                          <InfoItem label="Core Offer" value={strategy?.businessSummary?.offer} />
                          <InfoItem label="Messaging Angle" value={strategy?.businessSummary?.messaging} />
                          <InfoItem label="Visual Quality" value={strategy?.businessSummary?.visualQuality} />
                        </div>
                        <div className="space-y-6">
                          <InfoItem label="Target Audience" value={strategy?.businessSummary?.targetAudience} />
                          <InfoItem label="Market Positioning" value={strategy?.businessSummary?.marketPositioning} />
                          <InfoItem label="Brand Strength" value={strategy?.businessSummary?.brandStrength} />
                          <div className="flex gap-4">
                            <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">Price Level</label>
                              <span className="text-blue-400 font-bold uppercase text-xs">{strategy?.businessSummary?.priceLevel}</span>
                            </div>
                            <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-2">Detected Platforms</label>
                              <div className="flex flex-wrap gap-2">
                                {strategy?.businessSummary?.detectedPlatforms?.map((plat: string, idx: number) => (
                                  <span key={idx} className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md">
                                    {plat}
                                  </span>
                                ))}
                                {!strategy?.businessSummary?.detectedPlatforms?.length && (
                                  <span className="text-xs text-gray-500 italic">None detected</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {strategy?.sharedFunnelContext && (
                      <div className="glass-panel p-8 rounded-[3rem] border border-blue-500/20 bg-blue-500/5">
                        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                          <Activity className="w-6 h-6 text-blue-400" />
                          Budget Signal Context
                        </h2>
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Scaling Confidence</span>
                            <span className={cn("text-xs font-black uppercase tracking-widest", 
                              strategy?.sharedFunnelContext?.scalingConfidence === 'High' ? 'text-emerald-400' :
                              strategy?.sharedFunnelContext?.scalingConfidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                            )}>{strategy?.sharedFunnelContext?.scalingConfidence}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Suggested Test Budget</span>
                            <span className="text-xs font-black text-indigo-400">${strategy?.sharedFunnelContext?.recommendedTestingBudget}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Acquisition Difficulty</span>
                            <span className="text-xs font-black text-purple-400">{strategy?.sharedFunnelContext?.acquisitionDifficulty}</span>
                          </div>
                          {strategy?.sharedFunnelContext?.rationale && (
                            <p className="text-[10px] text-gray-500 mt-4 italic font-medium leading-relaxed">
                              {strategy.sharedFunnelContext.rationale}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="glass-panel p-8 rounded-[3rem] border border-red-500/20 bg-red-500/5">
                      <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        Conversion Leaks
                      </h2>
                      <div className="space-y-4">
                        {strategy?.detectedProblems?.map((problem: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-2xl bg-red-400/5 border border-red-500/10">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-red-500 text-white">
                                {problem.severity}
                              </span>
                              <h3 className="font-bold text-gray-100 text-sm italic">{problem.issue}</h3>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed text-right">{problem.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'competitors' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                {strategy?.competitorInsights?.topCompetitorName && (
                  <div className="glass-panel p-8 rounded-[3rem] border-blue-500/30 bg-blue-500/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-blue-500 text-white shadow-2xl">
                          <Target className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-white leading-none mb-2">Top Market Hybrid: {strategy?.competitorInsights?.topCompetitorName}</h3>
                          <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Strategic Benchmarking Analysis</p>
                        </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-[#0B0F19]/50 border border-white/5">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Why they are winning (The Rationale)
                        </h4>
                        <p className="text-lg text-gray-200 font-medium leading-relaxed italic text-right">
                          {strategy?.competitorInsights?.topCompetitorRationale || "Detailed performance data locked."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      <Target className="w-6 h-6 text-indigo-400" />
                      Direct Market Rivals
                    </h2>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                        Deep Competitive Analysis
                      </p>
                      <button 
                        onClick={() => navigate('/growth-planner', { state: { strategyData: strategy } })}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-[10px] font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                      >
                        <Copy className="w-3 h-3" />
                        Collect & Copy
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {strategy?.competitorInsights?.tier1?.map((comp: any, idx: number) => (
                      <div key={idx} className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none"></div>
                        
                        <div className="flex flex-col items-start justify-between mb-6 relative z-10 w-full gap-4 sm:flex-row sm:items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-black text-white leading-none mb-2 break-words">{comp.name}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              {comp.topWinningProduct && (
                                <span className="text-[11px] font-black text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20 shadow-sm">{comp.topWinningProduct}</span>
                              )}
                              <span className="w-1 h-1 rounded-full bg-white/10 hidden sm:block"></span>
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-md">{comp.adActivity}</span>
                              
                              {comp.activeAdsCount && (
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter bg-purple-500/10 px-2 py-0.5 rounded-md">{comp.activeAdsCount} Active Ads</span>
                              )}
                              {comp.campaignsCount && (
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-tighter bg-amber-500/10 px-2 py-0.5 rounded-md">{comp.campaignsCount} Campaigns</span>
                              )}
                            </div>
                            
                            {(comp.platforms && comp.platforms.length > 0) || (comp.campaignTypes && comp.campaignTypes.length > 0) ? (
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {comp.platforms?.map((p: any, i: number) => (
                                  typeof p === 'string' ? (
                                    <span key={i} className="text-[9px] bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/10 font-bold h-fit">{p}</span>
                                  ) : (
                                    <div key={i} className="flex flex-col gap-1 p-2 rounded-lg bg-[#0B0F19] border border-white/5 text-left mb-1 flex-1 min-w-[140px]">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-white font-black uppercase tracking-widest">{p.platformName}</span>
                                        {p.isTopPurchaseDriver && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-sm font-black">TOP ROI</span>}
                                      </div>
                                      <p className="text-[9px] text-indigo-200 mt-1"><span className="text-gray-500 font-bold block mb-0.5 uppercase tracking-widest text-[8px]">Objective</span> {p.campaignObjective}</p>
                                      <p className="text-[9px] text-gray-300"><span className="text-gray-500 font-bold block mb-0.5 uppercase tracking-widest text-[8px]">Content</span> {p.contentFormats}</p>
                                    </div>
                                  )
                                ))}
                                {comp.campaignTypes?.map((t: string, i: number) => (
                                  <span key={i} className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20 font-bold h-fit mb-1">{t}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="flex gap-2 relative z-30">
                            {comp.storeLinks?.map((link: string, i: number) => (
                              <a key={`store-${i}`} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all z-30 cursor-pointer">
                                <Globe className="w-4 h-4" />
                              </a>
                            ))}
                            {comp.socialPages?.map((link: string, i: number) => (
                              <a key={`social-${i}`} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 transition-all z-30 cursor-pointer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            ))}
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/ad-spy', { state: { searchTerms: comp.name } });
                              }} 
                              className="p-2 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-gray-300 hover:text-indigo-400 border border-white/5 transition-all group/btn z-40 cursor-pointer relative"
                              title="Spy on Ads"
                            >
                              <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 text-right relative z-10 flex-1 flex flex-col">
                          
                          {/* Key Strategy Blocks */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl bg-[#0B0F19] border border-white/5 shadow-inner text-left flex flex-col">
                              <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-2 border-b border-white/5 pb-2">Main Content</h4>
                              <p className="text-xs text-indigo-100 font-bold leading-relaxed">{comp.primaryContent || "Multi-format"}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#0B0F19] border border-white/5 shadow-inner text-left flex flex-col">
                              <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-2 border-b border-warning/5 border-red-500/10 pb-2">Top Weakness</h4>
                              <p className="text-xs text-red-300 font-bold leading-relaxed">{comp.weakness}</p>
                            </div>
                          </div>
                          
                          {/* AOV & Products */}
                          {(comp.estimatedAOV || comp.priceRange || (comp.productCatalogs && comp.productCatalogs.length > 0)) && (
                             <div className="p-4 rounded-xl bg-[#0B0F19]/80 border border-emerald-500/10 shadow-inner flex flex-col gap-3">
                                {(comp.estimatedAOV || comp.priceRange) && (
                                  <div className="flex items-center justify-between w-full border-b border-white/5 pb-2">
                                    <span className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-black">Est. AOV / Pricing</span>
                                    <span className="text-xs font-black text-emerald-400">
                                      {comp.estimatedAOV ? comp.estimatedAOV : ''} 
                                      {comp.priceRange ? ` (${comp.priceRange})` : ''}
                                    </span>
                                  </div>
                                )}
                                {comp.productCatalogs && comp.productCatalogs.length > 0 && (
                                   <div className="w-full text-left">
                                      <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black block mb-2">Catalog & Top Offers</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {comp.productCatalogs.map((prod: string, i: number) => (
                                          <span key={i} className="text-[10px] font-bold text-gray-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">{prod}</span>
                                        ))}
                                      </div>
                                   </div>
                                )}
                             </div>
                          )}

                          {/* Cost Metrics */}
                          {(comp.estimatedCostPerPurchase || comp.estimatedCostPerLead || comp.estimatedCostPerMessage || comp.estimatedCPM) && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                              {comp.estimatedCostPerPurchase && (
                                <div className="p-3 border border-blue-500/20 bg-blue-500/5 rounded-xl text-center shadow-inner flex flex-col justify-center">
                                  <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-1">CPA (Purchase)</p>
                                  <p className="text-sm font-black text-blue-400">{comp.estimatedCostPerPurchase}</p>
                                </div>
                              )}
                              {comp.estimatedCostPerLead && (
                                <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-center shadow-inner flex flex-col justify-center">
                                  <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">CPL (Lead)</p>
                                  <p className="text-sm font-black text-emerald-400">{comp.estimatedCostPerLead}</p>
                                </div>
                              )}
                              {comp.estimatedCostPerMessage && (
                                <div className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-xl text-center shadow-inner flex flex-col justify-center">
                                  <p className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mb-1">CPA (Message)</p>
                                  <p className="text-sm font-black text-amber-400">{comp.estimatedCostPerMessage}</p>
                                </div>
                              )}
                              {comp.estimatedCPM && (
                                <div className="p-3 border border-purple-500/20 bg-purple-500/5 rounded-xl text-center shadow-inner flex flex-col justify-center">
                                  <p className="text-[9px] font-black text-purple-500/70 uppercase tracking-widest mb-1">Est. CPM</p>
                                  <p className="text-sm font-black text-purple-400">{comp.estimatedCPM}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* SEO & Off-page */}
                          {(comp.seoKeywords || comp.seoBacklinksProfile) && (
                             <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 relative text-left">
                                <h4 className="text-[9px] uppercase tracking-widest text-indigo-400/70 font-black mb-3 flex items-center gap-1">
                                  <Search className="w-3 h-3" /> SEO Pipeline
                                </h4>
                                {comp.seoKeywords && comp.seoKeywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {comp.seoKeywords.map((kw: string, i: number) => (
                                      <span key={i} className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">{kw}</span>
                                    ))}
                                  </div>
                                )}
                                {comp.seoBacklinksProfile && (
                                  <p className="text-[11px] text-indigo-200/80 font-medium leading-relaxed" dir="auto">{comp.seoBacklinksProfile}</p>
                                )}
                             </div>
                          )}

                          {comp.topCampaignBreakdown && (
                             <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/5 border border-pink-500/20 relative text-left mt-2">
                                <h4 className="text-[9px] uppercase tracking-widest text-pink-400 font-black mb-3 flex items-center gap-1">
                                  <Target className="w-3 h-3" /> Winning Campaign Breakdown
                                </h4>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Target Regions</span>
                                      <span className="text-[10px] text-purple-200">{comp.topCampaignBreakdown.targetRegions}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Est. Daily Budget</span>
                                      <span className="text-[10px] font-black text-emerald-400">{comp.topCampaignBreakdown.estimatedDailyBudget}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Ad Formats</span>
                                    <div className="flex flex-wrap gap-1">
                                      {comp.topCampaignBreakdown.adTypes?.map((t: string, ti: number) => (
                                        <span key={ti} className="text-[8px] bg-white/10 text-white px-1.5 py-0.5 rounded uppercase">{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                  {comp.topCampaignBreakdown.captionsAngles && comp.topCampaignBreakdown.captionsAngles.length > 0 && (
                                    <div>
                                      <span className="text-[8px] uppercase font-bold text-gray-500 block mb-1">Caption Angles</span>
                                      <ul className="list-disc pl-3 text-[10px] text-pink-100/80 space-y-1 text-right" dir="auto">
                                        {comp.topCampaignBreakdown.captionsAngles.map((a: string, ai: number) => (
                                          <li key={ai}>{a}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                             </div>
                          )}

                          <div className="flex-1"></div>

                          {comp.contentStrategy && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-right mt-4" dir="auto">
                               <h4 className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-2 text-left">Content Strategy</h4>
                               <p className="text-xs text-gray-300 font-medium leading-relaxed">{comp.contentStrategy}</p>
                            </div>
                          )}

                          {(comp.engagingContent?.length > 0 || comp.strengths?.length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-right" dir="auto">
                              {comp.engagingContent?.length > 0 && (
                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                  <h4 className="text-[9px] uppercase tracking-widest text-amber-400 font-black mb-2 text-left">Engaging Content (الأكثر تفاعلاً)</h4>
                                  <ul className="space-y-1 text-[11px] text-amber-100/90 list-disc list-inside">
                                    {comp.engagingContent.map((ec: string, ecIdx: number) => (
                                      <li key={ecIdx}>{ec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {comp.strengths?.length > 0 && (
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                                  <h4 className="text-[9px] uppercase tracking-widest text-blue-400 font-black mb-2 text-left">Competitor Strengths (نقاط قوتهم)</h4>
                                  <ul className="space-y-1 text-[11px] text-blue-100/90 list-disc list-inside">
                                    {comp.strengths.map((st: string, stIdx: number) => (
                                      <li key={stIdx}>{st}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-3 mt-3">
                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                              <h4 className="text-[9px] uppercase tracking-widest text-indigo-400/70 font-black mb-3 text-left">Winning Hooks</h4>
                              <div className="flex flex-wrap gap-2 justify-end">
                                {comp.topHooks?.map((hook: string, hIdx: number) => (
                                  <span key={hIdx} className="text-[11px] font-medium bg-indigo-500/10 text-indigo-200 px-3 py-1.5 rounded-lg border border-indigo-500/20 italic">
                                    "{hook}"
                                  </span>
                                )) || <span className="text-[10px] text-gray-500 italic">No hooks detected</span>}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mt-3">
                            <h4 className="text-[10px] uppercase font-black text-emerald-400 mb-1 text-left">Strategic Gap</h4>
                            <p className="text-xs text-emerald-100 font-medium text-left">{comp.gap}</p>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Keywords Gap Section */}
                {strategy?.competitorInsights?.missingKeywords?.length > 0 && (
                  <div className="glass-panel p-8 rounded-[2.5rem] border-amber-500/20 bg-amber-500/5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-2">
                          <Search className="w-3.5 h-3.5" />
                          Keyword Gap Analysis
                        </div>
                        <h2 className="text-2xl font-black text-white">
                          الكلمات اللي الناس بتبحث عنها وموقعك مش ظاهر فيها
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
                      {strategy.competitorInsights.missingKeywords.map((kw: any, kIdx: number) => (
                        <div key={kIdx} className="p-5 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-3 text-right">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-amber-300">{kw.keyword}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                              {kw.monthlyDemand || 'High'}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            <span className="text-gray-500 font-bold">نية البحث:</span> {kw.searchIntent}
                          </div>
                          <div className="text-[11px] text-indigo-300">
                            <span className="text-gray-500 font-bold">المنافس المتصدر:</span> {kw.rankingCompetitor}
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-emerald-200 leading-relaxed">
                            <strong className="text-emerald-400 block mb-0.5">كيف تتصدرها:</strong>
                            {kw.actionTip}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {strategy?.competitorInsights?.marketBroad && (
                  <div className="pt-8 border-t border-white/5">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                      <Users className="w-5 h-5 text-purple-400" />
                      Global & Indirect Players
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {strategy?.competitorInsights?.marketBroad?.map((comp: any, idx: number) => (
                        <div key={idx} className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{comp.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-500 uppercase">{comp.priceRange || "Mid-Range"}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10"></span>
                              <span className="text-[9px] text-purple-400/70 font-black uppercase tracking-tighter">{comp.adActivity || "Active"}</span>
                            </div>
                          </div>
                          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Insight Lock</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TrendSection 
                    title="Winning Hooks (Localized)"
                    items={strategy?.marketTrends?.winningHooks}
                    icon={<Zap className="w-4 h-4" />}
                    color="amber"
                  />
                  <TrendSection 
                    title="High-Perf Formats"
                    items={strategy?.marketTrends?.creativeFormats}
                    icon={<Play className="w-4 h-4" />}
                    color="purple"
                  />
                  <TrendSection 
                    title="Recurring Market Patterns"
                    items={strategy?.marketTrends?.repeatedPatterns}
                    icon={<Repeat className="w-4 h-4" />}
                    color="blue"
                  />
                  <TrendSection 
                    title="Untapped Market Gaps"
                    items={strategy?.marketTrends?.missingInMarket}
                    icon={<Sparkles className="w-4 h-4" />}
                    color="pink"
                  />
                </div>
              </div>
            )}

            {activeTab === 'funnel' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="glass-panel p-8 rounded-[2.5rem] border-indigo-500/20 bg-indigo-500/5 flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-indigo-500/20 rounded-full text-[10px] font-black tracking-widest text-indigo-400 border border-indigo-500/30 uppercase">
                        Strategy Module
                      </div>
                      <div className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
                        Standalone Channel Planning
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 tracking-tight leading-none uppercase">Technical Funnel Architecture</h2>
                    <p className="text-xs text-indigo-200/50 font-medium leading-relaxed max-w-xl">
                      Each platform is analyzed as an independent profit center with its own budget, targeting, and creative ecosystem.
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Send Analysis</div>
                      <button
                        onClick={() => {
                          navigate('/budget', { state: { url, budget: customBudget, currency, funnelStrategy: strategy?.funnelStrategy } });
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-500 border border-yellow-500/30 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        Send to Budget Planner
                        <Target className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                       <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Adjust Total Monthly Budget</div>
                       <div className="flex gap-2">
                         <div className="relative group">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                            <input 
                              type="text"
                              placeholder="e.g. 5000"
                              value={customBudget}
                              onChange={(e) => setCustomBudget(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRecalculateWithBudget()}
                              className="bg-[#0B0F19] border border-white/10 text-white text-xs font-black rounded-xl pl-9 pr-4 py-3 outline-none focus:border-blue-500/50 transition-all w-24"
                            />
                         </div>
                         <div className="relative group">
                            <select 
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="bg-[#0B0F19] border border-white/10 text-white text-xs font-black rounded-xl pl-3 pr-8 py-3 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                            >
                              <option value="USD ($)">USD ($)</option>
                              <option value="EUR (€)">EUR (€)</option>
                              <option value="EGP (ج.م)">EGP (ج.م)</option>
                              <option value="SAR (ر.س)">SAR (ر.س)</option>
                              <option value="AED (د.إ)">AED (د.إ)</option>
                              <option value="GBP (£)">GBP (£)</option>
                              <option value="AUD ($)">AUD ($)</option>
                              <option value="CAD ($)">CAD ($)</option>
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                         </div>
                         <button
                           onClick={handleRecalculateWithBudget}
                           disabled={updatingBudget || !customBudget}
                           className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                         >
                           {updatingBudget ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                           Apply
                         </button>
                       </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-right mb-1">Active Platform Node</div>
                      <div className="relative group">
                        <select 
                          value={selectedPlatform}
                          onChange={(e) => setSelectedPlatform(e.target.value)}
                          className="bg-[#0B0F19] border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl px-6 py-4 pr-12 outline-none focus:border-indigo-500/50 transition-all min-w-[280px] appearance-none cursor-pointer shadow-2xl hover:bg-white/5 ring-1 ring-white/5"
                        >
                          {strategy?.funnelStrategy?.platforms?.map((p: any, idx: number) => (
                            <option key={`${p.platform}-${idx}`} value={p.platform}>{p.platform || 'Platform'}</option>
                          ))}
                        </select>
                        <ChevronRight className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none transition-transform group-hover:text-indigo-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Summary Section */}
                <div className="grid grid-cols-1 gap-6">
                  {strategy?.funnelStrategy?.platforms?.filter((p: any) => p.platform === selectedPlatform).map((p: any, idx: number) => (
                    <div key={idx} className="space-y-12 animate-in fade-in zoom-in duration-500">
                      <div className="p-10 rounded-[3rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                              <Zap className="w-6 h-6 fill-current" />
                            </div>
                            <div>
                              <div className="text-4xl font-black text-white tracking-tight uppercase leading-none">{p.platform}</div>
                              <div className="text-indigo-300 font-bold uppercase tracking-widest text-[10px] mt-1">Platform Independent Budget</div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <p className="text-lg text-indigo-100/80 font-medium max-w-2xl leading-relaxed text-right" dir="auto">{p.budgetRationale || p.reason}</p>
                            {p.marketCompetitiveBasis && (
                              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-right">
                                <span className="text-[8px] font-black uppercase text-gray-500 block mb-1">Market Logic</span>
                                <p className="text-xs text-indigo-200/60 italic" dir="auto">{p.marketCompetitiveBasis}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center min-w-[240px]">
                          <div className="text-5xl font-black text-indigo-400 drop-shadow-[0_0_20px_rgba(129,140,248,0.3)] leading-none mb-2">{p.standaloneMonthlyBudget || p.monthlyAmount}</div>
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Recommended Standalone Budget</div>
                        </div>
                      </div>

                      {/* Phased Breakdown - Distinct for THIS platform */}
                      <div className="space-y-16">
                        <FunnelPhase 
                          phase="Top of Funnel (Awareness)"
                          data={p.tof}
                          color="blue"
                        />
                        <FunnelPhase 
                          phase="Middle of Funnel (Consideration)"
                          data={p.mof}
                          color="purple"
                        />
                        <FunnelPhase 
                          phase="Bottom of Funnel (Conversion)"
                          data={p.bof}
                          color="emerald"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'creative' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="glass-panel p-8 rounded-[2rem] border-blue-500/20">
                    <h2 className="text-xl font-black text-white mb-6">Unique Angle</h2>
                    <p className="text-2xl font-black text-blue-400 leading-tight mb-4 text-right">{strategy?.creativeAndAdvantage?.uniqueAngle || strategy?.executiveSummary?.scaleOpportunity || 'زاوية تسويقية قائمة على القيمة وحل المشكلات المباشرة'}</p>
                    <p className="text-gray-300 text-right">{strategy?.creativeAndAdvantage?.howToOutperform || 'التفوق على المنافسين بتقديم دراسات حالة موثقة وأسئلة تأهيلية دقيقة تضمن أعلى هامش ربح صافي'}</p>
                  </div>
                  <div className="glass-panel p-8 rounded-[2rem] border-indigo-500/20">
                    <h2 className="text-xl font-black text-white mb-6">Proposed Core Hooks</h2>
                    <div className="space-y-4">
                      {(strategy?.creativeAndAdvantage?.primaryHooks || [
                        "3 أسباب تجعل إعلانات شركتك تجلب ليدز بدون مبيعات فعلية",
                        "كيف تضاعف صفقات الـ B2B الرابحة وتوفر 30% من تكلفة الاستحواذ؟",
                        "الفرق بين زيادة المشاهدات وزيادة الأرباح الصافية في السوق السعودي"
                      ]).map((h: string, i: number) => (
                        <div key={i} className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-100 font-bold italic text-right">"{h}"</div>
                      ))}
                    </div>
                  </div>
                </div>

                {strategy?.creativeAndAdvantage?.recommendedTopics?.length > 0 && (
                  <div className="glass-panel p-8 rounded-[2.5rem] border-emerald-500/20 bg-emerald-500/5 space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
                        <FileText className="w-3.5 h-3.5" />
                        Content To Outperform
                      </div>
                      <h2 className="text-2xl font-black text-white">المحتوى والموضوعات اللي لازم تنشرها</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
                      {strategy.creativeAndAdvantage.recommendedTopics.map((topic: any, tIdx: number) => (
                        <div key={tIdx} className="p-5 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-3 text-right">
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 inline-block">
                            {topic.format}
                          </span>
                          <h3 className="text-sm font-black text-white leading-snug">{topic.title}</h3>
                          <div className="text-[11px] text-indigo-300">
                            <span className="text-gray-500 font-bold">الكلمة المستهدفة:</span> {topic.targetKeyword}
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            <span className="text-gray-500 font-bold">الهدف:</span> {topic.goal}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-panel p-10 rounded-[3rem] border-pink-500/20 bg-pink-500/5">
                  <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                    <ImageIcon className="w-6 h-6 text-pink-400" />
                    Visual Ad Scripts (UGC / Production)
                  </h2>
                  <div className="grid grid-cols-1 gap-8">
                    {(strategy?.creativeAndAdvantage?.visualScripts || [
                      "**المشهد 1 (0-3 ثوان):** المتحدث ينظر للكاميرا ومعه لابتوب يعرض لوحة تحكم الحملات: 'لو بتصرف ميزانية إعلانات على شركتك وحاسس إن أغلب العملاء مش جادين، المشكلة مش في الإعلان.. المشكلة في الفلترة!'\\n\\n**المشهد 2 (3-15 ثانية):** عرض سريع للفرق بين نموذج تسجيل تقليدي ونموذج بأسئلة تأهيلية ذكية.\\n\\n**المشهد 3 (15-30 ثانية):** 'احجز جلستك التشخيصية المجانية اليوم واعرف كيف تهندس مسار نمو شركتك بالأرقام.'"
                    ]).map((script: string, i: number) => (
                      <div key={i} className="p-8 rounded-3xl bg-[#0B0F19] border border-white/5 prose prose-invert prose-pink max-w-none text-right">
                        <ReactMarkdown>{script}</ReactMarkdown>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-panel p-8 rounded-[2rem]">
                      <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <Rocket className="w-6 h-6 text-emerald-400" />
                        Execution Steps: Strategic Fixes
                      </h2>
                      <div className="relative">
                        <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/5 hidden md:block" />
                        <div className="space-y-6">
                          {strategy?.executionRoadmap?.problemSolutions?.map((item: any, idx: number) => (
                            <div key={idx} className="relative group">
                              <div className="glass-panel p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all text-right relative z-10">
                                <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-black text-emerald-400">
                                  0{idx + 1}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                  <div className="space-y-3 order-2 md:order-1 border-t md:border-t-0 md:border-r border-white/5 pt-4 md:pt-0 md:pr-8">
                                    <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 font-black mb-1 flex items-center gap-2 justify-end">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Strategic Solution (الحل المقترح)
                                    </h4>
                                    <p className="text-white font-bold leading-relaxed">{item.solution}</p>
                                  </div>
                                  <div className="space-y-3 order-1 md:order-2">
                                    <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-black mb-1 flex items-center gap-2 justify-end">
                                      <AlertTriangle className="w-3 h-3" />
                                      Critical Observation (الملاحظة)
                                    </h4>
                                    <p className="text-gray-400 font-medium leading-relaxed">{item.problem}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {strategy?.executionRoadmap?.thirtyDayActionPlan?.length > 0 && (
                      <div className="glass-panel p-8 rounded-[2rem] border-emerald-500/20 bg-emerald-500/5 space-y-6">
                        <div className="flex items-center justify-between gap-4">
                          <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-emerald-400" />
                            خطة عملية لمدة 30 يومًا لتحسين ظهورك وجذب عملاء أكثر
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                          {strategy.executionRoadmap.thirtyDayActionPlan.map((wk: any, wIdx: number) => (
                            <div key={wIdx} className="p-5 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-3 text-right">
                              <div className="text-xs font-black text-emerald-400">{wk.week}</div>
                              <div className="text-sm font-bold text-white">{wk.focus}</div>
                              <ul className="space-y-1.5 text-xs text-gray-300">
                                {wk.tasks?.map((task: string, tIdx: number) => (
                                  <li key={tIdx} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{task}</span>
                                  </li>
                                ))}
                              </ul>
                              {wk.expectedOutcome && (
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200">
                                  <strong className="text-emerald-400">النتيجة المتوقعة:</strong> {wk.expectedOutcome}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {longTermStrategy ? (
                      <div className="glass-panel p-8 rounded-3xl border-l-4 border-indigo-500 bg-indigo-500/5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                          <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                            3-Month Battle Plan (خطة الـ 90 يوماً التنفيذية)
                          </h2>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={handleCopyRoadmap}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="نسخ الخطة كاملة"
                            >
                              {copiedRoadmap ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedRoadmap ? 'تم النسخ' : 'نسخ'}</span>
                            </button>
                            <button
                              onClick={handleDownloadRoadmap}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="تنزيل كملف .md"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تنزيل</span>
                            </button>
                            <button 
                              onClick={handleGenerateLongTermStrategy} 
                              disabled={generatingRoadmap}
                              className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase transition-colors ml-2 cursor-pointer disabled:opacity-50"
                            >
                              {generatingRoadmap ? "Generating..." : "Regenerate"}
                            </button>
                          </div>
                        </div>
                        <div className="prose prose-invert prose-indigo max-w-none text-sm text-right prose-table:border-collapse prose-th:border prose-th:border-white/10 prose-th:bg-white/5 prose-th:p-3 prose-td:border prose-td:border-white/10 prose-td:p-3" dir="rtl">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{longTermStrategy}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-12 rounded-[2rem] text-center bg-indigo-500/5">
                        <Rocket className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-white mb-6">Need a full 3-month growth plan?</h3>
                        <button
                          onClick={handleGenerateLongTermStrategy}
                          disabled={generatingRoadmap}
                          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          {generatingRoadmap ? "Calculating Plan..." : "Generate Master 90-Day Roadmap"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-3xl text-right">
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 text-left">Target Audience Details</h4>
                      <p className="text-sm text-gray-300 font-medium leading-relaxed">{strategy?.executionRoadmap?.targetAudienceDetails?.description}</p>
                    </div>
                    <div className="glass-panel p-8 rounded-3xl bg-emerald-500/5 border-emerald-500/10 text-right">
                       <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 text-left">Winning Campaign Formats</h4>
                       <div className="space-y-4">
                         {strategy?.executionRoadmap?.campaignStrategy?.upcomingTypes?.map((camp: any, idx: number) => (
                           <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5">
                             <div className="text-white font-black text-sm">{camp.type}</div>
                             <div className="text-[10px] text-gray-500">{camp.objective}</div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                {!contentAnalysis ? (
                  <div className="glass-panel p-16 rounded-[3rem] text-center bg-blue-500/5 border-blue-500/20">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-blue-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl border border-blue-500/30">
                      <PenTool className="w-12 h-12 text-blue-400" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-6 tracking-tight uppercase">Content & Ad Copy Architect</h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 font-medium">
                      Generate a complete, high-conversion ad copy suite for every phase of your funnel. 
                      Precisely aligned with your business URL and market analysis.
                    </p>
                    <button
                      onClick={handleGenerateContent}
                      disabled={generatingContent}
                      className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-4 mx-auto disabled:opacity-50"
                    >
                      {generatingContent ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          Drafting Ad Copies...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          Generate Full Ad Suite
                        </>
                      )}
                    </button>
                    <p className="mt-8 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                      Uses advanced persuasion frameworks (PAS/AIDA) for maximum conversion
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between pb-8 border-b border-white/5">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center shadow-lg border border-blue-500/30">
                          <PenTool className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Ad Content Suite</h2>
                          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Full-Funnel Creative Matrix</p>
                        </div>
                      </div>
                      <button
                        onClick={handleGenerateContent}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-black rounded-xl transition-all flex items-center gap-2 border border-white/10"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate Suite
                      </button>
                    </div>

                    {contentAnalysis.platforms?.map((plat: any, platIdx: number) => (
                      <div key={platIdx} className="space-y-12">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-8 rounded-full bg-blue-500"></div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tight">{plat.platform} Ecosystem</h3>
                        </div>

                        {plat.phases?.map((phase: any, phIdx: number) => (
                          <div key={phIdx} className="space-y-6">
                            <div className="flex items-center gap-4">
                              <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em] bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
                                {phase.name}
                              </h4>
                              <div className="flex-1 h-px bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {phase.adSets?.map((adSet: any, asIdx: number) => (
                                <div key={asIdx} className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-white/2 hover:bg-white/5 transition-all group overflow-hidden">
                                  <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                                        <Target className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h5 className="text-lg font-black text-white leading-none">Ads #{asIdx + 1}</h5>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Targeting Profile</p>
                                      </div>
                                    </div>
                                    <div className="text-[10px] font-black text-indigo-400/80 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                                      {adSet.targetingProfile}
                                    </div>
                                  </div>

                                  {/* AD SET TARGETING & DETAILS */}
                                  <div className="mb-8 p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl pointer-events-none"></div>
                                     <h6 className="text-[10px] font-black tracking-widest text-indigo-400 uppercase mb-4 flex items-center gap-2">
                                       <Target className="w-3.5 h-3.5" />
                                       AD SET TARGETING & DETAILS
                                     </h6>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right" dir="auto">
                                       <div className="space-y-1">
                                         <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block text-left">Demographics & Locations</span>
                                         <p className="text-[11px] text-gray-300 font-bold">
                                           {adSet.targetingDetails?.demographics || '18-35+'} • {adSet.targetingDetails?.locations || 'Cairo, Giza, Alex'}
                                         </p>
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block text-left">Targeting Strategy</span>
                                         <p className="text-[11px] text-indigo-300/80 font-bold italic">
                                           {adSet.targetingDetails?.strategy || 'Open/Broad Algorithm Testing'}
                                         </p>
                                       </div>
                                       {adSet.targetingDetails?.interests?.length > 0 && (
                                         <div className="md:col-span-2 pt-2 border-t border-white/5">
                                           <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-2 text-left">Detailed Interests</span>
                                           <div className="flex flex-wrap gap-2 justify-end">
                                             {adSet.targetingDetails.interests.map((interest: string, i: number) => (
                                               <span key={i} className="text-[9px] bg-white/5 text-gray-400 px-2 py-1 rounded-lg border border-white/5">
                                                 {interest}
                                               </span>
                                             ))}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                  </div>

                                  <div className="space-y-6">
                                      {adSet.ads?.map((ad: any, adIdx: number) => {
                                        const adId = `${platIdx}-${phIdx}-${asIdx}-${adIdx}`;
                                        return (
                                          <div key={adIdx} className="p-6 rounded-3xl bg-[#0B0F19]/60 border border-white/10 group/ad hover:border-blue-500/40 transition-all">
                                            <div className="flex items-center justify-between mb-4">
                                              <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                                                  {adIdx + 1}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Variation - {ad.angle}</span>
                                              </div>
                                              <button 
                                                onClick={() => {
                                                  const text = `Headline: ${ad.headline}\n\n${ad.primaryText}\n\nCTA: ${ad.cta}`;
                                                  navigator.clipboard.writeText(text).then(() => {
                                                    setCopiedAdId(adId);
                                                    setTimeout(() => setCopiedAdId(null), 2000);
                                                  }).catch(err => {
                                                    console.error('Failed to copy: ', err);
                                                  });
                                                }}
                                                className={cn(
                                                  "p-2 rounded-lg transition-all flex items-center gap-2",
                                                  copiedAdId === adId 
                                                    ? "bg-emerald-500/20 text-emerald-400" 
                                                    : "bg-white/5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                )}
                                              >
                                                {copiedAdId === adId ? (
                                                  <>
                                                    <span className="text-[8px] font-black uppercase">Copied!</span>
                                                    <Check className="w-3.5 h-3.5" />
                                                  </>
                                                ) : (
                                                  <Copy className="w-3.5 h-3.5" />
                                                )}
                                              </button>
                                            </div>

                                            <div className="space-y-4 text-right" dir="auto">
                                              <div>
                                                <h6 className="text-[9px] uppercase tracking-widest text-gray-600 font-black mb-1 text-left">Winning Headline</h6>
                                                <p className="text-lg font-black text-white leading-tight">{ad.headline}</p>
                                              </div>
                                              
                                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover/ad:border-blue-500/20 transition-all">
                                                <h6 className="text-[9px] uppercase tracking-widest text-gray-600 font-black mb-2 text-left">Primary Body Copy</h6>
                                                <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                                                  {ad.primaryText}
                                                </p>
                                              </div>

                                              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full uppercase">
                                                  CTA: {ad.cta}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                  <span className="text-[8px] text-gray-600 font-black uppercase">Optimized for Conversion</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <FeatureCard 
            icon={<Search className="w-8 h-8" />} 
            title="Deep Analysis" 
            desc="We extract product info, messaging, and visual quality directly from the URL."
            color="blue"
          />
          <FeatureCard 
            icon={<Target className="w-8 h-8" />} 
            title="Competitor Intel" 
            desc="Our AI identifies top competitors and analyzes their winning strategies."
            color="indigo"
          />
          <FeatureCard 
            icon={<TrendingUp className="w-8 h-8" />} 
            title="Market Trends" 
            desc="Detect winning hooks and creative formats active in the market right now."
            color="purple"
          />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-right">
      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">{label}</label>
      <p className="text-gray-200 font-bold text-lg leading-tight" dir="auto">{value}</p>
    </div>
  );
}

function FunnelPhase({ phase, data, color }: { phase: string, data: any, color: string }) {
  if (!data) return null;

  const colorClasses: any = {
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  };

  return (
    <div className={cn("glass-panel p-10 rounded-[3rem] border shadow-2xl relative overflow-hidden", colorClasses[color].split(' ').slice(0, 2).join(' '))}>
      <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
        <div className="space-y-2 text-right">
          <h3 className="text-3xl font-black text-white tracking-tight">{phase}</h3>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white">
              {data.monthlyAmount || 'Calculating...'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-gray-400">
              {data.budgetPercentWithinPlatform || data.budget}% Phase Allocation
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-400">
              {data.campaignSetup} Setup
            </span>
          </div>
          {data.rationale && (
            <p className="text-[10px] text-gray-500 font-medium italic mt-2 text-right" dir="auto">
              Rationale: {data.rationale}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Campaign Structure</div>
          <div className="flex items-center gap-4 text-white">
            <div className="text-center group">
              <div className="relative inline-block mb-1">
                <div className="w-12 h-12 rounded-full border-4 border-red-500/30 flex items-center justify-center text-2xl font-black text-white bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse group-hover:animate-none group-hover:scale-110 transition-all">
                  {data.adSetCount}
                </div>
              </div>
              <div className="text-[9px] font-black text-white/80 uppercase tracking-tighter leading-tight max-w-[80px]">عدد ال ad sets داخل الحمله</div>
            </div>
            <div className="w-px h-12 bg-white/10 mx-2"></div>
            <div className="text-center">
              <div className="text-2xl font-black text-white mb-1">{data.adsPerSet}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter leading-tight max-w-[80px]">عدد ال ads داخل كل ad set</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Core Phase Strategy</h4>
            <p className="text-lg text-white font-bold leading-snug text-right" dir="auto">{data.strategy || data.objective || 'Generating tactical foundation...'}</p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 text-right">Ad Set Targeting & Details</h4>
            {data.adSetProfiles?.length > 0 ? (
              <div className="space-y-3">
                {data.adSetProfiles.map((profile: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 text-right">
                    <div className="flex items-center justify-between gap-2 mb-2">
                       <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">Targeting Segment #{idx + 1}</span>
                       <h5 className="text-[11px] font-black text-gray-200">{profile.name}</h5>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic" dir="auto">{profile.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                <p className="text-sm text-gray-300 leading-relaxed text-right italic" dir="auto">{data.adSetDetails || data.targeting || 'Identifying prime audience segments...'}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Creative Breakdown</h4>
            <div className="flex flex-wrap gap-2 justify-end text-right">
              {data.creativeBreakdown ? data.creativeBreakdown.map((crt: string, i: number) => (
                <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300" dir="auto">
                  {crt}
                </span>
              )) : (
                <span className="text-[10px] text-gray-500 italic">Formatting visual concepts...</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 text-right flex items-center justify-end gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Meta Ads Manager Technical Setup
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Campaign Objective</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaObjective || 'Sales'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Budget Type</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaBudgetType || 'ABO'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Optimization Goal</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaOptimizationGoal || 'Conversions'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Recommended Placements</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaPlacements || 'Advantage+'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Creative Format</span>
                  <span className="text-xs font-black text-emerald-400">{data.creativeFormat || 'Single Item'}</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 text-right flex items-center justify-end gap-2">
                <Users className="w-3.5 h-3.5" />
                Meta Audience Controls
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Locations</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaLocations || (url.toLowerCase().includes('.sa') || currency.includes('SAR') ? 'المملكة العربية السعودية' : 'السوق المستهدف')}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Age Range</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaAgeRange || '18-65+'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Gender</span>
                  <span className="text-xs font-black text-indigo-400">{data.metaGender || 'All'}</span>
                </div>
                <div className="p-3 bg-[#0B0F19]/40 rounded-xl border border-white/5 text-right">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Exclusions</div>
                  <div className="text-[10px] font-black text-red-400">{data.metaExclusions || 'Previous Purchasers (30 Days)'}</div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 text-right flex items-center justify-end gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Winning Ad Copy & Angles
              </h4>
              <div className="space-y-4">
                {data.adAngles && data.adAngles.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 mb-4">
                     {data.adAngles.map((angle: string, i: number) => (
                       <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-right justify-end group/angle hover:border-indigo-500/30 transition-all">
                          <span className="text-[10px] font-bold text-gray-300 italic" dir="auto">"{angle}"</span>
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-[9px] font-black text-indigo-400 shrink-0">
                            Angle {i + 1}
                          </div>
                       </div>
                     ))}
                  </div>
                )}
                <div className="text-sm text-indigo-100 leading-relaxed font-bold bg-[#0B0F19]/50 p-6 rounded-2xl text-right" dir="auto">
                  {data.contentCopy || data.creativeType || 'Drafting high-conversion copy...'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">High-Retention Hooks</h4>
            {data.hooks?.map((hook: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-indigo-500/30 transition-all text-right justify-end">
                <span className="text-sm font-bold text-white italic" dir="auto">"{hook}"</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0 order-first lg:order-last">
                  #{i+1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityButton({ title, desc, icon, color, onClick }: { title: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void }) {
  const colorClasses: any = {
    blue: "bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/5 border-purple-500/10 hover:bg-purple-500/10 text-purple-400",
    emerald: "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400",
  };

  return (
    <button 
      onClick={onClick}
      className={cn("w-full text-left p-5 rounded-2xl border transition-all group", colorClasses[color])}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
        </div>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-gray-300 font-medium leading-relaxed">{desc}</p>
    </button>
  );
}

function TrendSection({ title, items, icon, color }: { title: string, items: string[], icon: React.ReactNode, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/5 border-blue-500/20",
    indigo: "text-indigo-400 bg-indigo-500/5 border-indigo-500/20",
    pink: "text-pink-400 bg-pink-500/5 border-pink-500/20",
    amber: "text-amber-400 bg-amber-500/5 border-amber-500/20",
    purple: "text-purple-400 bg-purple-500/5 border-purple-500/20",
  };

  const currentClass = colorClasses[color] || colorClasses.blue;
  const textColor = currentClass.split(' ')[0];
  const bgColor = textColor.replace('text-', 'bg-');

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-white/2 hover:bg-white/5 transition-all group overflow-hidden relative">
      <div className={cn("absolute -top-12 -right-12 w-24 h-24 blur-[40px] opacity-20 pointer-events-none rounded-full", bgColor)}></div>
      <h3 className={cn("text-[10px] font-black uppercase tracking-widest mb-8 flex items-center justify-between", textColor)}>
        <span className="flex items-center gap-2">{icon} {title}</span>
        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] border border-white/5">Verified Trend</span>
      </h3>
      <div className="space-y-4 text-right">
        {items?.length > 0 ? items?.map((item: string, idx: number) => (
          <div key={idx} className="flex flex-row-reverse items-start gap-4 p-4 rounded-2xl bg-[#0B0F19]/40 border border-white/5 group-hover:border-white/10 transition-all">
            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-[0_0_10px_currentColor]", textColor, bgColor)}></div>
            <p className="text-sm text-gray-200 font-bold leading-relaxed">{item}</p>
          </div>
        )) : (
          <div className="text-center py-8 opacity-40 italic text-xs">No specific trends detected for this segment.</div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 group-hover:border-blue-500/30",
    indigo: "bg-indigo-500/10 text-indigo-400 group-hover:border-indigo-500/30",
    purple: "bg-purple-500/10 text-purple-400 group-hover:border-purple-500/30",
  };

  const currentClass = colorClasses[color] || colorClasses.blue;
  const bgClass = currentClass.split(' ')[0];

  return (
    <div className={cn("glass-panel p-10 rounded-[2.5rem] text-center space-y-6 group transition-all duration-500", currentClass)}>
      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-inner", bgClass)}>
        {icon}
      </div>
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <p className="text-gray-400 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
