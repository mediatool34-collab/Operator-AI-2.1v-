import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { StatePersistenceProvider } from './lib/StatePersistenceContext';
import { FilterProvider } from './lib/FilterContext';
import { OSProvider } from './lib/OSContext';
import { IntelligenceProvider } from './lib/IntelligenceContext';
import { Layout } from './components/Layout';

// Active Core Pages
import { DataConnections } from './pages/DataConnections';
import { Settings } from './pages/Settings';
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Creatives } from './pages/Creatives';
import { PreFunnelIntelligence } from './pages/PreFunnelIntelligence';
import { GrowthPlanner } from './pages/GrowthPlanner';
import { BudgetPlanner } from './pages/BudgetPlanner';
import { LiveAdSpy } from './pages/LiveAdSpy';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <StatePersistenceProvider>
          <FilterProvider>
            <OSProvider>
              <IntelligenceProvider>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/pre-funnel" replace />} />
                    <Route path="overview" element={<Dashboard />} />
                    <Route path="connections" element={<DataConnections />} />
                    <Route path="pre-funnel" element={<PreFunnelIntelligence />} />
                    <Route path="campaigns" element={<Campaigns />} />
                    <Route path="creatives" element={<Creatives />} />
                    <Route path="settings" element={<Settings />} />

                    {/* Supporting views triggered directly from Pre-Funnel Intel */}
                    <Route path="growth-planner" element={<GrowthPlanner />} />
                    <Route path="budget" element={<BudgetPlanner />} />
                    <Route path="ad-spy" element={<LiveAdSpy />} />

                    <Route path="*" element={<Navigate to="/pre-funnel" replace />} />
                  </Route>
                </Routes>
              </IntelligenceProvider>
            </OSProvider>
          </FilterProvider>
        </StatePersistenceProvider>
      </AuthProvider>
    </Router>
  );
}
