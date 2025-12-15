// src/features/services/rpmWindows/useRpmWindowsCalc.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendRpmConfig {
  windowPricingBothSidesIncluded: {
    smallWindowPrice: number;
    mediumWindowPrice: number;
    largeWindowPrice: number;
  };
  installPricing: {
    installationMultiplier: number;
  };
  minimumChargePerVisit: number;
  tripCharges: {
    standard: number;
    beltway: number;
  };
  frequencyPriceMultipliers: {
    biweeklyPriceMultiplier: number;
    monthlyPriceMultiplier: number;
    quarterlyPriceMultiplierAfterFirstTime: number;
    quarterlyFirstTimeMultiplier: number;
  };
  frequencyMetadata: {
    weekly: {
      monthlyRecurringMultiplier: number;
      firstMonthExtraMultiplier: number;
    };
    biweekly: {
      monthlyRecurringMultiplier: number;
      firstMonthExtraMultiplier: number;
    };
    bimonthly: {
      cycleMonths: number;
    };
    quarterly: {
      cycleMonths: number;
    };
    biannual: {
      cycleMonths: number;
    };
    annual: {
      cycleMonths: number;
    };
    monthly: {
      cycleMonths: number;
    };
  };
  minContractMonths: number;
  maxContractMonths: number;
}

const DEFAULT_FORM: RpmWindowsFormState = {
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,
  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,
  tripCharge: cfg.tripCharge,
  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,
  extraCharges: [],
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
  contractMonths: 12,
};

