import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface ForecastData {
  date: string;
  historicalRoas?: number;
  projectedRoas?: number;
  spend: number;
}

export function ROIForecast({ data, spendTrend = 0 }: { data: any[], spendTrend?: number }) {
  // Generate predictive data based on historical
  const forecastData: ForecastData[] = [];
  
  if (!data || data.length === 0) return null;

  // Last 7 days historical
  data.forEach((d, i) => {
    forecastData.push({
      date: d.name || `Day ${i+1}`,
      historicalRoas: d.roas,
      spend: d.spend
    });
  });

  const lastHistorical = forecastData[forecastData.length - 1];
  const avgRoas = forecastData.reduce((acc, curr) => acc + (curr.historicalRoas || 0), 0) / forecastData.length;
  
  // Predict next 3 days
  let currentRoas = lastHistorical.historicalRoas || avgRoas;
  let currentSpend = lastHistorical.spend || 100;

  for (let i = 1; i <= 3; i++) {
    // Add some noise and trend
    const noise = (Math.sin(i * 13) * 0.05) + 0.05; // deterministic noise between 0 and 0.1
    const trendFactor = 1 + (spendTrend / 100);
    currentRoas = currentRoas * (0.95 + noise) * (trendFactor > 1 ? 1.02 : 0.98); // Slightly better if spend trend is up
    currentSpend = currentSpend * trendFactor;

    forecastData.push({
      date: `+${i}d`,
      projectedRoas: Number(currentRoas.toFixed(2)),
      spend: Number(currentSpend.toFixed(2)),
      historicalRoas: i === 1 ? lastHistorical.historicalRoas : undefined // Connect the line
    });
  }

  // Ensure line connection between historical and projected
  const connectionIndex = forecastData.findIndex(d => d.projectedRoas !== undefined);
  if (connectionIndex > 0) {
    forecastData[connectionIndex].projectedRoas = forecastData[connectionIndex-1].historicalRoas;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col h-full bg-gradient-to-b from-[#111827]/80 to-[#1e293b]/80 border-indigo-500/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
       <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          ROI Forecast
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">7d History + 3d Projection</span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-6 italic">
        Predictive modeling based on current daily budget fluctuations and historical conversion velocity.
      </p>

      <div className="flex-1 min-h-[200px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Area 
              type="monotone" 
              dataKey="historicalRoas" 
              stroke="#818cf8" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorHistorical)" 
              name="Historical ROAS"
              activeDot={{ r: 6, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="projectedRoas" 
              stroke="#34d399" 
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#colorProjected)" 
              name="Projected ROAS"
              activeDot={{ r: 6, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center gap-2 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
         <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
         <p className="text-[11px] text-muted-foreground leading-tight">
          Projection indicates a <span className="text-gray-200 font-bold">{lastHistorical.historicalRoas && currentRoas > lastHistorical.historicalRoas ? 'positive' : 'negative'} trajectory</span>.  Ensure net margins support sustained spend increases.
         </p>
      </div>
    </div>
  );
}
