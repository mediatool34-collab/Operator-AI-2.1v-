import React from 'react';
import { useAuth } from '../lib/auth';
import { signInWithGoogle, logOut } from '../lib/firebase';
import { LogIn, LogOut } from 'lucide-react';
import { AccountSelector } from './AccountSelector';
import { DateRangePicker } from './DateRangePicker';
import { useFilters } from '../lib/FilterContext';
import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  const { user } = useAuth();
  const { platform, setPlatform, metaSubPlatform, setMetaSubPlatform, metaProfile } = useFilters();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2">
            <select 
              value={platform} 
              onChange={(e) => setPlatform(e.target.value)}
              className="glass-input text-sm py-1.5 px-3"
            >
              <option value="meta">Meta Ads</option>
              <option value="google">Google Ads</option>
              <option value="tiktok">TikTok Ads</option>
              <option value="snapchat">Snapchat Ads</option>
            </select>
            {platform === 'meta' && (
              <select 
                value={metaSubPlatform} 
                onChange={(e) => setMetaSubPlatform(e.target.value as any)}
                className="glass-input text-sm py-1.5 px-3 border-border text-primary"
              >
                <option value="all">Meta Ads Manager (All)</option>
                <option value="facebook">Facebook Ads</option>
                <option value="instagram">Instagram Ads</option>
              </select>
            )}
          </div>
        )}
        {user && <AccountSelector />}
        {user && <DateRangePicker />}
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-muted border border-border pl-2 pr-4 py-1.5 rounded-full">
              <img 
                src={metaProfile?.avatar || user.photoURL || ''} 
                alt="Avatar" 
                className="w-6 h-6 rounded-full ring-2 ring-primary/30 shadow-sm" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(metaProfile?.name || user.displayName || 'User')}&background=random`;
                }}
              />
              <span className="text-sm font-medium text-foreground">{metaProfile?.name || user.displayName}</span>
            </div>
            <button
              onClick={logOut}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all active:scale-90"
              title="Log out"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 bg-primary text-primary-foreground border-transparent px-5 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        )}
      </div>
    </header>
  );
}
