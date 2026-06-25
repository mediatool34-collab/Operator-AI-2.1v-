import React, { useState, useEffect } from 'react';
import JSON5 from 'json5';
import { 
  Search, Globe, Target, TrendingUp, Lightbulb, AlertTriangle, 
  CheckCircle2, Crosshair, Zap, Shield, BarChart3, Presentation, 
  Sparkles, ArrowRight, ExternalLink, Eye, Layout, MessageSquare, 
  Megaphone, Gauge, ChevronRight, Info, AlertCircle, Rocket,
  RefreshCw, Image as ImageIcon, Activity, DollarSign, Users, Play, Repeat,
  PenTool, Copy, Check
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useAiSettings } from '../hooks/useAiSettings';
import { usePersistedState } from '../hooks/usePersistedState';
import { analyzeWithGemini } from '../lib/gemini';
import { CRO_AND_AOV_INTELLIGENCE_DIRECTIVE } from '../lib/operatorDirectives';

type TabType = 'audit' | 'analysis' | 'competitors' | 'trends' | 'funnel' | 'creative' | 'roadmap' | 'content';

export function PreFunnelIntelligence() {
  const { provider: aiProvider } = useAiSettings();
  const [url, setUrl] = usePersistedState('pre_funnel_url', '');
  const [language, setLanguage] = usePersistedState('pre_funnel_language', 'Arabic');
  const [currency, setCurrency] = usePersistedState('pre_funnel_currency', 'USD ($)');
  const [customCompetitors, setCustomCompetitors] = usePersistedState('pre_funnel_custom_competitors', '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = usePersistedState<TabType>('pre_funnel_active_tab', 'analysis');
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = usePersistedState<any>('pre_funnel_strategy', null);
  const [contentAnalysis, setContentAnalysis] = usePersistedState<any>('pre_funnel_content', null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [copiedAdId, setCopiedAdId] = useState<string | null>(null);
  const [longTermStrategy, setLongTermStrategy] = usePersistedState<string | null>('pre_funnel_long_term', null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = usePersistedState<number | null>('pre_funnel_last_analyzed', null);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [customBudget, setCustomBudget] = usePersistedState<string>('pre_funnel_custom_budget', '');
  
  // Robust JSON cleaner and parser
  const safeParseJSON = (text: string) => {
    try {
      // First attempt to parse directly (models with responseMimeType often return clean JSON)
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
        if (firstBrace !== -1 && lastBrace !== -1) {
          sanitized = sanitized.substring(firstBrace, lastBrace + 1);
        }

        // Try JSON5, which handles a lot of edge cases like trailing commas, single quotes, etc.
        return JSON5.parse(sanitized);
      } catch (e: any) {
        console.error('JSON parse failed after cleanup:', e);
        throw new Error(`Expected clean JSON from AI, but received an invalid structure. Detail: ${e.message}`);
      }
    }
  };

  const [selectedPlatform, setSelectedPlatform] = usePersistedState<string>('pre_funnel_selected_platform', '');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sharedBudgetContext] = usePersistedState<any>('budget_planner_context', null);
  const [sharedFunnelContext, setSharedFunnelContext] = usePersistedState<any>('pre_funnel_context', null);

  useEffect(() => {
    if (strategy?.funnelStrategy?.platforms?.length > 0) {
      const platformExists = strategy.funnelStrategy.platforms.some((p: any) => p.platform === selectedPlatform);
      if (!platformExists) {
        setSelectedPlatform(strategy.funnelStrategy.platforms[0].platform);
      }
    }
  }, [strategy, selectedPlatform, setSelectedPlatform]);

  useEffect(() => {
    // If URL changes, we should clear the strategy to avoid "fake" or stale data showing
    // for a different brand URL.
    if (url && strategy && !url.includes(strategy.businessSummary?.name?.toLowerCase())) {
       // Optional: we can be more aggressive but for now let's just 
       // keep it simple: if the user came from a different URL, reset.
    }
  }, [url, strategy]);

  const handleAnalyze = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setStrategy(null);
    setAnalysisStep('جاري بدء الفحص التكتيكي...');
    
    try {
      setAnalysisStep('Surveying market ecosystem...');
      
      // 1. SCRAPE via Backend
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || 'anonymous'
        },
        body: JSON.stringify({ url, options: { timeout: 45000 } })
      });

      let scrapeData;
      const contentType = scrapeResponse.headers.get('content-type');
      if (scrapeResponse.ok && contentType && contentType.includes('application/json')) {
        scrapeData = await scrapeResponse.json();
      } else {
        console.warn('Scraping failed, falling back to URL-only analysis');
        scrapeData = { content: 'Could not scrape content', title: 'Target Website' };
      }

      setAnalysisStep('Performing broader market and competitor research...');
      
      let marketResearchContext = '';
      try {
        if (aiProvider === 'gemini') {
          const searchPrompt = `As a senior local market analyst (Media Buyer), investigate the following target business and find 3 to 6 REAL direct competitors for it in its specific local market. 
          
          TARGET BUSINESS DATA:
          URL: ${url}
          WEBSITE CONTENT: ${(scrapeData.content || '').substring(0, 5000)}
          
          ${customCompetitors?.trim() ? `CRITICAL - THE USER HAS EXPLICITLY PROVIDED THE DIRECT COMPETITORS:
          "${customCompetitors}"
          YOU MUST USE THESE AND ONLY THESE EXACT COMPETITORS. Use Google Search to find their websites, social media, and deep marketing metrics.` : `COMPETITOR RESEARCH RULES:
          1. Identify its core industry, product category, and target country.
          2. Use Google Search to find 3 to 5 REAL, STRONG BRAND COMPETITORS that MANUFACTURE or OWN competing/similar products in the same market.
          3. EXCLUDE RESELLERS & DISTRIBUTORS: STRICTLY DO NOT include general marketplaces (Amazon, Noon, Jumia), local retail stores, pharmacies, agencies, or retail outlets that merely resell products. The competitors MUST be the brand owners themselves (e.g., if the target product is Laser Hair Removal, the competitors are Brands like Braun, Philips, Ulike, Mlay, NOT a local store that sells them).
          4. EXCLUDE WEAK DROPSHIPPERS: DO NOT include weak, unverified social media pages or generic dropshipping stores.
          5. NO DUPLICATES: Each competitor in the list must be strictly unique.
          6. NO HALLUCINATIONS: You MUST verify the brands are real businesses with real official manufacturer websites (e.g., braun.com, philips.com) or verified official brand social media profiles.`}
          
          Give me a detailed list containing:
          1. Their exact names and store/social media links (online/offline stores).
          2. Complete Ad Strategy breakdown: Platform by platform (Meta, TikTok, etc), specifying for each the exact Campaign Objectives, Content Formats, and specifying which platform is their Top Purchase Driver.
          3. Exact "Top Winning Product" (المنتج الأكثر مبيعاً) specifying exactly what they are selling heavily.
          4. "Average Order Value" (AOV - متوسط قيمة الطلب). This MUST be a realistic numeric average purchase cart value in local currency.
          5. "priceRange" - This MUST indicate the class of pricing: "High-End", "Mid-Range", "Low-End" (فئة سعرية مرتفعة، متوسطة، رخيصة) - DO NOT PUT NUMBERS HERE.
          6. SEO Keywords they rank for and their estimated SEO Backlink strategy.
          7. Hyper-realistic, street-level media buying benchmarks for Cost per Purchase (CPA), Cost per Lead, and Cost per Message in their specific local country. 
             *WARNING: Do NOT just calculate a flat percentage of AOV. In markets like Egypt (EGP) or MENA, CPA is often aggressively low due to local purchasing power and CPMs. Even for a 7000 EGP product, the CPA on Meta might realistically be 150-400 EGP maximum, NOT 1000+ EGP. Leads and Messages are often as low as 10-50 EGP. Provide raw, accurate local media buyer numbers.*
          8. Top Campaign Breakdown: Find or estimate their MOST SUCCESSFUL campaign details (Target regions, target audience, competitive daily budget, ad formats, and caption angles).
          
          CRITICAL: Use only standard English digits for all numbers (1, 2, 3...) even if generating Arabic text. DO NOT use Eastern Arabic numerals.
          Ensure factual grounding. Find real local competitors for their target audience region.`;
          marketResearchContext = await analyzeWithGemini(searchPrompt, false);
        }
      } catch (searchErr) {
        console.warn('Market research grounding pass failed:', searchErr);
      }

      setAnalysisStep('Generating tactical funnel blueprint...');

      // 2. ANALYZE
      const prompt = `
        Act as a SENIOR STRATEGIC ANALYST & GROWTH ARCHITECT (McKinsey/BCG level). 
        Your mission is to perform a DEEP-DIVE forensic analysis of the business at ${url}.
        
        DATA SOURCE (TARGET BUSINESS):
        ${(scrapeData.content || '').substring(0, 150000)}

        MARKET RESEARCH CONTEXT (COMPETITOR INTELLIGENCE FROM SEARCH GROUNDING):
        ${marketResearchContext}

        ${CRO_AND_AOV_INTELLIGENCE_DIRECTIVE}
        
        CRITICAL INSTRUCTION FOR COMPETITOR INSIGHTS:
        You MUST ONLY use the competitors provided in the MARKET RESEARCH CONTEXT above. DO NOT invent, guess, or hallucinate competitors. Formulate the "tier1" array strictly based on the real data provided in the context.
        
        ${sharedBudgetContext ? `
        BUDGET ORCHESTRATION CONTEXT (USE AS A SUPPORTING SIGNAL, DO NOT OVERWRITE YOUR SCORING LOGIC):
        ${JSON.stringify(sharedBudgetContext)}
        Explain how this budget context influenced your funnel strategy in your executive summary.
        ` : ''}

        INSTRUCTIONS:
        PHASE 0: FORENSIC BUSINESS AUDIT
        - Analyze the business model (B2B, B2C, SaaS, Agency, etc.) based on the URL.
        - Determine the Brand Voice and Target Avatar profile.
        - Identify Conversion Friction (Why would a user NOT buy?).
        
        PHASE 1: COMPETITOR CONTENT BENCHMARKING
        - Analyze REAL competitors currently running ads.
        - What content formats are they winning with? (e.g. "Direct comparison tables", "Problem-solution UGC", "Founder story clips").
        - Identify the specific gaps we can exploit.

        1. **Competitor Intel:** 
           - Identify 3 to 6 STRONG, ESTABLISHED REAL BRAND COMPETITORS from the Market Research Context. Filter out weak drop-shipping pages and strictly focus on the highest authority MANUFACTURER brands or top substitutes in the market (e.g. Braun, Philips).
           - DO NOT INVENT fake competitor names out of thin air. Rely entirely on the research context to name real businesses.
           - Ensure EVERY competitor is UNIQUE. DO NOT output duplicate names.
           - STRICTLY DO NOT list general marketplaces (e.g., Amazon, Noon, Jumia), local retail stores, pharmacies, or distributors as competitors. Focus entirely on the BRANDS that own the competing products.
           - Designate a "Top Competitor" and provide a detailed 'topCompetitorRationale'.
           - Include 'campaignsCount' (e.g. "15 Campaigns"), and 'campaignTypes' array (e.g., ["Lead Generation", "Sales", "Messages"]) indicating what kind of campaigns they run.
           - Identify their specific advertising platforms and strategy in 'platforms' (e.g. Meta vs TikTok, what they run on each, their objectives, and which drives the most purchases).
           - CRITICAL: STRICT BUDGET & COST REALISM via REVERSE ENGINEERING: You MUST calculate 'estimatedCostPerPurchase', 'estimatedCostPerLead', and 'estimatedCostPerMessage' using mathematical reverse engineering (CPC / CR) and behavioral indicators.
           - REVERSE ENGINEERING FRAMEWORK:
             1. Determine CPC (Cost Per Click): Estimate CPC based on current benchmarks and keyword auction strength for the specific platform/country. (e.g. If CPM is 120 and CTR is 2%, CPC = ~6).
             2. Determine CR (Conversion Rate): Estimate their website/funnel CR based on its quality (e.g., 2-3% for high-quality smooth stores like Shopify, <1% for traditional/slow stores, or 5-12% close rate for direct WhatsApp sales).
             3. Calculate Expected CPA: Expected CPA = CPC / CR. (Example: If CPC is 6, and CR is 2% (0.02). CPA = 6 / 0.02 = 300).
           - BEHAVIORAL INDICATORS (Proxies for CPA health):
             1. Ad Longevity: If their top ads have been running for >1-2 months, their CPA is highly profitable.
             2. AOV Margin Limit: A sustainable competitor's CPA almost NEVER exceeds 25%-35% of their average selling price (AOV). If they sell at 2000, CPA maxes at 500-700. Provide EXTREMELY HIGH-ACCURACY numbers based on these exact methods.
             3. Messaging campaigns: Message/Lead costs are much lower (e.g., in MENA, messaging campaigns often cost 10-35 local currency units).
           - CRITICAL TRANSPARENCY: Populate 'estimatedAOV' (Average Order Value with currency, e.g. "1200 EGP" or "150 SAR"), 'topWinningProduct' (Name of the specific product they push the most), 'productCatalogs' (Array of their top selling items or categories), 'socialPages' (Array of FULL URLs of their EXACT, VERIFIED social media pages, e.g. ["https://www.instagram.com/brand"]), 'storeLinks' (Array of FULL URLs of their exact, verified website, e.g. ["https://brand.com"]), 'seoKeywords' (Array of their most profitable search keywords), and 'seoBacklinksProfile' (Brief summary of their off-page SEO strength and backlink strategy).
           - 'priceRange' MUST ONLY BE ONE OF: "High-End", "Mid-Range", "Budget" or "Low-End" (فئة السعر). DO NOT INCLUDE NUMBERS IN THIS FIELD.
           - 'topCampaignBreakdown': Provide deeply researched estimated details of their MOST SUCCESSFUL campaign (target regions, demographics, daily budget (MUST BE A REALISTIC LOCAL SPEND, e.g., "500-1500 EGP/day", not millions), ad formats, and caption angles). MUST BE GROUNDED IN REAL MARKET PRACTICES.
           - rivalContentFormats: List the types of creative content they are scaling with.
           - Identify specific "Gaps" you can exploit.
        2. **Market Trends**: Provide credible trends. What is actually working in ad creative right now for this niche?
        3. **Funnel Strategy**: This MUST BE UNIQUE. 
           - Strategy, Ad Set Profiles, Ad Angles, etc.
        4. **Execution Roadmap**: High-impact tactical fixes.
        5. **Shared Funnel Context**: Scores and Budget context.
        
        CRITICAL OVERRIDE - LANGUAGE AND CURRENCY:
        - EVERY SINGLE text field in the JSON (except property keys) MUST be written in ${language}. This includes business summaries, problem descriptions, strategy explanations, ad copy, and rationales.
        - You may use essential English acronyms (e.g., CPA, ROAS, LTV) where appropriate, but the prose MUST be in ${language}.
        - CRITICAL NUMBER OVERRIDE: ALL numbers, percentages, and currencies MUST be written in ONLY standard English digits (e.g., 0, 1, 2, 3, 450, 1500). DO NOT use Eastern Arabic numerals (like ١, ٢, ٣) anywhere in the output.
        - NEVER translate numbers into language words either (e.g., do not write "one thousand" or "ألف", write "1000").
        - ALL budget amounts, numeric estimates, and monetary values MUST be formatted using the ${currency} currency.

        MANDATORY JSON RULES (CRITICAL):
        - Return ONLY valid JSON. No markdown blocks, no conversational filler.
        - JSON SAFETY: NEVER use raw double quotes (") inside a string value. Use single quotes (') instead.
        - Example: "rationale": "This 'strategy' works best." (CORRECT) vs "rationale": "This "strategy" works best." (ERROR)
        - Ensure the JSON is complete and not truncated.
        
        REQUIRED SCHEMA (STRICT):
        {
          "businessAudit": {
            "model": string,
            "targetAvatarSummary": string,
            "brandVoice": string,
            "conversionFriction": string
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
            "tier1": Array<{ name: string, priceRange: string, adActivity: string, weakness: string, primaryContent: string, activeAdsCount: string, campaignsCount: string, platforms: Array<{ platformName: string, campaignObjective: string, contentFormats: string, isTopPurchaseDriver: boolean }>, topCampaignBreakdown: { targetRegions: string, targetAudience: string, estimatedDailyBudget: string, adTypes: string[], captionsAngles: string[] }, estimatedCostPerPurchase: string, estimatedCostPerLead: string, estimatedCostPerMessage: string, estimatedCPM: string, estimatedAOV: string, topWinningProduct: string, productCatalogs: string[], socialPages: string[], storeLinks: string[], seoKeywords: string[], seoBacklinksProfile: string, contentStrategy: string, topHooks: string[], gap: string }>,
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
          "creativeAndAdvantage": { "uniqueAngle": string, "contentPillars": string[], "brandVoice": string, "howToOutperform": string, "primaryHooks": string[], "visualScripts": string[] },
          "executionRoadmap": { "problemSolutions": Array<{ problem: string, solution: string }>, "targetAudienceDetails": { "description": string }, "campaignStrategy": { "upcomingTypes": Array<{ type: string, objective: string }> } }
        }

        LANGUAGE: PROFESSIONAL MODERN MARKETING ${language} (Mix of ${language} and essential English acronyms).
        Avoid generic fluff. Be technical and actionable.
      `;

      let aiResult = '';
      
      if (aiProvider === 'gemini') {
        aiResult = await analyzeWithGemini(prompt, true);
      } else {
        const response = await fetch('/api/intelligence/advanced-analysis', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user!.uid
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
      
      setStrategy(parsedStrategy);
      if (parsedStrategy.sharedFunnelContext) {
        setSharedFunnelContext({
          ...parsedStrategy.sharedFunnelContext,
          updatedAt: Date.now()
        });
      }
      setLastAnalyzedAt(Date.now());
      setActiveTab('audit');
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
            'x-user-id': user!.uid
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

  const handleGenerateLongTermStrategy = async () => {
    if (!strategy || !url) return;
    
    setGeneratingRoadmap(true);
    try {
      const prompt = `Act as an ELITE GROWTH STRATEGIST. Based on the following business analysis for ${url}:
      Business Summary: ${JSON.stringify(strategy.businessSummary)}
      Detected Problems: ${JSON.stringify(strategy.detectedProblems)}
      Competitor Intelligence: ${JSON.stringify(strategy.competitorInsights)}
      Funnel Strategy: ${JSON.stringify(strategy.funnelStrategy)}
      
      Generate a professional, high-performance 90-day execution roadmap.
      
      INSTRUCTIONS:
      1. This plan must be HYPER-SPECIFIC to the business at ${url}. Do not give generic advice like "create good content".
      2. Breakdown the strategy into 3 distinct phases (Month 1: Foundation & Fixes, Month 2: Optimization & Velocity, Month 3: Scale & Dominance).
      3. For each month, include:
         - Core Strategic Focus (The "North Star" for that month).
         - Tactical Tasks: Specific technical or creative fixes.
         - Media Buying Plan: How the budget should shift or scale.
         - Creative Briefs: Specific concepts for ads.
         - Expected KPIs: Realistic growth targets based on the current state.
      
      CRITICAL OVERRIDE - LANGUAGE AND CURRENCY:
      - EVERY SINGLE text field in the response MUST be written in ${language}. Your entire output must be native ${language}.
      - You may use essential English acronyms (like CPA, ROAS, LTV) where appropriate, but the prose MUST be entirely in ${language}.
      - ALL budget amounts, numeric estimates, and monetary values MUST be formatted using exactly ${currency}.
      
      Format: Clean Markdown with bold headings and technical bullet points.`;

      let aiResult = '';
      
      if (aiProvider === 'gemini') {
        aiResult = await analyzeWithGemini(prompt, false);
      } else {
        const response = await fetch('/api/intelligence/advanced-analysis', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user!.uid
          },
          body: JSON.stringify({
            prompt,
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
        aiResult = data.result;
      }

      if (aiResult) {
        setLongTermStrategy(aiResult);
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
    }
  };

  const handleGenerateContent = async () => {
    if (!strategy || !url) return;
    
    setGeneratingContent(true);
    try {
      const prompt = `
        Act as a WORLD-CLASS DIRECT-RESPONSE COPYWRITER and CONTENT ARCHITECT.
        
        GOAL: Generate a high-conversion ad copy suite for the business at ${url}.
        
        CRITICAL CONTENT STRUCTURE:
        - For EACH funnel phase (TOF, MOF, BOF), you MUST generate exactly 3 AD SETS.
        - AD SET 1: Targeted (Females 18-35, Cairo/Giza/Alex, Beauty/Skincare/Cosmetics interests).
        - AD SET 2: Competitor Stack (Lookalikes / Competitor Interest targeting).
        - AD SET 3: Broad Audience (No interests, open targeting for algorithm testing).
        - Each Ad Set MUST contain at least 3 unique AD VARIATIONS, each with a distinct "angle" (e.g., FOMO, Benefit-driven, Social Proof).
        
        CONTEXT:
        - Business Profile: ${JSON.stringify(strategy.businessSummary)}
        - Competitor Intelligence (BENCHMARK): ${JSON.stringify(strategy.competitorInsights.tier1)}
        - Market Trends: ${JSON.stringify(strategy.marketTrends)}
        - Funnel Strategy: ${JSON.stringify(strategy.funnelStrategy)}
        - Creative Philosophy: ${strategy.creativeAndAdvantage.uniqueAngle}
        - Brand Voice: ${strategy.creativeAndAdvantage.brandVoice}
        
        CRITICAL COPYWRITING INSTRUCTIONS:
        1. HUMAN-FIRST WRITING: Avoid generic AI phrases (e.g., "In the world of...", "Unlock your potential", "Experience the difference"). Use punchy, conversational, and persuasive native ${language}.
        2. COMPETITOR COUNTER-MOVES: Analyze the competitor "Top Hooks" and "Gaps". Write copy that highlights why ${url} is superior. If competitors use generic ads, use deep emotional storytelling.
        3. DIVERSE PSYCHOLOGICAL ANGLES: For every Ad Set, vary the "angle" used in its ads. Use:
           - FOMO (Scarcity & Urgency): "Only 5 spots left", "24-hour flash sale".
           - EMOTIONAL/PAIN: Speak directly to the frustration of the customer.
           - SOCIAL PROOF/AUTHORITY: "Join 5,000+ happy clients", "Recommended by experts".
           - BENEFITS-DRIVEN: Focus on the transformation, not just features.
           - PATTERN INTERRUPT: Start with a surprising or controversial statement.
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
                      "targetingProfile": "string (e.g., Broad Interests / Competitor Lookalike)",
                      "targetingDetails": {
                        "demographics": "string (e.g., Females 18-35)",
                        "locations": "string (e.g., Cairo, Giza, Alexandria)",
                        "interests": "string[] (e.g., Beauty salons, Skincare)",
                        "strategy": "string (e.g., Detailed Interests vs Broad Testing)"
                      },
                      "ads": [
                        {
                          "headline": "string (High-Impact)",
                          "primaryText": "string (Persuasive long/medium form copy)",
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
        
        TARGETING BENCHMARKS (IF RELEVANT TO BEAUTY/EGYPT):
        - Demographics: Females 18-35
        - Locations: Cairo, Giza, Alexandria, and Major Governorates.
        - Interests: Beauty salons, Skincare, Hair removal, Cosmetics.
        - Plus inclusion of "Broad Audience" segments for Meta Algorithm testing.
        
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
          headers: { 'Content-Type': 'application/json', 'x-user-id': user!.uid },
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
          
          <div className="w-full lg:w-[450px]">
            <div className="glass-panel p-3 rounded-2xl flex flex-col gap-3 shadow-2xl border-white/20 bg-white/5 backdrop-blur-2xl">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Paste Website or Social URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="w-full pl-12 pr-4 py-4 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-all font-medium"
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
                disabled={loading || !url}
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
                Analyzes Meta, TikTok, and Market Trends automatically
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
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
                <div className="p-10 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                    <Search className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 space-y-8">
                    <div dir="auto">
                      <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Forensic Business Audit</h3>
                      <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-2xl">
                        We analyzed your business architecture and brand signals to determine the optimal growth path.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-left">Business Model Identification</p>
                        <p className="text-foreground font-bold leading-relaxed">{strategy.businessAudit?.model}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-left">Brand Voice & Persona</p>
                        <p className="text-gray-200 font-bold leading-relaxed">{strategy.businessAudit?.brandVoice}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-left">Target Avatar Profile</p>
                        <p className="text-gray-200 font-bold leading-relaxed">{strategy.businessAudit?.targetAvatarSummary}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-3 text-right" dir="auto">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-left">Major Conversion Friction</p>
                        <p className="text-gray-200 font-bold leading-relaxed">{strategy.businessAudit?.conversionFriction}</p>
                      </div>
                    </div>
                  </div>
                </div>
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
                      <p className="text-white font-bold text-sm leading-snug">{strategy.executiveSummary?.keyUnlock}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-3xl border-red-500/20 bg-red-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-red-500/20 shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="w-full text-right" dir="auto">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Survival Threat</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy.executiveSummary?.theTruth}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="w-full text-right" dir="auto">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Scale Opportunity</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy.executiveSummary?.scaleOpportunity || strategy.creativeAndAdvantage?.uniqueAngle}</p>
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
                    {strategy.sharedFunnelContext && (
                      <div className="glass-panel p-8 rounded-[3rem] border border-blue-500/20 bg-blue-500/5">
                        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                          <Activity className="w-6 h-6 text-blue-400" />
                          Budget Signal Context
                        </h2>
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Scaling Confidence</span>
                            <span className={cn("text-xs font-black uppercase tracking-widest", 
                              strategy.sharedFunnelContext.scalingConfidence === 'High' ? 'text-emerald-400' :
                              strategy.sharedFunnelContext.scalingConfidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                            )}>{strategy.sharedFunnelContext.scalingConfidence}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Suggested Test Budget</span>
                            <span className="text-xs font-black text-indigo-400">${strategy.sharedFunnelContext.recommendedTestingBudget}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Acquisition Difficulty</span>
                            <span className="text-xs font-black text-purple-400">{strategy.sharedFunnelContext.acquisitionDifficulty}</span>
                          </div>
                          {strategy.sharedFunnelContext.rationale && (
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
                        {strategy.detectedProblems?.map((problem: any, idx: number) => (
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
                          <h3 className="text-3xl font-black text-white leading-none mb-2">Top Market Hybrid: {strategy.competitorInsights.topCompetitorName}</h3>
                          <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Strategic Benchmarking Analysis</p>
                        </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-[#0B0F19]/50 border border-white/5">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Why they are winning (The Rationale)
                        </h4>
                        <p className="text-lg text-gray-200 font-medium leading-relaxed italic text-right">
                          {strategy.competitorInsights.topCompetitorRationale || "Detailed performance data locked."}
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

                {strategy.competitorInsights.marketBroad && (
                  <div className="pt-8 border-t border-white/5">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                      <Users className="w-5 h-5 text-purple-400" />
                      Global & Indirect Players
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {strategy.competitorInsights.marketBroad?.map((comp: any, idx: number) => (
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
                    <p className="text-2xl font-black text-blue-400 leading-tight mb-4 text-right">{strategy.creativeAndAdvantage.uniqueAngle}</p>
                    <p className="text-gray-300 text-right">{strategy.creativeAndAdvantage.howToOutperform}</p>
                  </div>
                  <div className="glass-panel p-8 rounded-[2rem] border-indigo-500/20">
                    <h2 className="text-xl font-black text-white mb-6">Proposed Core Hooks</h2>
                    <div className="space-y-4">
                      {strategy.creativeAndAdvantage.primaryHooks?.map((h: string, i: number) => (
                        <div key={i} className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-100 font-bold italic text-right">"{h}"</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[3rem] border-pink-500/20 bg-pink-500/5">
                  <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                    <ImageIcon className="w-6 h-6 text-pink-400" />
                    Visual Ad Scripts (UGC / Production)
                  </h2>
                  <div className="grid grid-cols-1 gap-8">
                    {strategy.creativeAndAdvantage.visualScripts?.map((script: string, i: number) => (
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
                          {strategy.executionRoadmap?.problemSolutions?.map((item: any, idx: number) => (
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

                    {longTermStrategy ? (
                      <div className="glass-panel p-8 rounded-3xl border-l-4 border-indigo-500 bg-indigo-500/5">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                            3-Month Battle Plan
                          </h2>
                          <button onClick={handleGenerateLongTermStrategy} className="text-xs font-black text-indigo-400 uppercase">Regenerate</button>
                        </div>
                        <div className="prose prose-invert prose-indigo max-w-none text-sm text-right">
                          <ReactMarkdown>{longTermStrategy}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-12 rounded-[2rem] text-center bg-indigo-500/5">
                        <Rocket className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-white mb-6">Need a full 3-month growth plan?</h3>
                        <button
                          onClick={handleGenerateLongTermStrategy}
                          disabled={generatingRoadmap}
                          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all"
                        >
                          {generatingRoadmap ? "Calculating Plan..." : "Generate Master Roadmap"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-3xl text-right">
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 text-left">Target Audience Details</h4>
                      <p className="text-sm text-gray-300 font-medium leading-relaxed">{strategy.executionRoadmap?.targetAudienceDetails?.description}</p>
                    </div>
                    <div className="glass-panel p-8 rounded-3xl bg-emerald-500/5 border-emerald-500/10 text-right">
                       <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 text-left">Winning Campaign Formats</h4>
                       <div className="space-y-4">
                         {strategy.executionRoadmap?.campaignStrategy?.upcomingTypes?.map((camp: any, idx: number) => (
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
                  <span className="text-xs font-black text-indigo-400">{data.metaLocations || 'Egypt'}</span>
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
