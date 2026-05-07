import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export function useAiSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<AiProvider>(() => {
    return (localStorage.getItem('ai_provider') as AiProvider) || 'gemini';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
    
    const timer = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(timer);
  }, [user]);

  return { provider, loading };
}
