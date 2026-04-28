import React, { useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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
import { LiveAdSpy } from './pages/LiveAdSpy';
import { BudgetPlanner } from './pages/BudgetPlanner';
import { PageUnderConstruction } from './components/PageUnderConstruction';
import { useAuth, AuthProvider } from './lib/auth';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/Pricing';

function AppRouter() {
  const { user, loading } = useAuth();

  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: !user ? <LandingPage /> : <Layout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "pricing", element: <PricingPage /> },
        { path: "dashboard", element: <Dashboard /> },
        { path: "admin", element: <Admin /> },
        { path: "ad-spy", element: <LiveAdSpy /> },
        { path: "creatives", element: <Creatives /> },
        { path: "campaigns", element: <Campaigns /> },
        { path: "budget", element: <BudgetPlanner /> },
        { path: "scaling", element: <TestingEngine /> },
        { path: "strategy", element: <Strategy /> },
        { path: "funnel", element: <DiagnosisEngine /> },
        { path: "automation", element: <ExecutionEngine /> },
        { path: "market", element: <MarketIntelligence /> },
        { path: "pre-funnel", element: <PreFunnelIntelligence /> },
        { path: "logs", element: <OptimizationLogs /> },
        { path: "alerts", element: <Alerts /> },
        { path: "settings", element: <Settings /> },
        { path: "*", element: <PageUnderConstruction title="Module" /> },
      ]
    }
  ], {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    }
  }), [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <StatePersistenceProvider>
      <FilterProvider>
        <RouterProvider router={router} />
      </FilterProvider>
    </StatePersistenceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

