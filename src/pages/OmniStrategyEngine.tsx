import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Zap, Sparkles, BrainCircuit, Layout, Target, Shield, ActivitySquare, AlertCircle, Video, Rocket, PenTool, CheckSquare, Calculator, Flame, ChevronRight, Eye, RefreshCw, BarChart3, Database, Workflow, Diamond
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { CRO_AND_AOV_INTELLIGENCE_DIRECTIVE } from '../lib/operatorDirectives';
import { scrapeWebsite } from '../services/scraper';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

interface OmniPlan {
  brandOS: {
    archetype: string;
    positioning: string;
    coreMessage: string;
  };
  bcEngine: {
    winningAngles: Array<{ title: string; hook: string; reason: string }>;
  };
  creativeProduction: {
    videoConcepts: Array<{ scene: string; visual: string; text: string }>;
    imageFormats: string[];
  };
  journeyIntel: {
    tofu: string;
    mofu: string;
    bofu: string;
  };
  scalingEngine: {
    budgetDistribution: string;
    scalingRules: string[];
  };
  contentArchitect: {
    primaryCaption: string;
    hashtags: string[];
  };
  sfkStrategy: {
    targeting: string;
    biddingStrategy: string;
    campaignStructure: string;
  };
  strategyAuditor: {
    potentialRisks: string[];
    quickWins: string[];
  };
  budgetPlanner: {
    suggestedDailyAdSpend: string;
    expectedCPA: string;
    roasBreakEven: string;
    profitabilityNote: string;
  };
}

