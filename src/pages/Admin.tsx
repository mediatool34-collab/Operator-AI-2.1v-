import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, Globe, Database, Lock, AlertTriangle, CheckCircle2, Server, Terminal, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface SystemMetric {
  label: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ElementType;
}

export function Admin() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'infrastructure'>('overview');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const systemMetrics: SystemMetric[] = [
    { label: 'Active Sessions', value: '1,248', status: 'healthy', icon: Users },
    { label: 'API Requests/min', value: '45.2k', status: 'healthy', icon: Activity },
    { label: 'Database Health', value: '99.99%', status: 'healthy', icon: Database },
    { label: 'Auth Handshakes', value: '428', status: 'healthy', icon: Lock },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Server className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Super-Admin Command Center</h1>
          </div>
          <p className="text-gray-400">Global orchestration and system-wide visibility layer.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Global Live</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemMetrics.map((metric) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={metric.label}
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/5 rounded-xl text-gray-400 group-hover:text-blue-400 transition-colors">
                <metric.icon className="w-5 h-5" />
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                metric.status === 'healthy' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
              )}>
                {metric.status}
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">{metric.label}</div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* API Health & Environment */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  API Orchestration status
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {[
                { name: 'Meta Graph API (v21.0)', latency: '124ms', uptime: '99.98%', users: 842 },
                { name: 'Google Ads API (v15)', latency: '342ms', uptime: '99.95%', users: 615 },
                { name: 'TikTok Business API', latency: '215ms', uptime: '99.42%', users: 218 },
                { name: 'Gemini 1.5 Flash', latency: '450ms', uptime: '100%', users: 1248 },
              ].map((api) => (
                <div key={api.name} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white mb-0.5">{api.name}</div>
                      <div className="text-xs text-gray-500">{api.users} Active connections</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs font-bold text-blue-400">{api.latency}</div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Latency</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-green-400">{api.uptime}</div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Uptime</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-yellow-500/10 bg-yellow-500/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Global Client Secret Rotation</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  The zero-trust identity layer indicates that 12 client secrets are due for rotation in the next 48 hours. 
                  Operator AI handles this automatically via the encrypted persistence layer.
                </p>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-500 text-xs font-bold hover:bg-yellow-500/30 transition-all">
                    Manual Audit
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-white/5 text-gray-200 text-xs font-bold hover:bg-white/10 transition-all">
                    Ignore for now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Health Sidebar */}
        <div className="space-y-8">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Enterprise User Segments
            </h3>
            <div className="space-y-4">
              {[
                { segment: 'Agencies', count: 42, color: 'blue' },
                { segment: 'E-commerce', count: 185, color: 'purple' },
                { segment: 'Consultants', count: 94, color: 'indigo' },
              ].map((s) => (
                <div key={s.segment} className="p-4 rounded-xl bg-white/5 flex items-center justify-between">
                  <div className="text-sm text-gray-300">{s.segment}</div>
                  <div className="text-sm font-bold text-white">{s.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Global SFK Output
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  <span>Scaling Actions (Current Window)</span>
                  <span className="text-green-400">428</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[65%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  <span>Fixing Diagnostics</span>
                  <span className="text-yellow-400">1,248</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[45%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  <span>Protection (Kill) Shield</span>
                  <span className="text-red-400">182</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[15%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
