// src/components/services/ServicesContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { SanicleanFormState } from "./saniclean/sanicleanTypes";

/**
 * Cross-service integration context.
 * Allows services and products to know about each other's state.
 * NOW ALSO: Stores complete service data for form saving
 */

export interface ServicesState {
  saniclean?: any;
  foamingDrain?: any;
  saniscrub?: any;
  microfiberMopping?: any;
  rpmWindows?: any;
  refreshPowerScrub?: any;
  sanipod?: any;
  carpetclean?: any;
  janitorial?: any;
  stripwax?: any;
  greaseTrap?: any;
  electrostaticSpray?: any;
  customServices?: any;
}

interface ServicesContextValue {
  servicesState: ServicesState;
  updateSaniclean: (update: Partial<ServicesState["saniclean"]>) => void;
  updateService: (serviceName: keyof ServicesState, data: any) => void;

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
          ...(prev.saniclean ?? {}),
          ...update,
        },
      }));
    },
    []
  );

  // Generic update method for any service
  const updateService = useCallback(
    (serviceName: keyof ServicesState, data: any) => {
      setServicesState((prev) => ({
        ...prev,
        [serviceName]: data,
      }));
    },
    []
  );

  const value = useMemo<ServicesContextValue>(() => {
    // Computed: Is SaniClean in all-inclusive mode?
    // Access the structured data format
    const sanicleanData = servicesState.saniclean;
    const isSanicleanAllInclusive = Boolean(
      sanicleanData?.isActive &&
      (sanicleanData?.pricingMode?.value === "All Inclusive" ||
       sanicleanData?.pricingMode === "all_inclusive")
    );

    // Computed: Paper credit (all-inclusive only)
    // Extract fixture count from the structured data
    const fixtureCount = sanicleanData?.fixtureBreakdown?.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) || 0;
    const sanicleanPaperCreditPerWeek = isSanicleanAllInclusive
      ? fixtureCount * 5 // $5 per fixture per week
      : 0;

    return {
      servicesState,
      updateSaniclean,
      updateService,
      isSanicleanAllInclusive,
      sanicleanPaperCreditPerWeek,
    };
  }, [servicesState, updateSaniclean, updateService]); // ✅ Keep dependencies - callbacks are stable

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