export function OmniStrategyEngine() {
  const { user } = useAuth();
  const { selectedAccountId, platform } = useFilters();
  
  const [activeTab, setActiveTab] = useState<'url' | 'account'>('account');
  const [url, setUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<OmniPlan | null>(null);

  const [activeModule, setActiveModule] = useState<string>('brandOS');

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);
    setPlan(null);

    try {
      let contextData = '';
      let sourceType = '';

      if (activeTab === 'url') {
        if (!url) throw new Error("الرجاء إدخال رابط الموقع (URL).");
        sourceType = "New Client Website";
        let scraped = "Failed to scrape, relying on base URL.";
        try {
          const res = await scrapeWebsite(url);
          scraped = res.text?.substring(0, 3000) || '';
        } catch (e) {
          console.warn("Scraping blocked or failed, treating as broad link:", e);
        }
        contextData = `Website URL: ${url}\nIndustry: ${industry}\nScraped Data: ${scraped}`;
      } else {
        if (!selectedAccountId) throw new Error("الرجاء تحديد حساب إعلاني مربوط من القائمة العليا.");
        sourceType = "Connected Ad Account Data";
        
        try {
          // Fetch real data from the connected account!
          const token = localStorage.getItem(`${platform}Token`);
          const res = await fetch(`/api/analysis?accountId=${selectedAccountId}&platform=${platform}`, {
            headers: {
              'x-user-id': user?.uid || '',
              'x-meta-token': token || ''
            }
          });
          if (res.ok) {
            const data = await res.json();
            contextData = JSON.stringify(data).substring(0, 5000); // Only pass first 5000 chars to avoid quota
          } else {
            contextData = `Account ID: ${selectedAccountId}. Failed to pull full metrics, but please synthesize best practices for a standard connected advertiser.`;
          }
        } catch (e) {
          contextData = `Account ID: ${selectedAccountId}. Platform: ${platform}. Metrics could not be fetched fully.`;
        }
      }

      const prompt = `
You are the Master "Omni-Strategy Engine" unifying 9 distinct ad agencies into one super-brain.
Your goal is to build an interconnected master plan based on either a New Client's Website URL or an existing Connected Ad Account metrics.

Context Type: ${sourceType}
Context Data: ${contextData}

${CRO_AND_AOV_INTELLIGENCE_DIRECTIVE}

CRITICAL RULES:
- Adhere completely to the Project Rules: Value Net Profit & Margin over Vanity ROAS!
- Reply ONLY in valid JSON matching this schema exactly.

{
  "brandOS": {
    "archetype": "string (brand archetype)",
    "positioning": "string (market position)",
    "coreMessage": "string (one-liner message)"
  },
  "bcEngine": {
    "winningAngles": [
      { "title": "string", "hook": "string", "reason": "string" }
    ]
  },
  "creativeProduction": {
    "videoConcepts": [
      { "scene": "string", "visual": "string", "text": "string" }
    ],
    "imageFormats": ["string", "string"]
  },
  "journeyIntel": {
    "tofu": "string (Top of Funnel strategy)",
    "mofu": "string (Middle of Funnel strategy)",
    "bofu": "string (Bottom of Funnel strategy)"
  },
  "scalingEngine": {
    "budgetDistribution": "string",
    "scalingRules": ["string", "string"]
  },
  "contentArchitect": {
    "primaryCaption": "string (Arabic ad caption)",
    "hashtags": ["string", "string"]
  },
  "sfkStrategy": {
    "targeting": "string",
    "biddingStrategy": "string",
    "campaignStructure": "string"
  },
  "strategyAuditor": {
    "potentialRisks": ["string", "string"],
    "quickWins": ["string", "string"]
  },
  "budgetPlanner": {
    "suggestedDailyAdSpend": "string",
    "expectedCPA": "string",
    "roasBreakEven": "string",
    "profitabilityNote": "string (Crucial: explain that Net Profit > ROAS, mention shipping/product costs)"
  }
}

Respond in Arabic except for English marketing terms. MUST BE PARSABLE JSON. Do not add markdown around json.
      `;

      try {
        const responseJsonText = await analyzeWithGemini(prompt, true);
        const parsed = JSON.parse(responseJsonText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, ""));
        if (!parsed || !parsed.brandOS) throw new Error("Failed to parse the Master Plan JSON properly.");
        
        setPlan(parsed);
        setActiveModule('brandOS');
      } catch (geminiError: any) {
        if (geminiError.message?.includes("Quota Exhausted") || geminiError.message?.includes("RESOURCE")) {
           throw new Error("Quota exceeded for the AI model. Please try again in a few minutes or switch API keys.");
        }
        throw geminiError;
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير معروف');
    } finally {
      setIsGenerating(false);
    }
  };

  const modules = [
    { id: 'brandOS', name: 'Brand OS', icon: Shield, desc: 'Brand DNA & Identity' },
    { id: 'bcEngine', name: 'B.C Engine', icon: Sparkles, desc: 'Angles & Hooks' },
    { id: 'creativeProduction', name: 'Creative Intel', icon: Video, desc: 'Production Strategy' },
    { id: 'journeyIntel', name: 'Journey Intel', icon: ActivitySquare, desc: 'Funnel Mapping' },
    { id: 'sfkStrategy', name: 'S.F.K Strategy', icon: Target, desc: 'Media Buying Exec' },
    { id: 'scalingEngine', name: 'Scaling Engine', icon: Rocket, desc: 'Scale & Growth' },
    { id: 'contentArchitect', name: 'Content Arch.', icon: PenTool, desc: 'Copywriting' },
    { id: 'strategyAuditor', name: 'Strategy Audit', icon: AlertCircle, desc: 'Risks & Quick Wins' },
    { id: 'budgetPlanner', name: 'Budget Planner', icon: Calculator, desc: 'Financial Planning' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-foreground p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-[#0B0F19] border border-indigo-500/20 p-8 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-50 z-0 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 text-indigo-400" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">The Omni-Strategy Engine</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                المنصة المركزية لتوحيد جميع أدوات الذكاء الاصطناعي (Brand OS, Creative, Scaling, SFK...) في مكان واحد معتمد على بياناتك الحقيقية أو روابط عملائك الجدد.
              </p>
            </div>
          </div>
        </div>

        {/* Input Configuration Section */}
        {!plan && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#111823] border border-white/5 rounded-3xl p-6">
              <div className="flex gap-4 mb-8 bg-[#0B0F19] p-1.5 rounded-xl">
                <button
                  onClick={() => setActiveTab('account')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all",
                    activeTab === 'account' ? "bg-indigo-600 shadow-lg text-white" : "text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  <Database className="w-4 h-4" />
                  حساب مربوط (Connected Account)
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all",
                    activeTab === 'url' ? "bg-indigo-600 shadow-lg text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Globe className="w-4 h-4" />
                  عميل جديد (URL)
                </button>
              </div>

              {activeTab === 'account' ? (
                <div className="space-y-6">
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-sm text-gray-300 font-medium mb-3">سيتم استخدام الحساب المربوط حالياً:</p>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-indigo-400 font-mono text-lg">{selectedAccountId || 'لا يوجد حساب محدد'}</span>
                    </div>
                    {!selectedAccountId && (
                      <p className="text-xs text-red-400 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> يرجى اختيار حساب إعلاني من القائمة العلوية أولاً.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <LinkIcon className="w-3 h-3" /> Website URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://client-domain.com"
                      className="w-full bg-[#0B0F19] text-white border border-white/10 rounded-xl px-4 py-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-3 h-3" /> Industry / Niche
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      placeholder="مثال: عقارات، متجر الكتروني للملابس..."
                      className="w-full bg-[#0B0F19] text-white border border-white/10 rounded-xl px-4 py-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <button
                onClick={generatePlan}
                disabled={isGenerating || (activeTab === 'account' && !selectedAccountId) || (activeTab === 'url' && !url)}
                className={cn(
                  "mt-8 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                  isGenerating ? "bg-indigo-600/50 cursor-wait text-white/70" : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-white"
                )}
              >
                {isGenerating ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> جاري توحيد الأنظمة وتوليد الخطة الشاملة...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> بناء استراتيجية الـ Omni-Engine الكاملة</>
                )}
              </button>
            </div>
            
            <div className="hidden md:flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-[#111823]/50 p-8 text-center pattern-dot pattern-white/5 pattern-size-4">
              <Workflow className="w-16 h-16 text-indigo-500 mb-6 opacity-80" />
              <h3 className="text-xl font-bold text-white mb-4">قوة التوحيد الاستراتيجي</h3>
              <p className="text-gray-400 text-sm leading-loose max-w-sm">
                عند النقر على الأداة ستقوم بقراءة البيانات، وتمريرها عبر المحركات التسعة (Brand, Copywriting, Scale, SFK...) في ثوانٍ، لتعطيك خطة موحدة خالية من التعقيد ومتصلة بالكامل.
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {plan && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 space-y-2">
              <button 
                onClick={() => setPlan(null)}
                className="w-full py-3 mb-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium flex items-center justify-center gap-2 border border-white/10 text-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" /> العودة لإعداد إستراتيجية جديدة
              </button>
              
              {modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  className={cn(
                    "w-full text-right p-4 rounded-xl flex items-center justify-between border transition-all",
                    activeModule === m.id 
                      ? "bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.15)] text-white" 
                      : "bg-[#111823] border-white/5 text-gray-400 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <m.icon className={cn("w-5 h-5", activeModule === m.id ? "text-indigo-400" : "text-gray-500")} />
                    <div>
                      <div className="font-bold text-sm tracking-wide">{m.name}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{m.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", activeModule === m.id ? "rotate-180" : "")} />
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4">
              <div className="bg-[#111823] border border-white/10 rounded-3xl p-8 min-h-[600px] shadow-xl relative overflow-hidden">
                <AnimatePresence mode="wait">
                  
                  {activeModule === 'brandOS' && (
                    <motion.div key="brandOS" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Shield className="text-indigo-400"/> Brand OS Identity</h2>
                      </div>
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">Archetype (النمط الأساسي)</h4>
                        <p className="text-gray-200 text-lg">{plan.brandOS.archetype}</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">Positioning (تموضع العلامة)</h4>
                        <p className="text-gray-200 text-lg leading-relaxed">{plan.brandOS.positioning}</p>
                      </div>
                      <div className="bg-gradient-to-r from-indigo-900/30 to-transparent p-6 rounded-2xl border-l-4 border-indigo-500">
                        <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">Core Message (الرسالة الجوهرية)</h4>
                        <p className="text-white text-xl font-medium">{plan.brandOS.coreMessage}</p>
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'bcEngine' && (
                    <motion.div key="bcEngine" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Sparkles className="text-amber-400"/> B.C Engine (Angles)</h2>
                      </div>
                      <div className="grid gap-6">
                        {plan.bcEngine.winningAngles.map((angle, i) => (
                          <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500/50 group-hover:bg-amber-400 transition-colors" />
                            <h3 className="text-xl font-bold text-amber-300 mb-3">{angle.title}</h3>
                            <div className="space-y-4">
                              <div>
                                <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-wider block mb-1">The Hook</span>
                                <p className="text-gray-200 font-medium text-lg">&ldquo;{angle.hook}&rdquo;</p>
                              </div>
                              <div className="pt-4 border-t border-white/5">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Psychological Reason</span>
                                <p className="text-gray-400 text-sm leading-relaxed">{angle.reason}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'creativeProduction' && (
                    <motion.div key="creativeProduction" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Video className="text-pink-400"/> Creative Production Intel</h2>
                      </div>
                      <div className="space-y-6">
                        <h3 className="text-lg font-bold text-pink-300">Video Concepts & Storyboards</h3>
                        {plan.creativeProduction.videoConcepts.map((v, i) => (
                          <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-6">
                            <div className="md:w-1/3">
                              <span className="text-xs text-pink-500/70 font-bold uppercase tracking-wider">Scene Concept</span>
                              <p className="text-gray-200 font-medium mt-1">{v.scene}</p>
                            </div>
                            <div className="md:w-1/3">
                              <span className="text-xs text-pink-500/70 font-bold uppercase tracking-wider">Visual Anchor</span>
                              <p className="text-gray-400 text-sm mt-1">{v.visual}</p>
                            </div>
                            <div className="md:w-1/3">
                              <span className="text-xs text-pink-500/70 font-bold uppercase tracking-wider">On-Screen Text</span>
                              <p className="text-pink-300 font-bold mt-1 text-sm">{v.text}</p>
                            </div>
                          </div>
                        ))}
                        <div className="pt-6">
                          <h3 className="text-lg font-bold text-pink-300 mb-4">Recommended Image Formats</h3>
                          <div className="flex flex-wrap gap-3">
                            {plan.creativeProduction.imageFormats.map((f, i) => (
                              <span key={i} className="bg-pink-500/10 border border-pink-500/20 text-pink-300 px-4 py-2 rounded-lg text-sm font-medium">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'journeyIntel' && (
                     <motion.div key="journeyIntel" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><ActivitySquare className="text-teal-400"/> Customer Journey Mapping</h2>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 border-l-4 border-l-teal-400">
                          <h3 className="text-teal-300 font-bold text-lg mb-2 flex items-center gap-2">TOFU <span className="text-xs text-gray-500 font-normal">(Top of Funnel - Awareness)</span></h3>
                          <p className="text-gray-300 leading-relaxed text-sm">{plan.journeyIntel.tofu}</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 border-l-4 border-l-teal-500">
                          <h3 className="text-teal-400 font-bold text-lg mb-2 flex items-center gap-2">MOFU <span className="text-xs text-gray-500 font-normal">(Middle of Funnel - Consideration)</span></h3>
                          <p className="text-gray-300 leading-relaxed text-sm">{plan.journeyIntel.mofu}</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 border-l-4 border-l-teal-600">
                          <h3 className="text-teal-500 font-bold text-lg mb-2 flex items-center gap-2">BOFU <span className="text-xs text-gray-500 font-normal">(Bottom of Funnel - Conversion)</span></h3>
                          <p className="text-gray-300 leading-relaxed text-sm">{plan.journeyIntel.bofu}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'sfkStrategy' && (
                    <motion.div key="sfkStrategy" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Target className="text-emerald-400"/> S.F.K Media Buying Strategy</h2>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Targeting Approach</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">{plan.sfkStrategy.targeting}</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Bidding Strategy</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">{plan.sfkStrategy.biddingStrategy}</p>
                        </div>
                        <div className="md:col-span-2 bg-gradient-to-br from-[#0B0F19] to-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30">
                          <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Account Structure</h4>
                          <p className="text-white text-base leading-relaxed">{plan.sfkStrategy.campaignStructure}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'scalingEngine' && (
                    <motion.div key="scalingEngine" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                       <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Rocket className="text-violet-400"/> Autonomous Scaling Engine</h2>
                      </div>
                      <div className="bg-white/5 p-6 rounded-2xl border border-violet-500/20 mb-6">
                        <h4 className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-2">Budget Distribution</h4>
                        <p className="text-gray-200 text-lg">{plan.scalingEngine.budgetDistribution}</p>
                      </div>
                      <div>
                        <h4 className="text-violet-300 font-bold mb-4">Hard Scaling Rules</h4>
                        <div className="space-y-3">
                          {plan.scalingEngine.scalingRules.map((rule, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                              <CheckSquare className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-300 text-sm leading-relaxed">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'contentArchitect' && (
                    <motion.div key="contentArchitect" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><PenTool className="text-sky-400"/> Content Architect (Copywriting)</h2>
                      </div>
                      <div className="bg-[#0B0F19] p-6 rounded-2xl border border-sky-500/20 shadow-inner">
                        <h4 className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-4">Primary Master Caption</h4>
                        <p className="text-gray-200 text-lg leading-loose whitespace-pre-wrap">{plan.contentArchitect.primaryCaption}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-4">
                        {plan.contentArchitect.hashtags.map((tag, i) => (
                          <span key={i} className="text-sky-300 bg-sky-900/30 px-3 py-1.5 rounded-full text-xs border border-sky-500/20 font-medium">#{tag.replace('#','')}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'strategyAuditor' && (
                    <motion.div key="strategyAuditor" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><AlertCircle className="text-red-400"/> Strategy Auditor Matrix</h2>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Potential Risks</h4>
                          <div className="space-y-3">
                            {plan.strategyAuditor.potentialRisks.map((risk, i) => (
                              <div key={i} className="p-4 bg-red-900/10 rounded-xl border border-red-500/20 text-red-200 text-sm leading-relaxed">
                                {risk}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2"><Zap className="w-4 h-4"/> Quick Wins</h4>
                          <div className="space-y-3">
                            {plan.strategyAuditor.quickWins.map((win, i) => (
                              <div key={i} className="p-4 bg-green-900/10 rounded-xl border border-green-500/20 text-green-200 text-sm leading-relaxed">
                                {win}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModule === 'budgetPlanner' && (
                    <motion.div key="budgetPlanner" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-8">
                      <div className="border-b border-white/10 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Calculator className="text-blue-400"/> Financial & Budget Planner</h2>
                      </div>
                      
                      <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl mb-6 flex gap-4 items-start">
                        <Flame className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-yellow-400 font-bold text-sm mb-1">Financial Integrity Truth</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">{plan.budgetPlanner.profitabilityNote}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#0B0F19] p-6 rounded-2xl border border-white/10 text-center">
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-2">Suggested Daily Spend</span>
                          <span className="text-3xl font-bold text-blue-400">{plan.budgetPlanner.suggestedDailyAdSpend}</span>
                        </div>
                        <div className="bg-[#0B0F19] p-6 rounded-2xl border border-white/10 text-center">
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-2">Expected Target CPA</span>
                          <span className="text-3xl font-bold text-emerald-400">{plan.budgetPlanner.expectedCPA}</span>
                        </div>
                        <div className="bg-[#0B0F19] p-6 rounded-2xl border border-white/10 text-center">
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-2">ROAS Break-Even</span>
                          <span className="text-3xl font-bold text-amber-400">{plan.budgetPlanner.roasBreakEven}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
