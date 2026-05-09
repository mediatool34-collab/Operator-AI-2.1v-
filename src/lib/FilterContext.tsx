import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeJson } from './utils';
import { useAuth } from './auth';

interface FilterContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  datePreset: string;
  setDatePreset: (preset: string) => void;
  adAccounts: any[];
  metaToken: string | null;
  googleToken: string | null;
  tiktokToken: string | null;
  snapchatToken: string | null;
  platform: string;
  setPlatform: (platform: string) => void;
  metaSubPlatform: 'all' | 'facebook' | 'instagram';
  setMetaSubPlatform: (sub: 'all' | 'facebook' | 'instagram') => void;
  metaProfile: { name: string, avatar: string } | null;
  loadingAccounts: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedAccountId');
  });
  const [datePreset, setDatePreset] = useState('last_30d');
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [metaToken, setMetaToken] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [tiktokToken, setTiktokToken] = useState<string | null>(null);
  const [snapchatToken, setSnapchatToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState('meta');
  const [metaSubPlatform, setMetaSubPlatform] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [metaProfile, setMetaProfile] = useState<{ name: string, avatar: string } | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const setSelectedAccountId = (id: string | null) => {
    setSelectedAccountIdState(id);
    if (id) {
      localStorage.setItem('selectedAccountId', id);
    } else {
      localStorage.removeItem('selectedAccountId');
    }
  };

  useEffect(() => {
    // Current selected account sync
  }, [selectedAccountId]);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setMetaToken(null);
        setGoogleToken(null);
        setTiktokToken(null);
        setSnapchatToken(null);
        setAdAccounts([]);
        setSelectedAccountId(null);
        setMetaProfile(null);
      });
      return;
    }

    setMetaToken(localStorage.getItem('meta_token') || 'local_meta_token');
    return () => {};
  }, [user]);

  // Fetch Meta Profile Info
  useEffect(() => {
    if (metaToken && metaToken !== 'local_meta_token') {
      fetch(`https://graph.facebook.com/me?fields=name,picture.type(large)&access_token=${metaToken}`)
        .then(res => safeJson(res))
        .then(data => {
          if (data.name && data.picture) {
            setMetaProfile({
              name: data.name,
              avatar: data.picture.data.url
            });
          }
        })
        .catch(err => console.error('Error fetching Meta profile:', err));
    } else {
      Promise.resolve().then(() => {
        setMetaProfile(null);
      });
    }
  }, [metaToken]);

  // Fetch Ad Accounts
  useEffect(() => {
    if (!user) return;
    
    let currentToken = null;
    if (platform === 'meta') currentToken = metaToken;
    if (platform === 'google') currentToken = googleToken;
    if (platform === 'tiktok') currentToken = tiktokToken;
    if (platform === 'snapchat') currentToken = snapchatToken;

    if (currentToken && currentToken !== 'local_meta_token') {
      Promise.resolve().then(() => setLoadingAccounts(true));
      fetch(`/api/adaccounts?platform=${platform}`, {
        headers: { 
          'x-user-id': user.uid,
          [`x-${platform}-token`]: currentToken
        }
      })
      .then(res => safeJson(res))
      .then(data => {
        const unifiedAccount = { id: 'all', name: 'Unified Account View', account_id: 'ALL_ACCOUNTS' };
        if (data.accounts && data.accounts.length > 0) {
          const accountsWithUnified = [unifiedAccount, ...data.accounts];
          setAdAccounts(accountsWithUnified);
          
          const savedId = localStorage.getItem('selectedAccountId');
          const isCurrentValid = accountsWithUnified.some((a: any) => a.id === selectedAccountId);
          const isSavedValid = savedId && accountsWithUnified.some((a: any) => a.id === savedId);
          
          if (!isCurrentValid) {
            if (isSavedValid) {
              setSelectedAccountId(savedId);
            } else {
              setSelectedAccountId('all');
            }
          }
        } else {
          console.warn('No accounts returned from API:', data);
          setAdAccounts([unifiedAccount]);
          setSelectedAccountId('all');
          if (data.error || (data.accounts && data.accounts.length === 0)) {
            // Optional: You could set an error state here to show in the UI
          }
        }
      })
      .catch(err => {
        console.error('Error fetching ad accounts:', err);
        alert('Meta Data Error: ' + err.message);
        setAdAccounts([{ id: 'all', name: 'Unified Account View', account_id: 'ALL_ACCOUNTS' }]);
        setSelectedAccountId('all');
      })
      .finally(() => setLoadingAccounts(false));
    } else {
      Promise.resolve().then(() => {
        setAdAccounts([]);
        setSelectedAccountId(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, platform, metaToken, googleToken, tiktokToken, snapchatToken]);

  return (
    <FilterContext.Provider value={{ 
      selectedAccountId, 
      setSelectedAccountId, 
      datePreset, 
      setDatePreset, 
      adAccounts,
      metaToken,
      googleToken,
      tiktokToken,
      snapchatToken,
      platform,
      setPlatform,
      metaSubPlatform,
      setMetaSubPlatform,
      metaProfile,
      loadingAccounts
    }}>
      {children}
    </FilterContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
}
