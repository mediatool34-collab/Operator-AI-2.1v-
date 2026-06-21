import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, PlayCircle, PauseCircle, Settings, Shield, Zap, 
  RefreshCw, CheckCircle2, ChevronRight, Activity, Clock
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { usePersistedState } from '../hooks/usePersistedState';

const playbooks = [
  {
    id: 'stop_loss',
    name: 'Stop-Loss (Protect Margin)',
    description: 'Automatically pauses ads or adsets that spend more than $30 without generating a purchase.',
    icon: Shield,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20'
  },
  {
    id: 'scale_winners',
    name: 'Aggressive Scaling',
    description: 'Increases budget by 15-20% every 24 hours on campaigns maintaining a ROAS > 3.0.',
    icon: TrendingUp,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20'
  },
  {
    id: 'revive_fatigue',
    name: 'Fatigue Reviver',
    description: 'Detects declining CTR over 3 days, duplicates the ad, and applies a fresh CBO strategy.',
    icon: RefreshCw,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    id: 'late_night',
    name: 'Dayparting Edge',
    description: 'Reduces bids by 50% between 1 AM and 6 AM to conserve budget during low-conversion hours.',
    icon: Clock,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  }
];

export function PerformanceOperator() {
  const { user } = useAuth();
  const [activePlaybooks, setActivePlaybooks] = usePersistedState<string[]>('active_playbooks', []);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Mock fetching recent execution logs for realism
    setLogs([
      { id: 1, playbook: 'Stop-Loss', time: '10 mins ago', action: 'Paused Adset "Lookalike 1%" (Spent $35, 0 Sales)' },
      { id: 2, playbook: 'Aggressive Scaling', time: '2 hours ago', action: 'Increased budget on "Retargeting BOF" to $120/day (ROAS 4.2)' }
    ]);
  }, []);

  const togglePlaybook = (id: string) => {
    setActivePlaybooks(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full flex flex-col gap-6" dir="ltr">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Automations & Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">Autonomous playbooks actively monitoring and executing on your account 24/7.</p>
        </div>
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10 shrink-0">
          <div className="px-4 py-2 text-sm font-bold text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            {activePlaybooks.length} Active Engines
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Playbooks Grid */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {playbooks.map(pb => {
            const isActive = activePlaybooks.includes(pb.id);
            return (
              <div key={pb.id} className={cn(
                "glass-panel p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 cursor-pointer group",
                isActive ? "border-brand-accent/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]" : "hover:border-white/20"
              )} onClick={() => togglePlaybook(pb.id)}>
                <div className={cn("p-4 rounded-2xl transition-colors", isActive ? pb.bg : "bg-white/5")}>
                  <pb.icon className={cn("w-6 h-6", isActive ? pb.color : "text-muted-foreground")} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-accent transition-colors">
                      {pb.name}
                    </h3>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      isActive 
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-gray-800 text-gray-500 border-gray-700"
                    )}>
                      {isActive ? 'Active' : 'Paused'}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 max-w-md leading-relaxed">{pb.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Execution Logs */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-full bg-[#0A0F1C]/80 border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Zap className="w-5 h-5 text-brand-accent" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Recent Executions</h3>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {activePlaybooks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-xl">
                <Shield className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-gray-400 font-medium">No active playbooks.</p>
                <p className="text-xs text-gray-500 mt-1">Enable an automation to start protecting your account.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">{log.playbook}</span>
                    <span className="text-[10px] text-gray-500">{log.time}</span>
                  </div>
                  <p className="text-sm text-gray-300">{log.action}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

