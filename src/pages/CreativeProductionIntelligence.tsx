import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Clapperboard,
  Camera,
  Music,
  Scissors,
  BrainCircuit,
  Zap,
  TrendingUp,
  AlertCircle,
  Gem,
  Palette,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Film,
  Database
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeWebsite } from '../services/scraper';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

interface CreativeProductionPlan {
  creativeStrategy: {
    primaryCreativeType: string;
    productionLevel: string;
    rationale: string;
  };
  visualAndProduction: {
    visualDirection: string;
    shotStyle: string;
    cameraStyle: string;
    colorPsychology: string;
    lighting: string;
  };
  editorialAndPost: {
    editingStyle: string;
    pacing: string;
    visualIntensity: string;
    musicType: string;
    retentionStructure: string;
  };
  scriptingAndPsychology: {
    scriptStructure: string;
    hookStrategy: string[];
    emotionalTriggers: string[];
  };
}

export function CreativeProductionIntelligence() {
  const { user } = useAuth();
  const { selectedAccountId, platform, metaSubPlatform, datePreset, metaToken, googleToken, tiktokToken, adAccounts } = useFilters();
  const [url, setUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [positioning, setPositioning] = useState('Premium');
  
  const [competitorUrls, setCompetitorUrls] = useState('');
  
  const [showOptional, setShowOptional] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CreativeProductionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'strategy' | 'visuals' | 'editorial' | 'scripting'>('strategy');

  const positioningOptions = ['Luxury', 'Premium', 'Mass Market', 'Budget / Discount'];

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const activeAccount = selectedAccountId ? adAccounts.find(a => a.id === selectedAccountId) : null;

  const handleAnalyze = async () => {
    if (!url && !niche) {
      setError("Please provide at least a URL or Niche.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      let scrapedData = "";
      if (url) {
        try {
          const webData = await scrapeWebsite(url);
          scrapedData += JSON.stringify(webData).substring(0, 50000); // Truncate to avoid token limits
        } catch (err) {
          console.warn("Could not scrape main URL", err);
        }
      }

      let adsContext = "";
      const token = getToken();

      if (token && selectedAccountId && user) {
        try {
          const headers = { 'x-user-id': user.uid, [`x-${platform}-token`]: token };
          const q = `accountId=${selectedAccountId}&platform=${platform}&subPlatform=${metaSubPlatform}`;
          const [adsRes, insightRes] = await Promise.all([
            fetch(`/api/ads?${q}`, { headers }),
            fetch(`/api/insights?${q}&datePreset=${datePreset}`, { headers })
          ]);
          
          const adsData = await safeJson(adsRes);
          const insightData = await safeJson(insightRes);
          
          if (adsData.ads && insightData.insights) {
            const combined = adsData.ads.map((ad: any) => {
              const metrics = insightData.insights.find((i: any) => i.id === ad.id)?.metrics;
              return { name: ad.name, creative: ad.creative, metrics };
            });
            
            adsContext = JSON.stringify(combined).substring(0, 100000);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch live ads data', fetchErr);
        }
      }

      const prompt = `
        You are an ELITE AI CREATIVE DIRECTOR and PRODUCTION STRATEGIST.
        
        MISSION:
        Analyze the business and market context to determine EXACTLY what type of creatives are needed, the production quality required, the emotional style, and the optimal content format.
        
        CRITICAL RULE FOR LUXURY/PREMIUM:
        If the audience or pricing is luxury/premium, you MUST recommend:
        - Cinematic production
        - Minimal editing
        - Premium lighting
        - Slower pacing
        - Elegant typography
        - Exclusivity psychology
        DO NOT recommend cheap viral editing or aggressive UGC for luxury markets.

        INPUT DATA:
        Target URL / Business Content: ${scrapedData}
        Niche / Product Category: ${niche}
        Target Audience: ${targetAudience}
        Pricing / Positioning: ${positioning}
        Competitors: ${competitorUrls}
        
        ${adsContext ? `REAL AD ACCOUNT DATA:\n${adsContext}\n(Use this real data to inform your creative strategy. Which real active creatives are working and which are fatiguing?)` : `Note: No live ad account connected.`}
        
        DECISION MATRIX - Select primary creative type from:
        UGC, EGC (Employee Generated Content), IGC (Influencer Generated Content), Studio Production, Luxury Production, Documentary Style, Founder Style, Authority Style, Viral Style.

        You must output ONLY valid JSON using exactly this schema:
        {
          "creativeStrategy": {
            "primaryCreativeType": "string",
            "productionLevel": "string",
            "rationale": "string"
          },
          "visualAndProduction": {
            "visualDirection": "string",
            "shotStyle": "string",
            "cameraStyle": "string",
            "colorPsychology": "string",
            "lighting": "string"
          },
          "editorialAndPost": {
            "editingStyle": "string",
            "pacing": "string",
            "visualIntensity": "string",
            "musicType": "string",
            "retentionStructure": "string"
          },
          "scriptingAndPsychology": {
            "scriptStructure": "string",
            "hookStrategy": ["string"],
            "emotionalTriggers": ["string"]
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
        setActiveTab('strategy');
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
        <div className="absolute top-0 left-0 w-1/3 h-full bg-fuchsia-500/5 skew-x-12 -translate-x-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-black uppercase tracking-widest">
              <Film className="w-3 h-3" />
              Creative Director AI
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 uppercase">
              Creative & Production <br />
              <span className="text-fuchsia-400">Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl font-medium">
              Automatically analyze your LIVE ad account creatives and generate the exact formats, visual direction, and emotional triggers to scale.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-fuchsia-500/50">
                  <div className="pl-6 text-muted-foreground shrink-0"><LinkIcon className="w-5 h-5" /></div>
                  <input type="text" placeholder="Website URL (Optional)" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-fuchsia-500/50">
                  <select value={positioning} onChange={(e) => setPositioning(e.target.value)} className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold outline-none appearance-none cursor-pointer">
                    {positioningOptions.map(c => <option key={c} value={c} className="bg-brand-panel">{c}</option>)}
                  </select>
                  <Gem className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-fuchsia-500/50">
                  <input type="text" placeholder="Product Category / Niche" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={niche} onChange={(e) => setNiche(e.target.value)} />
                </div>
              </div>
              <div className="relative group">
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-fuchsia-500/50">
                  <input type="text" placeholder="Target Audience" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm text-fuchsia-400 font-bold uppercase tracking-widest hover:text-fuchsia-300 w-fit"
              >
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Competitor Data (Optional)
              </button>
              
              <AnimatePresence>
                {showOptional && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <input type="text" placeholder="Competitor URLs or brands (comma separated)" className="w-full bg-brand-panel border border-white/10 py-4 px-6 rounded-2xl text-white font-medium focus:border-fuchsia-500/50 outline-none shadow-2xl" value={competitorUrls} onChange={(e) => setCompetitorUrls(e.target.value)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="pt-2">
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Data Source Pipeline</p>
               {activeAccount ? (
                 <div className="flex items-center gap-4 bg-brand-panel p-4 rounded-xl border border-fuchsia-500/30 w-fit">
                   <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20">
                     <Database className="w-5 h-5 text-fuchsia-400" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white">Live Ads Sync Active</p>
                     <p className="text-xs text-gray-400">Pulling creative performance from <span className="text-fuchsia-400 font-bold">{activeAccount.name}</span></p>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10 w-fit">
                   <AlertCircle className="w-5 h-5 text-red-400" />
                   <p className="text-sm text-muted-foreground">No active ad account. Generation will be based purely on provided inputs.</p>
                 </div>
               )}
            </div>

            <div className="flex justify-start pt-4">
               <button 
                 onClick={handleAnalyze}
                 disabled={isAnalyzing || (!url && !niche)}
                 className={cn(
                   "h-auto py-4 px-8 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl min-w-[280px]",
                   isAnalyzing ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-fuchsia-600 text-white hover:bg-fuchsia-500 hover:shadow-fuchsia-500/20"
                 )}
               >
                 {isAnalyzing ? (
                   <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> DIRECTING GENERATION...</>
                 ) : (
                   <><Clapperboard className="w-5 h-5" /> START PRODUCTION PLAN</>
                 )}
               </button>
            </div>
            
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
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
                { id: 'strategy', label: 'Strategic Vision', icon: BrainCircuit },
                { id: 'visuals', label: 'Visual & Camera', icon: Camera },
                { id: 'editorial', label: 'Editorial & Post', icon: Scissors },
                { id: 'scripting', label: 'Scripting & Hooks', icon: Crosshair }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                
                {activeTab === 'strategy' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-fuchsia-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Video className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Creative Strategy</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="p-6 bg-[#0B0F19]/80 rounded-3xl border border-fuchsia-500/30">
                           <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-2">Primary Creative Type</p>
                           <p className="text-2xl font-bold text-white tracking-widest uppercase">{analysisResult.creativeStrategy.primaryCreativeType}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-2">Production Level</p>
                           <p className="text-lg font-bold text-foreground">{analysisResult.creativeStrategy.productionLevel}</p>
                        </div>
                     </div>

                     <div className="p-6 bg-white/5 rounded-3xl border border-white/10 relative z-10">
                        <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-4">Strategic Rationale</p>
                        <p className="text-gray-300 font-medium leading-relaxed italic border-l-4 border-fuchsia-500/50 pl-4">{analysisResult.creativeStrategy.rationale}</p>
                     </div>
                  </div>
                )}

                {activeTab === 'visuals' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-blue-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Camera className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Visual & Camera Direction</h3>
                     
                     <div className="space-y-6 relative z-10">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Overall Visual Direction</p>
                           <p className="text-gray-300 leading-relaxed font-bold">{analysisResult.visualAndProduction.visualDirection}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Camera Style</p>
                              <p className="text-sm text-gray-300 leading-relaxed font-medium">{analysisResult.visualAndProduction.cameraStyle}</p>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Shot Style</p>
                              <p className="text-sm text-gray-300 leading-relaxed font-medium">{analysisResult.visualAndProduction.shotStyle}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0"><Palette className="w-5 h-5 text-blue-400" /></div>
                              <div>
                                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Color Psychology</p>
                                 <p className="text-sm text-gray-300 leading-relaxed">{analysisResult.visualAndProduction.colorPsychology}</p>
                              </div>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex gap-4">
                              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-amber-400" /></div>
                              <div>
                                 <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Lighting Setup</p>
                                 <p className="text-sm text-gray-300 leading-relaxed">{analysisResult.visualAndProduction.lighting}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'editorial' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-purple-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Scissors className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Editorial & Post-Production</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Editing Style</p>
                           <p className="text-base font-bold text-gray-200 leading-relaxed">{analysisResult.editorialAndPost.editingStyle}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Pacing & Rhythm</p>
                           <p className="text-base font-bold text-gray-200 leading-relaxed">{analysisResult.editorialAndPost.pacing}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Visual Intensity</p>
                           <p className="text-sm text-gray-300 font-medium">{analysisResult.editorialAndPost.visualIntensity}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex gap-4">
                           <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0"><Music className="w-3 h-3 text-purple-400" /></div>
                           <div>
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Music Type</p>
                              <p className="text-sm text-gray-300">{analysisResult.editorialAndPost.musicType}</p>
                           </div>
                        </div>
                     </div>

                     <div className="p-6 bg-[#0B0F19]/80 rounded-3xl border border-purple-500/30 relative z-10">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Retention Structure</p>
                        <p className="text-gray-300 font-medium leading-relaxed">{analysisResult.editorialAndPost.retentionStructure}</p>
                     </div>
                  </div>
                )}

                {activeTab === 'scripting' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-emerald-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Crosshair className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Scripting & Psychology</h3>
                     
                     <div className="p-6 bg-white/5 rounded-3xl border border-white/10 relative z-10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Script Structure</p>
                        <p className="text-lg font-bold text-gray-200 leading-relaxed">{analysisResult.scriptingAndPsychology.scriptStructure}</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 space-y-4">
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Hook Strategy</p>
                           <ul className="space-y-3">
                              {analysisResult.scriptingAndPsychology.hookStrategy.map((hook, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                  <div className="px-2 py-0.5 bg-emerald-500/20 rounded text-[10px] font-black text-emerald-400 mt-0.5">{i+1}</div>
                                  <span>{hook}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Emotional Triggers</p>
                           <ul className="space-y-2">
                              {analysisResult.scriptingAndPsychology.emotionalTriggers.map((trigger, i) => (
                                <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                                  <BrainCircuit className="w-4 h-4 text-emerald-500" />
                                  <span>{trigger}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>
                )}

              </div>
              
              <div className="lg:col-span-4 space-y-6">
                 {/* Quick Dashboard */}
                 <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Production Blueprint</h3>
                    
                    <div className="space-y-6">
                       <div>
                          <p className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest mb-1">Type</p>
                          <p className="text-lg font-bold text-white">{analysisResult.creativeStrategy.primaryCreativeType}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Quality Tier</p>
                          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-black text-blue-400 mt-1">
                             {analysisResult.creativeStrategy.productionLevel}
                          </span>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Pacing</p>
                          <p className="text-sm font-medium text-gray-300">{analysisResult.editorialAndPost.pacing}</p>
                       </div>
                    </div>
                 </div>

                 {/* Luxury Indicator (Conditional) */}
                 {positioning === 'Luxury' && (
                    <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/20 space-y-4">
                       <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                         <Gem className="w-4 h-4" />
                         Luxury Directive
                       </h3>
                       <p className="text-sm text-gray-300 italic font-medium leading-relaxed">
                         "Cinematic production, premium lighting, and exclusivity psychology forced."
                       </p>
                    </div>
                 )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!analysisResult && !isAnalyzing && (
        <section className="max-w-7xl mx-auto mt-20 px-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Format Decision', desc: 'Know definitively if you need high-end studio work or lo-fi UGC.', icon: Video },
                { title: 'Editorial Control', desc: 'Determine the exact pacing, cuts, and retention strategies.', icon: Scissors },
                { title: 'Script Psychology', desc: 'Identify the exact hooks and psychological triggers needed.', icon: BrainCircuit }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-brand-panel border border-white/5 space-y-4 hover:border-fuchsia-500/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-fuchsia-400" />
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
