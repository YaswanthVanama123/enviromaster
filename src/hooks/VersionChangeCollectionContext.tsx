import React, { createContext, useContext, ReactNode } from 'react';
import { useVersionChangeCollection } from './useVersionChangeCollection';

interface VersionChangeCollectionContextValue {
  addChange: (change: any) => void;
  removeChange: (productKey: string, fieldType: string) => void;
  clearChanges: () => void;
  logVersionChanges: (data: any) => Promise<any>;
  changes: any[];
  hasChanges: boolean;
  isLogging: boolean;
  error: string | null;
}

const VersionChangeCollectionContext = createContext<VersionChangeCollectionContextValue | null>(null);

interface VersionChangeCollectionProviderProps {
  children: ReactNode;
}

export const VersionChangeCollectionProvider: React.FC<VersionChangeCollectionProviderProps> = ({ children }) => {
  const versionChangeCollection = useVersionChangeCollection();

  return (
    <VersionChangeCollectionContext.Provider value={versionChangeCollection}>
      {children}
    </VersionChangeCollectionContext.Provider>
  );
};

export const useSharedVersionChangeCollection = (): VersionChangeCollectionContextValue => {
  const context = useContext(VersionChangeCollectionContext);
  if (!context) {
    throw new Error('useSharedVersionChangeCollection must be used within a VersionChangeCollectionProvider');
  }
  return context;
};

export const useSharedVersionChangeCollectionOptional = (): VersionChangeCollectionContextValue | null => {
  return useContext(VersionChangeCollectionContext);
};
