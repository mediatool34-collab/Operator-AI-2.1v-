import React, { useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { FilterProvider } from './lib/FilterContext';
import { StatePersistenceProvider } from './lib/StatePersistenceContext';
import { Layout } from './components/Layout';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Creatives } from './pages/Creatives';
import { TestingEngine } from './pages/TestingEngine';
import { Strategy } from './pages/Strategy';
import { ExecutionEngine } from './pages/ExecutionEngine';
import { Alerts } from './pages/Alerts';
import { OptimizationLogs } from './pages/OptimizationLogs';
import { Settings } from './pages/Settings';
import { DiagnosisEngine } from './pages/DiagnosisEngine';
import { MarketIntelligence } from './pages/MarketIntelligence';
import { PreFunnelIntelligence } from './pages/PreFunnelIntelligence';
import { SocialIntelligenceHub } from './pages/SocialIntelligenceHub';
import { LiveAdSpy } from './pages/LiveAdSpy';
import { SystemIntelligence } from './pages/SystemIntelligence';
import { BudgetPlanner } from './pages/BudgetPlanner';
import { SocialStrategyAuditor } from './pages/SocialStrategyAuditor';
import { ContentArchitect } from './pages/ContentArchitect';
import { GrowthPlanner } from './pages/GrowthPlanner';
import { BrandOperatingSystem } from './pages/BrandOperatingSystem';
import { CreativeProductionIntelligence } from './pages/CreativeProductionIntelligence';
import { CustomerJourneyIntelligence } from './pages/CustomerJourneyIntelligence';
import { AutonomousScalingEngine } from './pages/AutonomousScalingEngine';
import { OmniStrategyEngine } from './pages/OmniStrategyEngine';
import { PerformanceOperator } from './pages/PerformanceOperator';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from './lib/firebase';

import { PageUnderConstruction } from './components/PageUnderConstruction';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signInAsSandbox } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups for this site, or try opening the app in a new tab.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('A sign-in request was already in progress or was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('The sign-in window was closed or blocked. Running inside an iframe limits popups. Please try opening the app in a new tab (using the button in the top right), or use the instant "Sandbox Developer Session" below.');
      } else {
        setError('An error occurred during sign-in. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };
  
  if (loading) return <div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>;
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground space-y-6 p-4">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to MediaBuyer</h1>
        <p className="text-muted-foreground max-w-md text-center">Please sign in with your Google account or launch a sandbox session to access your dashboard.</p>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-xl text-sm max-w-md text-center leading-relaxed font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={`flex items-center justify-center gap-2 glass-button ${isSigningIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSigningIn ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {isSigningIn ? 'Opening Popup...' : 'Sign In with Google'}
          </button>

          <button
            onClick={signInAsSandbox}
            className="flex items-center justify-center gap-2 bg-transparent hover:bg-muted text-foreground border border-border px-6 py-2 rounded-md text-sm font-medium transition-all active:scale-95"
          >
            <span>Launch Sandbox Developer Session</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", element: <Dashboard /> },
        { path: "admin", element: <Admin /> },
        { path: "omni-engine", element: <OmniStrategyEngine /> },
        { path: "performance", element: <PerformanceOperator /> },
        { path: "ad-spy", element: <LiveAdSpy /> },
        { path: "creatives", element: <Creatives /> },
        { path: "campaigns", element: <Campaigns /> },
        { path: "testing", element: <TestingEngine /> },
        { path: "funnel", element: <DiagnosisEngine /> },
        { path: "market", element: <MarketIntelligence /> },
        { path: "social-intel", element: <SocialIntelligenceHub /> },
        { path: "content-architect", element: <ContentArchitect /> },
        { path: "growth-planner", element: <GrowthPlanner /> },
        { path: "strategy", element: <Strategy /> },
        { path: "pre-funnel", element: <PreFunnelIntelligence /> },
        { path: "logs", element: <OptimizationLogs /> },
        { path: "alerts", element: <Alerts /> },
        { path: "settings", element: <Settings /> },
        { path: "*", element: <PageUnderConstruction title="Module" /> },
      ]
    }
  ], {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    }
  }), []);

  return (
    <AuthProvider>
      <StatePersistenceProvider>
        <FilterProvider>
          <RouterProvider router={router} />
        </FilterProvider>
      </StatePersistenceProvider>
    </AuthProvider>
  );
}

