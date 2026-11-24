import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeJson } from './utils';
import { useAuth } from './auth';

export type SupportedPlatform = 'meta' | 'google' | 'tiktok' | 'snapchat';

export interface ConnectedStore {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  storeUrl: string;
  platform: string;
  currency: string;
  monthlyRevenue: number;
  targetRoas: number;
  targetCpa: number;
  linkedAdAccountId?: string | null;
  linkedPlatform?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PreFunnelTargetSelection {
  type: 'url' | 'account' | 'platform' | 'store';
  platform?: SupportedPlatform;
  accountId?: string;
  accountName?: string;
  storeId?: string;
  storeName?: string;
  storeUrl?: string;
  currency?: string;
}

interface FilterContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
  datePreset: string;
  setDatePreset: (preset: string) => void;
  adAccounts: any[];
  allConnectedAccounts: any[];
  connectedStores: ConnectedStore[];
  connectedPlatformsStatus: Record<SupportedPlatform, boolean>;
  monitoringSummary: any | null;
  metaToken: string | null;
  googleToken: string | null;
  tiktokToken: string | null;
  snapchatToken: string | null;
  setPlatformToken: (platform: SupportedPlatform, token: string | null) => void;
  getTokenForPlatform: (platform: string) => string | null;
  platform: string;
  setPlatform: (platform: string) => void;
  metaSubPlatform: 'all' | 'facebook' | 'instagram';
  setMetaSubPlatform: (sub: 'all' | 'facebook' | 'instagram') => void;
  metaProfile: { name: string; avatar: string } | null;
  loadingAccounts: boolean;
  loadingConnections: boolean;
  loadingMonitoring: boolean;
  refreshConnections: () => Promise<void>;
  refreshMonitoring: () => Promise<void>;
  sendTargetToPreFunnel: (target: PreFunnelTargetSelection) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const PRE_FUNNEL_PENDING_TARGET_KEY = 'pre_funnel_pending_target';

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedAccountId');
  });
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedStoreId');
  });
  const [datePreset, setDatePreset] = useState('last_30d');
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [allConnectedAccounts, setAllConnectedAccounts] = useState<any[]>([]);
  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>([]);
  const [monitoringSummary, setMonitoringSummary] = useState<any | null>(null);

  const [metaToken, setMetaToken] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [tiktokToken, setTiktokToken] = useState<string | null>(null);
  const [snapchatToken, setSnapchatToken] = useState<string | null>(null);

  const [platform, setPlatform] = useState('meta');
  const [metaSubPlatform, setMetaSubPlatform] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [metaProfile, setMetaProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);

  const setSelectedAccountId = useCallback((id: string | null) => {
    setSelectedAccountIdState(id);
    if (id) {
      localStorage.setItem('selectedAccountId', id);
    } else {
      localStorage.removeItem('selectedAccountId');
    }
  }, []);

  const setSelectedStoreId = useCallback((id: string | null) => {
    setSelectedStoreIdState(id);
    if (id) {
      localStorage.setItem('selectedStoreId', id);
    } else {
      localStorage.removeItem('selectedStoreId');
    }
  }, []);

  const setPlatformToken = useCallback((plat: SupportedPlatform, token: string | null) => {
    if (token) {
      localStorage.setItem(`${plat}_token`, token);
    } else {
      localStorage.removeItem(`${plat}_token`);
    }
    if (plat === 'meta') setMetaToken(token);
    if (plat === 'google') setGoogleToken(token);
    if (plat === 'tiktok') setTiktokToken(token);
    if (plat === 'snapchat') setSnapchatToken(token);
  }, []);

  const getTokenForPlatform = useCallback(
    (plat: string): string | null => {
      if (plat === 'meta') return metaToken;
      if (plat === 'google') return googleToken;
      if (plat === 'tiktok') return tiktokToken;
      if (plat === 'snapchat') return snapchatToken;
      return null;
    },
    [metaToken, googleToken, tiktokToken, snapchatToken]
  );

  const refreshConnections = useCallback(async () => {
    if (!user) return;
    setLoadingConnections(true);
    try {
      const res = await fetch('/api/connections/overview', {
        headers: { 'x-user-id': user.uid },
      });
      const data = await safeJson(res);
      if (data && !data.error) {
        if (Array.isArray(data.platforms)) {
          data.platforms.forEach((p: any) => {
            if (p.accessToken && !localStorage.getItem(`${p.platform}_token`)) {
              localStorage.setItem(`${p.platform}_token`, p.accessToken);
              if (p.platform === 'meta') setMetaToken(p.accessToken);
              if (p.platform === 'google') setGoogleToken(p.accessToken);
              if (p.platform === 'tiktok') setTiktokToken(p.accessToken);
              if (p.platform === 'snapchat') setSnapchatToken(p.accessToken);
            }
          });
        }
        setAllConnectedAccounts(data.adAccounts || []);
        setConnectedStores(data.stores || []);
      }
    } catch (err) {
      console.error('Error refreshing connections overview:', err);
    } finally {
      setLoadingConnections(false);
    }
  }, [user]);

  const refreshMonitoring = useCallback(async () => {
    if (!user) return;
    setLoadingMonitoring(true);
    try {
      const headers: Record<string, string> = { 'x-user-id': user.uid };
      const mTok = localStorage.getItem('meta_token');
      const gTok = localStorage.getItem('google_token');
      const tTok = localStorage.getItem('tiktok_token');
      const sTok = localStorage.getItem('snapchat_token');
      if (mTok) headers['x-meta-token'] = mTok;
      if (gTok) headers['x-google-token'] = gTok;
      if (tTok) headers['x-tiktok-token'] = tTok;
      if (sTok) headers['x-snapchat-token'] = sTok;

      const res = await fetch('/api/monitoring/summary', { headers });
      const data = await safeJson(res);
      if (data && !data.error) {
        setMonitoringSummary(data);
        if (Array.isArray(data.accounts)) {
          setAllConnectedAccounts(prev => {
            const merged = [...data.accounts];
            for (const p of prev) {
              if (!merged.some((m: any) => m.id === p.id && m.platform === p.platform)) {
                merged.push(p);
              }
            }
            return merged;
          });
        }
        if (Array.isArray(data.stores)) {
          setConnectedStores(data.stores);
        }
      }
    } catch (err) {
      console.error('Error refreshing monitoring summary:', err);
    } finally {
      setLoadingMonitoring(false);
    }
  }, [user]);

  const sendTargetToPreFunnel = useCallback((target: PreFunnelTargetSelection) => {
    try {
      localStorage.setItem(PRE_FUNNEL_PENDING_TARGET_KEY, JSON.stringify({ ...target, requestedAt: Date.now() }));
    } catch (e) {
      console.error('Failed to store Pre-Funnel target:', e);
    }
  }, []);

  // Restore all 4 platform tokens on login + load DB overview
  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setMetaToken(null);
        setGoogleToken(null);
        setTiktokToken(null);
        setSnapchatToken(null);
        setAdAccounts([]);
        setAllConnectedAccounts([]);
        setConnectedStores([]);
        setMonitoringSummary(null);
        setSelectedAccountId(null);
        setMetaProfile(null);
      });
      return;
    }

    const m = localStorage.getItem('meta_token') || 'local_meta_token';
    const g = localStorage.getItem('google_token');
    const t = localStorage.getItem('tiktok_token');
    const s = localStorage.getItem('snapchat_token');
    setMetaToken(m);
    setGoogleToken(g);
    setTiktokToken(t);
    setSnapchatToken(s);

    refreshConnections().then(() => refreshMonitoring());
  }, [user, refreshConnections, refreshMonitoring, setSelectedAccountId]);

  // Fetch Meta Profile Info (live OAuth tokens only)
  useEffect(() => {
    if (metaToken && metaToken !== 'local_meta_token' && !metaToken.startsWith('manual_')) {
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

  // Fetch Ad Accounts for active platform
  useEffect(() => {
    if (!user) return;

    const currentToken = getTokenForPlatform(platform);
    const hasSavedForPlat = allConnectedAccounts.some(a => a.platform === platform);

    if ((currentToken && currentToken !== 'local_meta_token') || hasSavedForPlat) {
      Promise.resolve().then(() => setLoadingAccounts(true));
      const headers: Record<string, string> = { 'x-user-id': user.uid };
      if (currentToken) headers[`x-${platform}-token`] = currentToken;

      fetch(`/api/adaccounts?platform=${platform}`, { headers })
        .then(res => safeJson(res))
        .then(data => {
          const unifiedAccount = { id: 'all', name: 'Unified Account View', account_id: 'ALL_ACCOUNTS', platform };
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
            setAdAccounts([unifiedAccount]);
            setSelectedAccountId('all');
          }
        })
        .catch(err => {
          console.error('Error fetching ad accounts:', err);
          setAdAccounts([{ id: 'all', name: 'Unified Account View', account_id: 'ALL_ACCOUNTS', platform }]);
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

  const connectedPlatformsStatus: Record<SupportedPlatform, boolean> = {
    meta: (Boolean(metaToken) && metaToken !== 'local_meta_token') || allConnectedAccounts.some(a => a.platform === 'meta'),
    google: Boolean(googleToken) || allConnectedAccounts.some(a => a.platform === 'google'),
    tiktok: Boolean(tiktokToken) || allConnectedAccounts.some(a => a.platform === 'tiktok'),
    snapchat: Boolean(snapchatToken) || allConnectedAccounts.some(a => a.platform === 'snapchat'),
  };

  return (
    <FilterContext.Provider
      value={{
        selectedAccountId,
        setSelectedAccountId,
        selectedStoreId,
        setSelectedStoreId,
        datePreset,
        setDatePreset,
        adAccounts,
        allConnectedAccounts,
        connectedStores,
        connectedPlatformsStatus,
        monitoringSummary,
        metaToken,
        googleToken,
        tiktokToken,
        snapchatToken,
        setPlatformToken,
        getTokenForPlatform,
        platform,
        setPlatform,
        metaSubPlatform,
        setMetaSubPlatform,
        metaProfile,
        loadingAccounts,
        loadingConnections,
        loadingMonitoring,
        refreshConnections,
        refreshMonitoring,
        sendTargetToPreFunnel,
      }}
    >
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
