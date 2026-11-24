import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { signInWithGoogle, logOut } from '../lib/firebase';
import { LogIn, LogOut, Store, Link2 } from 'lucide-react';
import { AccountSelector } from './AccountSelector';
import { DateRangePicker } from './DateRangePicker';
import { useFilters } from '../lib/FilterContext';

export function Topbar() {
  const { user } = useAuth();
  const {
    platform,
    setPlatform,
    metaSubPlatform,
    setMetaSubPlatform,
    metaProfile,
    connectedPlatformsStatus,
    connectedStores,
  } = useFilters();

  return (
    <header className="min-h-16 py-2 bg-brand-panel/90 backdrop-blur-md border-b border-brand-border flex items-center justify-between gap-3 px-4 md:px-6 shrink-0 relative z-40">
      <div className="flex items-center flex-wrap gap-2">
        {user && (
          <div className="flex items-center gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              aria-label="Ad Platform"
              className="h-9 bg-[#0B0F19] border border-white/10 rounded-xl text-xs font-bold text-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer [&>option]:bg-[#0B0F19] [&>option]:text-gray-100"
            >
              <option value="meta">Meta Ads {connectedPlatformsStatus.meta ? '●' : ''}</option>
              <option value="google">Google Ads {connectedPlatformsStatus.google ? '●' : ''}</option>
              <option value="tiktok">TikTok Ads {connectedPlatformsStatus.tiktok ? '●' : ''}</option>
              <option value="snapchat">Snapchat Ads {connectedPlatformsStatus.snapchat ? '●' : ''}</option>
            </select>
            {platform === 'meta' && (
              <select
                value={metaSubPlatform}
                onChange={(e) => setMetaSubPlatform(e.target.value as any)}
                aria-label="Meta Sub-Platform"
                className="h-9 bg-[#0B0F19] border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 px-3 outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer [&>option]:bg-[#0B0F19] [&>option]:text-gray-100"
              >
                <option value="all">Meta (All)</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
            )}
          </div>
        )}
        {user && <AccountSelector />}
        {user && <DateRangePicker />}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {user && (
          <NavLink
            to="/connections"
            className={({ isActive }) =>
              `hidden lg:flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
              }`
            }
            title="Manage Platforms, Ad Accounts & Stores"
          >
            {connectedStores.length > 0 ? (
              <>
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>{connectedStores.length} Store{connectedStores.length > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Stores & Links</span>
              </>
            )}
          </NavLink>
        )}

        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-brand-card/60 border border-brand-border pl-1.5 pr-3 py-1 rounded-full backdrop-blur-md h-9">
              <img
                src={metaProfile?.avatar || user.photoURL || ''}
                alt="Avatar"
                className="w-6 h-6 rounded-full ring-2 ring-brand-accent/30 shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(metaProfile?.name || user.displayName || 'User')}&background=random`;
                }}
              />
              <span className="hidden sm:inline text-xs font-semibold text-gray-200 max-w-[130px] truncate">
                {metaProfile?.name || user.displayName}
              </span>
            </div>
            <button
              onClick={logOut}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all active:scale-90"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 bg-brand-accent/20 border border-brand-accent/30 text-brand-accent px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-accent/30 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-95 whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        )}
      </div>
    </header>
  );
}
