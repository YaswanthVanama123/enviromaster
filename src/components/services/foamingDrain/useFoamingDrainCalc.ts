
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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


function transformBackendFrequencyMeta(backendMeta: BackendFoamingDrainConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return cfg.billingConversions;
  }

  console.log('🔧 [Foaming Drain] Transforming backend frequencyMetadata:', backendMeta);


  const transformedBilling: any = {};


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


  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const monthlyMultiplier = 1 / cycleMonths; 

      transformedBilling[freq] = {
        cycleMonths,
        monthlyMultiplier,
      };
    }
  }


  const finalBilling = {
    ...cfg.billingConversions, 
    ...transformedBilling,     
  };

  console.log('✅ [Foaming Drain] Transformed frequencyMetadata to billingConversions:', finalBilling);
  return finalBilling;
}


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
  applyMinimum: true,
};

function clamp(num: number, min: number, max: number): number {
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function useFoamingDrainCalc(initialData?: Partial<FoamingDrainFormState>, customFields?: any[]) {

  const servicesContext = useServicesContextOptional();


  const calcFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "calc" && field.calcValues?.right) {
        const fieldTotal = parseFloat(field.calcValues.right) || 0;
        return sum + fieldTotal;
      }
      return sum;
    }, 0);

    console.log(`💰 [FOAMING-DRAIN-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
    return total;
  }, [customFields]);


  const dollarFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "dollar" && field.value) {
        const fieldValue = parseFloat(field.value) || 0;
        return sum + fieldValue;
      }
      return sum;
    }, 0);

    console.log(`💰 [FOAMING-DRAIN-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [state, setState] = useState<FoamingDrainFormState>(() => {

    const initialDrainCount = (initialData?.standardDrainCount || 0) +
                               (initialData?.installDrainCount || 0) +
                               (initialData?.filthyDrainCount || 0) +
                               (initialData?.greaseTrapCount || 0) +
                               (initialData?.greenDrainCount || 0) +
                               (initialData?.plumbingDrainCount || 0);

    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : DEFAULT_FOAMING_DRAIN_FORM_STATE.contractMonths;

    console.log(`📅 [FOAMING-DRAIN-INIT] Initializing contract months:`, {
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initialData?.contractMonths
    });


    const frequencyValue = typeof initialData?.frequency === 'object' && initialData.frequency !== null && 'frequencyKey' in initialData.frequency
      ? (initialData.frequency as any).frequencyKey
      : initialData?.frequency;

    const installFrequencyValue = typeof initialData?.installFrequency === 'object' && initialData.installFrequency !== null && 'value' in initialData.installFrequency
      ? ((initialData.installFrequency as any).value as string).toLowerCase()
      : initialData?.installFrequency;

    return {
      ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
      ...initialData,
      serviceId: "foamingDrain",
      contractMonths: defaultContractMonths,

      ...(frequencyValue && { frequency: frequencyValue }),
      ...(installFrequencyValue && { installFrequency: installFrequencyValue as "weekly" | "bimonthly" }),
    };
  });


  const [backendConfig, setBackendConfig] = useState<BackendFoamingDrainConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const isEditMode = useRef(!!initialData);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);


  const updateStateWithConfig = (config: BackendFoamingDrainConfig, forceUpdate: boolean = false) => {


    if (initialData && !forceUpdate) {
      console.log('📋 [FOAMING-DRAIN] Edit mode: Skipping form update to preserve loaded values');
      return; 
    }

    console.log('📋 [FOAMING-DRAIN] Updating state with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setState((prev) => ({
      ...prev,

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


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("foamingDrain");
        if (backendData?.config) {
          console.log('✅ [Foaming Drain] Using cached pricing data from context');
          const config = backendData.config as BackendFoamingDrainConfig;
          setBackendConfig(config);
          updateStateWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [FOAMING-DRAIN] Manual refresh: Clearing all custom overrides');
            setState(prev => ({
              ...prev,

              customRatePerDrain: undefined,
              customAltBaseCharge: undefined,
              customAltExtraPerDrain: undefined,
              customVolumeWeeklyRate: undefined,
              customVolumeBimonthlyRate: undefined,
              customGreaseWeeklyRate: undefined,
              customGreaseInstallRate: undefined,
              customGreenWeeklyRate: undefined,
              customGreenInstallRate: undefined,
              customPlumbingAddonRate: undefined,
              customFilthyMultiplier: undefined,

              customWeeklyService: undefined,
              customInstallationTotal: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ Foaming Drain CONFIG loaded from context:', {
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

      console.warn('⚠️ No backend pricing available for Foaming Drain, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch Foaming Drain config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("foamingDrain");
        if (fallbackConfig?.config) {
          console.log('✅ [Foaming Drain] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendFoamingDrainConfig;
          setBackendConfig(config);
          updateStateWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [FOAMING-DRAIN] Manual refresh: Clearing all custom overrides');
            setState(prev => ({
              ...prev,

              customRatePerDrain: undefined,
              customAltBaseCharge: undefined,
              customAltExtraPerDrain: undefined,
              customVolumeWeeklyRate: undefined,
              customVolumeBimonthlyRate: undefined,
              customGreaseWeeklyRate: undefined,
              customGreaseInstallRate: undefined,
              customGreenWeeklyRate: undefined,
              customGreenInstallRate: undefined,
              customPlumbingAddonRate: undefined,
              customFilthyMultiplier: undefined,

              customWeeklyService: undefined,
              customInstallationTotal: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));
          }

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };


  useEffect(() => {

    console.log('📋 [FOAMING-DRAIN-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!backendConfig) return;


    if (!baselineInitialized.current) {
      baselineInitialized.current = true;


      baselineValues.current = {
        standardDrainRate: initialData?.standardDrainRate ?? backendConfig.standardPricing?.standardDrainRate ?? state.standardDrainRate,
        altBaseCharge: initialData?.altBaseCharge ?? backendConfig.standardPricing?.alternateBaseCharge ?? state.altBaseCharge,
        altExtraPerDrain: initialData?.altExtraPerDrain ?? backendConfig.standardPricing?.alternateExtraPerDrain ?? state.altExtraPerDrain,
        volumeWeeklyRate: initialData?.volumeWeeklyRate ?? backendConfig.volumePricing?.weeklyRatePerDrain ?? state.volumeWeeklyRate,
        volumeBimonthlyRate: initialData?.volumeBimonthlyRate ?? backendConfig.volumePricing?.bimonthlyRatePerDrain ?? state.volumeBimonthlyRate,
        greaseWeeklyRate: initialData?.greaseWeeklyRate ?? backendConfig.greaseTrapPricing?.weeklyRatePerTrap ?? state.greaseWeeklyRate,
        greaseInstallRate: initialData?.greaseInstallRate ?? backendConfig.greaseTrapPricing?.installPerTrap ?? state.greaseInstallRate,
        greenWeeklyRate: initialData?.greenWeeklyRate ?? backendConfig.greenDrainPricing?.weeklyRatePerDrain ?? state.greenWeeklyRate,
        greenInstallRate: initialData?.greenInstallRate ?? backendConfig.greenDrainPricing?.installPerDrain ?? state.greenInstallRate,
        plumbingAddonRate: initialData?.plumbingAddonRate ?? backendConfig.addOns?.plumbingWeeklyAddonPerDrain ?? state.plumbingAddonRate,
        filthyMultiplier: initialData?.filthyMultiplier ?? backendConfig.installationMultipliers?.filthyMultiplier ?? state.filthyMultiplier,
      };

      console.log('✅ [FOAMING-DRAIN-BASELINE] Initialized baseline values for logging (ALL fields):', {
        standardDrainRate: baselineValues.current.standardDrainRate,
        altBaseCharge: baselineValues.current.altBaseCharge,
        altExtraPerDrain: baselineValues.current.altExtraPerDrain,
        volumeWeeklyRate: baselineValues.current.volumeWeeklyRate,
        volumeBimonthlyRate: baselineValues.current.volumeBimonthlyRate,
        greaseWeeklyRate: baselineValues.current.greaseWeeklyRate,
        greaseInstallRate: baselineValues.current.greaseInstallRate,
        greenWeeklyRate: baselineValues.current.greenWeeklyRate,
        greenInstallRate: baselineValues.current.greenInstallRate,
        plumbingAddonRate: baselineValues.current.plumbingAddonRate,
        filthyMultiplier: baselineValues.current.filthyMultiplier,
        note: initialData ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });


      if (initialData) {
        console.log('🔍 [FOAMING-DRAIN-PRICING] Detecting price overrides for yellow highlighting...');


        const overrides = {
          customRatePerDrain: (initialData.standardDrainRate !== undefined &&
                               initialData.standardDrainRate !== backendConfig.standardPricing?.standardDrainRate)
                               ? initialData.standardDrainRate : undefined,

          customAltBaseCharge: (initialData.altBaseCharge !== undefined &&
                                initialData.altBaseCharge !== backendConfig.standardPricing?.alternateBaseCharge)
                                ? initialData.altBaseCharge : undefined,

          customAltExtraPerDrain: (initialData.altExtraPerDrain !== undefined &&
                                   initialData.altExtraPerDrain !== backendConfig.standardPricing?.alternateExtraPerDrain)
                                   ? initialData.altExtraPerDrain : undefined,

          customVolumeWeeklyRate: (initialData.volumeWeeklyRate !== undefined &&
                                   initialData.volumeWeeklyRate !== backendConfig.volumePricing?.weeklyRatePerDrain)
                                   ? initialData.volumeWeeklyRate : undefined,

          customVolumeBimonthlyRate: (initialData.volumeBimonthlyRate !== undefined &&
                                      initialData.volumeBimonthlyRate !== backendConfig.volumePricing?.bimonthlyRatePerDrain)
                                      ? initialData.volumeBimonthlyRate : undefined,

          customGreaseWeeklyRate: (initialData.greaseWeeklyRate !== undefined &&
                                   initialData.greaseWeeklyRate !== backendConfig.greaseTrapPricing?.weeklyRatePerTrap)
                                   ? initialData.greaseWeeklyRate : undefined,

          customGreaseInstallRate: (initialData.greaseInstallRate !== undefined &&
                                    initialData.greaseInstallRate !== backendConfig.greaseTrapPricing?.installPerTrap)
                                    ? initialData.greaseInstallRate : undefined,

          customGreenWeeklyRate: (initialData.greenWeeklyRate !== undefined &&
                                  initialData.greenWeeklyRate !== backendConfig.greenDrainPricing?.weeklyRatePerDrain)
                                  ? initialData.greenWeeklyRate : undefined,

          customGreenInstallRate: (initialData.greenInstallRate !== undefined &&
                                   initialData.greenInstallRate !== backendConfig.greenDrainPricing?.installPerDrain)
                                   ? initialData.greenInstallRate : undefined,

          customPlumbingAddonRate: (initialData.plumbingAddonRate !== undefined &&
                                    initialData.plumbingAddonRate !== backendConfig.addOns?.plumbingWeeklyAddonPerDrain)
                                    ? initialData.plumbingAddonRate : undefined,

          customFilthyMultiplier: (initialData.filthyMultiplier !== undefined &&
                                   initialData.filthyMultiplier !== backendConfig.installationMultipliers?.filthyMultiplier)
                                   ? initialData.filthyMultiplier : undefined,
        };


        const hasAnyOverrides = Object.values(overrides).some(v => v !== undefined);

        if (hasAnyOverrides) {
          setState(prev => ({
            ...prev,
            ...overrides, 
          }));

          console.log('✅ [FOAMING-DRAIN-PRICING] Set custom override fields for yellow highlighting:',
            Object.fromEntries(
              Object.entries(overrides).filter(([_, value]) => value !== undefined)
            )
          );
        } else {
          console.log('ℹ️ [FOAMING-DRAIN-PRICING] No price overrides detected - using backend defaults');
        }
      }
    }
  }, [backendConfig, initialData]);


  useEffect(() => {

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);


  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(() => {
    const drainCount = state.standardDrainCount + state.installDrainCount +
                       state.filthyDrainCount + state.greaseTrapCount +
                       state.greenDrainCount + state.plumbingDrainCount;
    return drainCount > 0;
  });

  useEffect(() => {
    const drainCount = state.standardDrainCount + state.installDrainCount +
                       state.filthyDrainCount + state.greaseTrapCount +
                       state.greenDrainCount + state.plumbingDrainCount;
    const isServiceActive = drainCount > 0;
    const wasActive = wasActiveRef.current();
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {

      console.log(`📅 [FOAMING-DRAIN-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [FOAMING-DRAIN-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setState(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {

      const globalMonths = servicesContext.globalContractMonths;
      if (state.contractMonths !== globalMonths) {
        console.log(`📅 [FOAMING-DRAIN-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setState(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    }


    wasActiveRef.current = () => isServiceActive;
  }, [servicesContext?.globalContractMonths, state.contractMonths,
      state.standardDrainCount, state.installDrainCount, state.filthyDrainCount,
      state.greaseTrapCount, state.greenDrainCount, state.plumbingDrainCount, servicesContext]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setState(prev => ({ ...prev, contractMonths: months }));
    console.log(`📅 [FOAMING-DRAIN-CONTRACT] User override: ${months} months`);
  }, []);


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
    const isVolume = standardDrains >= activeConfig.volumePricing.minimumDrains;  
    const canUseInstallProgram =
      isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;


    const installDrains = canUseInstallProgram
      ? Math.min(installRequested, standardDrains)
      : 0;

    const normalStandardDrains = Math.max(standardDrains - installDrains, 0);


    const standardDrainsActive = state.isAllInclusive ? 0 : normalStandardDrains;


    let filthyDrains = 0;
    if (condition === "filthy" && standardDrainsActive > 0) {
      if (filthyRequested > 0) {
        filthyDrains = Math.min(filthyRequested, standardDrainsActive);
      } else {

        filthyDrains = standardDrainsActive;
      }
    }


    const effectiveStandardDrainRate = state.customRatePerDrain ?? state.standardDrainRate;
    const effectiveAltBaseCharge = state.customAltBaseCharge ?? state.altBaseCharge;
    const effectiveAltExtraPerDrain = state.customAltExtraPerDrain ?? state.altExtraPerDrain;
    const effectiveVolumeWeeklyRate = state.customVolumeWeeklyRate ?? state.volumeWeeklyRate;
    const effectiveVolumeBimonthlyRate = state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate;
    const effectiveGreaseWeeklyRate = state.customGreaseWeeklyRate ?? state.greaseWeeklyRate;
    const effectiveGreaseInstallRate = state.customGreaseInstallRate ?? state.greaseInstallRate;
    const effectiveGreenWeeklyRate = state.customGreenWeeklyRate ?? state.greenWeeklyRate;
    const effectiveGreenInstallRate = state.customGreenInstallRate ?? state.greenInstallRate;
    const effectivePlumbingAddonRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;
    const effectiveFilthyMultiplier = state.customFilthyMultiplier ?? state.filthyMultiplier;

    console.log('🔧 [FOAMING-DRAIN-CALC] Using effective values:', {
      effectiveStandardDrainRate,
      effectiveAltBaseCharge,
      effectiveAltExtraPerDrain,
      effectiveVolumeWeeklyRate,
      effectiveVolumeBimonthlyRate,
      effectiveGreaseWeeklyRate,
      effectiveGreaseInstallRate,
      effectiveGreenWeeklyRate,
      effectiveGreenInstallRate,
      effectivePlumbingAddonRate,
      effectiveFilthyMultiplier,
    });


    const tenTotal = standardDrainsActive * effectiveStandardDrainRate;  
    const altTotal =
      standardDrainsActive > 0
        ? effectiveAltBaseCharge + effectiveAltExtraPerDrain * standardDrainsActive  
        : 0;

    let usedSmallAlt = false;
    let usedBigAccountAlt = false;
    let useAltPricing = false;

    if (standardDrainsActive > 0 && !state.isAllInclusive) {
      if (state.useSmallAltPricingWeekly) {

        useAltPricing = true;
        usedSmallAlt = true;
      } else if (state.useBigAccountTenWeekly) {

        useAltPricing = false;
        usedBigAccountAlt = true;
      } else {

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


    let weeklyInstallDrains = 0;
    let volumePricingApplied = false;

    if (installDrains > 0 && canUseInstallProgram) {
      volumePricingApplied = true;


      const perDrainRate =
        state.installFrequency === "bimonthly"
          ? effectiveVolumeBimonthlyRate  
          : effectiveVolumeWeeklyRate;    

      weeklyInstallDrains = perDrainRate * installDrains;
    }


    const weeklyPlumbing =
      state.needsPlumbing && plumbingDrains > 0
        ? plumbingDrains * effectivePlumbingAddonRate  
        : 0;


    const weeklyGreaseTraps =
      greaseTraps > 0 ? greaseTraps * effectiveGreaseWeeklyRate : 0;  
    const weeklyGreenDrains =
      greenDrains > 0 ? greenDrains * effectiveGreenWeeklyRate : 0;  


    const weeklyServiceRaw =
      weeklyStandardDrains +
      weeklyInstallDrains +
      weeklyPlumbing +
      weeklyGreaseTraps +
      weeklyGreenDrains;


    const minimumChargePerVisit = backendConfig?.minimumChargePerVisit ?? 50; 
    const weeklyServiceBeforeMin = round2(weeklyServiceRaw);
    const weeklyService = weeklyServiceRaw > 0 ? (state.applyMinimum !== false ? Math.max(weeklyServiceBeforeMin, minimumChargePerVisit) : weeklyServiceBeforeMin) : 0;
    const tripCharge = 0; 
    const weeklyTotal = weeklyService; 


    let filthyInstallOneTime = 0;

    if (condition === "filthy" && standardDrainsActive > 0 && !state.useBigAccountTenWeekly) {

      const filthyDrainCount =
        filthyDrains > 0 && filthyDrains <= standardDrainsActive
          ? filthyDrains
          : standardDrainsActive;

      let weeklyFilthyCost = 0;

      if (useAltPricing) {

        weeklyFilthyCost =
          effectiveAltBaseCharge + effectiveAltExtraPerDrain * filthyDrainCount;  
      } else {

        weeklyFilthyCost = effectiveStandardDrainRate * filthyDrainCount;  
      }

      filthyInstallOneTime =
        weeklyFilthyCost * effectiveFilthyMultiplier; 
    }


    const greaseInstallOneTime =
      state.chargeGreaseTrapInstall && greaseTraps > 0
        ? effectiveGreaseInstallRate * greaseTraps  
        : 0;


    const greenInstallOneTime =
      greenDrains > 0 ? effectiveGreenInstallRate * greenDrains : 0;  

    const installationRaw =
      filthyInstallOneTime + greaseInstallOneTime + greenInstallOneTime;
    const installation = round2(installationRaw);


    const effectiveInstallation = state.customInstallationTotal ?? installation;


    let firstVisitServiceRaw = weeklyInstallDrains + weeklyPlumbing;


    if (condition === "normal") {
      firstVisitServiceRaw += weeklyStandardDrains;
    }


    if (!state.chargeGreaseTrapInstall) {
      firstVisitServiceRaw += weeklyGreaseTraps;
    }


    const firstVisitService = round2(firstVisitServiceRaw);
    let firstVisitPrice = effectiveInstallation + firstVisitService;
    firstVisitPrice = round2(firstVisitPrice);


    const contractMonths = clamp(
      Number(state.contractMonths) || activeConfig.contract.defaultMonths,  
      activeConfig.contract.minMonths,  
      activeConfig.contract.maxMonths   
    );


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


    const customOrCalculated = state.customWeeklyService ?? weeklyService;
    const effectiveWeeklyService = weeklyServiceRaw > 0
      ? (state.applyMinimum !== false ? Math.max(customOrCalculated, minimumChargePerVisit) : customOrCalculated)
      : customOrCalculated; 

    let normalMonth = effectiveWeeklyService * frequencyMultiplier;
    let firstMonthPrice = 0;


    if (effectiveInstallation > 0) {
      firstMonthPrice = firstVisitPrice + effectiveWeeklyService * Math.max(0, frequencyMultiplier - 1);
    } else {
      firstMonthPrice = normalMonth;
    }

    normalMonth = round2(normalMonth);
    firstMonthPrice = round2(firstMonthPrice);


    let contractTotalRaw = 0;
    const freqLower = frequency.toLowerCase();

    if (freqLower === "bimonthly") {


      const totalVisitsIn12Months = 6; 
      const contractVisitsForTerm = Math.round((contractMonths / 12) * totalVisitsIn12Months);

      if (effectiveInstallation > 0) {

        const remainingVisits = Math.max(contractVisitsForTerm - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
        console.log(`🔧 [Foaming Drain Bimonthly Contract] Fixed calculation: first visit=$${firstVisitPrice.toFixed(2)}, remaining ${remainingVisits} visits × $${effectiveWeeklyService.toFixed(2)} = $${contractTotalRaw.toFixed(2)}`);
      } else {

        contractTotalRaw = effectiveWeeklyService * contractVisitsForTerm;
        console.log(`🔧 [Foaming Drain Bimonthly Contract] No installation: ${contractVisitsForTerm} visits × $${effectiveWeeklyService.toFixed(2)} = $${contractTotalRaw.toFixed(2)}`);
      }
    } else if (freqLower === "quarterly") {

      const quarterlyVisits = contractMonths / 3;
      const totalVisits = Math.round(quarterlyVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else if (freqLower === "biannual") {

      const biannualVisits = contractMonths / 6;
      const totalVisits = Math.round(biannualVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else if (freqLower === "annual") {

      const annualVisits = contractMonths / 12;
      const totalVisits = Math.round(annualVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else {

      contractTotalRaw = firstMonthPrice + (contractMonths - 1) * normalMonth;
    }

    const contractTotal = round2(contractTotalRaw);


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [FOAMING-DRAIN-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });


    const calculatedMonthlyRecurring = normalMonth;
    const calculatedContractTotal = contractTotalWithCustomFields;  


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

      tripCharge, 
    };


    const quote: FoamingDrainQuoteResult = {
      serviceId: "foamingDrain",

      frequency,
      location,
      facilityCondition: condition,

      useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
      useBigAccountTenWeekly: state.useBigAccountTenWeekly,
      isAllInclusive: state.isAllInclusive,
      chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,


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


      minimumChargePerVisit,


      originalContractTotal: (() => {
        if (!weeklyServiceRaw) return 0;
        const baselineStandardDrains = standardDrainsActive * activeConfig.standardDrainRate;
        const baselineInstallDrains = installDrains > 0 && canUseInstallProgram
          ? (state.installFrequency === "bimonthly"
              ? activeConfig.volumePricing.bimonthlyRatePerDrain
              : activeConfig.volumePricing.weeklyRatePerDrain) * installDrains
          : 0;
        const baselinePlumbing = state.needsPlumbing && plumbingDrains > 0
          ? plumbingDrains * activeConfig.plumbing.weeklyAddonPerDrain
          : 0;
        const baselineGrease = greaseTraps > 0 ? greaseTraps * activeConfig.grease.weeklyRatePerTrap : 0;
        const baselineGreen = greenDrains > 0 ? greenDrains * activeConfig.green.weeklyRatePerDrain : 0;
        const baselineWeeklyRaw = baselineStandardDrains + baselineInstallDrains + baselinePlumbing + baselineGrease + baselineGreen;
        const baselineWeekly = baselineWeeklyRaw > 0 ? (state.applyMinimum !== false ? Math.max(round2(baselineWeeklyRaw), minimumChargePerVisit) : round2(baselineWeeklyRaw)) : 0;
        const baselineNormalMonth = baselineWeekly * frequencyMultiplier;
        const freqLowerOct = frequency.toLowerCase();
        let baselineContractRaw = 0;
        if (freqLowerOct === "bimonthly") {
          const contractVisitsForTerm = Math.round(contractMonths / 2);
          baselineContractRaw = baselineWeekly * contractVisitsForTerm;
        } else if (freqLowerOct === "quarterly") {
          const totalVisits = Math.max(Math.floor(contractMonths / 3), 1);
          baselineContractRaw = baselineWeekly * totalVisits;
        } else if (freqLowerOct === "biannual") {
          const totalVisits = Math.max(Math.floor(contractMonths / 6), 1);
          baselineContractRaw = baselineWeekly * totalVisits;
        } else if (freqLowerOct === "annual") {
          const totalVisits = Math.max(Math.floor(contractMonths / 12), 1);
          baselineContractRaw = baselineWeekly * totalVisits;
        } else {
          baselineContractRaw = baselineNormalMonth + (contractMonths - 1) * baselineNormalMonth;
        }
        return round2(baselineContractRaw);
      })(),
    };

    return quote;
  }, [
    backendConfig,  
    state.standardDrainCount,
    state.installDrainCount,
    state.filthyDrainCount,
    state.greaseTrapCount,
    state.greenDrainCount,
    state.plumbingDrainCount,
    state.needsPlumbing,
    state.frequency,
    state.installFrequency, 
    state.facilityCondition,
    state.location,
    state.useSmallAltPricingWeekly,
    state.useBigAccountTenWeekly,
    state.isAllInclusive,
    state.chargeGreaseTrapInstall,
    state.tripChargeOverride,
    state.contractMonths,
    state.notes,

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

    state.customRatePerDrain,
    state.customAltBaseCharge,
    state.customAltExtraPerDrain,
    state.customVolumeWeeklyRate,
    state.customVolumeBimonthlyRate,
    state.customGreaseWeeklyRate,
    state.customGreaseInstallRate,
    state.customGreenWeeklyRate,
    state.customGreenInstallRate,
    state.customPlumbingAddonRate,
    state.customFilthyMultiplier,

    state.customWeeklyService,
    state.customInstallationTotal,
    state.customMonthlyRecurring,
    state.customFirstMonthPrice,
    state.customContractTotal,

    state.applyMinimum,

    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  const updateField = <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => {
    setState((prev) => {

      const originalValue = prev[key];

      const next = {
        ...prev,
        [key]: value,
      };


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


      const baseEditableFields = [
        'standardDrainRate', 'altBaseCharge', 'altExtraPerDrain',
        'volumeWeeklyRate', 'volumeBimonthlyRate', 'greaseWeeklyRate', 'greaseInstallRate',
        'greenWeeklyRate', 'greenInstallRate', 'plumbingAddonRate', 'filthyMultiplier'
      ];


      const customRateOverrideFields = [
        'customRatePerDrain', 'customAltBaseCharge', 'customAltExtraPerDrain',
        'customVolumeWeeklyRate', 'customVolumeBimonthlyRate',
        'customGreaseWeeklyRate', 'customGreaseInstallRate',
        'customGreenWeeklyRate', 'customGreenInstallRate',
        'customPlumbingAddonRate', 'customFilthyMultiplier'
      ];


      const customTotalOverrideFields = [
        'customWeeklyService', 'customInstallationTotal', 'customMonthlyRecurring',
        'customFirstMonthPrice', 'customContractTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customRateOverrideFields, ...customTotalOverrideFields];


      const customToBaseFieldMap: Record<string, string> = {
        'customRatePerDrain': 'standardDrainRate',
        'customAltBaseCharge': 'altBaseCharge',
        'customAltExtraPerDrain': 'altExtraPerDrain',
        'customVolumeWeeklyRate': 'volumeWeeklyRate',
        'customVolumeBimonthlyRate': 'volumeBimonthlyRate',
        'customGreaseWeeklyRate': 'greaseWeeklyRate',
        'customGreaseInstallRate': 'greaseInstallRate',
        'customGreenWeeklyRate': 'greenWeeklyRate',
        'customGreenInstallRate': 'greenInstallRate',
        'customPlumbingAddonRate': 'plumbingAddonRate',
        'customFilthyMultiplier': 'filthyMultiplier',
        'customWeeklyService': 'standardDrainRate',
        'customInstallationTotal': 'filthyMultiplier',
        'customFirstMonthPrice': 'standardDrainRate',
        'customMonthlyRecurring': 'standardDrainRate',
        'customContractTotal': 'standardDrainRate',
      };

      if (allPricingFields.includes(key as string)) {
        const newValue = value as number | undefined;
        const keyStr = key as string;


        const baseFieldForLookup = customToBaseFieldMap[keyStr] || keyStr;
        const baselineValue = baselineValues.current[baseFieldForLookup];

        console.log(`🔍 [FOAMING-DRAIN-LOGGING] Field: ${keyStr}`, {
          newValue,
          baseFieldForLookup,
          baselineValue,
          isCustomField: keyStr.startsWith('custom'),
        });


        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          console.log(`📝 [FOAMING-DRAIN-BASELINE-LOG] Logging change for ${keyStr}:`, {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
            changePercent: ((newValue - baselineValue) / baselineValue * 100).toFixed(1) + '%'
          });
          addServiceFieldChange(keyStr, baselineValue, newValue);
        } else {
          console.log(`⚠️ [FOAMING-DRAIN-LOGGING] NOT logging for ${keyStr}:`, {
            reason: newValue === undefined ? 'newValue is undefined' :
                    baselineValue === undefined ? 'baselineValue is undefined' :
                    typeof newValue !== 'number' ? `newValue is ${typeof newValue}, not number` :
                    typeof baselineValue !== 'number' ? `baselineValue is ${typeof baselineValue}, not number` :
                    'values are equal',
            newValue,
            baselineValue,
          });
        }
      }


      const allFormFields = [

        'drainsPerWeek', 'contractMonths',

        'frequency', 'location', 'condition', 'rateTier'
      ];


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
    refreshConfig: () => fetchPricing(true), 
    isLoadingConfig,
    backendConfig, 
    setContractMonths, 
  };
}
