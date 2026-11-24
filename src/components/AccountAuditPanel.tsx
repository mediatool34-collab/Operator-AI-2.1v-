import React from 'react';
import { ShieldCheck, AlertTriangle, TrendingUp, Zap, PauseCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface AccountAuditPanelProps {
  campaigns?: any[];
  insights?: any[];
  globalAnalysis?: any;
  isExecuting?: boolean;
  onExecutePlan?: () => Promise<void> | void;
}

export function AccountAuditPanel({
  campaigns = [],
  insights = [],
  globalAnalysis,
  isExecuting = false,
  onExecutePlan,
}: AccountAuditPanelProps) {
  const insightMap = new Map(insights.map(i => [i.id, i.metrics || {}]));

  let scaleReady = 0;
  let needsOpt = 0;
  let highSpendNoConv = 0;

  campaigns.forEach(c => {
    const m = insightMap.get(c.id) || {};
    const roas = Number(m.roas || 0);
    const spend = Number(m.spend || 0);
    const conv = Number(m.conversions || 0);
    if (roas >= 2.5) scaleReady++;
    else if (spend > 50 && conv === 0) highSpendNoConv++;
    else if (spend > 0) needsOpt++;
  });

  const detectedProblems: string[] = Array.isArray(globalAnalysis?.problems) && globalAnalysis.problems.length > 0
    ? globalAnalysis.problems
    : [
        highSpendNoConv > 0
          ? `${highSpendNoConv} campaign(s) spent budget with 0 tracked conversions/leads.`
          : null,
        needsOpt > 0
          ? `${needsOpt} active campaign(s) can improve efficiency with creative or audience rotation.`
          : null,
        campaigns.length === 0
          ? 'No campaigns loaded yet for this account or date range.'
          : null,
      ].filter(Boolean) as string[];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Account Health & Execution Audit</h3>
            <p className="text-xs text-gray-400">
              {globalAnalysis?.suggestedAction || `Auditing ${campaigns.length} campaign(s) across live performance signals.`}
            </p>
          </div>
        </div>

        {onExecutePlan && campaigns.length > 0 && (
          <button
            type="button"
            onClick={onExecutePlan}
            disabled={isExecuting}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 shrink-0"
          >
            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isExecuting ? 'Executing Playbook...' : 'Run 1-Click Optimization'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Scale Ready</span>
            <span className="text-xl font-black text-white">{scaleReady}</span>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Needs Optimization</span>
            <span className="text-xl font-black text-white">{needsOpt}</span>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block">Zero-Result Spend</span>
            <span className="text-xl font-black text-white">{highSpendNoConv}</span>
          </div>
          <PauseCircle className="w-5 h-5 text-red-400 opacity-80" />
        </div>
      </div>

      {detectedProblems.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Audit Findings</div>
          <div className="space-y-2">
            {detectedProblems.map((prob, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-xl border text-xs',
                  highSpendNoConv > 0
                    ? 'bg-red-500/5 border-red-500/15 text-gray-200'
                    : 'bg-white/5 border-white/10 text-gray-300'
                )}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{prob}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>All tracked campaigns are operating within healthy efficiency thresholds.</span>
        </div>
      )}
    </div>
  );
}
