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

  // ✅ NEW: Global trip charge and parking charge
  globalTripCharge: number; // Trip charge per visit
  setGlobalTripCharge: (charge: number) => void;
  globalParkingCharge: number; // Parking charge per visit
  setGlobalParkingCharge: (charge: number) => void;
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

  // ✅ NEW: Global contract months state (default: 36 months)
  const [globalContractMonths, setGlobalContractMonths] = useState<number>(36);

  // ✅ NEW: Global trip charge and parking charge state (default: 0)
  const [globalTripCharge, setGlobalTripCharge] = useState<number>(0);
  const [globalParkingCharge, setGlobalParkingCharge] = useState<number>(0);

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

    // ✅ Add global trip charge and parking charge to the contract total
    // These are per-visit charges, so multiply by estimated visits in contract period
    // Assuming weekly frequency: contract months × 4.33 weeks/month
    const estimatedVisitsInContract = globalContractMonths * 4.33;
    const tripChargeContractTotal = globalTripCharge * estimatedVisitsInContract;
    const parkingChargeContractTotal = globalParkingCharge * estimatedVisitsInContract;

    totalAmount += tripChargeContractTotal;
    totalAmount += parkingChargeContractTotal;

    if (tripChargeContractTotal > 0) {
      console.log(`📊 [TOTAL CALC] Global Trip Charge (${estimatedVisitsInContract.toFixed(0)} visits): $${tripChargeContractTotal.toFixed(2)}`);
    }
    if (parkingChargeContractTotal > 0) {
      console.log(`📊 [TOTAL CALC] Global Parking Charge (${estimatedVisitsInContract.toFixed(0)} visits): $${parkingChargeContractTotal.toFixed(2)}`);
    }

    console.log(`📊 [TOTAL CALC] Total Agreement Amount: $${totalAmount.toFixed(2)}`);
    return totalAmount;
  }, [servicesState, globalContractMonths, globalTripCharge, globalParkingCharge]);

  // ✅ NEW: Helper function to calculate total original per-visit (actual charged prices)
  const getTotalOriginalPerVisit = useCallback((): number => {
    let totalOriginal = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      // Check if service is active
      if (serviceData?.isActive) {
        let originalPerVisit = 0;

        // Get the ACTUAL per-visit price being charged (not raw before minimum)
        // This is the price after minimum has been applied

        if (typeof serviceData.perVisitCharge === 'number') {
          // Carpet uses perVisitCharge (after minimum)
          originalPerVisit = serviceData.perVisitCharge;
        } else if (typeof serviceData.perVisit === 'number') {
          // Most services use perVisit (after minimum)
          originalPerVisit = serviceData.perVisit;
        } else if (serviceData.calc?.perVisit && typeof serviceData.calc.perVisit === 'number') {
          // Some services store in calc object
          originalPerVisit = serviceData.calc.perVisit;
        } else if (serviceData.totals?.perVisit?.total && typeof serviceData.totals.perVisit.total === 'number') {
          // SaniClean uses totals.perVisit.total
          originalPerVisit = serviceData.totals.perVisit.total;
        } else if (serviceData.totals?.perVisit?.amount && typeof serviceData.totals.perVisit.amount === 'number') {
          // RPM Windows, Janitorial, SaniScrub, FoamingDrain use totals.perVisit.amount
          originalPerVisit = serviceData.totals.perVisit.amount;
        } else if (typeof serviceData.perVisitPrice === 'number') {
          // Some services use perVisitPrice
          originalPerVisit = serviceData.perVisitPrice;
        }

        if (originalPerVisit > 0) {
          totalOriginal += originalPerVisit;
          console.log(`📊 [ORIGINAL CALC] ${serviceName}: $${originalPerVisit.toFixed(2)}`);
        }
      }
    });

    // ✅ Add global trip charge and parking charge to the original total
    totalOriginal += globalTripCharge;
    totalOriginal += globalParkingCharge;

    if (globalTripCharge > 0) {
      console.log(`📊 [ORIGINAL CALC] Global Trip Charge: $${globalTripCharge.toFixed(2)}`);
    }
    if (globalParkingCharge > 0) {
      console.log(`📊 [ORIGINAL CALC] Global Parking Charge: $${globalParkingCharge.toFixed(2)}`);
    }

    console.log(`📊 [ORIGINAL CALC] Total Original Per Visit: $${totalOriginal.toFixed(2)}`);
    return totalOriginal;
  }, [servicesState, globalTripCharge, globalParkingCharge]);

  // ✅ NEW: Helper function to calculate total minimum per-visit (sum of minimum thresholds)
  const getTotalMinimumPerVisit = useCallback((): number => {
    let totalMinimum = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      // Check if service is active
      if (serviceData?.isActive) {
        let minimumThreshold = 0;

        // Try to find the minimum price threshold configuration for each service
        // Different services store this in different fields

        // Top-level minimum charge per visit (most common)
        if (typeof serviceData.minimumChargePerVisit === 'number') {
          minimumThreshold = serviceData.minimumChargePerVisit;
        }
        // Direct minimum field
        else if (typeof serviceData.perVisitMinimum === 'number') {
          minimumThreshold = serviceData.perVisitMinimum;
        }
        // Calc object with minimum
        else if (serviceData.calc?.minimumChargePerVisit && typeof serviceData.calc.minimumChargePerVisit === 'number') {
          minimumThreshold = serviceData.calc.minimumChargePerVisit;
        }
        // Minimum charge per week (SaniClean)
        else if (serviceData.totals?.minimumChargePerWeek && typeof serviceData.totals.minimumChargePerWeek === 'number') {
          minimumThreshold = serviceData.totals.minimumChargePerWeek;
        }
        // Minimum visit (Refresh Power Scrub)
        else if (typeof serviceData.minimumVisit === 'number') {
          minimumThreshold = serviceData.minimumVisit;
        }
        // Form-level minimum
        else if (typeof serviceData.minCharge === 'number') {
          minimumThreshold = serviceData.minCharge;
        }
        // Config minimum
        else if (serviceData.config?.minimumChargePerVisit && typeof serviceData.config.minimumChargePerVisit === 'number') {
          minimumThreshold = serviceData.config.minimumChargePerVisit;
        }

        if (minimumThreshold > 0) {
          totalMinimum += minimumThreshold;
          console.log(`📊 [MINIMUM THRESHOLD CALC] ${serviceName}: $${minimumThreshold.toFixed(2)}`);
        }
      }
    });

    console.log(`📊 [MINIMUM THRESHOLD CALC] Total Minimum Thresholds: $${totalMinimum.toFixed(2)}`);
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
      // ✅ NEW: Global trip charge and parking charge
      globalTripCharge,
      setGlobalTripCharge,
      globalParkingCharge,
      setGlobalParkingCharge,
    };
  }, [servicesState, updateSaniclean, updateService, backendPricingData, getBackendPricingForService, globalContractMonths, getTotalAgreementAmount, getTotalOriginalPerVisit, getTotalMinimumPerVisit, globalTripCharge, globalParkingCharge]); // ✅ Keep dependencies - callbacks are stable

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
