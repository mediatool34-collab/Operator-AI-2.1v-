import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Target, Globe, Link2 } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';

export function AccountSelector() {
  const navigate = useNavigate();
  const {
    adAccounts,
    selectedAccountId,
    setSelectedAccountId,
    loadingAccounts,
    platform,
    connectedPlatformsStatus,
  } = useFilters();
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

  const isPlatConnected = connectedPlatformsStatus[platform as keyof typeof connectedPlatformsStatus];
  const currentAccount = adAccounts.find(a => a.id === selectedAccountId);
  const isUnified = selectedAccountId === 'all';

  const getPlatformIcon = () => {
    if (loadingAccounts) return <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />;
    if (!isPlatConnected && adAccounts.length === 0) return <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
    if (isUnified) return <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    return <Target className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  };

  const unifiedAccount = adAccounts.find(a => a.id === 'all');
  const individualAccounts = adAccounts.filter(a => a.id !== 'all');

  const buttonLabel = loadingAccounts
    ? 'Syncing...'
    : currentAccount
    ? currentAccount.name
    : isPlatConnected
    ? 'Select Account'
    : `No ${platform.toUpperCase()} Linked`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        disabled={loadingAccounts}
        className={`h-9 group flex items-center gap-2 bg-[#0B0F19] hover:bg-white/5 border border-white/10 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
          isOpen ? 'ring-2 ring-blue-500/50 border-blue-500/40' : ''
        } ${loadingAccounts ? 'opacity-60 cursor-wait' : ''}`}
      >
        {getPlatformIcon()}

        <div className="flex flex-col items-start min-w-[90px] max-w-[175px]">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 leading-none mb-0.5">
            {loadingAccounts
              ? 'Syncing'
              : !isPlatConnected && adAccounts.length === 0
              ? `${platform.toUpperCase()} Offline`
              : isUnified
              ? 'Global View'
              : 'Account'}
          </span>
          <span className="truncate w-full text-left text-gray-200 leading-tight">{buttonLabel}</span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-gray-300'
          }`}
        />
      </button>

      {isOpen && !loadingAccounts && (
        <div className="absolute left-0 mt-2 w-80 bg-[#0B0F19] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[100] py-3">
          {unifiedAccount && (
            <div className="px-3 mb-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedAccountId('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-150 ${
                  selectedAccountId === 'all'
                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedAccountId === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-xs tracking-tight">Unified Account View</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                    All {platform.toUpperCase()} Accounts
                  </div>
                </div>
              </button>
            </div>
          )}

          <div className="px-4 py-1.5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.18em]">
              Ad Accounts ({individualAccounts.length})
            </div>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="max-h-72 overflow-y-auto px-3 custom-scrollbar space-y-1">
            {individualAccounts.length === 0 ? (
              <div className="py-6 px-3 text-center space-y-3">
                <Building2 className="w-8 h-8 text-gray-700 mx-auto" />
                <div>
                  <div className="text-xs font-bold text-gray-400">No {platform.toUpperCase()} Accounts Linked</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Connect OAuth or link an Ad Account ID to monitor live metrics.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/connections');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect {platform.toUpperCase()} Account
                </button>
              </div>
            ) : (
              individualAccounts.map((account) => (
                <button
                  type="button"
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                    selectedAccountId === account.id
                      ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Target className={`w-4 h-4 shrink-0 ${selectedAccountId === account.id ? 'text-blue-400' : 'text-gray-500'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-bold text-xs truncate">{account.name}</div>
                    <div className="text-[10px] font-mono text-gray-500 mt-0.5 truncate">
                      ID: {account.account_id || account.id}
                    </div>
                  </div>
                  {selectedAccountId === account.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="mt-2 pt-2 px-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Live {platform.toUpperCase()} sync</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/connections');
              }}
              className="text-[10px] font-bold text-blue-400 hover:underline"
            >
              Manage Connections →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
