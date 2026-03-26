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

  // ✅ NEW: Contract Total comparison for greenline (sum of baseline-rate contract totals vs current)
  getTotalOriginalContractTotal: () => number; // Sum of contract totals using pricing-table (baseline) rates

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

  // ✅ NEW: Sum of contract totals using baseline (pricing-table) rates for greenline comparison.
  // For services that export `originalContractTotal` (e.g. RPM Windows) we use it directly.
  // For services that don't track the baseline yet we fall back to their current contractTotal,
  // meaning those services contribute equally to both sides and don't affect the greenline ratio.
  const getTotalOriginalContractTotal = useCallback((): number => {
    let totalOriginal = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      if (serviceData?.isActive) {
        let originalTotal = 0;

        // Prefer explicit baseline-rate contract total when available
        if (typeof serviceData.originalContractTotal === 'number' && serviceData.originalContractTotal > 0) {
          originalTotal = serviceData.originalContractTotal;
        }
        // Fall back to current contract total (treats service as "no change")
        else if (typeof serviceData.contractTotal === 'number') {
          originalTotal = serviceData.contractTotal;
        } else if (serviceData.totals?.contract?.amount && typeof serviceData.totals.contract.amount === 'number') {
          originalTotal = serviceData.totals.contract.amount;
        } else if (serviceData.totals?.annual?.amount && typeof serviceData.totals.annual.amount === 'number') {
          originalTotal = serviceData.totals.annual.amount;
        }

        totalOriginal += originalTotal;
      }
    });

    // Trip/parking charges don't have a separate "original" – treat as unchanged
    const tripChargeContractTotal = globalTripChargeFrequency === 0
      ? globalTripCharge
      : globalTripCharge * globalTripChargeFrequency * globalContractMonths;
    const parkingChargeContractTotal = globalParkingChargeFrequency === 0
      ? globalParkingCharge
      : globalParkingCharge * globalParkingChargeFrequency * globalContractMonths;

    totalOriginal += tripChargeContractTotal;
    totalOriginal += parkingChargeContractTotal;

    console.log(`📊 [ORIGINAL CONTRACT TOTAL] $${totalOriginal.toFixed(2)}`);
    return totalOriginal;
  }, [servicesState, globalContractMonths, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency]);

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
      // ✅ NEW: Contract Total comparison for greenline
      getTotalOriginalContractTotal,
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
  }, [servicesState, updateSaniclean, updateService, backendPricingData, getBackendPricingForService, globalContractMonths, getTotalAgreementAmount, getTotalOriginalContractTotal, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency]); // ✅ Keep dependencies - callbacks are stable

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
