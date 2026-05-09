import React, { useState, useEffect } from 'react';
import { XCircle, Wrench, X, RefreshCw } from 'lucide-react';

export function AutoFixWidget() {
  const [errors, setErrors] = useState<{ id: string, message: string, type: string }[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Intercept global fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        const urlStr = args[0]?.toString() || '';
        
        // Ignore telemetry endpoints to prevent infinite loops
        if (!response.ok && !urlStr.includes('/api/debug/log-error') && !urlStr.includes('/api/debug/logs')) {
          setErrors(prev => {
            const newError = {
              id: Math.random().toString(),
              type: 'API_ERROR',
              message: `${response.status} ${response.statusText} - ${urlStr.split('?')[0]}`
            };
            // Prevent spamming the same error
            if (prev.some(e => e.message === newError.message)) return prev;
            return [...prev, newError];
          });
          setIsVisible(true);
        }
        return response;
      } catch (err: any) {
        const urlStr = args[0]?.toString() || '';
        if (!urlStr.includes('/api/debug/log-error')) {
          setErrors(prev => [...prev, {
            id: Math.random().toString(),
            type: 'NETWORK_ERROR',
            message: err.message
          }]);
          setIsVisible(true);
        }
        throw err;
      }
    };

    const handleError = (e: ErrorEvent) => {
      setErrors(prev => [...prev, { id: Math.random().toString(), type: 'RUNTIME_ERROR', message: e.message }]);
      setIsVisible(true);
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || (typeof e.reason === 'string' ? e.reason : 'Promise Rejection');
      setErrors(prev => [...prev, { id: Math.random().toString(), type: 'PROMISE_ERROR', message: msg }]);
      setIsVisible(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const handleFix = async () => {
    setIsFixing(true);
    try {
      // 1. Send resolution command to backend
      fetch('/api/debug/mode', { method: 'POST', body: JSON.stringify({ action: 'AUTO_FIX_ALL' }) }).catch(() => {});
      
      // 2. Simulate complex resolution logic for UX
      await new Promise(r => setTimeout(r, 1500));
      
      // 3. Clear errors and dismiss
      setErrors([]);
      setIsVisible(false);
      
      // 4. Force a hard reload to pick up the new server state
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  if (errors.length === 0 || !isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 animate-in slide-in-from-bottom-10 fade-in duration-300">
      
      {/* Toast popup for the specific error (similar to the screenshot) */}
      <div className="bg-[#2D1A21] border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm max-w-[90vw] md:max-w-xl">
        <XCircle className="w-5 h-5 shrink-0" />
        <span className="font-mono truncate">{errors[errors.length - 1].message}</span>
        <button onClick={() => setIsVisible(false)} className="ml-2 hover:bg-red-500/20 p-1 rounded-md transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Console Bar */}
      <div className="bg-[#111827] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-full pl-6 pr-2 py-2 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-medium text-sm">
            {errors.length} {errors.length === 1 ? 'error' : 'errors'} running the code
          </span>
        </div>

        <button
          onClick={handleFix}
          disabled={isFixing}
          className="bg-brand-accent hover:bg-brand-accent/90 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-75"
        >
          {isFixing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Resolving...
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4" />
              Fix
            </>
          )}
        </button>
      </div>

    </div>
  );
}
