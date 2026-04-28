import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Zap, BrainCircuit, RefreshCw, ToggleLeft, ToggleRight, Wrench } from 'lucide-react';
import { cn, safeJson } from '../lib/utils';

export function SystemIntelligence() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/intelligence/status');
      const json = await safeJson(res);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const toggleAutoOpt = async () => {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch('/api/intelligence/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !data.autoOptimizationEnabled })
      });
      const json = await safeJson(res);
      setData({ ...data, autoOptimizationEnabled: json.autoOptimizationEnabled });
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Error</h2>
          <p className="text-red-300 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <BrainCircuit className="w-6 h-6 text-blue-400" />
            </div>
            Institutional Intelligence Command
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-black text-[10px]">Autonomic Diagnostics • Real-time Corrective Protocols • Strategic Yield Memory</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#111827]/50 px-4 py-2 rounded-xl border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Active Protocol</span>
            <span className="text-xs font-semibold text-white">Agentic Yield Maximization</span>
          </div>
          <button 
            onClick={toggleAutoOpt} 
            disabled={toggling}
            className={cn("transition-all duration-300 transform", data?.autoOptimizationEnabled ? "text-blue-400 scale-110 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" : "text-gray-600 scale-100")}
          >
            {data?.autoOptimizationEnabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* Autonomic Integrity Matrix */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col border-blue-500/10">
          <div className="p-4 border-b border-white/10 bg-blue-500/5 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Wrench className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-black text-white uppercase tracking-widest text-xs">Autonomic Integrity Matrix</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96 space-y-6 custom-scrollbar">
            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Anomaly Detection Stream</h3>
              {data?.activeIssues.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">No active issues detected.</p>
              ) : (
                <div className="space-y-2">
                  {data?.activeIssues.map((issue: any) => (
                    <div key={issue.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3 shadow-inner">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-300">{issue.type.replace('_', ' ')}</p>
                        <p className="text-xs text-red-200/70 mt-0.5">{issue.description}</p>
                        <p className="text-[10px] text-red-500/50 mt-1.5 font-mono">{new Date(issue.detectedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Historical Corrective Logs</h3>
              {data?.autoFixes.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">No corrective records available.</p>
              ) : (
                <div className="space-y-2">
                  {data?.autoFixes.map((fix: any) => (
                    <div key={fix.id} className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3 shadow-inner">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-300">{fix.actionTaken}</p>
                        <p className="text-xs text-blue-200/70 mt-0.5">Execution sequence complete for anomaly {fix.issueId}</p>
                        <p className="text-[10px] text-blue-500/50 mt-1.5 font-mono">{new Date(fix.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Strategy Engine */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col border-blue-500/10">
          <div className="p-4 border-b border-white/10 bg-blue-500/5 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-black text-white uppercase tracking-widest text-xs">Global Optimization Stream</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96 custom-scrollbar">
            {data?.optimizationActions.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">Strategic engine idle. Awaiting yield signals.</p>
            ) : (
              <div className="space-y-3">
                {data?.optimizationActions.map((action: any) => (
                  <div key={action.id} className="p-3 bg-[#111827]/50 border border-white/5 rounded-xl flex items-start gap-3 shadow-inner">
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0 border",
                      action.action === 'SCALE' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      action.action === 'REDUCE' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      action.action === 'PAUSE' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border",
                          action.action === 'SCALE' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          action.action === 'REDUCE' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          action.action === 'PAUSE' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>{action.action === 'SCALE' ? 'YIELD_SCALE' : action.action === 'REDUCE' ? 'BUDGET_THROTTLE' : action.action}</span>
                        <span className="text-sm font-semibold text-white tracking-tight">{action.campaignName}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{action.reason}</p>
                      <p className="text-[10px] text-gray-500 mt-1.5 font-mono">{new Date(action.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Neural Strategic Memory */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col lg:col-span-2 border-indigo-500/10">
          <div className="p-4 border-b border-white/10 bg-indigo-500/5 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="font-black text-white uppercase tracking-widest text-xs">Neural Strategic Memory</h2>
          </div>
          <div className="p-4 overflow-x-auto custom-scrollbar">
            {data?.learningInsights.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">Neural pathways initializing. Strategic pattern recognition in progress.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-500 text-[10px] uppercase tracking-widest font-black">
                    <th className="pb-3 px-2">Diagnostic Observation</th>
                    <th className="pb-3 px-2">Intervention Type</th>
                    <th className="pb-3 px-2">Yield Vector</th>
                    <th className="pb-3 px-2">Institutional Insight</th>
                    <th className="pb-3 px-2 text-right">Protocol Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.learningInsights.map((insight: any) => (
                    <tr key={insight.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-2 text-white font-semibold tracking-tight">{insight.problem}</td>
                      <td className="py-4 px-2 text-gray-400 text-xs">{insight.actionTaken}</td>
                      <td className="py-4 px-2">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border",
                          insight.result === 'IMPROVED' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          insight.result === 'FAILED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {insight.result}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-medium text-indigo-300 text-xs italic">{insight.insight}</td>
                      <td className="py-4 px-2 text-gray-500 text-[10px] text-right font-mono uppercase">{new Date(insight.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
