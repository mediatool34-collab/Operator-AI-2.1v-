import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export function useAiSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'intelligence');
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.provider) setProvider(data.provider);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to AI settings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { provider, loading };
}
