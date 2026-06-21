import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  Target, 
  Globe, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Layout, 
  Megaphone, 
  Coins, 
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  PieChart,
  BrainCircuit,
  Zap,
  ChevronDown,
  ChevronUp,
  Share2,
  ExternalLink,
  MessageSquare,
  Flame,
  BarChart3,
  Layers,
  Sparkles,
  Calculator,
  History
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeSocialPage } from '../services/scraper';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

interface Section {
  id: string;
  title: string;
  icon: any;
  titleAr: string;
}

const sections: Section[] = [
  { id: 'audit', title: 'Profile Audit', icon: ShieldCheck, titleAr: 'تدقيق الصفحة' },
  { id: 'competitors', title: 'Competitor Intel', icon: Search, titleAr: 'تحليل المنافسين' },
  { id: 'market', title: 'Market Logic', icon: Globe, titleAr: 'تحليل السوق' },
  { id: 'audience', title: 'Audience Persona', icon: Users, titleAr: 'شخصية العميل' },
  { id: 'strategy', title: 'Media Plan (Ads)', icon: Megaphone, titleAr: 'خطة الإعلانات' },
  { id: 'creative', title: 'Creative Hook Strategy', icon: Flame, titleAr: 'استراتيجية المحتوى' },
];

export function SocialStrategyAuditor() {
  const { user } = useAuth();
  const { selectedAccountId, platform, metaSubPlatform, datePreset, metaToken, googleToken, tiktokToken, adAccounts } = useFilters();
  const [profileUrl, setProfileUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [market, setMarket] = useState('Egypt');
  const [budget, setBudget] = useState('1000');
  const [currency, setCurrency] = useState('USD');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('audit');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeAccount = selectedAccountId ? adAccounts.find(a => a.id === selectedAccountId) : null;

  const getToken = React.useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const addCompetitor = () => setCompetitorUrls([...competitorUrls, '']);
  const removeCompetitor = (index: number) => {
    const newUrls = [...competitorUrls];
    newUrls.splice(index, 1);
    setCompetitorUrls(newUrls);
  };
  const updateCompetitor = (index: number, val: string) => {
    const newUrls = [...competitorUrls];
    newUrls[index] = val;
    setCompetitorUrls(newUrls);
  };

  const handleRunAnalysis = async () => {
    if (!profileUrl) {
      setError('Please provide a profile or page URL.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);
    setProgress(5);
    setProgressLabel('Initializing operator engine...');

    try {
      // 1. Scrape Main Profile
      setProgress(20);
      setProgressLabel(`Scraping main profile: ${profileUrl}...`);
      let profileData = {};
      try {
        const platformType = profileUrl.includes('facebook') ? 'facebook' : 
                         profileUrl.includes('instagram') ? 'instagram' : 
                         profileUrl.includes('tiktok') ? 'tiktok' : 'facebook';
        profileData = await scrapeSocialPage(profileUrl, platformType as any);
      } catch (e) {
        console.warn('Scraping failed, proceeding with manual awareness', e);
      }

      // 2. Fetch Live Campaign Data if connected
      setProgress(40);
      setProgressLabel('Syncing live ad account data...');
      let campaignContext = "";
      const token = getToken();

      if (token && selectedAccountId && user) {
        try {
          const headers = { 'x-user-id': user.uid, [`x-${platform}-token`]: token };
          const q = `accountId=${selectedAccountId}&platform=${platform}&subPlatform=${metaSubPlatform}`;
          const [campRes, insightRes] = await Promise.all([
            fetch(`/api/campaigns?${q}`, { headers }),
            fetch(`/api/insights?${q}&datePreset=${datePreset}`, { headers })
          ]);
          
          const campData = await safeJson(campRes);
          const insightData = await safeJson(insightRes);
          
          if (campData.campaigns && insightData.insights) {
            const combined = campData.campaigns.map((c: any) => {
              const metrics = insightData.insights.find((i: any) => i.id === c.id)?.metrics;
              return { name: c.name, status: c.status, budget: c.raw?.daily_budget, metrics };
            }).filter((c: any) => c.status !== 'ARCHIVED');
            
            campaignContext = JSON.stringify(combined).substring(0, 50000); // Up to 50k chars
          }
        } catch (fetchErr) {
          console.warn('Could not fetch live campaign data', fetchErr);
        }
      }

      // 3. Prepare Detailed Prompt
      setProgress(60);
      setProgressLabel('Generating strategy blueprint...');

      const prompt = `
        You are a World-Class Performance Marketing Strategist and Digital Growth Architect. 
        Perform a comprehensive "Evidence-Based" audit and marketing strategy for the following business:
        
        MAIN PROFILE URL: ${profileUrl}
        COMPETITOR URLS: ${competitorUrls.filter(u => u).join(', ')}
        TARGET MARKET: ${market}
        MONTHLY BUDGET: ${budget} ${currency}
        
        CONTEXT DATA (Scraped): ${JSON.stringify(profileData).substring(0, 100000)}
        
        ${campaignContext ? `REAL AD ACCOUNT DATA:\n${campaignContext}\n(Use this real data to inform your audit instead of just relying on the website)` : `Note: No live ad account connected.`}
        
        INSTRUCTIONS:
        1. Use Google Search Grounding to find REAL-WORLD evidence for benchmarks, competitor pricing, and active offers in the ${market} market.
        2. DO NOT provide generic AI advice. All ideas MUST be innovative, specific to the current social media landscape (2024+), and backed by psychology or market trends.
        3. Analyze "Product Demand": Identify if the product/service on the page is seasonal, current demand strength, and how to exploit growth windows.
        4. Analyze "Creative Failure": Specifically identify why their current Reels or Posts might be failing (e.g., poor hook, boring middle, lack of visual punch, weak CTA).
        5. Provide your findings in a structured JSON format.
        6. All textual descriptions (brandingGuidance, strengths, reasons, innovativeIdeas) MUST be bilingual (English followed by detailed Arabic) to support the user.
        
        REQUIRED JSON STRUCTURE:
        {
          "audit": {
            "score": 0-100,
            "missingElements": ["Element 1 (English/Arabic)", "Element 2"],
            "brandingGuidance": "Detailed breakdown of branding gaps (English/Arabic)",
            "frequency": "Specific count (e.g., 4 Reels, 2 Posts per week)",
            "organicStatus": "Brutally honest verdict on current performance"
          },
          "competitors": {
            "strengthAnalysis": "How they dominate or fail",
            "pricingStrategy": "Real-world pricing benchmarks for this market",
            "mainOffers": ["Specific Offer 1", "Offer 2"],
            "topPlatforms": ["Platform A", "Platform B"],
            "hooks": {
              "reels": ["Psychological Hook 1 (Arabic)", "Hook 2"],
              "static": ["Post Hook 1 (Arabic)"]
            }
          },
          "marketLogic": {
            "demandStrength": "Detailed demand analysis (High/Med/Low) + Seasonality peaks",
            "seasonality": "Specific months and why (Arabic)",
            "financialBenchmarks": {
              "cpl": "Target Range in ${currency}",
              "cpa": "Target Range in ${currency}",
              "cr": "Expected Conv Rate %",
              "cpr": "Expected Result Cost"
            },
            "sources": ["Real Source/Article 1", "Real Source 2"]
          },
          "audience": {
            "persona": {
              "name": "Creative Persona Name",
              "pains": ["Pain Points (Detailed)"],
              "desires": ["Desires/Aspirations"]
            },
            "funnel": [
              { "stage": "TOFU (Awareness)", "messaging": "Specific ad angle" },
              { "stage": "MOFU (Consideration)", "messaging": "Trust-building angle" },
              { "stage": "BOFU (Conversion)", "messaging": "Closing offer angle" }
            ]
          },
          "adsStrategy": {
            "campaignStructure": {
              "type": "CBO or ABO recommended and WHY",
              "reasoning": "Strategy rationale",
              "totalCampaigns": number,
              "adSetsPerCampaign": number,
              "adsPerSet": number
            },
            "budgetAllocation": {
              "testing": "Amount in ${currency}",
              "scaling": "Amount in ${currency}",
              "retargeting": "Amount in ${currency}"
            },
            "campaignTimeline": "Week-by-week execution plan"
          },
          "creativeIntel": {
            "whyFail": "Detailed technical reasons why their current videos/posts might be boring or failing to convert",
            "mustDos": ["Actionable Rule 1", "Actionable Rule 2"],
            "innovativeIdeas": ["Specific, non-generic creative concept 1", "Concept 2"]
          }
        }
      `;

      setProgress(60);
      setProgressLabel('Grounding models with live market data...');
      
      const response = await analyzeWithGemini(prompt, true);
      const parsed = JSON.parse(response);
      
      setProgress(90);
      setProgressLabel('Finishing report compilation...');
      
      setAnalysisResult(parsed);
      setProgress(100);
      setIsAnalyzing(false);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'The strategic audit engine encountered an error. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-2xl border border-brand-accent/40 shadow-[0_0_25px_rgba(59,130,246,0.2)]">
              <BrainCircuit className="w-7 h-7 text-primary" />
            </div>
            Advanced Social Strategy & Audit
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl px-1">
            Analyze any social media page to extract missing elements, competitor pricing, ad structure, and market-specific financial benchmarks using AI grounding.
          </p>
        </div>
      </div>

      {/* Input Section */}
      {!analysisResult && !isAnalyzing && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div className="glass-panel p-8 rounded-3xl space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-accent" />
                Main Profile / Page URL
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="https://facebook.com/yourpage"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all font-medium text-lg"
                />
                <div className="absolute inset-0 bg-brand-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                Competitor Links
              </label>
              <div className="space-y-3">
                {competitorUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Competitor URL..."
                      value={url}
                      onChange={(e) => updateCompetitor(i, e.target.value)}
                      className="flex-1 bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all"
                    />
                    <button 
                      onClick={() => removeCompetitor(i)}
                      className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors border border-transparent hover:border-red-400/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={addCompetitor}
                  className="flex items-center gap-2 text-sm font-medium text-brand-accent hover:text-blue-400 transition-colors bg-brand-accent/5 px-4 py-2 rounded-xl border border-dashed border-brand-accent/30"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Competitor
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Target Market
                </label>
                <input
                  type="text"
                  placeholder="Egypt, UAE, USA..."
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  Desired Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all appearance-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (LE)</option>
                  <option value="SAR">SAR (SR)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                Monthly Ad Budget
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{currency}</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-2xl pl-16 pr-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all text-xl font-bold"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleRunAnalysis}
                className="w-full bg-brand-accent hover:bg-blue-500 text-white font-bold py-5 rounded-3xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-[0_10px_30px_rgba(59,130,246,0.3)] group"
              >
                <Zap className="w-6 h-6 fill-white group-hover:animate-pulse" />
                Run Intelligence Audit
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="glass-panel p-16 rounded-[2rem] flex flex-col items-center justify-center space-y-8 min-h-[500px]">
          <div className="relative">
            <div className="w-32 h-32 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
            <BrainCircuit className="w-12 h-12 text-brand-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">{progressLabel}</h2>
            <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-brand-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              />
            </div>
            <p className="text-gray-500 text-sm font-medium tracking-wide">PHASE {progress < 30 ? '1: OSINT' : progress < 60 ? '2: COMPETITIVE' : '3: SYNTHESIS'}</p>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="xl:col-span-1 space-y-2">
            <div className="glass-panel p-4 rounded-3xl sticky top-8">
              <div className="mb-4 px-4 py-2 bg-brand-accent/10 rounded-xl border border-brand-accent/20">
                <span className="text-[10px] font-black uppercase text-brand-accent tracking-[.25em]">Report Output</span>
              </div>
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm transition-all duration-300 group",
                    activeTab === section.id 
                      ? "bg-brand-accent text-white shadow-xl translate-x-1" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className={cn("w-4 h-4", activeTab === section.id ? "text-white" : "text-gray-500 group-hover:text-brand-accent")} />
                    <div className="flex flex-col items-start translate-y-0.5">
                      <span className="font-bold">{section.title}</span>
                      <span className="text-[10px] opacity-60 font-medium font-sans antialiased">{section.titleAr}</span>
                    </div>
                  </div>
                  {activeTab === section.id && <ArrowRight className="w-4 h-4" />}
                </button>
              ))}
              
              <div className="mt-8 pt-6 border-t border-white/5">
                <button className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold text-brand-accent bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors border border-brand-accent/20">
                  <Share2 className="w-4 h-4" />
                  Export Strategy PDF
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-10 rounded-[2.5rem] bg-[#0F172A]/40"
              >
                {activeTab === 'audit' && (
                  <div className="space-y-10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Profile Audit</h2>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Audit Score</p>
                          <p className={cn(
                            "text-4xl font-black italic",
                            (analysisResult?.audit?.score || 0) > 70 ? "text-emerald-400" :
                            (analysisResult?.audit?.score || 0) > 40 ? "text-amber-400" : "text-red-400"
                          )}>
                            {analysisResult?.audit?.score || 0}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right font-sans antialiased" dir="rtl">
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                          <div className="w-2 h-8 bg-brand-accent rounded-full" />
                          ما ينقص صفحتك حالياً
                        </h3>
                        <div className="space-y-3">
                          {(analysisResult?.audit?.missingElements || []).map((el: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-muted-foreground">
                              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                              <span className="font-medium text-lg leading-relaxed">{el}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                          <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                          دليل البراندينج والتحسين
                        </h3>
                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] text-gray-300 leading-relaxed text-lg italic">
                          <ReactMarkdown>{analysisResult?.audit?.brandingGuidance || ""}</ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between p-5 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-brand-accent" />
                            <span className="font-bold text-brand-accent">معدل النشر المقترح</span>
                          </div>
                          <span className="text-xl font-bold text-white">{analysisResult?.audit?.frequency || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'competitors' && (
                  <div className="space-y-10">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                      Competitor Intel
                      <span className="text-xs bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-full border border-brand-accent/20 uppercase tracking-widest font-black">Ad Spy Grounded</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="glass-panel p-6 rounded-2xl border-white/5 bg-white/[0.02]">
                        <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2">Pricing Strategy</p>
                        <p className="text-lg text-white font-medium">{analysisResult?.competitors?.pricingStrategy || "N/A"}</p>
                      </div>
                      <div className="glass-panel p-6 rounded-2xl border-white/5 bg-white/[0.02]">
                        <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2">Active Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {(analysisResult?.competitors?.topPlatforms || []).map((p: string) => (
                            <span key={p} className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-lg text-xs font-bold border border-brand-accent/20">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="glass-panel p-6 rounded-2xl border-white/5 bg-white/[0.02]">
                        <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2">Benchmarking</p>
                        <p className="text-lg text-white font-medium italic">"{analysisResult?.competitors?.strengthAnalysis?.substring(0, 100)}..."</p>
                      </div>
                    </div>

                    <div className="space-y-6 text-right" dir="rtl">
                      <h3 className="text-xl font-bold text-white">أنواع الـ Hooks الناجحة للمنافسين</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-brand-accent/5 rounded-3xl border border-brand-accent/10 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-5 h-5 text-orange-400" />
                            <h4 className="font-bold text-lg text-foreground">Reels Hooks (المقاطع القصيرة)</h4>
                          </div>
                          {(analysisResult?.competitors?.hooks?.reels || []).map((h: string, i: number) => (
                            <div key={i} className="flex gap-4 items-start p-3 bg-white/5 rounded-xl text-gray-300">
                              <div className="w-6 h-6 rounded-full bg-orange-400/20 text-orange-400 flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>
                              <p className="text-md leading-relaxed">{h}</p>
                            </div>
                          ))}
                        </div>
                        <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                            <h4 className="font-bold text-lg text-gray-200">Post Hooks (البوستات)</h4>
                          </div>
                          {(analysisResult?.competitors?.hooks?.static || []).map((h: string, i: number) => (
                            <div key={i} className="flex gap-4 items-start p-3 bg-white/5 rounded-xl text-gray-300">
                              <div className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>
                              <p className="text-md leading-relaxed">{h}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'market' && (
                  <div className="space-y-10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Market Logic</h2>
                      <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 font-bold text-sm tracking-wide">
                        {market} / {currency}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="glass-panel p-8 rounded-3xl bg-white/[0.02] border-emerald-500/10 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">AVG CPL</p>
                        <p className="text-2xl font-black text-emerald-400 mb-1">{analysisResult?.marketLogic?.financialBenchmarks?.cpl || "N/A"}</p>
                        <p className="text-[10px] text-gray-500 font-bold italic">Source: Grounded Intel</p>
                      </div>
                      <div className="glass-panel p-8 rounded-3xl bg-white/[0.02] border-emerald-500/10 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">AVG CPA</p>
                        <p className="text-2xl font-black text-brand-accent mb-1">{analysisResult?.marketLogic?.financialBenchmarks?.cpa || "N/A"}</p>
                      </div>
                      <div className="glass-panel p-8 rounded-3xl bg-white/[0.02] border-emerald-500/10 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">CR %</p>
                        <p className="text-2xl font-black text-amber-400 mb-1">{analysisResult?.marketLogic?.financialBenchmarks?.cr || "N/A"}</p>
                      </div>
                      <div className="glass-panel p-8 rounded-3xl bg-white/[0.02] border-emerald-500/10 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">CPM/CPR</p>
                        <p className="text-2xl font-black text-purple-400 mb-1">{analysisResult?.marketLogic?.financialBenchmarks?.cpr || "N/A"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right" dir="rtl">
                      <div className="space-y-4 p-8 bg-card/50 rounded-[2rem] border border-white/5 shadow-2xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                          قوة الطلب (Demand Analysis)
                        </h3>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border",
                            (analysisResult?.marketLogic?.demandStrength || "").toLowerCase().includes('high') ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          )}>
                            {analysisResult?.marketLogic?.demandStrength || "N/A"}
                          </div>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                          {analysisResult?.marketLogic?.seasonality || "N/A"}
                        </p>
                      </div>
                      
                      <div className="space-y-4 p-8 bg-brand-panel/50 rounded-[2rem] border border-white/5">
                        <h3 className="text-xl font-bold text-white">المصادر والأدلة (Reliable Sources)</h3>
                        <div className="space-y-3">
                          {(analysisResult?.marketLogic?.sources || []).map((s: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl text-gray-400 text-sm italic">
                              <ExternalLink className="w-4 h-4 text-emerald-400" />
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'audience' && (
                  <div className="space-y-10">
                    <h2 className="text-3xl font-bold text-white">Audience Persona</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      <div className="glass-panel p-10 rounded-[2.5rem] bg-gradient-to-br from-brand-accent/10 to-transparent border-brand-accent/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 transform translate-x-1/2 -translate-y-1/2 opacity-10 group-hover:scale-110 transition-transform duration-700">
                          <Users className="w-48 h-48 text-brand-accent" />
                        </div>
                        <div className="relative z-10 space-y-6">
                          <div className="space-y-2">
                            <span className="px-3 py-1 bg-brand-accent/20 text-brand-accent rounded-full text-[10px] font-black tracking-widest uppercase border border-brand-accent/30">Target Persona</span>
                            <h3 className="text-4xl font-black text-white">{analysisResult?.audience?.persona?.name || "N/A"}</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6" dir="rtl">
                            <div className="space-y-4 text-right">
                              <h4 className="text-emerald-400 font-bold flex items-center gap-2">الرغبات والمكاسب</h4>
                              <ul className="space-y-2">
                                {(analysisResult?.audience?.persona?.desires || []).map((d: string) => (
                                  <li key={d} className="text-gray-300 text-sm flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-500 shrink-0" />{d}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-4 text-right">
                              <h4 className="text-red-400 font-bold flex items-center gap-2">الآلام والتحديات</h4>
                              <ul className="space-y-2">
                                {(analysisResult?.audience?.persona?.pains || []).map((p: string) => (
                                  <li key={p} className="text-gray-300 text-sm flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-500 shrink-0" />{p}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          <Layers className="w-6 h-6 text-brand-accent" />
                          Funnel Segmentation
                        </h3>
                        <div className="space-y-4 text-right" dir="rtl">
                          {(analysisResult?.audience?.funnel || []).map((item: any, i: number) => (
                            <div key={i} className="group relative">
                              <div className="flex items-center gap-6 p-6 glass-panel rounded-3xl border-white/5 hover:border-brand-accent/30 transition-all hover:bg-brand-accent/[0.02]">
                                <div className="flex flex-col items-center justify-center shrink-0 w-20 h-20 bg-brand-panel border border-white/10 rounded-2xl shadow-xl">
                                  <span className="text-xs font-black text-gray-500 tracking-widest">{item.stage}</span>
                                  <span className="text-2xl font-black text-white italic">0{i+1}</span>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="text-lg font-bold text-white">{item.stage === 'TOFU' ? 'البحث والاستكشاف' : item.stage === 'MOFU' ? 'التفكير والمقارنة' : 'اتخاذ القرار'}</h4>
                                  <p className="text-gray-400 text-md leading-relaxed">{item.messaging}</p>
                                </div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-12 h-12 bg-brand-accent text-white flex items-center justify-center rounded-full shadow-2xl scale-75 group-hover:scale-100 transition-all duration-300">
                                    <ArrowRight className="w-5 h-5 -rotate-180" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'strategy' && (
                  <div className="space-y-10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Ads Strategy & Architecture</h2>
                      <div className="p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl flex items-center gap-3">
                        <Coins className="w-5 h-5 text-brand-accent" />
                        <span className="text-xl font-black text-white">{budget} {currency}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="p-8 glass-panel rounded-[2rem] border-brand-accent/20 bg-gradient-to-br from-brand-accent/[0.03] to-transparent text-center space-y-4">
                          <Calculator className="w-10 h-10 text-brand-accent mx-auto" />
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Testing Phase</p>
                            <p className="text-3xl font-black text-white">{analysisResult?.adsStrategy?.budgetAllocation?.testing || "N/A"}</p>
                          </div>
                       </div>
                       <div className="p-8 glass-panel rounded-[2rem] border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-transparent text-center space-y-4">
                          <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto" />
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Scaling Phase</p>
                            <p className="text-3xl font-black text-white">{analysisResult?.adsStrategy?.budgetAllocation?.scaling || "N/A"}</p>
                          </div>
                       </div>
                       <div className="p-8 glass-panel rounded-[2rem] border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-transparent text-center space-y-4">
                          <History className="w-10 h-10 text-amber-400 mx-auto" />
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Retargeting</p>
                            <p className="text-3xl font-black text-white">{analysisResult?.adsStrategy?.budgetAllocation?.retargeting || "N/A"}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-8 text-right" dir="rtl">
                      <div className="p-10 glass-panel rounded-[2.5rem] bg-[#111827]/40 border-white/5 space-y-8">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center border border-brand-accent/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                             <BarChart3 className="w-6 h-6 text-brand-accent" />
                           </div>
                           <h3 className="text-2xl font-bold text-white">هيكل الحملات الإعلانية (Hierarchy)</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                              <span className="text-gray-400 font-bold">نوع الاستراتيجية</span>
                              <span className="text-xl font-black text-brand-accent italic translate-y-0.5">{analysisResult?.adsStrategy?.campaignStructure?.type || "N/A"}</span>
                            </div>
                            <div className="space-y-3">
                              <p className="text-lg font-bold text-gray-200">الأرقام المقترحة للهيكل:</p>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10">
                                  <p className="text-2xl font-black text-white">{analysisResult?.adsStrategy?.campaignStructure?.totalCampaigns || 0}</p>
                                  <p className="text-[10px] font-black uppercase text-gray-500">Campaigns</p>
                                </div>
                                <div className="p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10">
                                  <p className="text-2xl font-black text-white">{analysisResult?.adsStrategy?.campaignStructure?.adSetsPerCampaign || 0}</p>
                                  <p className="text-[10px] font-black uppercase text-gray-500">Ad Sets</p>
                                </div>
                                <div className="p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10">
                                  <p className="text-2xl font-black text-white">{analysisResult?.adsStrategy?.campaignStructure?.adsPerSet || 0}</p>
                                  <p className="text-[10px] font-black uppercase text-gray-500">Ads</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="p-6 bg-brand-panel rounded-[2rem] border border-border">
                              <h4 className="text-brand-accent font-bold mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                لماذا هذا الهيكل؟
                              </h4>
                              <p className="text-gray-400 text-md leading-relaxed italic">"{analysisResult?.adsStrategy?.campaignStructure?.reasoning || ""}"</p>
                            </div>
                            <div className="p-6 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10">
                              <h4 className="text-indigo-400 font-bold mb-3 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                الجدول الزمني (Timeline)
                              </h4>
                              <p className="text-gray-300 text-md leading-relaxed">{analysisResult?.adsStrategy?.campaignTimeline || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'creative' && (
                  <div className="space-y-10">
                     <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                       Creative Hook Strategy
                       <Sparkles className="w-6 h-6 text-brand-accent" />
                     </h2>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right" dir="rtl">
                       <div className="space-y-8">
                         <div className="p-8 glass-panel rounded-[2.5rem] bg-red-500/[0.02] border-red-500/10 space-y-4">
                            <h3 className="text-xl font-bold text-red-400 flex items-center gap-3">
                              لماذا قد تفشل الكرييتيف الحالية؟
                            </h3>
                            <p className="text-gray-300 text-lg leading-relaxed italic">
                              {analysisResult?.creativeIntel?.whyFail || "N/A"}
                            </p>
                         </div>

                         <div className="p-8 glass-panel rounded-[2.5rem] border-white/5 space-y-6">
                            <h3 className="text-xl font-bold text-white">قواعد ذهبية لا غنى عنها</h3>
                            <div className="space-y-3">
                              {(analysisResult?.creativeIntel?.mustDos || []).map((rule: string, idx: number) => (
                                <div key={idx} className="flex gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-300">
                                   <CheckCircle2 className="w-5 h-5 shrink-0 translate-y-0.5" />
                                   <span className="font-medium">{rule}</span>
                                </div>
                              ))}
                            </div>
                         </div>
                       </div>

                       <div className="p-10 glass-panel rounded-[3rem] bg-brand-accent/[0.03] border-brand-accent/20 relative overflow-hidden flex flex-col items-center justify-center text-center">
                          <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 translate-x-1/4 -translate-y-1/4 scale-150">
                            <Sparkles className="w-64 h-64 text-brand-accent" />
                          </div>
                          <div className="relative z-10 space-y-10">
                            <div className="space-y-2">
                              <span className="px-4 py-2 bg-brand-accent/20 text-brand-accent rounded-full text-xs font-black tracking-widest uppercase">Operator Suggestions</span>
                              <h3 className="text-3xl font-black text-white">أفكار إبداعية خارج الصندوق</h3>
                            </div>
                            <div className="space-y-6">
                              {(analysisResult?.creativeIntel?.innovativeIdeas || []).map((idea: string, i: number) => (
                                <div key={i} className="group cursor-default">
                                  <div className="p-6 bg-[#0F172A] border border-white/5 rounded-3xl hover:border-brand-accent/40 shadow-xl transition-all hover:scale-[1.03] duration-500">
                                    <p className="text-gray-300 text-lg leading-relaxed font-bold group-hover:text-white">{idea}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                       </div>
                     </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Persistence Note */}
      {analysisResult && (
        <div className="flex justify-center pt-8">
           <div className="px-6 py-3 bg-white/5 rounded-full border border-white/10 flex items-center gap-3 text-gray-500 text-sm italic">
             <Info className="w-4 h-4" />
             This strategic report is grounded in real-time market data sourced via Google Gemini. Review benchmarks for seasonal variance.
           </div>
        </div>
      )}

      {error && (
        <div className="flex justify-center">
          <div className="max-w-md w-full glass-panel p-6 border-red-500/20 text-center animate-in fade-in zoom-in duration-300">
             <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
             <h3 className="text-white font-bold mb-1">Audit Failed</h3>
             <p className="text-red-400 text-sm mb-4">{error}</p>
             <button onClick={() => setError(null)} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
