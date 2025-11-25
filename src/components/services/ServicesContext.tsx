// src/components/services/ServicesContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { SanicleanFormState } from "./saniclean/sanicleanTypes";

/**
 * Cross-service integration context.
 * Allows services and products to know about each other's state.
 */

export interface ServicesState {
  saniclean?: {
    pricingMode: SanicleanFormState["pricingMode"];
    fixtureCount: number;
    isActive: boolean;
  };
}

interface ServicesContextValue {
  servicesState: ServicesState;
  updateSaniclean: (update: Partial<ServicesState["saniclean"]>) => void;

  // Helper computed values
  isSanicleanAllInclusive: boolean;
  sanicleanPaperCreditPerWeek: number; // $5 per fixture per week
}

const ServicesContext = createContext<ServicesContextValue | undefined>(
  undefined
);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [servicesState, setServicesState] = useState<ServicesState>({});

  const updateSaniclean = useCallback(
    (update: Partial<ServicesState["saniclean"]>) => {
      setServicesState((prev) => ({
        ...prev,
        saniclean: {
          ...(prev.saniclean ?? {
            pricingMode: "auto",
            fixtureCount: 0,
            isActive: false,
          }),
          ...update,
        },
      }));
    },
    []
  );

  // Computed: Is SaniClean in all-inclusive mode?
  const isSanicleanAllInclusive =
    servicesState.saniclean?.isActive &&
    servicesState.saniclean?.pricingMode === "all_inclusive";

  // Computed: Paper credit (all-inclusive only)
  const sanicleanPaperCreditPerWeek = isSanicleanAllInclusive
    ? (servicesState.saniclean?.fixtureCount ?? 0) * 5 // $5 per fixture per week
    : 0;

  const value = useMemo<ServicesContextValue>(() => ({
    servicesState,
    updateSaniclean,
    isSanicleanAllInclusive,
    sanicleanPaperCreditPerWeek,
  }), [servicesState, updateSaniclean, isSanicleanAllInclusive, sanicleanPaperCreditPerWeek]);

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServicesContext = (): ServicesContextValue => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error(
      "useServicesContext must be used within ServicesProvider"
    );
  }
  return context;
};

// Hook that returns null if context is not available (for optional usage)
export const useServicesContextOptional = ():
  | ServicesContextValue
  | undefined => {
  return useContext(ServicesContext);
};
