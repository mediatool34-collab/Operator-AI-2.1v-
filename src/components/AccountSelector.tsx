import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Target, Globe } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';

export function AccountSelector() {
  const { adAccounts, selectedAccountId, setSelectedAccountId, metaToken, googleToken, tiktokToken, loadingAccounts, platform } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!metaToken && !googleToken && !tiktokToken) return null;

  const currentAccount = adAccounts.find(a => a.id === selectedAccountId);
  const isUnified = selectedAccountId === 'all';

  const getPlatformIcon = () => {
    if (loadingAccounts) return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    if (isUnified) return <Globe className="w-4 h-4 text-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />;
    return <Target className="w-4 h-4 text-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />;
  };

  const unifiedAccount = adAccounts.find(a => a.id === 'all');
  const individualAccounts = adAccounts.filter(a => a.id !== 'all');

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingAccounts}
        className={`group flex items-center gap-3 bg-[#0B0F19] hover:bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
          isOpen ? 'ring-2 ring-blue-500/50 border-blue-500/30' : ''
        } ${loadingAccounts ? 'opacity-50 cursor-wait' : 'shadow-lg shadow-black/20'}`}
      >
        <div className="flex items-center justify-center">
          {getPlatformIcon()}
        </div>
        
        <div className="flex flex-col items-start min-w-[120px] max-w-[200px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none mb-0.5">
            {loadingAccounts ? 'Syncing...' : (isUnified ? 'Global View' : 'Single Account')}
          </span>
          <span className="truncate text-gray-200">
            {loadingAccounts ? 'Accounts...' : (currentAccount ? currentAccount.name : 'Select Account')}
          </span>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-gray-300'}`} />
      </button>

      {isOpen && !loadingAccounts && (
        <div className="absolute left-0 mt-3 w-80 bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 py-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-blue-500/5">
          {unifiedAccount && (
            <div className="px-3 mb-2">
              <button
                onClick={() => {
                  setSelectedAccountId('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  selectedAccountId === 'all' 
                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedAccountId === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-extrabold text-sm tracking-tight">Unified Account View</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">All {platform} Accounts</div>
                </div>
                {selectedAccountId === 'all' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
            </div>
          )}

          <div className="px-5 py-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5"></div>
            <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Individual Portfolios</div>
            <div className="h-px flex-1 bg-white/5"></div>
          </div>

          <div className="max-h-80 overflow-y-auto px-3 custom-scrollbar space-y-1">
            {individualAccounts.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">No Single Accounts Found</div>
                <div className="text-[10px] text-gray-700 mt-1 italic">Connected via {platform}</div>
              </div>
            ) : (
              individualAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    selectedAccountId === account.id 
                      ? 'bg-blue-500/10 text-blue-200 border border-blue-500/20' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Target className={`w-5 h-5 ${selectedAccountId === account.id ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-bold text-sm truncate uppercase tracking-tight">{account.name}</div>
                    <div className="text-[10px] font-medium text-gray-500 mt-0.5 truncate">ID: {account.account_id || account.id}</div>
                  </div>
                  {selectedAccountId === account.id && (
                    <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
                  )}
                </button>
              ))
            )}
          </div>
          
          <div className="mt-2 pt-2 px-4 border-t border-white/5">
             <div className="text-[9px] font-medium text-gray-600 italic text-center">
               Syncing live data from {platform.toUpperCase()} API nodes
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
