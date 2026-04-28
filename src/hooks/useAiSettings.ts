import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export function useAiSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [manusMode, setManusMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Use setTimeout to avoid synchronous setState in effect warning
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'intelligence');
    
    // Use onSnapshot for live updates across the app
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.provider) setProvider(data.provider);
        if (data.manusMode !== undefined) setManusMode(data.manusMode);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to AI settings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { provider, manusMode, loading };
}
