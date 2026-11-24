import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  Store,
  Activity,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Crosshair,
  Edit3,
  Layers,
  KeyRound,
  TrendingUp,
  Megaphone,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters, SupportedPlatform, ConnectedStore } from '../lib/FilterContext';
import { cn, safeJson } from '../lib/utils';

const PLATFORM_META: Array<{
  id: SupportedPlatform;
  name: string;
  badge: string;
  color: string;
  bg: string;
  border: string;
}> = [
  {
    id: 'meta',
    name: 'Meta Ads (FB & IG)',
    badge: 'f',
    color: 'text-blue-400',
    bg: 'bg-[#1877F2]',
    border: 'border-blue-500/30',
  },
  {
    id: 'google',
    name: 'Google Ads & YouTube',
    badge: 'G',
    color: 'text-emerald-400',
    bg: 'bg-white text-gray-900',
    border: 'border-emerald-500/30',
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads Manager',
    badge: 'TT',
    color: 'text-pink-400',
    bg: 'bg-black border border-white/20',
    border: 'border-pink-500/30',
  },
  {
    id: 'snapchat',
    name: 'Snapchat Ads Manager',
    badge: 'SC',
    color: 'text-yellow-300',
    bg: 'bg-[#FFFC00] text-black',
    border: 'border-yellow-500/30',
  },
];

