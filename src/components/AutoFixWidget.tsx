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
    setFixProgress(10);
    
    try {
      // Step 1: Detect failure type and prepare fix
      const lastError = errors[0]?.message || '';
      const isAuthError = lastError.includes('401') || lastError.includes('Unauthorized');
      
      setFixProgress(30);
      
      // Step 2: Call Backend Self-Healing
      const res = await fetch('/api/debug/mode', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'system-healing' 
        },
        body: JSON.stringify({ action: 'AUTO_FIX_ALL', context: { isAuthError, lastError } }) 
      }).catch(() => null);
      
      setFixProgress(60);

      // Step 3: Client-side healing
      if (isAuthError) {
        // Clear potential expired states
        localStorage.removeItem('meta_token_error');
        console.log('🔧 Local Auth State Repaired');
      }

      await new Promise(r => setTimeout(r, 800));
      setFixProgress(90);
      await new Promise(r => setTimeout(r, 400));
      
      setErrors([]);
      setIsVisible(false);
      window.location.reload();
    } catch (e) {
      window.location.reload();
    } finally {
      setIsFixing(false);
      setFixProgress(0);
    }
  };

  if (!isVisible || errors.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="glass-panel bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Progress Bar */}
        {isFixing && (
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%] animate-gradient transition-all duration-500" style={{ width: `${fixProgress}%` }} />
        )}

        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm">
                <Wrench className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {isFixing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Applying Auto-Fix...
                  </span>
                ) : (
                  <>System Issue Detected <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] border border-red-500/20">{errors.length}</span></>
                )}
              </div>
              <div className="text-xs text-gray-400 font-medium truncate max-w-[300px]">
                {isFixing ? 'Re-syncing system state and clearing blockages...' : errors[0].message}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsVisible(false)}
              className="p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              onClick={handleFix}
              disabled={isFixing}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300",
                "bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]",
                isFixing && "opacity-50 grayscale cursor-not-allowed scale-100"
              )}
            >
              {isFixing ? 'Fixing...' : (
                <>
                  <Wrench className="w-4 h-4" />
                  Fix Issue
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