function mapFrequency(v: string): RpmFrequencyKey {
  if (v === "oneTime" || v === "weekly" || v === "biweekly" || v === "twicePerMonth" ||
      v === "monthly" || v === "bimonthly" || v === "quarterly" || v === "biannual" || v === "annual") {
    return v;
  }
  return "weekly";
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>) {
  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendRpmConfig | null>(null);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // ✅ Store base weekly rates (initialize with config, will be updated by backend)
  const [baseWeeklyRates, setBaseWeeklyRates] = useState({
    small: cfg.smallWindowRate,
    medium: cfg.mediumWindowRate,
    large: cfg.largeWindowRate,
    trip: cfg.tripCharge,
  });

  // ✅ Initialize form state (will be updated when backend config loads)
  const [form, setForm] = useState<RpmWindowsFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    console.log('🔄 [RPM Windows] Fetching fresh configuration from backend...');

    try {
      const response = await serviceConfigApi.getActive("rpmWindows");

      console.log('📥 [RPM Windows] Backend response:', response);

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ RPM Windows config not found in active services, trying fallback pricing...');
        console.warn('⚠️ [RPM Windows] Error:', response?.error);

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("rpmWindows");
          if (fallbackConfig?.config) {
            console.log('✅ [RPM Windows] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendRpmConfig;
            setBackendConfig(config);

            const newBaseRates = {
              small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
              medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
              large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
              trip: config.tripCharges?.standard ?? cfg.tripCharge,
            };

            console.log('📊 [RPM Windows] Updating base rates from fallback config:', newBaseRates);
            setBaseWeeklyRates(newBaseRates);

            // ✅ FORCE UPDATE FORM with backend values immediately
            setForm(prev => ({
              ...prev,
              smallWindowRate: newBaseRates.small,
              mediumWindowRate: newBaseRates.medium,
              largeWindowRate: newBaseRates.large,
              tripCharge: newBaseRates.trip,
            }));

            console.log('✅ RPM Windows FALLBACK CONFIG loaded from context:', config);
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ RPM Windows document has no config property');
        return;
      }

      const config = document.config as BackendRpmConfig;

      console.log('✅ [RPM Windows] Config found! Details:', {
        serviceId: document.serviceId,
        version: document.version,
        isActive: document.isActive,
        configKeys: Object.keys(config),
      });

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);

      // ✅ Store base weekly rates for frequency adjustment
      const newBaseRates = {
        small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
        medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
        large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
        trip: config.tripCharges?.standard ?? cfg.tripCharge,
      };

      console.log('📊 [RPM Windows] Setting new base rates from backend:', newBaseRates);
      console.log('📊 [RPM Windows] Previous rates were:', baseWeeklyRates);

      setBaseWeeklyRates(newBaseRates);

      // ✅ FORCE UPDATE FORM with backend values immediately (without frequency multiplier initially)
      setForm(prev => ({
        ...prev,
        smallWindowRate: newBaseRates.small,
        mediumWindowRate: newBaseRates.medium,
        largeWindowRate: newBaseRates.large,
        tripCharge: newBaseRates.trip,
      }));

      console.log('✅ RPM Windows config loaded from backend and form updated:', {
        windowRates: {
          small: config.windowPricingBothSidesIncluded?.smallWindowPrice,
          medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice,
          large: config.windowPricingBothSidesIncluded?.largeWindowPrice,
        },
        installMultiplier: config.installPricing?.installationMultiplier,
        minimumCharge: config.minimumChargePerVisit,
        tripCharges: config.tripCharges,
        frequencyMetadata: config.frequencyMetadata,
      });
    } catch (error) {
      console.error('❌ Failed to fetch RPM Windows config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("rpmWindows");
        if (fallbackConfig?.config) {
          console.log('✅ [RPM Windows] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendRpmConfig;
          setBackendConfig(config);

          const newBaseRates = {
            small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
            medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
            large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
            trip: config.tripCharges?.standard ?? cfg.tripCharge,
          };

          setBaseWeeklyRates(newBaseRates);

          // ✅ FORCE UPDATE FORM with backend values immediately
          setForm(prev => ({
            ...prev,
            smallWindowRate: newBaseRates.small,
            mediumWindowRate: newBaseRates.medium,
            largeWindowRate: newBaseRates.large,
            tripCharge: newBaseRates.trip,
          }));

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []); // Run once on mount

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
      productKey: `rpmWindows_${fieldName}`,
      productName: `RPM Windows - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [RPM-WINDOWS-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.smallQty, form.mediumQty, form.largeQty, form.frequency]);

  // ✅ Update rate fields when frequency changes (apply frequency multiplier)
  useEffect(() => {
    // ✅ Use backend config frequency data if available, otherwise use fallback
    let freqMult = 1;
    const freqKey = mapFrequency(form.frequency);

    if (backendConfig?.frequencyMetadata) {
      // Use new backend frequencyMetadata structure
      if (freqKey === "weekly" && backendConfig.frequencyMetadata.weekly) {
        freqMult = 1; // Weekly is base rate
      } else if (freqKey === "biweekly" && backendConfig.frequencyPriceMultipliers?.biweeklyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
      } else if (freqKey === "monthly" && backendConfig.frequencyPriceMultipliers?.monthlyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
      } else if (freqKey === "quarterly" && backendConfig.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime) {
        freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
      } else if (freqKey === "bimonthly" && backendConfig.frequencyMetadata.bimonthly?.cycleMonths) {
        // For frequencies with cycleMonths, calculate multiplier based on cycle length
        const cycleMonths = backendConfig.frequencyMetadata.bimonthly.cycleMonths;
        freqMult = cycleMonths > 0 ? cycleMonths * 0.5 : 1; // Rough approximation
      } else if (freqKey === "biannual" && backendConfig.frequencyMetadata.biannual?.cycleMonths) {
        const cycleMonths = backendConfig.frequencyMetadata.biannual.cycleMonths;
        freqMult = cycleMonths > 0 ? cycleMonths * 0.4 : 1;
      } else if (freqKey === "annual" && backendConfig.frequencyMetadata.annual?.cycleMonths) {
        const cycleMonths = backendConfig.frequencyMetadata.annual.cycleMonths;
        freqMult = cycleMonths > 0 ? cycleMonths * 0.25 : 1;
      } else {
        // Use fallback config multipliers
        const activeFreqMult = cfg.frequencyMultipliers;
        freqMult = activeFreqMult[freqKey] || 1;
      }
    } else {
      // Use fallback config multipliers
      const activeFreqMult = cfg.frequencyMultipliers;
      freqMult = activeFreqMult[freqKey] || 1;
    }

    console.log('📊 [RPM Windows] Applying frequency multiplier:', {
      frequency: freqKey,
      multiplier: freqMult,
      baseRates: baseWeeklyRates,
    });

    // Apply frequency multiplier to base weekly rates
    setForm((prev) => ({
      ...prev,
      smallWindowRate: baseWeeklyRates.small * freqMult,
      mediumWindowRate: baseWeeklyRates.medium * freqMult,
      largeWindowRate: baseWeeklyRates.large * freqMult,
      tripCharge: baseWeeklyRates.trip * freqMult,
    }));
  }, [form.frequency, backendConfig, baseWeeklyRates]); // Run when frequency, backend config, or base rates change

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, checked } = e.target as any;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof RpmWindowsFormState];

      let newFormState = prev;

      switch (name) {
        case "frequency":
          newFormState = { ...prev, frequency: mapFrequency(value) };
          break;

        case "selectedRateCategory":
          newFormState = { ...prev, selectedRateCategory: value as RpmRateCategory };
          break;

        case "includeMirrors":
          newFormState = { ...prev, includeMirrors: !!checked };
          break;

        case "smallQty":
        case "mediumQty":
        case "largeQty":
          newFormState = { ...prev, [name]: Number(value) || 0 };
          break;

        case "contractMonths":
          newFormState = { ...prev, contractMonths: Number(value) || 0 };
          break;

        // Custom total overrides
        case "customSmallTotal":
        case "customMediumTotal":
        case "customLargeTotal":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customAnnualPrice": {
          // Allow empty string to clear the field (set to undefined)
          if (value === '') {
            newFormState = { ...prev, [name]: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              newFormState = { ...prev, [name]: numVal };
            } else {
              newFormState = prev;
            }
          }
          break;
        }

        case "customInstallationFee": {
          if (value === '') {
            newFormState = { ...prev, customInstallationFee: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              newFormState = { ...prev, customInstallationFee: numVal };
            } else {
              newFormState = prev;
            }
          }
          break;
        }

        // Rate fields - when manually edited, update base weekly rate
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const displayVal = Number(value) || 0;

          // Calculate base weekly rate from current frequency-adjusted value
          const freqKey = mapFrequency(prev.frequency);

          // ✅ Apply same frequency multiplier logic as useEffect
          let freqMult = 1;
          if (backendConfig?.frequencyMetadata) {
            // Use new backend frequencyMetadata structure
            if (freqKey === "weekly") {
              freqMult = 1; // Weekly is base rate
            } else if (freqKey === "biweekly" && backendConfig.frequencyPriceMultipliers?.biweeklyPriceMultiplier) {
              freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
            } else if (freqKey === "monthly" && backendConfig.frequencyPriceMultipliers?.monthlyPriceMultiplier) {
              freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
            } else if (freqKey === "quarterly" && backendConfig.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime) {
              freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
            } else {
              // Use fallback config multipliers for other frequencies
              const activeFreqMult = cfg.frequencyMultipliers;
              freqMult = activeFreqMult[freqKey] || 1;
            }
          } else {
            // Use fallback config multipliers
            const activeFreqMult = cfg.frequencyMultipliers;
            freqMult = activeFreqMult[freqKey] || 1;
          }

          const weeklyBase = displayVal / freqMult;

          // Update base weekly rates
          if (name === "smallWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, small: weeklyBase }));
          } else if (name === "mediumWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, medium: weeklyBase }));
          } else if (name === "largeWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, large: weeklyBase }));
          } else if (name === "tripCharge") {
            setBaseWeeklyRates(b => ({ ...b, trip: weeklyBase }));
          }

          newFormState = { ...prev, [name]: displayVal };
          break;
        }

        default:
          newFormState = prev;
          break;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'smallWindowRate', 'mediumWindowRate', 'largeWindowRate', 'tripCharge',
        'customSmallTotal', 'customMediumTotal', 'customLargeTotal',
        'customPerVisitPrice', 'customMonthlyRecurring', 'customAnnualPrice', 'customInstallationFee'
      ];

      if (pricingFields.includes(name)) {
        const newValue = newFormState[name as keyof RpmWindowsFormState] as number | undefined;
        const oldValue = originalValue as number | undefined;

        // Handle undefined values (when cleared) - don't log clearing to undefined
        if (newValue !== undefined && oldValue !== undefined &&
            typeof newValue === 'number' && typeof oldValue === 'number' &&
            newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(name, oldValue, newValue);
        }
      }

      return newFormState;
    });
  };

  // + Button handlers
  const addExtraCharge = () => {
    setForm((prev) => ({
      ...prev,
      extraCharges: [
        ...prev.extraCharges,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calcText: "",
          description: "",
          amount: 0,
        },
      ],
    }));
  };

  const updateExtraCharge = (
    id: string,
    field: "calcText" | "description" | "amount",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((line) =>
        line.id === id
          ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value }
          : line
      ),
    }));
  };

  const removeExtraCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((line) => line.id !== id),
    }));
  };

  const calc = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = {
      smallWindowRate: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
      mediumWindowRate: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
      largeWindowRate: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
      tripCharge: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
      installMultiplierFirstTime: backendConfig?.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime,
      installMultiplierClean: 1, // Clean install is always 1x
      minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
      // Map backend frequency structure to expected format
      frequencyMultipliers: {
        weekly: 1,
        biweekly: backendConfig?.frequencyPriceMultipliers?.biweeklyPriceMultiplier ?? cfg.frequencyMultipliers.biweekly,
        monthly: backendConfig?.frequencyPriceMultipliers?.monthlyPriceMultiplier ?? cfg.frequencyMultipliers.monthly,
        quarterly: backendConfig?.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime ?? cfg.frequencyMultipliers.quarterly,
        bimonthly: cfg.frequencyMultipliers.bimonthly, // Use fallback for missing frequencies
        annual: cfg.frequencyMultipliers.annual,
        biannual: cfg.frequencyMultipliers.biannual,
        twicePerMonth: cfg.frequencyMultipliers.twicePerMonth,
        oneTime: cfg.frequencyMultipliers.oneTime,
        quarterlyFirstTime: backendConfig?.frequencyPriceMultipliers?.quarterlyFirstTimeMultiplier ?? cfg.frequencyMultipliers.quarterlyFirstTime,
      },
      // Map backend frequency metadata to monthly conversions
      monthlyConversions: {
        weekly: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.weekly,
        actualWeeksPerMonth: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.actualWeeksPerMonth,
        actualWeeksPerYear: 52,
      },
      // Use fallback for annual frequencies (not in backend structure)
      annualFrequencies: cfg.annualFrequencies,
      // Use fallback rate categories (not in current backend structure)
      rateCategories: cfg.rateCategories,
    };

    const freqKey = mapFrequency(form.frequency);

    // ✅ NEW: Apply special pricing rules for certain frequencies (same as useEffect)
    let effectiveFreqKey = freqKey;

    // 2×/Month and Bi-Monthly use Monthly pricing
    if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
      effectiveFreqKey = "monthly";
    }
    // Bi-Annual and Annual use Quarterly pricing
    else if (freqKey === "biannual" || freqKey === "annual") {
      effectiveFreqKey = "quarterly";
    }

    // ✅ FREQUENCY MULTIPLIER FROM BACKEND (using effective frequency for pricing)
    // When you select bi-weekly, this will be 1.25 FROM YOUR MONGODB CONFIG
    // When you select twicePerMonth/bimonthly, this will use monthly multiplier
    // When you select biannual/annual, this will use quarterly multiplier
    const freqMult = activeConfig.frequencyMultipliers[effectiveFreqKey] || 1;

    // ✅ USE FREQUENCY-ADJUSTED RATES FROM FORM (already multiplied by useEffect)
    const weeklySmall = baseWeeklyRates.small;
    const weeklyMedium = baseWeeklyRates.medium;
    const weeklyLarge = baseWeeklyRates.large;
    const weeklyTrip = baseWeeklyRates.trip; // will be 0, used only for display

    // Weekly base window cost
    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;

    // Use form rates directly (already frequency-adjusted by useEffect)
    const effSmall = form.smallWindowRate;
    const effMedium = form.mediumWindowRate;
    const effLarge = form.largeWindowRate;
    const effTrip = form.tripCharge; // display only

    // Per-visit, at chosen frequency (NO TRIP CHARGE ANYMORE)
    const perVisitWindows =
      form.smallQty * effSmall +
      form.mediumQty * effMedium +
      form.largeQty * effLarge;

    const perVisitService = hasWindows ? perVisitWindows : 0;

    const extrasTotal = form.extraCharges.reduce(
      (s, l) => s + (l.amount || 0),
      0
    );

    const recurringPerVisitBase = perVisitService + extrasTotal;

    // ✅ RATE CATEGORY FROM BACKEND (red/green multipliers)
    const rateCfg =
      activeConfig.rateCategories[form.selectedRateCategory] ??
      activeConfig.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * (rateCfg?.multiplier ?? 1);

    // ✅ INSTALLATION MULTIPLIER FROM BACKEND (NOT HARDCODED!)
    // First time install = 3x, Clean = 1x (from your MongoDB config)
    const installMultiplier = form.isFirstTimeInstall
      ? (activeConfig.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime)
      : (activeConfig.installMultiplierClean ?? cfg.installMultiplierClean);

    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindows * installMultiplier
        : 0;

    const installOneTime = installOneTimeBase * (rateCfg?.multiplier ?? 1);

    // FIRST VISIT PRICE = INSTALLATION ONLY (no normal service on that visit)
    const firstVisitTotalRated = installOneTime;

    // ✅ MONTHLY VISITS FROM BACKEND CONFIG (NOT HARDCODED!)
    // Uses your monthlyConversions.weekly: 4.33 from MongoDB
    let monthlyVisits = 0;
    const weeksPerMonth = activeConfig.monthlyConversions.actualWeeksPerMonth ?? 4.33;

    if (freqKey === "oneTime") monthlyVisits = 0; // oneTime has no monthly billing
    else if (freqKey === "weekly") monthlyVisits = weeksPerMonth;
    else if (freqKey === "biweekly") monthlyVisits = weeksPerMonth / 2;
    else if (freqKey === "twicePerMonth") monthlyVisits = 2;
    else if (freqKey === "monthly") monthlyVisits = 1;
    else if (freqKey === "bimonthly") monthlyVisits = 0.5; // every 2 months = 0.5 per month
    else if (freqKey === "quarterly") monthlyVisits = 0; // no monthly for quarterly
    else if (freqKey === "biannual") monthlyVisits = 0; // no monthly for biannual
    else if (freqKey === "annual") monthlyVisits = 0; // no monthly for annual

    // Standard ongoing monthly bill (after the first month)
    const standardMonthlyBillRated = recurringPerVisitRated * monthlyVisits;

    // First month bill:
    //  - for oneTime: just the first visit (installation or service)
    //  - for quarterly/biannual/annual: first visit only (installation or service)
    //  - for other frequencies: first visit + remaining visits in the month
    const isVisitBasedFrequency = freqKey === "oneTime" || freqKey === "quarterly" || freqKey === "biannual" || freqKey === "annual" || freqKey === "bimonthly";
    const effectiveServiceVisitsFirstMonth =
      isVisitBasedFrequency ? 0 : (monthlyVisits > 1 ? monthlyVisits - 1 : 0);

    let firstMonthBillRated = 0;
    if (form.isFirstTimeInstall) {
      if (isVisitBasedFrequency) {
        // For visit-based frequencies install: just the installation cost
        firstMonthBillRated = firstVisitTotalRated;
      } else {
        // For other frequencies: installation + remaining service visits in first month
        firstMonthBillRated = firstVisitTotalRated +
          recurringPerVisitRated * effectiveServiceVisitsFirstMonth;
      }
    } else {
      // No installation, just standard monthly billing (or 0 for visit-based)
      firstMonthBillRated = standardMonthlyBillRated;
    }

    // Displayed "Monthly Recurring" value
    const monthlyBillRated = standardMonthlyBillRated;

    // CONTRACT TOTAL for N months (2–36)
    const contractMonths = Math.max(form.contractMonths ?? 0, 0);

    let contractTotalRated = 0;
    if (contractMonths > 0) {
      if (freqKey === "oneTime") {
        // ✅ For oneTime: just the first visit (installation or service)
        contractTotalRated = firstMonthBillRated;
      } else if (freqKey === "quarterly" || freqKey === "biannual" || freqKey === "annual" || freqKey === "bimonthly") {
        // ✅ For visit-based frequencies: use annual frequencies FROM BACKEND
        // Uses annualFrequencies.quarterly: 4, bimonthly: 6, biannual: 2, annual: 1 from your MongoDB config
        const visitsPerYear = activeConfig.annualFrequencies?.[freqKey] ?? 1;
        const totalVisits = (contractMonths / 12) * visitsPerYear;

        if (form.isFirstTimeInstall) {
          // First visit is install only, remaining visits are service
          const serviceVisits = Math.max(totalVisits - 1, 0);
          contractTotalRated = installOneTime + (serviceVisits * recurringPerVisitRated);
        } else {
          // No install, all visits are service
          contractTotalRated = totalVisits * recurringPerVisitRated;
        }
      } else {
        // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
        if (form.isFirstTimeInstall) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          contractTotalRated =
            firstMonthBillRated + standardMonthlyBillRated * remainingMonths;
        } else {
          contractTotalRated = standardMonthlyBillRated * contractMonths;
        }
      }
    }

    return {
      effSmall,
      effMedium,
      effLarge,
      effTrip,
      recurringPerVisitRated,
      installOneTime,
      firstVisitTotalRated,
      standardMonthlyBillRated,
      firstMonthBillRated,
      monthlyBillRated,
      contractTotalRated,
    };
  }, [
    backendConfig, // ✅ CRITICAL: Re-calculate when backend config loads!
    baseWeeklyRates, // ✅ CRITICAL: Re-calculate when base rates change!
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    form.frequency,
    form.selectedRateCategory,
    form.isFirstTimeInstall,
    form.extraCharges,
    form.contractMonths,
  ]);

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: calc.recurringPerVisitRated,
    // now represents TOTAL for selected contract months (not "per year")
    annualPrice: calc.contractTotalRated,
    detailsBreakdown: [],
  };

  return {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    calc,
    quote,
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}