import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeJson } from './utils';
import { useAuth } from './auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';

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

    // Real-time listeners for tokens
    const unsubMeta = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'meta'), (docSnap) => {
      if (docSnap.exists()) setMetaToken(docSnap.data().accessToken);
      else setMetaToken(null);
    }, (err) => {
      console.error('Error fetching meta token:', err);
      if (err.code === 'permission-denied') {
        try {
          handleFirestoreError(err, 'get', `users/${user.uid}/tokens/meta`);
        } catch (e) {
          console.error('Handled Firestore Error:', e);
        }
      }
    });

    const unsubGoogle = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'google'), (docSnap) => {
      if (docSnap.exists()) setGoogleToken(docSnap.data().accessToken);
      else setGoogleToken(null);
    }, (err) => {
      console.error('Error fetching google token:', err);
      if (err.code === 'permission-denied') {
        try {
          handleFirestoreError(err, 'get', `users/${user.uid}/tokens/google`);
        } catch (e) {
          console.error('Handled Firestore Error:', e);
        }
      }
    });

    const unsubTiktok = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'tiktok'), (docSnap) => {
      if (docSnap.exists()) setTiktokToken(docSnap.data().accessToken);
      else setTiktokToken(null);
    }, (err) => {
      console.error('Error fetching tiktok token:', err);
      if (err.code === 'permission-denied') {
        try {
          handleFirestoreError(err, 'get', `users/${user.uid}/tokens/tiktok`);
        } catch (e) {
          console.error('Handled Firestore Error:', e);
        }
      }
    });

    const unsubSnapchat = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'snapchat'), (docSnap) => {
      if (docSnap.exists()) setSnapchatToken(docSnap.data().accessToken);
      else setSnapchatToken(null);
    }, (err) => {
      console.error('Error fetching snapchat token:', err);
      if (err.code === 'permission-denied') {
        try {
          handleFirestoreError(err, 'get', `users/${user.uid}/tokens/snapchat`);
        } catch (e) {
          console.error('Handled Firestore Error:', e);
        }
      }
    });

    return () => {
      unsubMeta();
      unsubGoogle();
      unsubTiktok();
      unsubSnapchat();
    };
  }, [user]);

  // Fetch Meta Profile Info
  useEffect(() => {
    if (metaToken) {
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

    if (currentToken) {
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
          setAdAccounts([unifiedAccount]);
          setSelectedAccountId('all');
        }
      })
      .catch(err => {
        console.error('Error fetching ad accounts:', err);
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
