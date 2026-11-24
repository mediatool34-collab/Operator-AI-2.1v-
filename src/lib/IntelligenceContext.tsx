import React, { useState } from 'react';
import { IntelligenceContext } from '../hooks/useIntelligence';

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<any[]>([]);

  const addReport = (report: any) => {
    setReports(prev => [report, ...prev]);
  };

  return (
    <IntelligenceContext.Provider value={{ reports, addReport }}>
      {children}
    </IntelligenceContext.Provider>
  );
}
