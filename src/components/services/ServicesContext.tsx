// src/components/services/ServicesContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { SanicleanFormState } from "./saniclean/sanicleanTypes";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";

/**
 * Cross-service integration context.
 * Allows services and products to know about each other's state.
 * NOW ALSO: Stores complete service data for form saving
 * UPDATED: Includes backend pricing data to replace static fallbacks
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

  // Backend pricing data - replaces static fallbacks for inactive services
  backendPricingData: ServiceConfig[];
  getBackendPricingForService: (serviceId: string) => ServiceConfig | null;

  // Helper computed values
  isSanicleanAllInclusive: boolean;
  sanicleanPaperCreditPerWeek: number; // $5 per fixture per week

  // ✅ NEW: Global contract months functionality
  globalContractMonths: number; // Global contract months (2-36)
  setGlobalContractMonths: (months: number) => void;
  getTotalAgreementAmount: () => number; // Sum of all service contract totals

  // ✅ NEW: Red/Green Line Pricing Totals
  getTotalOriginalPerVisit: () => number; // Sum of raw per-visit prices (before minimums)
  getTotalMinimumPerVisit: () => number; // Sum of actual per-visit prices (after minimums)
}

const ServicesContext = createContext<ServicesContextValue | undefined>(
  undefined
);

export const ServicesProvider: React.FC<{
  children: React.ReactNode;
  backendPricingData?: ServiceConfig[]
}> = ({
  children,
  backendPricingData = [],
}) => {
  const [servicesState, setServicesState] = useState<ServicesState>({});

  // ✅ NEW: Global contract months state (default: 12 months)
  const [globalContractMonths, setGlobalContractMonths] = useState<number>(12);

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

  // Helper function to get backend pricing for a specific service
  const getBackendPricingForService = useCallback((serviceId: string): ServiceConfig | null => {
    return backendPricingData.find(config => config.serviceId === serviceId) || null;
  }, [backendPricingData]);

  // ✅ NEW: Helper function to calculate total agreement amount (sum of all service contract totals)
  const getTotalAgreementAmount = useCallback((): number => {
    let totalAmount = 0;

    // Iterate through all services and sum their contract totals
    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      // Check if service is active
      if (serviceData?.isActive) {
        // ✅ FIX: Contract total can be in multiple locations depending on service structure
        let contractTotal = 0;

        // Try direct contractTotal field (for simpler services)
        if (typeof serviceData.contractTotal === 'number') {
          contractTotal = serviceData.contractTotal;
        }
        // Try nested totals.contract.amount structure (for SaniClean and similar services)
        else if (serviceData.totals?.contract?.amount && typeof serviceData.totals.contract.amount === 'number') {
          contractTotal = serviceData.totals.contract.amount;
        }

        if (contractTotal > 0) {
          totalAmount += contractTotal;
          console.log(`📊 [TOTAL CALC] ${serviceName}: $${contractTotal.toFixed(2)}`);
        }
      }
    });

    console.log(`📊 [TOTAL CALC] Total Agreement Amount: $${totalAmount.toFixed(2)}`);
    return totalAmount;
  }, [servicesState]);

  // ✅ NEW: Helper function to calculate total original per-visit (raw prices before minimums)
  const getTotalOriginalPerVisit = useCallback((): number => {
    let totalOriginal = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      // Check if service is active
      if (serviceData?.isActive) {
        let originalPerVisit = 0;

        // Try different field names for raw per-visit price (before minimum)
        if (typeof serviceData.perVisitBase === 'number') {
          // Carpet uses perVisitBase
          originalPerVisit = serviceData.perVisitBase;
        } else if (typeof serviceData.rawPrice === 'number') {
          // Strip & Wax uses rawPrice
          originalPerVisit = serviceData.rawPrice;
        } else if (serviceData.calc?.perVisitBase && typeof serviceData.calc.perVisitBase === 'number') {
          // Some services store in calc object
          originalPerVisit = serviceData.calc.perVisitBase;
        } else if (serviceData.calc?.rawPrice && typeof serviceData.calc.rawPrice === 'number') {
          originalPerVisit = serviceData.calc.rawPrice;
        } else if (serviceData.totals?.perVisit?.base && typeof serviceData.totals.perVisit.base === 'number') {
          // SaniClean-style nested structure
          originalPerVisit = serviceData.totals.perVisit.base;
        } else if (typeof serviceData.perVisit === 'number') {
          // Fallback: if no raw price found, use actual perVisit
          originalPerVisit = serviceData.perVisit;
        } else if (serviceData.totals?.perVisit?.total && typeof serviceData.totals.perVisit.total === 'number') {
          // SaniClean uses totals.perVisit.total
          originalPerVisit = serviceData.totals.perVisit.total;
        }

        if (originalPerVisit > 0) {
          totalOriginal += originalPerVisit;
          console.log(`📊 [ORIGINAL CALC] ${serviceName}: $${originalPerVisit.toFixed(2)}`);
        }
      }
    });

    console.log(`📊 [ORIGINAL CALC] Total Original Per Visit: $${totalOriginal.toFixed(2)}`);
    return totalOriginal;
  }, [servicesState]);

  // ✅ NEW: Helper function to calculate total minimum per-visit (actual prices after minimums)
  const getTotalMinimumPerVisit = useCallback((): number => {
    let totalMinimum = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      // Check if service is active
      if (serviceData?.isActive) {
        let minimumPerVisit = 0;

        // Try different field names for actual per-visit price (after minimum)
        if (typeof serviceData.perVisitCharge === 'number') {
          // Carpet uses perVisitCharge
          minimumPerVisit = serviceData.perVisitCharge;
        } else if (typeof serviceData.perVisit === 'number') {
          // Most services use perVisit
          minimumPerVisit = serviceData.perVisit;
        } else if (serviceData.calc?.perVisit && typeof serviceData.calc.perVisit === 'number') {
          // Some services store in calc object
          minimumPerVisit = serviceData.calc.perVisit;
        } else if (serviceData.totals?.perVisit?.total && typeof serviceData.totals.perVisit.total === 'number') {
          // SaniClean uses totals.perVisit.total
          minimumPerVisit = serviceData.totals.perVisit.total;
        } else if (typeof serviceData.perVisitPrice === 'number') {
          // Some services use perVisitPrice
          minimumPerVisit = serviceData.perVisitPrice;
        }

        if (minimumPerVisit > 0) {
          totalMinimum += minimumPerVisit;
          console.log(`📊 [MINIMUM CALC] ${serviceName}: $${minimumPerVisit.toFixed(2)}`);
        }
      }
    });

    console.log(`📊 [MINIMUM CALC] Total Minimum Per Visit: $${totalMinimum.toFixed(2)}`);
    return totalMinimum;
  }, [servicesState]);

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
      backendPricingData,
      getBackendPricingForService,
      isSanicleanAllInclusive,
      sanicleanPaperCreditPerWeek,
      // ✅ NEW: Global contract months functionality
      globalContractMonths,
      setGlobalContractMonths,
      getTotalAgreementAmount,
      // ✅ NEW: Red/Green Line Pricing Totals
      getTotalOriginalPerVisit,
      getTotalMinimumPerVisit,
    };
  }, [servicesState, updateSaniclean, updateService, backendPricingData, getBackendPricingForService, globalContractMonths, getTotalAgreementAmount, getTotalOriginalPerVisit, getTotalMinimumPerVisit]); // ✅ Keep dependencies - callbacks are stable

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
