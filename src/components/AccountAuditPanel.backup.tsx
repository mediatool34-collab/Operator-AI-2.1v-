import React, { useState } from 'react';
import { Target, AlertTriangle, TrendingUp, BrainCircuit, Activity, Rocket, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';

export function AccountAuditPanel({ campaigns, insights, globalAnalysis, onExecutePlan, isExecuting }: any) {
  const [activeTab, setActiveTab] = useState<'overview' | 'plan'>('overview');
  const { metaToken, googleToken } = useFilters();

  // Compute what's working and what's not from the campaigns and insights
  const winningCampaigns = campaigns.filter((c: any) => {
    const m = insights.find((i: any) => i.id === c.id)?.metrics;
    return m && m.roas >= 2.0 && m.spend > 5;
  });

  const failingCampaigns = campaigns.filter((c: any) => {
    const m = insights.find((i: any) => i.id === c.id)?.metrics;
    return m && ((m.roas < 1.0 && m.spend > 15) || (m.cpa > 30));
  });

  const hasTokens = !!metaToken || !!googleToken;

  return (
    <div className="glass-panel rounded-[2rem] border border-brand-accent/20 bg-[#0A0F1C]/90 overflow-hidden flex flex-col mt-6 shadow-2xl">
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-brand-accent/10 to-transparent gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <BrainCircuit className="w-48 h-48 text-primary" />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-4 bg-primary/20 rounded-2xl border border-brand-accent/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Activity className="w-8 h-8 text-brand-accent animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Account Diagnostic Center</h2>
            <p className="text-sm text-muted-foreground font-medium mt-1 tracking-wide">Complete Account Analysis & Automated Executive Fixes</p>
          </div>
        </div>
        
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10 shrink-0 relative z-10 shadow-inner">
          <button onClick={() => setActiveTab('overview')} className={cn("px-6 py-2.5 text-sm font-bold rounded-lg transition-all", activeTab === 'overview' ? "bg-white/10 text-white shadow-md border border-white/10" : "text-muted-foreground hover:text-muted-foreground")}>
            Diagnostic Overview
          </button>
          <button onClick={() => setActiveTab('plan')} className={cn("px-6 py-2.5 text-sm font-bold rounded-lg transition-all", activeTab === 'plan' ? "bg-brand-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-brand-accent" : "text-gray-500 hover:text-gray-300")}>
            AI Execution Strategy
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 min-h-[450px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* The 4 Pillars Checklist */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col h-full col-span-1 md:col-span-2 border border-brand-accent/20 bg-brand-accent/5 mb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-accent/20 rounded-lg"><CheckCircle2 className="w-5 h-5 text-brand-accent" /></div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Media Buying Core Pillars (الصورة الكاملة)</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-center">
                  <div className="text-xs text-gray-400 mb-1">الجمهور المستهدف</div>
                  <div className="text-sm font-bold text-brand-accent">Audience Evaluated</div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-center">
                  <div className="text-xs text-gray-400 mb-1">إعدادات الإعلان</div>
                  <div className="text-sm font-bold text-brand-accent">Ad Sets Audited</div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-center">
                  <div className="text-xs text-gray-400 mb-1">المحتوى الإعلاني</div>
                  <div className="text-sm font-bold text-brand-accent">Creatives Scored</div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-center">
                  <div className="text-xs text-gray-400 mb-1">صافي الربح</div>
                  <div className="text-sm font-bold text-orange-400">Net Profit Focus</div>
                </div>
              </div>
            </div>

            {/* Winners Panel */}
            <div className="glass-panel bg-green-500/5 border-green-500/20 p-6 rounded-2xl flex flex-col h-[350px] relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-green-500/50" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30"><TrendingUp className="w-6 h-6 text-green-400" /></div>
                <div>
                  <h3 className="text-lg font-black text-green-400 tracking-tight">Drivers of Success</h3>
                  <p className="text-[10px] text-green-500/70 font-bold uppercase tracking-widest">High ROAS / Low CPA campaigns</p>
                </div>
              </div>
              
              {winningCampaigns.length > 0 ? (
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {winningCampaigns.map((c: any) => {
                    const m = insights.find((i: any) => i.id === c.id)?.metrics;
                    return (
                      <div key={c.id} className="p-4 bg-black/60 border border-green-500/20 rounded-xl hover:bg-black/80 transition-colors">
                        <div className="font-bold text-white truncate text-sm mb-3">{c.name}</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                            <div className="text-[10px] text-green-400/70 uppercase font-black tracking-wider mb-1">ROAS Target Met</div>
                            <div className="text-lg font-bold text-green-400">{m?.roas.toFixed(2)}x</div>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-1">Efficient CPA</div>
                            <div className="text-lg font-bold text-white">${m?.cpa.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-green-500/20 rounded-xl bg-green-500/5">
                  <Search className="w-10 h-10 text-green-500/40 mb-3" />
                  <p className="text-green-400 font-bold mb-1">No major winners detected</p>
                  <p className="text-xs text-green-500/70">The algorithm needs more data or stronger creative hooks to find scalable campaigns.</p>
                </div>
              )}
            </div>

            {/* Failing Panel */}
            <div className="glass-panel bg-red-500/5 border-red-500/20 p-6 rounded-2xl flex flex-col h-full relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-red-500/50" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-500/30"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
                <div>
                  <h3 className="text-lg font-black text-red-400 tracking-tight">Critical Leaks Detected</h3>
                  <p className="text-[10px] text-red-500/70 font-bold uppercase tracking-widest">Inefficient Ad Spend</p>
                </div>
              </div>
              
              {failingCampaigns.length > 0 ? (
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {failingCampaigns.map((c: any) => {
                    const m = insights.find((i: any) => i.id === c.id)?.metrics;
                    return (
                      <div key={c.id} className="p-4 bg-black/60 border border-red-500/20 rounded-xl group hover:border-red-500/40 transition-colors">
                        <div className="font-bold text-white truncate text-sm mb-3">{c.name}</div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            <div className="text-[10px] text-red-400/70 uppercase font-black tracking-wider mb-1">Bleeding Spend</div>
                            <div className="text-lg font-bold text-red-400">${m?.spend.toFixed(2)}</div>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-1">Loss ROAS</div>
                            <div className="text-lg font-bold text-red-400">{m?.roas.toFixed(2)}x</div>
                          </div>
                        </div>
                        <div className="text-xs text-red-300/80 bg-red-500/10 p-2 rounded border border-red-500/20 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Ad fatigue or poor targeting match. Needs structural adjustment or immediate pause.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-red-500/20 rounded-xl bg-red-500/5">
                  <CheckCircle2 className="w-10 h-10 text-red-500/40 mb-3" />
                  <p className="text-red-400 font-bold mb-1">No critical bleeding detected</p>
                  <p className="text-xs text-red-500/70">All campaigns are currently operating within acceptable performance guardrails.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="h-full flex flex-col animate-in fade-in duration-500">
            {globalAnalysis ? (
              <div className="flex flex-col h-full gap-6">
                <div className="p-6 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <BrainCircuit className="w-32 h-32 text-brand-accent" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 flex items-center gap-3 relative z-10">
                    <BrainCircuit className="w-6 h-6 text-brand-accent" />
                    Strategic Plan Generated by AI
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm relative z-10">
                    {globalAnalysis.suggestedAction || 'Based on the diagnostic overview, reallocate budget from underperforming adsets to top-performing campaigns. Test new creatives for fatigued audiences.'}
                  </p>
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Executable Prescriptions (1-Click Fixes)
                  </h4>
                  
                  <div className="space-y-4">
                    {winningCampaigns.length > 0 && (
                      <div className="flex items-start gap-4 p-5 bg-black/40 border border-green-500/20 rounded-2xl group hover:border-green-500/40 transition-colors">
                        <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 shrink-0"><TrendingUp className="w-6 h-6 text-green-400" /></div>
                        <div className="flex-1">
                          <h5 className="font-bold text-white text-base">Scale Winners (Automated Allocation)</h5>
                          <p className="text-sm text-gray-400 mt-1 mb-3">Increase daily budget by 20% on {winningCampaigns.length} successful campaigns that exceeded primary ROAS targets.</p>
                          <div className="flex gap-2">
                            {winningCampaigns.slice(0,3).map((c: any) => (
                              <span key={c.id} className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded truncate max-w-[100px]">{c.name}</span>
                            ))}
                            {winningCampaigns.length > 3 && <span className="text-[10px] text-gray-500 px-2 py-1">+{winningCampaigns.length - 3} more</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch">
                           <span className="text-sm font-black text-green-400 bg-green-500/10 px-4 py-1.5 rounded-lg border border-green-500/20">Action: Scale Budget</span>
                        </div>
                      </div>
                    )}
                    
                    {failingCampaigns.length > 0 && (
                      <div className="flex items-start gap-4 p-5 bg-black/40 border border-yellow-500/20 rounded-2xl group hover:border-yellow-500/40 transition-colors">
                        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 shrink-0"><AlertTriangle className="w-6 h-6 text-yellow-500" /></div>
                        <div className="flex-1">
                          <h5 className="font-bold text-white text-base">Enforce Strict Value Rules (Stop Loss)</h5>
                          <p className="text-sm text-gray-400 mt-1 mb-3">Apply Cost Cap / Minimum ROAS rules on {failingCampaigns.length} campaigns bleeding budget.</p>
                          <div className="flex gap-2">
                            {failingCampaigns.slice(0,3).map((c: any) => (
                              <span key={c.id} className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded truncate max-w-[100px]">{c.name}</span>
                            ))}
                            {failingCampaigns.length > 3 && <span className="text-[10px] text-gray-500 px-2 py-1">+{failingCampaigns.length - 3} more</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch">
                           <span className="text-sm font-black text-yellow-500 bg-yellow-500/10 px-4 py-1.5 rounded-lg border border-yellow-500/20">Action: Restrict Bids</span>
                        </div>
                      </div>
                    )}

                    {winningCampaigns.length === 0 && failingCampaigns.length === 0 && (
                      <div className="p-8 border border-white/5 rounded-2xl bg-white/5 text-center">
                        <p className="text-gray-400 font-medium">No aggressive adjustments required. The account is stable.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                    {!hasTokens && <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Operating in Mock Mode (No Real Ad Accounts Linked)</>}
                  </div>
                  <button 
                    onClick={onExecutePlan}
                    disabled={isExecuting || (winningCampaigns.length === 0 && failingCampaigns.length === 0)}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-accent hover:bg-brand-accent/90 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group w-full sm:w-auto"
                  >
                    {isExecuting ? (
                      <><RefreshCw className="w-5 h-5 animate-spin" /> EXECUTING FIXES...</>
                    ) : (
                      <><Rocket className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> EXECUTE ACTION PLAN TO ACCOUNT</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 items-center justify-center text-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-black/20">
                <BrainCircuit className="w-20 h-20 text-gray-700 mb-6 animate-pulse" />
                <h3 className="text-2xl font-black text-white mb-3">No Strategy Formulated</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
                  The AI is waiting for you to run a full diagnostic audit on the account above. Doing so will generate a comprehensive, executable plan.
                </p>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
