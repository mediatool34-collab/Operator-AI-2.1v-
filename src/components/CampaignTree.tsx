import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, Target, Image as ImageIcon, Filter, ArrowUpDown, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';

interface CampaignTreeProps {
  campaigns: any[];
  adsets: any[];
  ads: any[];
  insights: any[];
  selectedId: string | null;
  onSelect: (item: any, type: 'campaign' | 'adset' | 'ad') => void;
}

type SortField = 'spend' | 'roas' | 'cpa' | 'ctr' | 'name';
type SortOrder = 'asc' | 'desc';

export function CampaignTree({ campaigns, adsets, ads, insights, selectedId, onSelect }: CampaignTreeProps) {
  const { platform, setPlatform } = useFilters();
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());
  
  // Filtering & Sorting State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [minRoas, setMinRoas] = useState<string>('');
  const [maxCpa, setMaxCpa] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const toggleCampaign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedCampaigns);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCampaigns(newSet);
  };

  const toggleAdset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedAdsets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedAdsets(newSet);
  };

  const getItemMetrics = React.useCallback((id: string) => {
    return insights.find(i => i.id === id)?.metrics || {};
  }, [insights]);

  const processedCampaigns = useMemo(() => {
    let filtered = [...campaigns];

    // Status Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Performance Filters
    if (minRoas || maxCpa) {
      filtered = filtered.filter(c => {
        const m = getItemMetrics(c.id);
        const roasMatch = !minRoas || (m.roas && m.roas >= parseFloat(minRoas));
        const cpaMatch = !maxCpa || (m.cpa && m.cpa <= parseFloat(maxCpa));
        return roasMatch && cpaMatch;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA: any, valB: any;
      
      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else {
        const mA = getItemMetrics(a.id);
        const mB = getItemMetrics(b.id);
        valA = mA[sortBy] || 0;
        valB = mB[sortBy] || 0;
      }

      const order = sortOrder === 'asc' ? 1 : -1;
      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });

    return filtered;
  }, [campaigns, statusFilter, minRoas, maxCpa, sortBy, sortOrder, getItemMetrics]);


  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full bg-[#0B0F19]/50 border border-white/5 shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-[#111827]/80 flex items-center justify-between">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-400" />
          Campaign Structure
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-1.5 rounded-lg border transition-all",
              showFilters ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            )}
            title="Filter & Sort"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-[#111827]/40 border-b border-white/5 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Platform</label>
            <select 
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-[#0B0F19] border border-white/10 text-xs rounded-lg px-3 py-2 text-gray-300 outline-none focus:border-blue-500/50"
            >
              <option value="meta">Meta Ads</option>
              <option value="google">Google Ads</option>
              <option value="tiktok">TikTok Ads</option>
              <option value="snapchat">Snapchat Ads</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 text-xs rounded-lg px-2 py-1.5 text-gray-300 outline-none focus:border-blue-500/50"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Sort By</label>
              <div className="flex gap-1">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="flex-1 bg-[#0B0F19] border border-white/10 text-xs rounded-lg px-2 py-1.5 text-gray-300 outline-none focus:border-blue-500/50"
                >
                  <option value="name">Name</option>
                  <option value="spend">Spend</option>
                  <option value="roas">ROAS</option>
                  <option value="cpa">CPA</option>
                  <option value="ctr">CTR</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 bg-[#0B0F19] border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Min. ROAS</label>
              <input 
                type="number"
                step="0.1"
                placeholder="0.0"
                value={minRoas}
                onChange={(e) => setMinRoas(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 text-xs rounded-lg px-2 py-1.5 text-gray-300 outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Max. CPA</label>
              <input 
                type="number"
                placeholder="50"
                value={maxCpa}
                onChange={(e) => setMaxCpa(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 text-xs rounded-lg px-2 py-1.5 text-gray-300 outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {processedCampaigns.length === 0 && (
          <div className="p-8 text-sm text-gray-500 text-center flex flex-col items-center gap-3">
            <Filter className="w-8 h-8 opacity-20" />
            <p>No campaigns match your filters</p>
            <button 
              onClick={() => { setStatusFilter('ALL'); setMinRoas(''); setMaxCpa(''); }}
              className="text-blue-400 text-xs font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
        {processedCampaigns.map(campaign => {
          const m = getItemMetrics(campaign.id);
          const campaignAdsets = adsets.filter(a => a.campaignId === campaign.id);
          const isExpanded = expandedCampaigns.has(campaign.id);
          const isSelected = selectedId === campaign.id;

          return (
            <div key={campaign.id} className="mb-2">
              <div 
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group relative overflow-hidden outline-none",
                  isSelected ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_4px_15px_rgba(59,130,246,0.1)]" : "hover:bg-white/5 text-gray-300 border border-transparent"
                )}
                onClick={() => onSelect(campaign, 'campaign')}
              >
                <button onClick={(e) => toggleCampaign(campaign.id, e)} className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                <Folder className={cn("w-4 h-4 shrink-0", isSelected ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} />
                <div className="flex flex-col min-w-0 flex-1 ml-1">
                  <span className="text-sm font-bold truncate tracking-tight">{campaign.name}</span>
                  {sortBy !== 'name' && m[sortBy] !== undefined && (
                    <span className="text-[10px] text-gray-500 font-medium">
                      {sortBy.toUpperCase()}: {sortBy === 'spend' || sortBy === 'cpa' ? `$${m[sortBy].toFixed(2)}` : (sortBy === 'ctr' ? `${m[sortBy].toFixed(2)}%` : `${m[sortBy].toFixed(2)}x`)}
                    </span>
                  )}
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              {isExpanded && (
                <div className="ml-6 pl-3 border-l border-white/10 mt-1 space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                  {campaignAdsets.map(adset => {
                    const adsetAds = ads.filter(a => a.adsetId === adset.id);
                    const isAdsetExpanded = expandedAdsets.has(adset.id);
                    const isAdsetSelected = selectedId === adset.id;

                    return (
                      <div key={adset.id}>
                        <div 
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200 group",
                            isAdsetSelected ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "hover:bg-white/5 text-gray-400 border border-transparent"
                          )}
                          onClick={() => onSelect(adset, 'adset')}
                        >
                          <button onClick={(e) => toggleAdset(adset.id, e)} className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                            {isAdsetExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          </button>
                          <Target className={cn("w-4 h-4 shrink-0", isAdsetSelected ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} />
                          <span className="text-xs font-semibold truncate flex-1">{adset.name}</span>
                          <StatusBadge status={adset.status} />
                        </div>

                        {isAdsetExpanded && (
                          <div className="ml-6 pl-3 border-l border-white/10 mt-1 space-y-1 animate-in fade-in slide-in-from-left-2 duration-200">
                            {adsetAds.map(ad => {
                              const isAdSelected = selectedId === ad.id;
                              return (
                                <div 
                                  key={ad.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200 group",
                                    isAdSelected ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "hover:bg-white/5 text-gray-400 border border-transparent"
                                  )}
                                  onClick={() => onSelect(ad, 'ad')}
                                >
                                  <div className="w-6 shrink-0" /> {/* Spacer */}
                                  <ImageIcon className={cn("w-3.5 h-3.5 shrink-0", isAdSelected ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} />
                                  <span className="text-xs truncate flex-1">{ad.name}</span>
                                  <StatusBadge status={ad.status} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" title="Active" />;
  if (status === 'PAUSED') return <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" title="Paused" />;
  if (status === 'ARCHIVED') return <div className="w-1.5 h-1.5 rounded-full bg-gray-500" title="Archived" />;
  return <div className="w-1.5 h-1.5 rounded-full bg-gray-600" title="Unknown" />;
}

