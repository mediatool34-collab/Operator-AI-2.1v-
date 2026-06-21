import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  TrendingUp,
  AlertCircle,
  ActivitySquare,
  Target,
  Zap,
  LayoutDashboard,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  ShoppingCart,
  DollarSign,
  BarChart4,
  Database
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeWebsite } from '../services/scraper';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

interface JourneyIntelligencePlan {
  computedMetrics: {
    roas: string;
    cpa: string;
    cpc: string;
    ctr: string;
    conversionRate: string;
    cartAbandonmentRate: string;
    checkoutAbandonmentRate: string;
  };
  funnelAnalysis: {
    healthScore: number; // 1-100
    weakestStage: string;
    weaknessRationale: string;
    creativeFatigueDetection: string;
    audienceSaturationDetection: string;
  };
  audienceIntelligence: {
    highIntentUsers: string[];
    winningAudienceSegments: string[];
    retargetingAudiences: string[];
  };
  strategicAction: {
    recoveryCampaignIdeas: Array<{ angle: string; offer: string }>;
    scalingRecommendations: string[];
    immediateFunnelFixes: string[];
  };
}

export function CustomerJourneyIntelligence() {
  const { user } = useAuth();
  const { selectedAccountId, platform, metaSubPlatform, datePreset, metaToken, googleToken, tiktokToken, adAccounts } = useFilters();
  const [url, setUrl] = useState('');
  
  // Simulated auto-connect toggles
  const [sources, setSources] = useState({
    metaPixel: true,
    shopify: true,
    ga4: true,
    crm: false,
    conversionApi: true
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JourneyIntelligencePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'funnel' | 'audience' | 'strategy'>('funnel');

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const activeAccount = selectedAccountId ? adAccounts.find(a => a.id === selectedAccountId) : null;

  const toggleSource = (key: keyof typeof sources) => {
    setSources(prev => ({...prev, [key]: !prev[key]}));
  };

  const handleAnalyze = async () => {
    if (!url) {
      setError("Please provide a Brand Website URL to begin automatic sync.");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    try {
      let scrapedData = "";
      try {
        const webData = await scrapeWebsite(url);
        scrapedData += JSON.stringify(webData).substring(0, 50000); // Truncate
      } catch (err) {
        console.warn("Could not scrape URL", err);
      }

      let insightContext = "";
      const token = getToken();

      if (token && selectedAccountId && user) {
        try {
          const headers = { 'x-user-id': user.uid, [`x-${platform}-token`]: token };
          const q = `accountId=${selectedAccountId}&platform=${platform}&subPlatform=${metaSubPlatform}`;
          const insightRes = await fetch(`/api/insights?${q}&datePreset=${datePreset}`, { headers });
          const insightData = await safeJson(insightRes);
          
          if (insightData.insights) {
             // For Journey Intelligence, grab the top-level account metrics if available, or just send a summarized version of campaign metrics
             insightContext = JSON.stringify(insightData.insights.slice(0, 20)).substring(0, 100000);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch live insights data', fetchErr);
        }
      }

      const activeSources = Object.entries(sources).filter(([_, active]) => active).map(([name]) => name).join(", ");

      const prompt = `
        You are an ELITE PERFORMANCE MARKETER and DATA SCIENTIST AI.
        
        MISSION:
        You have automatically "synced" and ingested simulated data from the following connected sources: ${activeSources}.
        Based on the layout, offer, and branding of the website: ${url}, you must generate a highly realistic, automatically calculated customer journey and funnel analysis.
        
        Website Content Context: ${scrapedData}
        
        ${insightContext ? `REAL ACCOUNT INSIGHTS DATA:\n${insightContext}\n(Use this real data to inform your computed metrics and bottleneck analysis. If CTR is low, blame Top of Funnel. If CPA is high but CTR is good, blame Bottom of Funnel.)` : `Note: No live ad account connected.`}

        INSTRUCTIONS:
        Infer and simulate realistic metrics (Spend, Revenue, Add to Cart rates, Checkout dropoffs, Retargeting audiences, LTV, etc.) that a business of this type would legitimately see.
        Produce brutal, actionable intelligence for retargeting, scaling, and funnel recovery based on your simulated data (or real data if provided).

        You must output ONLY valid JSON using exactly this schema:
        {
          "computedMetrics": {
            "roas": "string (e.g. 2.5x)",
            "cpa": "string",
            "cpc": "string",
            "ctr": "string (e.g. 1.25%)",
            "conversionRate": "string",
            "cartAbandonmentRate": "string",
            "checkoutAbandonmentRate": "string"
          },
          "funnelAnalysis": {
            "healthScore": 0, // Number 1-100 indicating overall funnel efficiency
            "weakestStage": "string (e.g. Checkout Phase, Click-to-ATC)",
            "weaknessRationale": "string",
            "creativeFatigueDetection": "string",
            "audienceSaturationDetection": "string"
          },
          "audienceIntelligence": {
            "highIntentUsers": ["string"],
            "winningAudienceSegments": ["string"],
            "retargetingAudiences": ["string"]
          },
          "strategicAction": {
            "recoveryCampaignIdeas": [
              {"angle": "string", "offer": "string"}
            ],
            "scalingRecommendations": ["string"],
            "immediateFunnelFixes": ["string"]
          }
        }
      `;

      const result = await analyzeWithGemini(prompt, true);
      
      let sanitizedResult = result.trim();
      sanitizedResult = sanitizedResult.replace(/^`{3}json\s*|\s*`{3}$/g, '').trim();
      
      const firstBrace = sanitizedResult.indexOf('{');
      const lastBrace = sanitizedResult.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        sanitizedResult = sanitizedResult.substring(firstBrace, lastBrace + 1);
      }
      
      sanitizedResult = sanitizedResult
        .replace(/,\s*([}\]])/g, '$1') 
        .replace(/([}\]])\s*([{\["'])/g, '$1, $2');

      try {
        const parsed = JSON.parse(sanitizedResult);
        setAnalysisResult(parsed);
        setActiveTab('funnel');
      } catch (parseErr) {
        console.error("JSON Parse Error. Raw result:", result);
        throw new Error("The AI returned an invalid structure. Please try simplifying your inputs.");
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to analyze. Please check parameters.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 overflow-x-hidden">
      <section className="relative pt-12 pb-20 px-6 border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-500/5 skew-x-12 translate-x-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-widest">
              <ActivitySquare className="w-3 h-3" />
              Funnel Diagnostics AI
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 uppercase">
              Customer Journey <br />
              <span className="text-cyan-400">Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl font-medium">
              Automatically sync and analyze purchasing behavior, detect leaks across your funnel, and extract hidden scaling opportunities based on real ad account data.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-cyan-500/50">
                <div className="pl-6 text-muted-foreground shrink-0"><LinkIcon className="w-5 h-5" /></div>
                <input type="text" placeholder="Enter Brand Website URL for Analysis" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold placeholder:font-normal" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Simulated Data Sources</p>
               <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'metaPixel', label: 'Meta Pixel', active: sources.metaPixel },
                    { id: 'shopify', label: 'Shopify / Woo', active: sources.shopify },
                    { id: 'conversionApi', label: 'Conversion API', active: sources.conversionApi },
                    { id: 'ga4', label: 'GA4 / Analytics', active: sources.ga4 },
                    { id: 'crm', label: 'CRM Upload', active: sources.crm }
                  ].map((source) => (
                    <button 
                      key={source.id}
                      onClick={() => toggleSource(source.id as any)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                        source.active ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "bg-brand-panel border-white/10 text-gray-500 hover:text-muted-foreground"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", source.active ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-gray-600")} />
                      {source.label}
                    </button>
                  ))}
               </div>
            </div>
            
            <div className="pt-2">
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Live Insights Sync</p>
               {activeAccount ? (
                 <div className="flex items-center gap-4 bg-brand-panel p-4 rounded-xl border border-cyan-500/30 w-fit">
                   <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                     <Database className="w-5 h-5 text-cyan-400" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white">Live Data Pipeline Active</p>
                     <p className="text-xs text-gray-400">Syncing insights from <span className="text-cyan-400 font-bold">{activeAccount.name}</span></p>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10 w-fit">
                   <AlertCircle className="w-5 h-5 text-red-400" />
                   <p className="text-sm text-gray-300">No active ad account connected. Using simulated funnel metrics.</p>
                 </div>
               )}
            </div>

            <div className="flex justify-start pt-4">
               <button 
                 onClick={handleAnalyze}
                 disabled={isAnalyzing || !url}
                 className={cn(
                   "h-auto py-4 px-8 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl",
                   isAnalyzing ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-cyan-500/20"
                 )}
               >
                 {isAnalyzing ? (
                   <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> SYNCING DATA PIPELINES...</>
                 ) : (
                   <><RefreshCw className="w-5 h-5" /> SYNC DATA & ANALYZE FUNNEL</>
                 )}
               </button>
            </div>
            
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 w-fit text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="font-bold text-sm tracking-tight">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {analysisResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto mt-12 px-6">
            <div className="flex flex-wrap gap-1 bg-brand-panel p-1.5 rounded-[2rem] border border-white/5 mb-12 w-fit">
              {[
                { id: 'funnel', label: 'Funnel Integrity', icon: Filter },
                { id: 'audience', label: 'Audience Intel', icon: Users },
                { id: 'strategy', label: 'Strategic Actions', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                
                {activeTab === 'funnel' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'ROAS', val: analysisResult.computedMetrics.roas, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                          { label: 'CPA', val: analysisResult.computedMetrics.cpa, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                          { label: 'Conv. Rate', val: analysisResult.computedMetrics.conversionRate, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                          { label: 'CTR', val: analysisResult.computedMetrics.ctr, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
                        ].map((metric, i) => (
                          <div key={i} className={cn("p-5 rounded-2xl border flex flex-col items-center justify-center text-center", metric.bg, metric.border)}>
                             <span className={cn("text-2xl font-black mb-1", metric.color)}>{metric.val}</span>
                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{metric.label}</span>
                          </div>
                        ))}
                     </div>

                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-red-500/20 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><AlertCircle className="w-40 h-40" /></div>
                        
                        <div className="flex items-center justify-between relative z-10">
                           <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Bottleneck Analysis</h3>
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                             <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">Active Leaks</span>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                           <div className="p-6 bg-red-500/5 rounded-3xl border border-red-500/10">
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Primary Weakness</p>
                              <p className="text-xl font-bold text-white mb-2">{analysisResult.funnelAnalysis.weakestStage}</p>
                              <p className="text-sm text-red-200 leading-relaxed font-medium">{analysisResult.funnelAnalysis.weaknessRationale}</p>
                           </div>
                           <div className="space-y-4">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cart Abandonment</span>
                                 <span className="text-lg font-bold text-orange-400">{analysisResult.computedMetrics.cartAbandonmentRate}</span>
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checkout Abandonment</span>
                                 <span className="text-lg font-bold text-red-400">{analysisResult.computedMetrics.checkoutAbandonmentRate}</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Creative Fatigue</p>
                              <p className="text-sm text-gray-300 font-medium">{analysisResult.funnelAnalysis.creativeFatigueDetection}</p>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Audience Saturation</p>
                              <p className="text-sm text-gray-300 font-medium">{analysisResult.funnelAnalysis.audienceSaturationDetection}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'audience' && (
                  <div className="space-y-6">
                     <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-emerald-500/20 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Users className="w-40 h-40" /></div>
                        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Audience Segmentation</h3>
                        
                        <div className="space-y-6 relative z-10">
                           <div className="p-6 bg-[#0B0F19]/80 rounded-3xl border border-emerald-500/30">
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">High Intent Profiles Detected</p>
                              <ul className="space-y-3">
                                 {analysisResult.audienceIntelligence.highIntentUsers.map((user, i) => (
                                   <li key={i} className="text-sm text-foreground flex items-start gap-3">
                                     <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5"><Target className="w-2 h-2 text-emerald-400" /></div>
                                     <span className="font-medium">{user}</span>
                                   </li>
                                 ))}
                              </ul>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Winning Segments</p>
                                 <ul className="space-y-3">
                                    {analysisResult.audienceIntelligence.winningAudienceSegments.map((seg, i) => (
                                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-sm mt-1.5 shrink-0" />
                                        {seg}
                                      </li>
                                    ))}
                                 </ul>
                              </div>
                              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Retargeting Buckets</p>
                                 <ul className="space-y-3">
                                    {analysisResult.audienceIntelligence.retargetingAudiences.map((aud, i) => (
                                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                        <RefreshCw className="w-4 h-4 text-emerald-400/50 shrink-0 mt-0.5" />
                                        {aud}
                                      </li>
                                    ))}
                                 </ul>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'strategy' && (
                  <div className="space-y-6">
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-purple-500/20">
                        <h3 className="text-2xl font-black text-purple-400 uppercase italic tracking-tighter mb-6">Recovery Campaigns</h3>
                        <div className="space-y-4">
                           {analysisResult.strategicAction.recoveryCampaignIdeas.map((camp, i) => (
                             <div key={i} className="flex flex-col gap-3 p-5 bg-white/5 rounded-2xl border border-white/5">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Angle</p>
                                  <p className="text-sm text-white font-bold">{camp.angle}</p>
                                </div>
                                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Offer Engine</p>
                                  <p className="text-sm text-purple-200">{camp.offer}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-brand-panel border border-white/10">
                           <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4">Immediate Funnel Fixes</p>
                           <ul className="space-y-3">
                              {analysisResult.strategicAction.immediateFunnelFixes.map((fix, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
                                  <div className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-black mt-0.5 border border-red-500/20">FIX</div>
                                  <span className="leading-relaxed">{fix}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="p-6 rounded-3xl bg-brand-panel border border-white/10">
                           <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4">Scaling Directives</p>
                           <ul className="space-y-3">
                              {analysisResult.strategicAction.scalingRecommendations.map((rec, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
                                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">{rec}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>
                )}

              </div>
              
              <div className="lg:col-span-4 space-y-6">
                 {/* Macro Pulse */}
                 <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Funnel Health</h3>
                    
                    <div className="space-y-6">
                       <div className="flex justify-center py-4">
                          <div className="w-32 h-32 rounded-full border-8 border-cyan-500/20 flex flex-col items-center justify-center relative">
                             <div 
                               className="absolute inset-0 rounded-full border-4 border-cyan-400 border-l-transparent transition-all duration-1000"
                               style={{ transform: `rotate(${(analysisResult.funnelAnalysis.healthScore / 100) * 360}deg)` }}
                             />
                             <span className="text-4xl font-black text-cyan-400">{analysisResult.funnelAnalysis.healthScore}</span>
                             <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Score</span>
                          </div>
                       </div>
                       
                       <div>
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Critical Blockage</p>
                          <p className="text-sm font-bold text-white">{analysisResult.funnelAnalysis.weakestStage}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Target CPA</p>
                          <p className="text-sm font-bold text-white">{analysisResult.computedMetrics.cpa}</p>
                       </div>
                    </div>
                 </div>

                 <div className="p-8 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/20 space-y-4">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Priority Action
                    </h3>
                    <p className="text-sm text-gray-300 italic font-medium leading-relaxed">
                      "{analysisResult.strategicAction.immediateFunnelFixes[0] || 'Optimize checkout flow'}"
                    </p>
                 </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!analysisResult && !isAnalyzing && (
        <section className="max-w-7xl mx-auto mt-20 px-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Dropoff Isolation', desc: 'Pinpoint exactly where users are abandoning the journey.', icon: AlertCircle },
                { title: 'Intent Mapping', desc: 'Identify which segments have active purchasing intent.', icon: Target },
                { title: 'Recovery Engines', desc: 'Generate specific offers to salvage lost carts and checkouts.', icon: RefreshCw }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-brand-panel border border-white/5 space-y-4 hover:border-cyan-500/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-cyan-400" />
                   </div>
                   <h3 className="text-lg font-black text-white tracking-widest uppercase">{feature.title}</h3>
                   <p className="text-sm text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              ))}
           </div>
        </section>
      )}
    </div>
  );
}
