import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  Target,
  Zap,
  Link as LinkIcon,
  AlertCircle,
  ActivitySquare,
  Crosshair,
  ShieldAlert,
  Database
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeWebsite } from '../services/scraper';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

interface ScalingPlan {
  scalingPriorityList: Array<{
    campaignId: string;
    campaignName: string;
    reason: string;
    priority: string;
  }>;
  budgetIncreaseRecommendations: Array<{
    targetId: string;
    target: string;
    recommendation: string;
    logic: string;
    suggestedBudget?: number;
  }>;
  horizontalScalingPlan: string[];
  verticalScalingPlan: string[];
  killRecommendations: Array<{
    targetId: string;
    target: string;
    reason: string;
  }>;
  creativeRefreshSuggestions: string[];
  systemVerdict: string;
}

export function AutonomousScalingEngine() {
  const { user } = useAuth();
  const { selectedAccountId, platform, metaSubPlatform, datePreset, metaToken, googleToken, tiktokToken, adAccounts } = useFilters();
  const [url, setUrl] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScalingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scaling' | 'budget' | 'maintenance'>('scaling');
  const [actionStatuses, setActionStatuses] = useState<Record<string, 'loading' | 'success' | 'error'>>({});

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const handleAction = async (targetId: string, actionType: 'pause' | 'increase_budget', value?: number) => {
    const token = getToken();
    if (!token || !user) return;
    
    setActionStatuses(prev => ({ ...prev, [targetId]: 'loading' }));
    
    try {
      const headers = { 'x-user-id': user.uid, 'Content-Type': 'application/json' };
      const payload: any = { platform, objectId: targetId, metaToken: token };
      if (actionType === 'pause') payload.status = 'PAUSED';
      if (actionType === 'increase_budget' && value) payload.dailyBudget = value;

      const res = await fetch('/api/campaigns/action', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Action failed');
      
      setActionStatuses(prev => ({ ...prev, [targetId]: 'success' }));
    } catch (e) {
      console.error(e);
      setActionStatuses(prev => ({ ...prev, [targetId]: 'error' }));
    }
  };

  const activeAccount = selectedAccountId ? adAccounts.find(a => a.id === selectedAccountId) : null;

  const handleAnalyze = async () => {
    if (!url) {
      setError("Please provide a Brand Website URL to begin analysis.");
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

      let campaignContext = "";
      const token = getToken();

      // Fetch LIVE ad account data if connected
      if (token && selectedAccountId && user) {
        try {
          const headers = {
            'x-user-id': user.uid,
            [`x-${platform}-token`]: token
          };
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
              return { id: c.id, name: c.name, status: c.status, budget: c.raw?.daily_budget, metrics };
            }).filter((c: any) => c.status !== 'ARCHIVED'); // Ignore completely dead ones
            
            campaignContext = JSON.stringify(combined).substring(0, 100000); // Up to 100k chars for Gemini
          }
        } catch (fetchErr) {
          console.warn('Could not fetch live campaign data', fetchErr);
        }
      }

      const prompt = `
        You are an ELITE MEDIA BUYER and AUTONOMOUS SCALING AI.
        
        MISSION:
        You have automatically "synced" and ingested real media buying performance data from the connected ${platform.toUpperCase()} ad account.
        Based on the website context for the business at: ${url}, and the REAL campaign data provided below, generate highly realistic, mathematically sound scaling decisions.
        
        Website Content Context: ${scrapedData}
        
        REAL CAMPAIGN DATA:
        ${campaignContext ? campaignContext : "No live data available. Fallback to generating a theoretical roadmap based solely on the website."}

        INSTRUCTIONS:
        Analyze the metrics (ROAS, CPA, Spend) provided in the campaign data.
        Identify which real campaigns should be scaled (budget increased), which should be killed (paused), and where adsets/creatives are fatiguing.
        IMPORTANT: Always include the real ID ('targetId' or 'campaignId') from the LIVE DATA so the user can apply the recommended action via API.
        If no real campaign data is available, generate a highly realistic assumed plan for launching and scaling this brand (leave IDs mapped to empty strings).
        
        You must output ONLY valid JSON using exactly this schema:
        {
          "scalingPriorityList": [
            {"campaignId": "string", "campaignName": "string", "reason": "string (Why it scales based on metrics)", "priority": "High / Medium / Low"}
          ],
          "budgetIncreaseRecommendations": [
            {"targetId": "string", "target": "string", "recommendation": "string", "logic": "string", "suggestedBudget": 150}
          ],
          "horizontalScalingPlan": ["string"],
          "verticalScalingPlan": ["string"],
          "killRecommendations": [
            {"targetId": "string", "target": "string", "reason": "string (Why it fails)"}
          ],
          "creativeRefreshSuggestions": ["string"],
          "systemVerdict": "string"
        }
      `;

      const result = await analyzeWithGemini(prompt, true);
      
      let sanitizedResult = result.trim();
      sanitizedResult = sanitizedResult.replace(/^\`{3}json\s*|\s*\`{3}$/g, '').trim();
      
      const firstBrace = sanitizedResult.indexOf('{');
      const lastBrace = sanitizedResult.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        sanitizedResult = sanitizedResult.substring(firstBrace, lastBrace + 1);
      }
      
      sanitizedResult = sanitizedResult
        .replace(/,\s*([}\]])/g, '$1') 
        .replace(/([}\]])\s*([{\\["'])/g, '$1, $2');

      try {
        const parsed = JSON.parse(sanitizedResult);
        setAnalysisResult(parsed);
        setActiveTab('scaling');
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
        <div className="absolute top-0 left-0 w-1/2 h-full bg-rose-500/5 -skew-x-12 -translate-x-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest">
              <Rocket className="w-3 h-3" />
              Autonomous Scaling Agent
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 uppercase">
              Autonomous Scaling <br />
              <span className="text-rose-400">Engine</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl font-medium">
              Automatically ingest LIVE campaign data to identify winning campaigns, scalable adsets, and profitable creatives for brutal horizontally and vertically structured scaling strategies.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-rose-500/50">
                <div className="pl-6 text-muted-foreground shrink-0"><LinkIcon className="w-5 h-5" /></div>
                <input type="text" placeholder="Enter Brand Website URL for Context" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold placeholder:font-normal" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Data Source Pipeline</p>
               {activeAccount ? (
                 <div className="flex items-center gap-4 bg-brand-panel p-4 rounded-xl border border-rose-500/30 w-fit">
                   <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                     <Database className="w-5 h-5 text-rose-400" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white">Live Sync Active</p>
                     <p className="text-xs text-gray-400">Pulling metrics from <span className="text-rose-400 font-bold">{activeAccount.name}</span> ({platform.toUpperCase()})</p>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10 w-fit">
                   <AlertCircle className="w-5 h-5 text-red-400" />
                   <p className="text-sm text-muted-foreground">No active ad account connected. Engine will run in simulation mode.</p>
                 </div>
               )}
            </div>

            <div className="flex justify-start pt-4">
               <button 
                 onClick={handleAnalyze}
                 disabled={isAnalyzing || !url}
                 className={cn(
                   "h-auto py-5 px-10 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl overflow-hidden relative",
                   isAnalyzing ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-rose-600 text-white hover:bg-rose-500 hover:shadow-rose-500/20"
                 )}
               >
                 {isAnalyzing ? (
                   <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> SYNCING PERFORMANCE DATA...</>
                 ) : (
                   <><Rocket className="w-5 h-5" /> INITIALIZE SCALING SEQUENCE</>
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
                { id: 'scaling', label: 'Scaling Vectors', icon: TrendingUp },
                { id: 'budget', label: 'Budget Allocations', icon: Target },
                { id: 'maintenance', label: 'Kill & Refresh', icon: ShieldAlert }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                
                {activeTab === 'scaling' && (
                  <div className="space-y-6">
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-emerald-500/20 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><TrendingUp className="w-40 h-40" /></div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter relative z-10">Scaling Priority Queue</h3>
                        
                        <div className="grid grid-cols-1 gap-4 relative z-10">
                           {analysisResult.scalingPriorityList.map((item, i) => (
                             <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                <div className="space-y-1">
                                   <p className="text-sm font-bold text-white tracking-widest flex items-center gap-2">{item.campaignName} {item.campaignId && <span className="px-2 py-0.5 bg-white/10 text-gray-400 text-[9px] rounded uppercase">{item.campaignId}</span>}</p>
                                   <p className="text-xs text-emerald-200 font-medium">{item.reason}</p>
                                </div>
                                <div className={cn(
                                   "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap self-start md:self-auto border",
                                   item.priority.toLowerCase().includes('high') ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                                   item.priority.toLowerCase().includes('medium') ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : 
                                   "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                )}>
                                   {item.priority} PRIORITY
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-4">
                           <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><ArrowRightIcon className="w-3 h-3 text-rose-500" /> Horizontal Scaling Plan</p>
                           <ul className="space-y-3">
                              {analysisResult.horizontalScalingPlan.map((plan, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                   <span className="leading-relaxed">{plan}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-4">
                           <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><ArrowUpIcon className="w-3 h-3 text-rose-500" /> Vertical Scaling Plan</p>
                           <ul className="space-y-3">
                              {analysisResult.verticalScalingPlan.map((plan, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                   <span className="leading-relaxed">{plan}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'budget' && (
                  <div className="space-y-6">
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-cyan-500/20 space-y-6 group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Target className="w-40 h-40" /></div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter relative z-10">Budget Optimizations</h3>
                        
                        <div className="space-y-4 relative z-10">
                           {analysisResult.budgetIncreaseRecommendations.map((rec, i) => (
                             <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3 relative group/item">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                   <div>
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Asset</p>
                                      <p className="text-base font-bold text-white flex items-center gap-2">{rec.target} {rec.targetId && <span className="px-2 py-0.5 bg-white/10 text-gray-400 text-[9px] rounded uppercase">{rec.targetId}</span>}</p>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      {rec.targetId && activeAccount && (
                                        <button 
                                          onClick={() => handleAction(rec.targetId, 'increase_budget', rec.suggestedBudget || 100)}
                                          disabled={actionStatuses[rec.targetId] === 'loading' || actionStatuses[rec.targetId] === 'success'}
                                          className={cn(
                                            "flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                            actionStatuses[rec.targetId] === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
                                            "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/40"
                                          )}
                                        >
                                          {actionStatuses[rec.targetId] === 'loading' ? 'APPLYING...' : 
                                           actionStatuses[rec.targetId] === 'success' ? 'APPLIED' : 
                                           `APPLY BUDGET ${rec.suggestedBudget ? '(' + rec.suggestedBudget + ')' : ''}`}
                                        </button>
                                      )}
                                      <div className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-black uppercase tracking-widest">
                                         {rec.recommendation}
                                      </div>
                                   </div>
                                </div>
                                <div className="p-3 bg-[#0B0F19]/50 rounded-xl">
                                   <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">AI Logic</p>
                                   <p className="text-sm text-cyan-200">{rec.logic}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 space-y-4 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5"><AlertOctagon className="w-24 h-24" /></div>
                           <h3 className="text-lg font-black text-red-500 uppercase tracking-widest flex items-center gap-2 relative z-10">
                             <TrendingDown className="w-5 h-5" /> Kill List
                           </h3>
                           <div className="space-y-4 relative z-10">
                              {analysisResult.killRecommendations.map((kill, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-red-500/10 flex justify-between items-center group/item hover:border-red-500/30 transition-colors">
                                   <div>
                                     <p className="text-sm font-bold text-white mb-1 flex items-center gap-2">{kill.target} {kill.targetId && <span className="px-2 py-0.5 bg-red-500/10 text-red-300 text-[9px] rounded uppercase">{kill.targetId}</span>}</p>
                                     <p className="text-[11px] text-red-300 font-medium flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> {kill.reason}</p>
                                   </div>
                                   {kill.targetId && activeAccount && (
                                     <button 
                                       onClick={() => handleAction(kill.targetId, 'pause')}
                                       disabled={actionStatuses[kill.targetId] === 'loading' || actionStatuses[kill.targetId] === 'success'}
                                       className={cn(
                                         "px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                         actionStatuses[kill.targetId] === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
                                         "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/40 opacity-0 group-hover/item:opacity-100"
                                       )}
                                      >
                                       {actionStatuses[kill.targetId] === 'loading' ? 'KILLING...' : 
                                        actionStatuses[kill.targetId] === 'success' ? 'PAUSED' : 'AUTO-KILL'}
                                      </button>
                                   )}
                                </div>
                              ))}
                           </div>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-blue-500/20 space-y-4 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5"><RefreshCw className="w-24 h-24" /></div>
                           <h3 className="text-lg font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 relative z-10">
                             <Crosshair className="w-5 h-5" /> Creative Refresh
                           </h3>
                           <ul className="space-y-3 relative z-10 mt-4">
                              {analysisResult.creativeRefreshSuggestions.map((sug, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
                                   <div className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-black uppercase mt-0.5">REQ</div>
                                   <span className="leading-relaxed">{sug}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>
                )}

              </div>
              
              <div className="lg:col-span-4 space-y-6">
                 {/* System Verdict Pulse */}
                 <div className="p-8 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3 border-b border-rose-500/10 pb-4">
                       <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                       <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest">System Verdict</h3>
                    </div>
                    <p className="text-sm text-rose-100 font-bold leading-relaxed pt-2">
                       "{analysisResult.systemVerdict}"
                    </p>
                 </div>

                 <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Automated Actions</h3>
                    <ul className="space-y-4">
                       <li className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 font-medium">Budgets Increased</span>
                          <span className="text-white font-black">{analysisResult.budgetIncreaseRecommendations.length} Assets</span>
                       </li>
                       <li className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 font-medium">Ads Terminated</span>
                          <span className="text-red-400 font-black">{analysisResult.killRecommendations.length} Ads</span>
                       </li>
                       <li className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 font-medium">New Angles Requested</span>
                          <span className="text-blue-400 font-black">{analysisResult.creativeRefreshSuggestions.length} Hooks</span>
                       </li>
                    </ul>
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
                { title: 'Velocity Detection', desc: 'Instantly pinpoint ad sets that can handle 20% budget bumps without CPA deterioration.', icon: Rocket },
                { title: 'Fatigue Protection', desc: 'Identify creative decay before it impacts your blended ROAS.', icon: AlertOctagon },
                { title: 'Autonomous Killing', desc: 'Ruthlessly cut low-intent traffic and reallocate spend to winning variants.', icon: TrendingDown }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-brand-panel border border-white/5 space-y-4 hover:border-rose-500/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-rose-400" />
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

// Internal icons for quick use
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
  );
}
