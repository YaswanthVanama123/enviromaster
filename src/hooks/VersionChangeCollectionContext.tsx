// src/hooks/VersionChangeCollectionContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useVersionChangeCollection } from './useVersionChangeCollection';

// Interface for the context value
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

// Create the context
const VersionChangeCollectionContext = createContext<VersionChangeCollectionContextValue | null>(null);

// Provider component
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

// Hook to use the shared version change collection
export const useSharedVersionChangeCollection = (): VersionChangeCollectionContextValue => {
  const context = useContext(VersionChangeCollectionContext);
  if (!context) {
    throw new Error('useSharedVersionChangeCollection must be used within a VersionChangeCollectionProvider');
  }
  return context;
};

// Optional hook that returns null if not within provider (for backward compatibility)
export const useSharedVersionChangeCollectionOptional = (): VersionChangeCollectionContextValue | null => {
  return useContext(VersionChangeCollectionContext);
};