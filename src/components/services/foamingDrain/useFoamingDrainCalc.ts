// src/features/services/foamingDrain/useFoamingDrainCalc.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
  FoamingDrainBreakdown,
} from "./foamingDrainTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Helper function to transform backend frequencyMetadata to frontend format
function transformBackendFrequencyMeta(backendMeta: BackendFoamingDrainConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return cfg.billingConversions;
  }

  console.log('🔧 [Foaming Drain] Transforming backend frequencyMetadata:', backendMeta);

  // Transform backend structure to frontend billingConversions format
  const transformedBilling: any = {};

  // Handle weekly and biweekly with their special multipliers
  if (backendMeta.weekly) {
    transformedBilling.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.weekly.firstMonthExtraMultiplier,
    };
  }

  if (backendMeta.biweekly) {
    transformedBilling.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.biweekly.firstMonthExtraMultiplier,
    };
  }

  // Handle cycle-based frequencies (monthly, bimonthly, quarterly, biannual, annual)
  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const monthlyMultiplier = 1 / cycleMonths; // e.g., bimonthly: 1/2=0.5, quarterly: 1/3=0.333

      transformedBilling[freq] = {
        cycleMonths,
        monthlyMultiplier,
      };
    }
  }

  // Merge with fallback config
  const finalBilling = {
    ...cfg.billingConversions, // Start with fallback values
    ...transformedBilling,     // Override with backend values
  };

  console.log('✅ [Foaming Drain] Transformed frequencyMetadata to billingConversions:', finalBilling);
  return finalBilling;
}

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendFoamingDrainConfig {
  standardPricing: {
    standardDrainRate: number;
    alternateBaseCharge: number;
    alternateExtraPerDrain: number;
  };
  volumePricing: {
    minimumDrains: number;
    weeklyRatePerDrain: number;
    bimonthlyRatePerDrain: number;
  };
  addOns: {
    plumbingWeeklyAddonPerDrain: number;
  };
  minimumChargePerVisit: number;
  installationMultipliers: {
    filthyMultiplier: number;
  };
  greenDrainPricing: {
    installPerDrain: number;
    weeklyRatePerDrain: number;
  };
  greaseTrapPricing: {
    weeklyRatePerTrap: number;
    installPerTrap: number;
  };
  tripCharges: {
    standard: number;
    beltway: number;
  };
  contract: {
    minMonths: number;
    maxMonths: number;
    defaultMonths: number;
  };
  defaultFrequency: string;
  allowedFrequencies: string[];
  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly?: { cycleMonths: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
}

const DEFAULT_FREQUENCY: FoamingDrainFrequency = cfg.defaultFrequency;

const DEFAULT_FOAMING_DRAIN_FORM_STATE: FoamingDrainFormState = {
  serviceId: "foamingDrain",

  standardDrainCount: 0,
  installDrainCount: 0,
  filthyDrainCount: 0,
  greaseTrapCount: 0,
  greenDrainCount: 0,
  plumbingDrainCount: 0,

  needsPlumbing: false,

  frequency: DEFAULT_FREQUENCY,
  // ✅ NEW: Default install frequency to weekly
  installFrequency: "weekly" as const,
  facilityCondition: "normal",
  location: "standard",

  useSmallAltPricingWeekly: false,
  useBigAccountTenWeekly: false,
  isAllInclusive: false,

  chargeGreaseTrapInstall: true,
  tripChargeOverride: undefined,

  contractMonths: cfg.contract.defaultMonths,
  notes: "",

  // Editable pricing rates from config (will be overridden by backend)
  standardDrainRate: cfg.standardDrainRate,
  altBaseCharge: cfg.altBaseCharge,
  altExtraPerDrain: cfg.altExtraPerDrain,
  volumeWeeklyRate: cfg.volumePricing.weekly.ratePerDrain,
  volumeBimonthlyRate: cfg.volumePricing.bimonthly.ratePerDrain,
  greaseWeeklyRate: cfg.grease.weeklyRatePerTrap,
  greaseInstallRate: cfg.grease.installPerTrap,
  greenWeeklyRate: cfg.green.weeklyRatePerDrain,
  greenInstallRate: cfg.green.installPerDrain,
  plumbingAddonRate: cfg.plumbing.weeklyAddonPerDrain,
  filthyMultiplier: cfg.installationRules.filthyMultiplier,
};

function clamp(num: number, min: number, max: number): number {
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function useFoamingDrainCalc(initialData?: Partial<FoamingDrainFormState>) {
  const [state, setState] = useState<FoamingDrainFormState>({
    ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
    ...initialData,
    serviceId: "foamingDrain",
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendFoamingDrainConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update state with config data from the actual backend structure
  const updateStateWithConfig = (config: BackendFoamingDrainConfig) => {
    setState((prev) => ({
      ...prev,
      // ✅ Extract from nested backend structure
      standardDrainRate: config.standardPricing?.standardDrainRate ?? prev.standardDrainRate,
      altBaseCharge: config.standardPricing?.alternateBaseCharge ?? prev.altBaseCharge,
      altExtraPerDrain: config.standardPricing?.alternateExtraPerDrain ?? prev.altExtraPerDrain,
      volumeWeeklyRate: config.volumePricing?.weeklyRatePerDrain ?? prev.volumeWeeklyRate,
      volumeBimonthlyRate: config.volumePricing?.bimonthlyRatePerDrain ?? prev.volumeBimonthlyRate,
      greaseWeeklyRate: config.greaseTrapPricing?.weeklyRatePerTrap ?? prev.greaseWeeklyRate,
      greaseInstallRate: config.greaseTrapPricing?.installPerTrap ?? prev.greaseInstallRate,
      greenWeeklyRate: config.greenDrainPricing?.weeklyRatePerDrain ?? prev.greenWeeklyRate,
      greenInstallRate: config.greenDrainPricing?.installPerDrain ?? prev.greenInstallRate,
      plumbingAddonRate: config.addOns?.plumbingWeeklyAddonPerDrain ?? prev.plumbingAddonRate,
      filthyMultiplier: config.installationMultipliers?.filthyMultiplier ?? prev.filthyMultiplier,
    }));
  };

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("foamingDrain");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Foaming Drain config not found in active services, trying fallback pricing...');
        console.warn('⚠️ [Foaming Drain] Error:', response?.error);

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("foamingDrain");
          if (fallbackConfig?.config) {
            console.log('✅ [Foaming Drain] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendFoamingDrainConfig;
            setBackendConfig(config);
            updateStateWithConfig(config);

            // ✅ Clear all custom overrides when refreshing config
            setState(prev => ({
              ...prev,
              customWeeklyService: undefined,
              customInstallationTotal: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));

            console.log('✅ Foaming Drain FALLBACK CONFIG loaded from context:', {
              standardPricing: config.standardPricing,
              volumePricing: config.volumePricing,
              addOns: config.addOns,
              minimumChargePerVisit: config.minimumChargePerVisit,
              installationMultipliers: config.installationMultipliers,
              greenDrainPricing: config.greenDrainPricing,
              greaseTrapPricing: config.greaseTrapPricing,
              tripCharges: config.tripCharges,
              frequencyMetadata: config.frequencyMetadata,
              contract: config.contract,
            });
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ Foaming Drain document has no config property');
        return;
      }

      const config = document.config as BackendFoamingDrainConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateStateWithConfig(config);

      // ✅ Clear all custom overrides when refreshing config
      setState(prev => ({
        ...prev,
        customWeeklyService: undefined,
        customInstallationTotal: undefined,
        customMonthlyRecurring: undefined,
        customFirstMonthPrice: undefined,
        customContractTotal: undefined,
      }));

      console.log('✅ Foaming Drain FULL CONFIG loaded from backend:', {
        standardPricing: config.standardPricing,
        volumePricing: config.volumePricing,
        addOns: config.addOns,
        minimumChargePerVisit: config.minimumChargePerVisit,
        installationMultipliers: config.installationMultipliers,
        greenDrainPricing: config.greenDrainPricing,
        greaseTrapPricing: config.greaseTrapPricing,
        tripCharges: config.tripCharges,
        frequencyMetadata: config.frequencyMetadata,
        contract: config.contract,
        contractLimits: `${config.contract?.minMonths}-${config.contract?.maxMonths} months`,
      });
    } catch (error) {
      console.error('❌ Failed to fetch Foaming Drain config from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("foamingDrain");
        if (fallbackConfig?.config) {
          console.log('✅ [Foaming Drain] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendFoamingDrainConfig;
          setBackendConfig(config);
          updateStateWithConfig(config);

          // ✅ Clear all custom overrides when refreshing config
          setState(prev => ({
            ...prev,
            customWeeklyService: undefined,
            customInstallationTotal: undefined,
            customMonthlyRecurring: undefined,
            customFirstMonthPrice: undefined,
            customContractTotal: undefined,
          }));

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // ✅ Fetch pricing configuration on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetch when services context becomes available
  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `foamingDrain_${fieldName}`,
      productName: `Foaming Drain - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: state.standardDrainCount || 1,
      frequency: state.frequency || ''
    });

    console.log(`📝 [FOAMING-DRAIN-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [state.standardDrainCount, state.frequency]);

  const quote = useMemo<FoamingDrainQuoteResult>(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map backend config to expected format with proper fallbacks
    const activeConfig = {
      standardDrainRate: backendConfig?.standardPricing?.standardDrainRate ?? cfg.standardDrainRate,
      altBaseCharge: backendConfig?.standardPricing?.alternateBaseCharge ?? cfg.altBaseCharge,
      altExtraPerDrain: backendConfig?.standardPricing?.alternateExtraPerDrain ?? cfg.altExtraPerDrain,
      volumePricing: {
        minimumDrains: backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains,
        weeklyRatePerDrain: backendConfig?.volumePricing?.weeklyRatePerDrain ?? cfg.volumePricing.weekly.ratePerDrain,
        bimonthlyRatePerDrain: backendConfig?.volumePricing?.bimonthlyRatePerDrain ?? cfg.volumePricing.bimonthly.ratePerDrain,
      },
      grease: {
        weeklyRatePerTrap: backendConfig?.greaseTrapPricing?.weeklyRatePerTrap ?? cfg.grease.weeklyRatePerTrap,
        installPerTrap: backendConfig?.greaseTrapPricing?.installPerTrap ?? cfg.grease.installPerTrap,
      },
      green: {
        weeklyRatePerDrain: backendConfig?.greenDrainPricing?.weeklyRatePerDrain ?? cfg.green.weeklyRatePerDrain,
        installPerDrain: backendConfig?.greenDrainPricing?.installPerDrain ?? cfg.green.installPerDrain,
      },
      plumbing: {
        weeklyAddonPerDrain: backendConfig?.addOns?.plumbingWeeklyAddonPerDrain ?? cfg.plumbing.weeklyAddonPerDrain,
      },
      installationRules: {
        filthyMultiplier: backendConfig?.installationMultipliers?.filthyMultiplier ?? cfg.installationRules.filthyMultiplier,
      },
      tripCharges: backendConfig?.tripCharges ?? cfg.tripCharges,
      contract: backendConfig?.contract ?? cfg.contract,
      defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
      allowedFrequencies: backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies,
      // ✅ NEW: Transform backend frequencyMetadata
      billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
    };

    if (!backendConfig) {
      console.warn('⚠️ [Foaming Drain] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [Foaming Drain] Using backend config with transformed frequency metadata:', {
        standardPricing: activeConfig.standardDrainRate,
        volumePricing: activeConfig.volumePricing,
        billingConversions: activeConfig.billingConversions,
      });
    }

    // ---------- 1) Normalize inputs ----------
    const standardDrains = Math.max(0, Number(state.standardDrainCount) || 0);
    const installRequested = Math.max(
      0,
      Number(state.installDrainCount) || 0
    );
    const filthyRequested = Math.max(
      0,
      Number(state.filthyDrainCount) || 0
    );
    const greaseTraps = Math.max(0, Number(state.greaseTrapCount) || 0);
    const greenDrains = Math.max(0, Number(state.greenDrainCount) || 0);
    const plumbingDrains = Math.max(
      0,
      Number(state.plumbingDrainCount) || 0
    );

    const frequency: FoamingDrainFrequency =
      state.frequency || DEFAULT_FREQUENCY;
    const location: FoamingDrainLocation = state.location || "standard";
    const condition: FoamingDrainCondition =
      state.facilityCondition || "normal";

    const isWeekly = frequency === "weekly";
    const isVolume = standardDrains >= activeConfig.volumePricing.minimumDrains;  // ✅ FROM BACKEND
    const canUseInstallProgram =
      isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

    // Install-level drains: only when volume program is valid
    const installDrains = canUseInstallProgram
      ? Math.min(installRequested, standardDrains)
      : 0;

    const normalStandardDrains = Math.max(standardDrains - installDrains, 0);

    // When all-inclusive, standard drains are included for free
    const standardDrainsActive = state.isAllInclusive ? 0 : normalStandardDrains;

    // Filthy drain count is subset of standard drains
    let filthyDrains = 0;
    if (condition === "filthy" && standardDrainsActive > 0) {
      if (filthyRequested > 0) {
        filthyDrains = Math.min(filthyRequested, standardDrainsActive);
      } else {
        // 0 means "all" in this UI when filthy mode is on
        filthyDrains = standardDrainsActive;
      }
    }

    // ---------- 2) Standard drain pricing ----------
    const tenTotal = standardDrainsActive * state.standardDrainRate;  // ✅ USE FORM VALUE (from backend)
    const altTotal =
      standardDrainsActive > 0
        ? state.altBaseCharge + state.altExtraPerDrain * standardDrainsActive  // ✅ USE FORM VALUES
        : 0;

    let usedSmallAlt = false;
    let usedBigAccountAlt = false;
    let useAltPricing = false;

    if (standardDrainsActive > 0 && !state.isAllInclusive) {
      if (state.useSmallAltPricingWeekly) {
        // Force 20 + 4$/drain
        useAltPricing = true;
        usedSmallAlt = true;
      } else if (state.useBigAccountTenWeekly) {
        // Force $10/drain
        useAltPricing = false;
        usedBigAccountAlt = true;
      } else {
        // Auto choose cheaper between 10$/drain vs 20+4$/drain
        if (altTotal > 0 && altTotal < tenTotal) {
          useAltPricing = true;
          usedSmallAlt = true;
        } else {
          useAltPricing = false;
        }
      }
    }

    const weeklyStandardDrains = state.isAllInclusive
      ? 0
      : useAltPricing
      ? altTotal
      : tenTotal;

    // ---------- 3) Install-level drains (10+ program) ----------
    // IMPORTANT: drains are always serviced at their install frequency.
    // The Install Frequency selector is used to decide the install-program rate:
    //   Weekly  → $20 / install drain
    //   Monthly → $10 / install drain (treated as bimonthly rate for compatibility)
    let weeklyInstallDrains = 0;
    let volumePricingApplied = false;

    if (installDrains > 0 && canUseInstallProgram) {
      volumePricingApplied = true;

      // ✅ UPDATED: Use correct backend pricing structure for install frequencies
      const perDrainRate =
        state.installFrequency === "bimonthly"
          ? state.volumeBimonthlyRate  // ✅ USE FORM VALUE (from backend volumePricing.bimonthlyRatePerDrain)
          : state.volumeWeeklyRate;    // ✅ USE FORM VALUE (from backend volumePricing.weeklyRatePerDrain)

      weeklyInstallDrains = perDrainRate * installDrains;
    }

    // ---------- 4) Plumbing add-on ----------
    const weeklyPlumbing =
      state.needsPlumbing && plumbingDrains > 0
        ? plumbingDrains * state.plumbingAddonRate  // ✅ USE FORM VALUE (from backend)
        : 0;

    // ---------- 5) Grease & green weekly service ----------
    const weeklyGreaseTraps =
      greaseTraps > 0 ? greaseTraps * state.greaseWeeklyRate : 0;  // ✅ USE FORM VALUE
    const weeklyGreenDrains =
      greenDrains > 0 ? greenDrains * state.greenWeeklyRate : 0;  // ✅ USE FORM VALUE

    // ---------- 6) Total weekly service (no trip) ----------
    const weeklyServiceRaw =
      weeklyStandardDrains +
      weeklyInstallDrains +
      weeklyPlumbing +
      weeklyGreaseTraps +
      weeklyGreenDrains;

    // ✅ NEW: Apply minimum charge per visit from backend ONLY when there's actual service
    const minimumChargePerVisit = backendConfig?.minimumChargePerVisit ?? 50; // Default $50
    const weeklyServiceBeforeMin = round2(weeklyServiceRaw);
    const weeklyService = weeklyServiceRaw > 0 ? Math.max(weeklyServiceBeforeMin, minimumChargePerVisit) : 0;
    const tripCharge = 0; // Trip charge removed from math
    const weeklyTotal = weeklyService; // (service only)

    // ---------- 7) One-time installation ----------

    // 7a) Filthy standard drains installation
    //     FilthyInstall = (weekly cost for filthy drains) × filthyMultiplier (usually 3)
    //     ✅ WAIVED when "$10/drain for all standard drains" checkbox is enabled
    let filthyInstallOneTime = 0;

    if (condition === "filthy" && standardDrainsActive > 0 && !state.useBigAccountTenWeekly) {
      // How many drains are filthy?
      const filthyDrainCount =
        filthyDrains > 0 && filthyDrains <= standardDrainsActive
          ? filthyDrains
          : standardDrainsActive;

      let weeklyFilthyCost = 0;

      if (useAltPricing) {
        // Alt weekly for those filthy drains: $20 + $4/drain
        weeklyFilthyCost =
          state.altBaseCharge + state.altExtraPerDrain * filthyDrainCount;  // ✅ USE FORM VALUES
      } else {
        // Standard pricing: standardDrainRate × filthyDrains
        weeklyFilthyCost = state.standardDrainRate * filthyDrainCount;  // ✅ USE FORM VALUE
      }

      filthyInstallOneTime =
        weeklyFilthyCost * state.filthyMultiplier; // ✅ USE FORM VALUE (from backend, ×3)
    }

    // 7b) Grease traps install – $300 × #traps (one-time)
    const greaseInstallOneTime =
      state.chargeGreaseTrapInstall && greaseTraps > 0
        ? state.greaseInstallRate * greaseTraps  // ✅ USE FORM VALUE (from backend)
        : 0;

    // 7c) Green drains install – $100 × #drains (one-time)
    const greenInstallOneTime =
      greenDrains > 0 ? state.greenInstallRate * greenDrains : 0;  // ✅ USE FORM VALUE

    const installationRaw =
      filthyInstallOneTime + greaseInstallOneTime + greenInstallOneTime;
    const installation = round2(installationRaw);

    // ✅ Apply custom installation override early for dependent calculations
    const effectiveInstallation = state.customInstallationTotal ?? installation;

    // ---------- 7d) FIRST VISIT LOGIC ----------
    // Filthy facility:
    //   FirstVisit = filthyInstall + weeklyInstallDrains + greaseInstall + greenInstall + weeklyPlumbing
    //
    // Normal facility:
    //   FirstVisit = greaseInstall + greenInstall + weeklyStandardDrains + weeklyInstallDrains + weeklyPlumbing
    let firstVisitPrice: number;

    if (condition === "filthy" && filthyInstallOneTime > 0) {
      // When there's a filthy installation, use effective installation in first visit
      firstVisitPrice =
        effectiveInstallation +
        weeklyInstallDrains +
        weeklyPlumbing; // ✅ Use effective installation
    } else {
      firstVisitPrice =
        (effectiveInstallation > 0 ? effectiveInstallation : 0) +
        weeklyStandardDrains +
        weeklyInstallDrains +
        weeklyPlumbing; // ✅ Use effective installation
    }

    firstVisitPrice = round2(firstVisitPrice);

    // ---------- 8) Monthly & contract logic ----------
    const contractMonths = clamp(
      Number(state.contractMonths) || activeConfig.contract.defaultMonths,  // ✅ USE BACKEND
      activeConfig.contract.minMonths,  // ✅ USE BACKEND
      activeConfig.contract.maxMonths   // ✅ USE BACKEND
    );

    // ✅ Get frequency multiplier from backend-transformed billing conversions
    const getFrequencyMultiplier = (freq: string) => {
      const normalized = freq.toLowerCase().replace(/\s+/g, '');

      switch (normalized) {
        case 'onetime':
          return activeConfig.billingConversions.oneTime?.monthlyMultiplier ?? 0;
        case 'weekly':
          return activeConfig.billingConversions.weekly?.monthlyMultiplier ?? 4.33;
        case 'biweekly':
          return activeConfig.billingConversions.biweekly?.monthlyMultiplier ?? 2.165;
        case 'twicepermonth':
          return activeConfig.billingConversions.twicePerMonth?.monthlyMultiplier ?? 2.0;
        case 'monthly':
          return activeConfig.billingConversions.monthly?.monthlyMultiplier ?? 1.0;
        case 'bimonthly':
          return activeConfig.billingConversions.bimonthly?.monthlyMultiplier ?? 0.5;
        case 'quarterly':
          return activeConfig.billingConversions.quarterly?.monthlyMultiplier ?? 0.333;
        case 'biannual':
          return activeConfig.billingConversions.biannual?.monthlyMultiplier ?? 0.167;
        case 'annual':
          return activeConfig.billingConversions.annual?.monthlyMultiplier ?? 0.083;
        default:
          return 1.0;
      }
    };

    const frequencyMultiplier = getFrequencyMultiplier(frequency);

    // ✅ Apply custom override to per-visit price FIRST, before calculating monthly/contract
    const effectiveWeeklyService = state.customWeeklyService ?? weeklyService;

    let normalMonth = effectiveWeeklyService * frequencyMultiplier;
    let firstMonthPrice = 0;

    // First month includes installation if present (check effective installation for custom overrides)
    if (effectiveInstallation > 0) {
      firstMonthPrice = firstVisitPrice + effectiveWeeklyService * Math.max(0, frequencyMultiplier - 1);
    } else {
      firstMonthPrice = normalMonth;
    }

    normalMonth = round2(normalMonth);
    firstMonthPrice = round2(firstMonthPrice);

    // ✅ FIXED: Contract total calculation with proper bimonthly logic
    let contractTotalRaw = 0;
    const freqLower = frequency.toLowerCase();

    if (freqLower === "bimonthly") {
      // ✅ CORRECTED: Bimonthly = every 2 months = 6 visits in 12 months
      // When installation is present: Installation + 5 regular visits (not 6)
      const totalVisitsIn12Months = 6; // 12 months / 2 months per visit = 6 visits
      const contractVisitsForTerm = Math.round((contractMonths / 12) * totalVisitsIn12Months);

      if (effectiveInstallation > 0) {
        // First visit includes installation, remaining visits are regular service
        const remainingVisits = Math.max(contractVisitsForTerm - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
        console.log(`🔧 [Foaming Drain Bimonthly Contract] Fixed calculation: first visit=$${firstVisitPrice.toFixed(2)}, remaining ${remainingVisits} visits × $${effectiveWeeklyService.toFixed(2)} = $${contractTotalRaw.toFixed(2)}`);
      } else {
        // No installation: all visits are regular service
        contractTotalRaw = effectiveWeeklyService * contractVisitsForTerm;
        console.log(`🔧 [Foaming Drain Bimonthly Contract] No installation: ${contractVisitsForTerm} visits × $${effectiveWeeklyService.toFixed(2)} = $${contractTotalRaw.toFixed(2)}`);
      }
    } else if (freqLower === "quarterly") {
      // Quarterly: visits = months / 3
      const quarterlyVisits = contractMonths / 3;
      const totalVisits = Math.round(quarterlyVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else if (freqLower === "biannual") {
      // Bi-annual: visits = months / 6
      const biannualVisits = contractMonths / 6;
      const totalVisits = Math.round(biannualVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else if (freqLower === "annual") {
      // Annual: visits = months / 12
      const annualVisits = contractMonths / 12;
      const totalVisits = Math.round(annualVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else {
      // All other frequencies: FirstMonth + (Months − 1) × NormalMonth
      contractTotalRaw = firstMonthPrice + (contractMonths - 1) * normalMonth;
    }

    const contractTotal = round2(contractTotalRaw);

    // For compatibility with ServiceQuoteResult:
    // - monthlyRecurring  → Normal recurring month (NormalMonth)
    // - annualRecurring   → TOTAL CONTRACT for contractMonths
    const calculatedMonthlyRecurring = normalMonth;
    const calculatedContractTotal = contractTotal;

    // ---------- 9) Breakdown ----------
    const breakdown: FoamingDrainBreakdown = {
      usedSmallAlt,
      usedBigAccountAlt,
      volumePricingApplied,

      weeklyStandardDrains: round2(weeklyStandardDrains),
      weeklyInstallDrains: round2(weeklyInstallDrains),
      weeklyGreaseTraps: round2(weeklyGreaseTraps),
      weeklyGreenDrains: round2(weeklyGreenDrains),
      weeklyPlumbing: round2(weeklyPlumbing),

      filthyInstallOneTime: round2(filthyInstallOneTime),
      greaseInstallOneTime: round2(greaseInstallOneTime),
      greenInstallOneTime: round2(greenInstallOneTime),

      tripCharge, // always 0 in new rules
    };

    // ---------- 10) Build quote ----------
    const quote: FoamingDrainQuoteResult = {
      serviceId: "foamingDrain",

      frequency,
      location,
      facilityCondition: condition,

      useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
      useBigAccountTenWeekly: state.useBigAccountTenWeekly,
      isAllInclusive: state.isAllInclusive,
      chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,

      // ✅ Apply custom overrides in cascade:
      // 1. Per-visit can be customized
      // 2. Monthly/Contract are calculated from custom per-visit (if set), but can be further overridden
      weeklyService: effectiveWeeklyService,
      weeklyTotal: effectiveWeeklyService,
      monthlyRecurring: state.customMonthlyRecurring ?? calculatedMonthlyRecurring,
      annualRecurring: state.customContractTotal ?? calculatedContractTotal,
      installation: state.customInstallationTotal ?? installation,
      tripCharge,

      firstVisitPrice,
      firstMonthPrice: state.customFirstMonthPrice ?? firstMonthPrice,
      contractMonths,

      notes: state.notes || "",

      breakdown,

      // ✅ NEW: Export minimum charge for redline/greenline indicator
      minimumChargePerVisit,
    };

    return quote;
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    state.standardDrainCount,
    state.installDrainCount,
    state.filthyDrainCount,
    state.greaseTrapCount,
    state.greenDrainCount,
    state.plumbingDrainCount,
    state.needsPlumbing,
    state.frequency,
    state.installFrequency, // ✅ MISSING: Re-calculate when install frequency changes!
    state.facilityCondition,
    state.location,
    state.useSmallAltPricingWeekly,
    state.useBigAccountTenWeekly,
    state.isAllInclusive,
    state.chargeGreaseTrapInstall,
    state.tripChargeOverride,
    state.contractMonths,
    state.notes,
    // ✅ NEW: Editable rate fields (from backend)
    state.standardDrainRate,
    state.altBaseCharge,
    state.altExtraPerDrain,
    state.volumeWeeklyRate,
    state.volumeBimonthlyRate,
    state.greaseWeeklyRate,
    state.greaseInstallRate,
    state.greenWeeklyRate,
    state.greenInstallRate,
    state.plumbingAddonRate,
    state.filthyMultiplier,
    // ✅ Custom override fields
    state.customWeeklyService,
    state.customInstallationTotal,
    state.customMonthlyRecurring,
    state.customFirstMonthPrice,
    state.customContractTotal,
  ]);

  const updateField = <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => {
    setState((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[key];

      const next = {
        ...prev,
        [key]: value,
      };

      // ✅ AUTO-CLEAR CUSTOM OVERRIDES when base inputs change
      // If user changes a base input (like drain counts), clear related custom totals
      if (
        key === 'standardDrainCount' ||
        key === 'installDrainCount' ||
        key === 'filthyDrainCount' ||
        key === 'greaseTrapCount' ||
        key === 'greenDrainCount' ||
        key === 'plumbingDrainCount' ||
        key === 'frequency' ||
        key === 'facilityCondition' ||
        key === 'useSmallAltPricingWeekly' ||
        key === 'useBigAccountTenWeekly' ||
        key === 'isAllInclusive' ||
        key === 'chargeGreaseTrapInstall' ||
        key === 'needsPlumbing' ||
        key === 'contractMonths'
      ) {
        // Clear all custom overrides when base inputs change
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customInstallationTotal = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      // Also clear custom overrides when pricing rates change
      if (
        key === 'standardDrainRate' ||
        key === 'altBaseCharge' ||
        key === 'altExtraPerDrain' ||
        key === 'volumeWeeklyRate' ||
        key === 'volumeBimonthlyRate' ||
        key === 'greaseWeeklyRate' ||
        key === 'greaseInstallRate' ||
        key === 'greenWeeklyRate' ||
        key === 'greenInstallRate' ||
        key === 'plumbingAddonRate' ||
        key === 'filthyMultiplier'
      ) {
        // Clear custom overrides when rates change
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customInstallationTotal = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'standardDrainRate', 'altBaseCharge', 'altExtraPerDrain',
        'volumeWeeklyRate', 'volumeBimonthlyRate', 'greaseWeeklyRate', 'greaseInstallRate',
        'greenWeeklyRate', 'greenInstallRate', 'plumbingAddonRate', 'filthyMultiplier',
        'customWeeklyService', 'customInstallationTotal', 'customMonthlyRecurring', 'customFirstMonthPrice', 'customContractTotal'
      ];

      if (pricingFields.includes(key as string)) {
        const newValue = value as number | undefined;
        const oldValue = originalValue as number | undefined;

        // Handle undefined values (when cleared) - don't log clearing to undefined
        if (newValue !== undefined && oldValue !== undefined &&
            typeof newValue === 'number' && typeof oldValue === 'number' &&
            newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(key as string, oldValue, newValue);
        }
      }

      // ✅ NEW: Log form field changes using universal logger
      const allFormFields = [
        // Quantity fields
        'drainsPerWeek', 'contractMonths',
        // Selection fields
        'frequency', 'location', 'condition', 'rateTier'
      ];

      // Log non-pricing field changes
      if (allFormFields.includes(key as string)) {
        logServiceFieldChanges(
          'foamingDrain',
          'Foaming Drain',
          { [key]: value },
          { [key]: originalValue },
          [key as string],
          next.drainsPerWeek || 1,
          next.frequency || 'weekly'
        );
      }

      return next;
    });
  };

  const reset = () => {
    setState({
      ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
      serviceId: "foamingDrain",
    });
  };

  return {
    state,
    quote,
    updateField,
    reset,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    backendConfig, // ✅ EXPOSE: Backend config for dynamic thresholds
  };
}