export function DataConnections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    connectedPlatformsStatus,
    allConnectedAccounts,
    connectedStores,
    monitoringSummary,
    loadingMonitoring,
    setPlatformToken,
    setPlatform,
    setSelectedAccountId,
    refreshConnections,
    refreshMonitoring,
    sendTargetToPreFunnel,
  } = useFilters();

  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [manualModalPlat, setManualModalPlat] = useState<SupportedPlatform | null>(null);
  const [manualForm, setManualForm] = useState({ adAccountId: '', accountName: '', accessToken: '' });
  const [savingPlatform, setSavingPlatform] = useState(false);

  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [savingStore, setSavingStore] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    storeUrl: '',
    platform: 'salla',
    currency: 'SAR (ر.س)',
    monthlyRevenue: '25000',
    targetRoas: '3.5',
    targetCpa: '45',
    linkedPlatform: '',
    linkedAdAccountId: '',
    notes: '',
  });

  const [campaignFilterPlat, setCampaignFilterPlat] = useState<'all' | SupportedPlatform>('all');

  // OAuth popup listener
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.platform && event.data?.token) {
        if (!user) return;
        const plat = event.data.platform as SupportedPlatform;
        setPlatformToken(plat, event.data.token);
        await fetch('/api/connections/platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.uid },
          body: JSON.stringify({
            platform: plat,
            accessToken: event.data.token,
            refreshToken: event.data.refreshToken || null,
          }),
        });
        await refreshConnections();
        await refreshMonitoring();
        setBanner({ type: 'success', message: `${plat.toUpperCase()} connected and synced successfully.` });
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setBanner({ type: 'error', message: event.data.error || 'OAuth authentication failed.' });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, setPlatformToken, refreshConnections, refreshMonitoring]);

  const handleOAuthConnect = async (plat: SupportedPlatform) => {
    if (!user) return;
    setBanner(null);
    try {
      const response = await fetch(`/api/auth/connect/${plat}?uid=${user.uid}&json=true`);
      const text = await response.text();
      if (!response.ok) {
        let msg = `OAuth not configured for ${plat.toUpperCase()}.`;
        try {
          msg = JSON.parse(text).error || msg;
        } catch {}
        // Automatically open manual link drawer so user is never blocked
        setManualModalPlat(plat);
        setBanner({
          type: 'info',
          message: `${msg} Use Quick Account Link below to connect by Ad Account ID & Access Token.`,
        });
        return;
      }
      const { url } = JSON.parse(text);
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (err: any) {
      setManualModalPlat(plat);
      setBanner({ type: 'info', message: err.message || 'Use Quick Account Link below to link this platform.' });
    }
  };

  const handleManualConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualModalPlat) return;
    setSavingPlatform(true);
    setBanner(null);
    try {
      const res = await fetch('/api/connections/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.uid },
        body: JSON.stringify({
          platform: manualModalPlat,
          adAccountId: manualForm.adAccountId.trim() || `${manualModalPlat}_primary_acc`,
          accountName:
            manualForm.accountName.trim() ||
            `${manualModalPlat.toUpperCase()} Account (${manualForm.adAccountId.trim() || 'Primary'})`,
          accessToken: manualForm.accessToken.trim() || undefined,
        }),
      });
      const data = await safeJson(res);
      if (data.error) throw new Error(data.error);

      setPlatformToken(manualModalPlat, data.token);
      setPlatform(manualModalPlat);
      if (manualForm.adAccountId.trim()) {
        setSelectedAccountId(manualForm.adAccountId.trim());
      }
      await refreshConnections();
      await refreshMonitoring();

      setBanner({
        type: 'success',
        message: `${manualModalPlat.toUpperCase()} account linked and added to live monitoring.`,
      });
      setManualModalPlat(null);
      setManualForm({ adAccountId: '', accountName: '', accessToken: '' });
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to link platform account.' });
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleDisconnectPlatform = async (plat: SupportedPlatform) => {
    if (!user) return;
    setBanner(null);
    try {
      setPlatformToken(plat, null);
      await fetch(`/api/connections/platform/${plat}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.uid },
      });
      await refreshConnections();
      await refreshMonitoring();
      setBanner({ type: 'info', message: `${plat.toUpperCase()} disconnected.` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to disconnect platform.' });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return;
    try {
      await fetch(`/api/connections/account/${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.uid },
      });
      await refreshConnections();
      await refreshMonitoring();
      setBanner({ type: 'info', message: `Removed ad account ${accountId}.` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to delete ad account.' });
    }
  };

  const openEditStore = (st: ConnectedStore) => {
    setEditingStoreId(st.id);
    setStoreForm({
      name: st.name,
      storeUrl: st.storeUrl,
      platform: st.platform || 'salla',
      currency: st.currency || 'SAR (ر.س)',
      monthlyRevenue: String(st.monthlyRevenue || 0),
      targetRoas: String(st.targetRoas || 3.0),
      targetCpa: String(st.targetCpa || 50),
      linkedPlatform: st.linkedPlatform || '',
      linkedAdAccountId: st.linkedAdAccountId || '',
      notes: st.notes || '',
    });
    setShowStoreForm(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingStore(true);
    setBanner(null);
    try {
      const res = await fetch('/api/connections/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.uid },
        body: JSON.stringify({
          id: editingStoreId || undefined,
          ...storeForm,
        }),
      });
      const data = await safeJson(res);
      if (data.error) throw new Error(data.error);

      await refreshConnections();
      await refreshMonitoring();
      setShowStoreForm(false);
      setEditingStoreId(null);
      setStoreForm({
        name: '',
        storeUrl: '',
        platform: 'salla',
        currency: 'SAR (ر.س)',
        monthlyRevenue: '25000',
        targetRoas: '3.5',
        targetCpa: '45',
        linkedPlatform: '',
        linkedAdAccountId: '',
        notes: '',
      });
      setBanner({ type: 'success', message: 'Store saved & linked to monitoring hub.' });
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to save store.' });
    } finally {
      setSavingStore(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!user) return;
    try {
      await fetch(`/api/connections/stores/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.uid },
      });
      await refreshConnections();
      await refreshMonitoring();
      setBanner({ type: 'info', message: 'Store disconnected.' });
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to delete store.' });
    }
  };

  const totals = monitoringSummary?.totals || {
    connectedPlatformsCount: Object.values(connectedPlatformsStatus).filter(Boolean).length,
    adAccountsCount: allConnectedAccounts.length,
    storesCount: connectedStores.length,
    campaignsCount: 0,
    activeCampaignsCount: 0,
    totalSpend: 0,
    totalRevenue: 0,
    blendedRoas: 0,
    alertsCount: 0,
  };

  const monitoredPlatforms = monitoringSummary?.platforms || [];
  const monitoredAccounts = monitoringSummary?.accounts || allConnectedAccounts;
  const monitoredCampaigns = (monitoringSummary?.campaigns || []).filter(
    (c: any) => campaignFilterPlat === 'all' || c.platform === campaignFilterPlat
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30">
              <Link2 className="w-6 h-6 text-blue-400" />
            </div>
            Command Connections & Live Monitoring Hub
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            ربط ومتابعة الحسابات الإعلانية، المنصات، المتاجر، والحملات الحية — مع إرسال أي حساب أو متجر مباشرة للتحليل في Pre-Funnel Intel.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setEditingStoreId(null);
              setShowStoreForm(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Store (Salla / Zid / Shopify)
          </button>
          <button
            onClick={() => {
              refreshConnections();
              refreshMonitoring();
            }}
            disabled={loadingMonitoring}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loadingMonitoring && 'animate-spin')} />
            Sync All Live Metrics
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {banner && (
        <div
          className={cn(
            'p-4 rounded-2xl border flex items-center justify-between gap-4 text-sm',
            banner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : banner.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          )}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : banner.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <Activity className="w-5 h-5 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10">
            Close
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-panel p-4 rounded-2xl border-white/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Platforms Linked</div>
          <div className="text-2xl font-black text-white">{totals.connectedPlatformsCount} / 4</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Ad Accounts</div>
          <div className="text-2xl font-black text-blue-400">{totals.adAccountsCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Connected Stores</div>
          <div className="text-2xl font-black text-emerald-400">{totals.storesCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Active Campaigns</div>
          <div className="text-2xl font-black text-indigo-400">
            {totals.activeCampaignsCount} <span className="text-xs text-gray-500 font-bold">/ {totals.campaignsCount}</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Tracked Spend</div>
          <div className="text-2xl font-black text-white">${Number(totals.totalSpend || 0).toFixed(0)}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Blended ROAS & Alerts</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-400">{Number(totals.blendedRoas || 0).toFixed(2)}x</span>
            {totals.alertsCount > 0 && (
              <span className="text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg">
                {totals.alertsCount} Alerts
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1. Ad Platforms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            Ad Platforms & Live Spend Monitor
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLATFORM_META.map(plat => {
            const isConnected = connectedPlatformsStatus[plat.id];
            const summary = monitoredPlatforms.find((p: any) => p.platform === plat.id);
            return (
              <div
                key={plat.id}
                className={cn(
                  'glass-panel p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all',
                  isConnected ? plat.border : 'border-white/10'
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-lg', plat.bg)}>
                        {plat.badge}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{plat.name}</div>
                        <div className="text-xs flex items-center gap-1 mt-0.5">
                          {isConnected ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                            </span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Not Linked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isConnected && summary ? (
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#0B0F19] border border-white/5 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Accounts / Camps</span>
                        <span className="font-bold text-white">
                          {summary.accountsCount} / {summary.campaignsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">ROAS</span>
                        <span className="font-bold text-emerald-400">{Number(summary.roas || 0).toFixed(2)}x</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Spend</span>
                        <span className="font-bold text-blue-300">${Number(summary.spend || 0).toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Alerts</span>
                        <span className={cn('font-bold', summary.alertsCount > 0 ? 'text-red-400' : 'text-gray-400')}>
                          {summary.alertsCount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#0B0F19]/60 border border-white/5 text-[11px] text-gray-500">
                      Link via OAuth or enter an Ad Account ID / API Token to track campaigns live.
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOAuthConnect(plat.id)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
                    >
                      {isConnected ? 'Re-Auth OAuth' : 'OAuth Connect'}
                    </button>
                    <button
                      onClick={() => {
                        setManualModalPlat(plat.id);
                        setManualForm({ adAccountId: '', accountName: '', accessToken: '' });
                      }}
                      className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Link Ad Account ID or Token manually"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Link ID
                    </button>
                  </div>

                  {isConnected && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          sendTargetToPreFunnel({
                            type: 'platform',
                            platform: plat.id,
                            accountName: plat.name,
                          });
                          navigate('/pre-funnel');
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Crosshair className="w-3.5 h-3.5 shrink-0" />
                        <span>Pre-Funnel Intel</span>
                      </button>
                      <button
                        onClick={() => handleDisconnectPlatform(plat.id)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-colors"
                        title="Disconnect Platform"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Connected Stores Hub */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Store className="w-5 h-5 text-emerald-400" />
            Connected Stores & Funnels (Salla / Zid / Shopify / Custom)
          </h2>
          <button
            onClick={() => {
              setEditingStoreId(null);
              setShowStoreForm(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect New Store
          </button>
        </div>

        {connectedStores.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border-dashed border-white/15 text-center space-y-3">
            <Store className="w-10 h-10 text-emerald-400/60 mx-auto" />
            <div className="text-white font-bold">No Stores Connected Yet</div>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Add your Salla, Zid, Shopify, or custom website store to link it with your ad accounts, track target ROAS/CPA, and analyze it directly inside Pre-Funnel Intel.
            </p>
            <button
              onClick={() => setShowStoreForm(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add First Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {connectedStores.map(st => (
              <div key={st.id} className="glass-panel p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                          {st.platform}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold">{st.currency}</span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1.5 truncate">{st.name}</h3>
                      <a
                        href={st.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{st.storeUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditStore(st)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                        title="Edit Store"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStore(st.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        title="Delete Store"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#0B0F19] border border-white/5 text-center">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">Monthly Rev</span>
                      <span className="text-xs font-black text-white">{Number(st.monthlyRevenue || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">Target ROAS</span>
                      <span className="text-xs font-black text-emerald-400">{st.targetRoas}x</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">Target CPA</span>
                      <span className="text-xs font-black text-blue-400">{st.targetCpa}</span>
                    </div>
                  </div>

                  {st.linkedAdAccountId && (
                    <div className="text-[11px] text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        Linked Account: <strong className="text-white">{st.linkedAdAccountId}</strong> ({st.linkedPlatform || 'ads'})
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    sendTargetToPreFunnel({
                      type: 'store',
                      storeId: st.id,
                      storeName: st.name,
                      storeUrl: st.storeUrl,
                      currency: st.currency,
                      platform: (st.linkedPlatform as SupportedPlatform) || undefined,
                      accountId: st.linkedAdAccountId || undefined,
                    });
                    navigate('/pre-funnel');
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Crosshair className="w-4 h-4" />
                  Analyze Store + Linked Ads in Pre-Funnel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Monitored Ad Accounts Watchlist */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2.5">
          <Target className="w-5 h-5 text-indigo-400" />
          Monitored Ad Accounts ({monitoredAccounts.length})
        </h2>

        {monitoredAccounts.length === 0 ? (
          <div className="glass-panel p-6 rounded-2xl border-white/10 text-sm text-gray-400">
            No individual ad accounts linked yet. Connect a platform above or use <strong>Link ID</strong> to add specific ad accounts for monitoring.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitoredAccounts.map((acc: any) => (
              <div key={`${acc.platform}_${acc.id}`} className="glass-panel p-5 rounded-2xl border-white/10 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20 text-[10px] font-black uppercase">
                        {acc.platform}
                      </span>
                      {acc.alertsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 text-[10px] font-black">
                          {acc.alertsCount} Alerts
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm mt-1.5 truncate">{acc.name}</h3>
                    <div className="text-[11px] font-mono text-gray-500 truncate">ID: {acc.account_id || acc.id}</div>
                  </div>
                  {acc.source === 'saved' || acc.isManual ? (
                    <button
                      onClick={() => handleDeleteAccount(acc.account_id || acc.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                      title="Remove Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#0B0F19] border border-white/5 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block">Campaigns</span>
                    <span className="font-bold text-white">{acc.campaignsCount ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block">Spend</span>
                    <span className="font-bold text-blue-300">${Number(acc.spend || 0).toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block">ROAS</span>
                    <span className="font-bold text-emerald-400">{Number(acc.roas || 0).toFixed(2)}x</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPlatform(acc.platform || 'meta');
                      setSelectedAccountId(acc.id);
                      navigate('/overview');
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold transition-colors"
                  >
                    Open Dashboard
                  </button>
                  <button
                    onClick={() => {
                      sendTargetToPreFunnel({
                        type: 'account',
                        platform: acc.platform,
                        accountId: acc.id,
                        accountName: acc.name,
                      });
                      navigate('/pre-funnel');
                    }}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    Pre-Funnel Intel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Cross-Platform Monitored Campaigns Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-amber-400" />
            Live Cross-Platform Campaign Monitor ({monitoredCampaigns.length})
          </h2>
          <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1 rounded-xl border border-white/10">
            {(['all', 'meta', 'google', 'tiktok', 'snapchat'] as const).map(f => (
              <button
                key={f}
                onClick={() => setCampaignFilterPlat(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors',
                  campaignFilterPlat === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#111827]/70 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Platform / Account</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Spend</th>
                  <th className="p-4 text-right">ROAS</th>
                  <th className="p-4 text-right">CPA</th>
                  <th className="p-4 text-right">CTR</th>
                  <th className="p-4 text-center">Decision</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {monitoredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      No active campaigns monitored yet for this filter. Link an ad platform or account above to begin live tracking.
                    </td>
                  </tr>
                ) : (
                  monitoredCampaigns.map((camp: any) => (
                    <tr key={`${camp.platform}_${camp.accountId}_${camp.id}`} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white max-w-[240px]">
                        <div className="truncate" title={camp.name}>
                          {camp.name}
                        </div>
                        {camp.problems?.length > 0 && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                            {camp.problems.join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-gray-200 font-bold uppercase text-[10px] mr-1.5">
                          {camp.platform}
                        </span>
                        <span className="text-gray-400 text-[11px]">{camp.accountName}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black',
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-gray-500/20 text-gray-400'
                          )}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-gray-200">
                        ${Number(camp.metrics?.spend || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400">
                        {Number(camp.metrics?.roas || 0).toFixed(2)}x
                      </td>
                      <td className="p-4 text-right font-mono text-gray-300">
                        {camp.metrics?.cpa > 0 ? `$${Number(camp.metrics.cpa).toFixed(2)}` : '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-gray-300">
                        {Number(camp.metrics?.ctr || 0).toFixed(2)}%
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase',
                            camp.decision === 'SCALE'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : camp.decision === 'KILL'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : camp.decision === 'OPTIMIZE'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          )}
                        >
                          {camp.decision}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            sendTargetToPreFunnel({
                              type: 'account',
                              platform: camp.platform,
                              accountId: camp.accountId,
                              accountName: camp.accountName,
                            });
                            navigate('/pre-funnel');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <TrendingUp className="w-3 h-3" />
                          Pre-Funnel
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Manual Platform / Ad Account Link */}
      {manualModalPlat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/15 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Link {manualModalPlat.toUpperCase()} Ad Account</h3>
              <button onClick={() => setManualModalPlat(null)} className="text-gray-400 hover:text-white text-xs font-bold">
                Close
              </button>
            </div>
            <form onSubmit={handleManualConnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Ad Account ID (e.g. act_123456 or Customer ID)</label>
                <input
                  type="text"
                  required
                  value={manualForm.adAccountId}
                  onChange={e => setManualForm({ ...manualForm, adAccountId: e.target.value })}
                  placeholder={`e.g. ${manualModalPlat}_9948102`}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Account Display Name</label>
                <input
                  type="text"
                  value={manualForm.accountName}
                  onChange={e => setManualForm({ ...manualForm, accountName: e.target.value })}
                  placeholder="e.g. Rights.sa Production Ad Account"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">API Access Token (Optional — leave empty for Tracked Sandbox)</label>
                <input
                  type="password"
                  value={manualForm.accessToken}
                  onChange={e => setManualForm({ ...manualForm, accessToken: e.target.value })}
                  placeholder="Paste live API token or leave blank..."
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalPlat(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlatform}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black disabled:opacity-50"
                >
                  {savingPlatform ? 'Saving...' : 'Save & Monitor Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Connected Store */}
      {showStoreForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/15 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                {editingStoreId ? 'Edit Connected Store' : 'Connect Store or Brand Website'}
              </h3>
              <button onClick={() => setShowStoreForm(false)} className="text-gray-400 hover:text-white text-xs font-bold">
                Close
              </button>
            </div>
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Store Name</label>
                  <input
                    type="text"
                    required
                    value={storeForm.name}
                    onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                    placeholder="e.g. Rights.sa / Brand Store"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Store Platform</label>
                  <select
                    value={storeForm.platform}
                    onChange={e => setStoreForm({ ...storeForm, platform: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                  >
                    <option value="salla">Salla (سلة)</option>
                    <option value="zid">Zid (زد)</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                    <option value="custom">Custom / SaaS / Service Site</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Store / Website URL</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeUrl}
                  onChange={e => setStoreForm({ ...storeForm, storeUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Currency</label>
                  <select
                    value={storeForm.currency}
                    onChange={e => setStoreForm({ ...storeForm, currency: e.target.value })}
                    className="w-full px-2.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-xs"
                  >
                    <option value="SAR (ر.س)">SAR (ر.س)</option>
                    <option value="USD ($)">USD ($)</option>
                    <option value="AED (د.إ)">AED (د.إ)</option>
                    <option value="EGP (ج.م)">EGP (ج.م)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Monthly Rev</label>
                  <input
                    type="number"
                    value={storeForm.monthlyRevenue}
                    onChange={e => setStoreForm({ ...storeForm, monthlyRevenue: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Target ROAS</label>
                  <input
                    type="number"
                    step="0.1"
                    value={storeForm.targetRoas}
                    onChange={e => setStoreForm({ ...storeForm, targetRoas: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Target CPA</label>
                  <input
                    type="number"
                    value={storeForm.targetCpa}
                    onChange={e => setStoreForm({ ...storeForm, targetCpa: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Link Ad Account (Optional — combines store + ad telemetry)</label>
                <select
                  value={storeForm.linkedAdAccountId}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const acc = monitoredAccounts.find((a: any) => a.id === selectedId);
                    setStoreForm({
                      ...storeForm,
                      linkedAdAccountId: selectedId,
                      linkedPlatform: acc?.platform || '',
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl text-white text-sm"
                >
                  <option value="">-- No Specific Ad Account Linked --</option>
                  {monitoredAccounts.map((acc: any) => (
                    <option key={`${acc.platform}_${acc.id}`} value={acc.id}>
                      [{String(acc.platform).toUpperCase()}] {acc.name} ({acc.account_id || acc.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStoreForm(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStore}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-50"
                >
                  {savingStore ? 'Saving...' : 'Save Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
