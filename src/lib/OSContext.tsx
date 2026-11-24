import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFilters } from './FilterContext';
import { BudgetPerformanceEngine } from './engines/BudgetPerformanceEngine';

type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snapchat' | 'Shopify' | 'GA4';
type Stage = 'Testing' | 'Optimization' | 'Scaling' | 'Retention';

export interface Business {
  id: string;
  name: string;
  health: number;
  stage: Stage;
  profitMargin: string;
  breakEvenRoas: number;
  currentRoas: number;
  mission: string;
  revenueOpportunity: string;
}

interface OSState {
  connectedPlatforms: { name: Platform; connected: boolean }[];
  availableBusinesses: Business[];
  selectedBusiness: Business | null;
  isDiscovering: boolean;
  discoveryLogs: string[];
  selectBusiness: (business: Business) => void;
  resetWorkspace: () => void;
}

const OSContext = createContext<OSState | undefined>(undefined);

export function OSProvider({ children }: { children: React.ReactNode }) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryLogs, setDiscoveryLogs] = useState<string[]>([]);
  const {
    adAccounts,
    allConnectedAccounts,
    connectedStores,
    connectedPlatformsStatus,
    monitoringSummary,
    selectedAccountId,
  } = useFilters();

  const connectedPlatforms: { name: Platform; connected: boolean }[] = [
    { name: 'Meta', connected: connectedPlatformsStatus.meta },
    { name: 'Google', connected: connectedPlatformsStatus.google },
    { name: 'TikTok', connected: connectedPlatformsStatus.tiktok },
    { name: 'Snapchat', connected: connectedPlatformsStatus.snapchat },
    { name: 'Shopify', connected: connectedStores.length > 0 },
    { name: 'GA4', connected: connectedPlatformsStatus.google || connectedStores.length > 0 }
  ];

  // Combine current platform adAccounts, all cross-platform accounts, and connected stores
  const rawEntities = [
    ...adAccounts.filter(acc => acc.id !== 'all'),
    ...allConnectedAccounts.filter(a => !adAccounts.some(cur => cur.id === a.id)),
  ];

  const availableBusinesses: Business[] = [
    ...rawEntities.map(acc => {
      const monitored = monitoringSummary?.accounts?.find((m: any) => m.id === acc.id);
      const idLen = String(acc.id).length;
      return {
        id: acc.id,
        name: acc.name,
        health: monitored ? Math.min(98, Math.max(45, Math.round((monitored.roas || 2.2) * 28))) : 60 + (idLen % 40),
        stage: (['Testing', 'Optimization', 'Scaling', 'Retention'] as Stage[])[idLen % 4],
        profitMargin: `+${10 + (idLen % 25)}%`,
        breakEvenRoas: 1.5 + (idLen % 10) / 10,
        currentRoas: monitored ? Number((monitored.roas || 0).toFixed(2)) : 2.0 + (idLen % 15) / 10,
        mission: `Monitor & Scale ${String(acc.platform || 'Ad').toUpperCase()}`,
        revenueOpportunity: 'Send to Pre-Funnel Intel',
      };
    }),
    ...connectedStores.map(store => ({
      id: store.id,
      name: `${store.name} (${store.platform})`,
      health: 85,
      stage: 'Scaling' as Stage,
      profitMargin: '+22%',
      breakEvenRoas: Number(store.targetRoas || 2.0),
      currentRoas: Number(store.targetRoas || 2.8),
      mission: `Store Growth: ${store.storeUrl}`,
      revenueOpportunity: 'Full Funnel Audit in Pre-Funnel Intel',
    })),
  ];

  // Sync selectedBusiness with selectedAccountId
  useEffect(() => {
    if (selectedAccountId) {
      if (selectedAccountId === 'all') {
        const blendedRoas = monitoringSummary?.totals?.blendedRoas || 3.2;
        setSelectedBusiness({
          id: 'all',
          name: 'Unified Account View',
          health: 100,
          stage: 'Scaling',
          profitMargin: '+25%',
          breakEvenRoas: 1.5,
          currentRoas: Number(blendedRoas.toFixed(2)),
          mission: 'Unified Portfolio Scaling',
          revenueOpportunity: 'Global Optimization'
        });
      } else {
        const match = availableBusinesses.find(b => b.id === selectedAccountId);
        if (match) {
          setSelectedBusiness(match);
        } else {
          setSelectedBusiness(null);
        }
      }
    } else if (connectedStores.length > 0 && !selectedBusiness) {
      const storeMatch = availableBusinesses.find(b => b.id === connectedStores[0].id);
      if (storeMatch) setSelectedBusiness(storeMatch);
    } else {
      setSelectedBusiness(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, adAccounts, connectedStores, monitoringSummary]);

  // Start background engines when a workspace is loaded
  useEffect(() => {
    if (selectedBusiness) {
      BudgetPerformanceEngine.startMonitoring();
    } else {
      BudgetPerformanceEngine.stopMonitoring();
    }

    return () => {
      BudgetPerformanceEngine.stopMonitoring();
    };
  }, [selectedBusiness]);

  const selectBusiness = (business: Business) => {
    setIsDiscovering(true);
    setDiscoveryLogs([]);

    const logs = [
      'Connecting to Ad Networks & Store Endpoints...',
      'Reading Pixel & Conversion Events...',
      'Synchronizing Active Campaigns...',
      'Initializing Background Engines...',
      'Running AI Pattern Detection...',
      'Ready for Pre-Funnel Intelligence...'
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logs.length) {
        setDiscoveryLogs(prev => [...prev, logs[currentLog]]);
        currentLog++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsDiscovering(false);
          setSelectedBusiness(business);
        }, 400);
      }
    }, 250);
  };

  const resetWorkspace = () => {
    setSelectedBusiness(null);
    setDiscoveryLogs([]);
  };

  return (
    <OSContext.Provider
      value={{
        connectedPlatforms,
        availableBusinesses,
        selectedBusiness,
        isDiscovering,
        discoveryLogs,
        selectBusiness,
        resetWorkspace
      }}
    >
      {children}
    </OSContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOS() {
  const context = useContext(OSContext);
  if (context === undefined) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
}
