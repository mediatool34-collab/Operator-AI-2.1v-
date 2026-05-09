import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    
    // Log to backend
    fetch('/api/debug/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: { componentStack: errorInfo.componentStack }
      })
    }).catch(err => console.error('Failed to report frontend error', err));
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F19] text-white p-6">
          <div className="bg-[#111827] border border-red-500/30 rounded-2xl p-8 max-w-2xl w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
              <p className="text-gray-400">
                A critical error occurred in the user interface. We've logged this issue automatically and our systems are attempting to self-heal.
              </p>
            </div>

            <div className="bg-[#0B0F19] p-4 rounded-xl text-left border border-white/5 overflow-auto max-h-48 text-sm font-mono text-gray-300">
              {this.state.error?.message}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl w-full font-bold transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
