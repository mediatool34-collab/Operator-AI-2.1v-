import { createContext } from 'react';

export interface PersistedData {
  value: any;
  timestamp: number;
}

export interface StatePersistenceContextType {
  getPersistedState: (key: string) => any;
  setPersistedState: (key: string, value: any) => void;
  clearPersistedState: (key: string) => void;
}

export const StatePersistenceContext = createContext<StatePersistenceContextType | undefined>(undefined);

export const EXPIRATION_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
