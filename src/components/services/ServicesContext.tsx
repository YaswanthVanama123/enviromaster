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
  pureJanitorial?: any;
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

  // ✅ NEW: Frequency for trip and parking charges
  globalTripChargeFrequency: number; // How many times per month (default: 4 for weekly)
  setGlobalTripChargeFrequency: (frequency: number) => void;
  globalParkingChargeFrequency: number; // How many times per month (default: 4 for weekly)
  setGlobalParkingChargeFrequency: (frequency: number) => void;
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

  // ✅ NEW: Frequency state for trip and parking charges (default: 4 for weekly)
  const [globalTripChargeFrequency, setGlobalTripChargeFrequency] = useState<number>(4);
  const [globalParkingChargeFrequency, setGlobalParkingChargeFrequency] = useState<number>(4);

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
  const normalizeFrequencyKey = (value: any): string | null => {
    if (value === undefined || value === null) return null;
    const raw = typeof value === "object"
      ? value.frequencyKey ?? value.value ?? value.label ?? value.name ?? value.frequency ?? ""
      : value;
    const text = String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return text || null;
  };

  const isOneTimeService = (serviceData: any): boolean => {
    if (!serviceData) return false;
    const candidates = [
      serviceData.frequency,
      serviceData.frequencyKey,
      serviceData.frequency?.frequencyKey,
      serviceData.frequency?.value,
      serviceData.frequency?.label,
      serviceData.frequencyDisplay?.frequencyKey,
      serviceData.frequencyDisplay?.value,
      serviceData.frequencyDisplay?.label,
    ];
    return candidates.some((candidate) => {
      const normalized = normalizeFrequencyKey(candidate);
      return normalized === "onetime" || normalized === "1time";
    });
  };

  const getOneTimePrice = (serviceData: any): number | null => {
    const candidates = [
      serviceData.totalPrice,
      serviceData.calc?.totalPrice,
      serviceData.totals?.totalPrice?.amount,
      serviceData.totals?.perVisit?.amount,
      serviceData.totals?.firstVisit?.amount,
      serviceData.perVisit,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "number" && candidate > 0) {
        return candidate;
      }
    }
    return null;
  };

  const getTotalAgreementAmount = useCallback((): number => {
    let totalAmount = 0;

    // Iterate through all services and sum their contract totals
    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      // Check if service is active
      if (serviceData?.isActive) {
        // ✅ FIX: Contract total can be in multiple locations depending on service structure
        let contractTotal = 0;

        // Priority 1: Try direct contractTotal field (for SaniClean, RefreshPowerScrub)
        if (typeof serviceData.contractTotal === 'number') {
          contractTotal = serviceData.contractTotal;
          console.log(`📊 [TOTAL CALC] ${serviceName} found contractTotal: $${contractTotal.toFixed(2)}`);
        }
        // Priority 2: Try nested totals.contract.amount structure (for SaniPod, Janitorial)
        else if (serviceData.totals?.contract?.amount && typeof serviceData.totals.contract.amount === 'number') {
          contractTotal = serviceData.totals.contract.amount;
          console.log(`📊 [TOTAL CALC] ${serviceName} found totals.contract.amount: $${contractTotal.toFixed(2)}`);
        }
        // Priority 3: Try totals.annual.amount (for RPM Windows and similar services)
        else if (serviceData.totals?.annual?.amount && typeof serviceData.totals.annual.amount === 'number') {
          contractTotal = serviceData.totals.annual.amount;
          console.log(`📊 [TOTAL CALC] ${serviceName} found totals.annual.amount: $${contractTotal.toFixed(2)}`);
        }

        const oneTime = isOneTimeService(serviceData);
        if (oneTime) {
          const oneTimePrice = getOneTimePrice(serviceData);
          if (oneTimePrice !== null) {
            contractTotal = oneTimePrice;
            console.log(`ÐY"S [TOTAL CALC] ${serviceName} one-time override: $${contractTotal.toFixed(2)}`);
          }
        }

        if (contractTotal <= 0) {
          const fallbackFields = [
            serviceData.totals?.firstMonth?.amount,
            serviceData.perVisitCharge,
            serviceData.perVisit,
            serviceData.calc?.perVisit,
            serviceData.calc?.contractTotal,
            serviceData.calc?.total,
            serviceData.totalPrice,
            serviceData.calc?.totalPrice,
            serviceData.totals?.perVisit?.amount,
            serviceData.totals?.perVisit?.total,
          ];
          for (const fallback of fallbackFields) {
            if (typeof fallback === "number" && fallback > 0) {
              contractTotal = fallback;
              console.log(
                `📊 [TOTAL CALC] ${serviceName} fallback contract total: $${contractTotal.toFixed(2)}`
              );
              break;
            }
          }
        }

        if (contractTotal > 0) {
          totalAmount += contractTotal;
        } else {
          console.warn(
            `⚠️ [TOTAL CALC] ${serviceName} is active but no contract total found. Service data keys:`,
            Object.keys(serviceData)
          );
        }
      }
    });

    // ✅ Add global trip charge and parking charge to the contract total
    // These are per-visit charges, so multiply by frequency and contract months
    // Special handling for one-time charges (frequency = 0)
    const tripChargeContractTotal = globalTripChargeFrequency === 0
      ? globalTripCharge // One-time charge - no multiplication
      : globalTripCharge * globalTripChargeFrequency * globalContractMonths;

    const parkingChargeContractTotal = globalParkingChargeFrequency === 0
      ? globalParkingCharge // One-time charge - no multiplication
      : globalParkingCharge * globalParkingChargeFrequency * globalContractMonths;

    totalAmount += tripChargeContractTotal;
    totalAmount += parkingChargeContractTotal;

    if (tripChargeContractTotal > 0) {
      const freqLabel = globalTripChargeFrequency === 0 ? 'One-time' :
                       globalTripChargeFrequency === 4 ? 'Weekly' :
                       globalTripChargeFrequency === 2 ? 'Bi-weekly' :
                       globalTripChargeFrequency === 1 ? 'Monthly' :
                       globalTripChargeFrequency === 0.5 ? 'Every 2 months' :
                       globalTripChargeFrequency === 0.33 ? 'Quarterly' :
                       globalTripChargeFrequency === 0.17 ? 'Bi-annually' :
                       globalTripChargeFrequency === 0.08 ? 'Annually' :
                       `${globalTripChargeFrequency}×/mo`;

      console.log(`📊 [TOTAL CALC] Global Trip Charge ($${globalTripCharge} - ${freqLabel}): $${tripChargeContractTotal.toFixed(2)}`);
    }
    if (parkingChargeContractTotal > 0) {
      const freqLabel = globalParkingChargeFrequency === 0 ? 'One-time' :
                       globalParkingChargeFrequency === 4 ? 'Weekly' :
                       globalParkingChargeFrequency === 2 ? 'Bi-weekly' :
                       globalParkingChargeFrequency === 1 ? 'Monthly' :
                       globalParkingChargeFrequency === 0.5 ? 'Every 2 months' :
                       globalParkingChargeFrequency === 0.33 ? 'Quarterly' :
                       globalParkingChargeFrequency === 0.17 ? 'Bi-annually' :
                       globalParkingChargeFrequency === 0.08 ? 'Annually' :
                       `${globalParkingChargeFrequency}×/mo`;

      console.log(`📊 [TOTAL CALC] Global Parking Charge ($${globalParkingCharge} - ${freqLabel}): $${parkingChargeContractTotal.toFixed(2)}`);
    }

    console.log(`📊 [TOTAL CALC] Total Agreement Amount: $${totalAmount.toFixed(2)}`);
    return totalAmount;
  }, [servicesState, globalContractMonths, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency]);

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

        // Priority 1: Top-level minimum charge per visit (most common)
        if (typeof serviceData.minimumChargePerVisit === 'number') {
          minimumThreshold = serviceData.minimumChargePerVisit;
        }
        // Priority 2: SaniScrub uses perVisitMinimum
        else if (typeof serviceData.perVisitMinimum === 'number') {
          minimumThreshold = serviceData.perVisitMinimum;
        }
        // Priority 3: SaniClean uses minimumChargePerWeek
        else if (typeof serviceData.minimumChargePerWeek === 'number') {
          minimumThreshold = serviceData.minimumChargePerWeek;
        }
        // Priority 4: Direct minimum field
        else if (typeof serviceData.perVisitMinimum === 'number') {
          minimumThreshold = serviceData.perVisitMinimum;
        }
        // Priority 5: Calc object with minimum
        else if (serviceData.calc?.minimumChargePerVisit && typeof serviceData.calc.minimumChargePerVisit === 'number') {
          minimumThreshold = serviceData.calc.minimumChargePerVisit;
        }
        // Priority 6: Totals minimum charge per week (SaniClean)
        else if (serviceData.totals?.minimumChargePerWeek && typeof serviceData.totals.minimumChargePerWeek === 'number') {
          minimumThreshold = serviceData.totals.minimumChargePerWeek;
        }
        // Priority 7: Minimum visit (Refresh Power Scrub)
        else if (typeof serviceData.minimumVisit === 'number') {
          minimumThreshold = serviceData.minimumVisit;
        }
        // Priority 8: Form-level minimum
        else if (typeof serviceData.minCharge === 'number') {
          minimumThreshold = serviceData.minCharge;
        }
        // Priority 9: Config minimum
        else if (serviceData.config?.minimumChargePerVisit && typeof serviceData.config.minimumChargePerVisit === 'number') {
          minimumThreshold = serviceData.config.minimumChargePerVisit;
        }

        if (minimumThreshold > 0) {
          totalMinimum += minimumThreshold;
          console.log(`📊 [MINIMUM THRESHOLD CALC] ${serviceName}: $${minimumThreshold.toFixed(2)}`);
        } else {
          console.warn(`⚠️ [MINIMUM THRESHOLD CALC] ${serviceName} is active but no minimum found. Available fields:`, Object.keys(serviceData));
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
      // ✅ NEW: Frequency for trip and parking charges
      globalTripChargeFrequency,
      setGlobalTripChargeFrequency,
      globalParkingChargeFrequency,
      setGlobalParkingChargeFrequency,
    };
  }, [servicesState, updateSaniclean, updateService, backendPricingData, getBackendPricingForService, globalContractMonths, getTotalAgreementAmount, getTotalOriginalPerVisit, getTotalMinimumPerVisit, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency]); // ✅ Keep dependencies - callbacks are stable

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
