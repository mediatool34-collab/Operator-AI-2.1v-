import { createContext, useContext, useState } from 'react';

interface IntelligenceContextType {
  reports: any[];
  addReport: (report: any) => void;
}

export const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

export function useIntelligence() {
  const context = useContext(IntelligenceContext);
  if (!context) {
    throw new Error('useIntelligence must be used within an IntelligenceProvider');
  }
  return context;
}
