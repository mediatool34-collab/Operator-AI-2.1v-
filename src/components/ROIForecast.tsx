import React from 'react';
import { TrendingUp, Sparkles, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';

interface ROIForecastProps {
  data?: Array<{ name: string; spend: number; roas: number }>;
  spendTrend?: number;
}

export function ROIForecast({ data = [], spendTrend }: ROIForecastProps) {
  const totalPeriodSpend = data.reduce((acc, d) => acc + (d.spend || 0), 0);
  const validRoasPoints = data.filter(d => (d.roas || 0) > 0);
  const avgRoas =
    validRoasPoints.length > 0
      ? validRoasPoints.reduce((acc, d) => acc + d.roas, 0) / validRoasPoints.length
      : 0;

  const trendFactor = spendTrend !== undefined ? 1 + Math.max(-0.25, Math.min(0.35, spendTrend / 100)) : 1.08;
  const projected30dSpend = totalPeriodSpend > 0 ? totalPeriodSpend * (30 / 7) * 0.25 * trendFactor : 0;
  const projectedRoas = avgRoas > 0 ? avgRoas * (spendTrend && spendTrend > 0 ? 1.05 : 1.02) : 0;
  const projectedRevenue = projected30dSpend * projectedRoas;
  const breakEvenProgress = projectedRoas > 0 ? Math.min(100, Math.round((projectedRoas / 2.5) * 100)) : 0;

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4 border border-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">ROI Forecast (30d)</h3>
        </div>
        {spendTrend !== undefined && (
          <span
            className={cn(
              'text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border',
              spendTrend >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            )}
          >
            {spendTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {spendTrend >= 0 ? '+' : ''}
            {spendTrend}%
          </span>
        )}
      </div>

      {totalPeriodSpend <= 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-gray-500 text-xs">
          <DollarSign className="w-7 h-7 opacity-25 mb-2" />
          <span>Insufficient spend trajectory for 30-day ROI projection.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0B0F19]/80 border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Est. 30d Spend</span>
              <span className="text-base font-black text-white tabular-nums">
                ${projected30dSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#0B0F19]/80 border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Est. Revenue</span>
              <span className="text-base font-black text-emerald-400 tabular-nums">
                {projectedRevenue > 0
                  ? `$${projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : 'Lead-Gen Mode'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0F19]/80 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                Projected ROAS
              </span>
              <span className="font-black text-white">
                {projectedRoas > 0 ? `${projectedRoas.toFixed(2)}x` : 'N/A (Leads)'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(12, breakEvenProgress)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Break-even Benchmark: 2.50x</span>
              <span>{projectedRoas >= 2.5 ? 'Scaling Ready' : projectedRoas > 0 ? 'Optimize Funnel' : 'Track Value'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
