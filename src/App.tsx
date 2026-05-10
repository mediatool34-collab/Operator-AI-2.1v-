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
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from './lib/firebase';

import { PageUnderConstruction } from './components/PageUnderConstruction';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen bg-[#0B0F19] text-white">Loading...</div>;
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0B0F19] text-white space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Operator AI</h1>
        <p className="text-gray-400 max-w-md text-center">Please sign in with your Google account to access your dashboard and intelligent insights.</p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          <LogIn className="w-5 h-5" />
          Sign In with Google
        </button>
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
        { path: "ad-spy", element: <LiveAdSpy /> },
        { path: "creatives", element: <Creatives /> },
        { path: "campaigns", element: <Campaigns /> },
        { path: "budget", element: <BudgetPlanner /> },
        { path: "scaling", element: <TestingEngine /> },
        { path: "funnel", element: <DiagnosisEngine /> },
        { path: "automation", element: <ExecutionEngine /> },
        { path: "market", element: <MarketIntelligence /> },
        { path: "social-intel", element: <SocialIntelligenceHub /> },
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

