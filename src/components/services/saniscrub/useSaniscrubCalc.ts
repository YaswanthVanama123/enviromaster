import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { SaniscrubFormState, SaniscrubFrequency } from "./saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyList,
} from "./saniscrubConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";


interface BackendSaniscrubConfig {
  tripCharges: {
    standard: number;
    beltway: number;
  };
  parkingFeeAddOn: number;
  monthlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  bimonthlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  quarterlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  twicePerMonthPricing: {
    discountFromMonthlyRate: number;
  };
  nonBathroomSqFtPricingRule: {
    sqFtBlockUnit: number;
    priceFirstBlock: number;
    priceAdditionalBlock: number;
  };
  installationPricing: {
    installMultiplierDirtyOrFirstTime: number;
    allowInstallFeeWaiver: boolean;
  };
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

const DEFAULT_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  fixtureCount: 0,
  nonBathroomSqFt: 0,
  useExactNonBathroomSqft: true, 
  frequency: "monthly",
  hasSaniClean: true,
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, 
  includeInstall: false,
  isDirtyInstall: false,
  notes: "",
  contractMonths: 12, 


  fixtureRateMonthly: cfg.fixtureRates.monthly,
  fixtureRateBimonthly: cfg.fixtureRates.bimonthly,
  fixtureRateQuarterly: cfg.fixtureRates.quarterly,
  minimumMonthly: cfg.minimums.monthly,
  minimumBimonthly: cfg.minimums.bimonthly,
  nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate,
  nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  twoTimesPerMonthDiscount: cfg.twoTimesPerMonthDiscountFlat,
  applyMinimum: true,
};

function clampFrequency(f: string): SaniscrubFrequency {
  return saniscrubFrequencyList.includes(f as SaniscrubFrequency)
    ? (f as SaniscrubFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}


function buildActiveConfig(backendConfig: BackendSaniscrubConfig | null) {

  const defaults = {
    fixtureRates: cfg.fixtureRates || {
      monthly: 25,
      bimonthly: 35,
      quarterly: 40
    },
    minimums: cfg.minimums || {
      monthly: 125,
      bimonthly: 175,
      quarterly: 200
    },
    nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate || 250,
    nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate || 125,
    nonBathroomUnitSqFt: cfg.nonBathroomUnitSqFt || 500,
    installMultipliers: cfg.installMultipliers || {
      dirty: 3,
      clean: 1
    },
    twoTimesPerMonthDiscountFlat: cfg.twoTimesPerMonthDiscountFlat || 50,
    tripCharges: cfg.tripCharges || { standard: 0, beltway: 0 },
    parkingFee: cfg.parkingFee || 5
  };

  if (!backendConfig) {
    console.log('📊 [SaniScrub] Using static config fallback values');
    return {
      ...defaults,
      frequencyMultipliers: {
        oneTime: 0,
        weekly: 4.33,
        biweekly: 2.165,
        twicePerMonth: 2,
        monthly: 1.0,
        bimonthly: 0.5,
        quarterly: 0,
        biannual: 0,
        annual: 0,
      },
      annualFrequencies: {
        oneTime: 1,
        weekly: 52,
        biweekly: 26,
        twicePerMonth: 24,
        monthly: 12,
        bimonthly: 6,
        quarterly: 4,
        biannual: 2,
        annual: 1,
      }
    };
  }

  console.log('📊 [SaniScrub] Building active config from backend:', backendConfig);


  const activeConfig = {

    fixtureRates: {
      monthly: backendConfig.monthlyPricing?.pricePerFixture ?? defaults.fixtureRates.monthly,
      bimonthly: backendConfig.bimonthlyPricing?.pricePerFixture ?? defaults.fixtureRates.bimonthly,
      quarterly: backendConfig.quarterlyPricing?.pricePerFixture ?? defaults.fixtureRates.quarterly,
    },


    minimums: {
      monthly: backendConfig.monthlyPricing?.minimumPrice ?? defaults.minimums.monthly,
      bimonthly: backendConfig.bimonthlyPricing?.minimumPrice ?? defaults.minimums.bimonthly,
      quarterly: backendConfig.quarterlyPricing?.minimumPrice ?? defaults.minimums.quarterly,
    },


    nonBathroomFirstUnitRate: backendConfig.nonBathroomSqFtPricingRule?.priceFirstBlock ?? defaults.nonBathroomFirstUnitRate,
    nonBathroomAdditionalUnitRate: backendConfig.nonBathroomSqFtPricingRule?.priceAdditionalBlock ?? defaults.nonBathroomAdditionalUnitRate,
    nonBathroomUnitSqFt: backendConfig.nonBathroomSqFtPricingRule?.sqFtBlockUnit ?? defaults.nonBathroomUnitSqFt,


    installMultipliers: {
      dirty: backendConfig.installationPricing?.installMultiplierDirtyOrFirstTime ?? defaults.installMultipliers.dirty,
      clean: 1, 
    },


    twoTimesPerMonthDiscountFlat: backendConfig.twicePerMonthPricing?.discountFromMonthlyRate ?? defaults.twoTimesPerMonthDiscountFlat,


    tripCharges: backendConfig.tripCharges ?? defaults.tripCharges,
    parkingFee: backendConfig.parkingFeeAddOn ?? defaults.parkingFee,


    frequencyMultipliers: {
      oneTime: 0,
      weekly: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? 4.33,
      biweekly: backendConfig.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? 2.165,
      twicePerMonth: 2, 
      monthly: 1.0, 
      bimonthly: 0.5, 
      quarterly: 0, 
      biannual: 0, 
      annual: 0, 
    },


    annualFrequencies: {
      oneTime: 1,
      weekly: 52,
      biweekly: 26,
      twicePerMonth: 24,
      monthly: 12,
      bimonthly: backendConfig.frequencyMetadata?.bimonthly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.bimonthly.cycleMonths : 6,
      quarterly: backendConfig.frequencyMetadata?.quarterly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.quarterly.cycleMonths : 4,
      biannual: backendConfig.frequencyMetadata?.biannual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.biannual.cycleMonths : 2,
      annual: backendConfig.frequencyMetadata?.annual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.annual.cycleMonths : 1,
    },


    frequencyMetadata: backendConfig.frequencyMetadata,
  };

  console.log('✅ [SaniScrub] Active config built:', {
    fixtureRates: activeConfig.fixtureRates,
    minimums: activeConfig.minimums,
    nonBathroomPricing: {
      firstBlock: activeConfig.nonBathroomFirstUnitRate,
      additionalBlock: activeConfig.nonBathroomAdditionalUnitRate,
      blockSize: activeConfig.nonBathroomUnitSqFt,
    },
    installMultipliers: activeConfig.installMultipliers,
    twoTimesPerMonthDiscount: activeConfig.twoTimesPerMonthDiscountFlat,
    frequencyMultipliers: activeConfig.frequencyMultipliers,
    annualFrequencies: activeConfig.annualFrequencies,
  });

  return activeConfig;
}

export function useSaniscrubCalc(initial?: Partial<SaniscrubFormState>, customFields?: any[]) {

  const servicesContext = useServicesContextOptional();
  const isEditMode = useRef(!!initial);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);


  const calcFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "calc" && field.calcValues?.right) {
        const fieldTotal = parseFloat(field.calcValues.right) || 0;
        return sum + fieldTotal;
      }
      return sum;
    }, 0);

    console.log(`💰 [SANISCRUB-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [SANISCRUB-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<SaniscrubFormState>(() => {

    const initialFixtureCount = initial?.fixtureCount || 0;
    const isInitiallyActive = initialFixtureCount > 0;


    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : DEFAULT_FORM.contractMonths;

    console.log(`📅 [SANISCRUB-INIT] Initializing contract months:`, {
      initialFixtureCount,
      isInitiallyActive,
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initial?.contractMonths
    });

    return {
      ...DEFAULT_FORM,
      ...initial,
      contractMonths: defaultContractMonths,
    };
  });


  const [backendConfig, setBackendConfig] = useState<BackendSaniscrubConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const backendActiveConfig = useMemo(() => buildActiveConfig(backendConfig), [backendConfig]);


  const updateFormWithConfig = (activeConfig: any, forceUpdate: boolean = false) => {
    if (isEditMode.current && !forceUpdate) {
      console.log('ÐY"< [SANISCRUB] Edit mode: skipping auto-overwrite from backend');
      return;
    }

    setForm((prev) => ({
      ...prev,

      fixtureRateMonthly: activeConfig.fixtureRates?.monthly ?? prev.fixtureRateMonthly,
      fixtureRateBimonthly: activeConfig.fixtureRates?.bimonthly ?? prev.fixtureRateBimonthly,
      fixtureRateQuarterly: activeConfig.fixtureRates?.quarterly ?? prev.fixtureRateQuarterly,
      minimumMonthly: activeConfig.minimums?.monthly ?? prev.minimumMonthly,
      minimumBimonthly: activeConfig.minimums?.bimonthly ?? prev.minimumBimonthly,
      nonBathroomFirstUnitRate: activeConfig.nonBathroomFirstUnitRate ?? prev.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: activeConfig.nonBathroomAdditionalUnitRate ?? prev.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: activeConfig.installMultipliers?.dirty ?? prev.installMultiplierDirty,
      installMultiplierClean: activeConfig.installMultipliers?.clean ?? prev.installMultiplierClean,
      twoTimesPerMonthDiscount: activeConfig.twoTimesPerMonthDiscountFlat ?? prev.twoTimesPerMonthDiscount,
      ...(forceUpdate ? {
        customInstallationFee: undefined,
        customPerVisitPrice: undefined,
        customMonthlyRecurring: undefined,
        customFirstMonthPrice: undefined,
        customContractTotal: undefined,
      } : {}),
    }));

    console.log('✅ [SaniScrub] Form updated with backend config values:', {
      monthlyRate: activeConfig.fixtureRates?.monthly,
      bimonthlyRate: activeConfig.fixtureRates?.bimonthly,
      quarterlyRate: activeConfig.fixtureRates?.quarterly,
      monthlyMinimum: activeConfig.minimums?.monthly,
      bimonthlyMinimum: activeConfig.minimums?.bimonthly,
      nonBathroomFirstBlock: activeConfig.nonBathroomFirstUnitRate,
      nonBathroomAdditionalBlock: activeConfig.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: activeConfig.installMultipliers?.dirty,
      twicePerMonthDiscount: activeConfig.twoTimesPerMonthDiscountFlat,
    });
  };


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("saniscrub");
        if (backendData?.config) {
          console.log('✅ [SaniScrub] Using cached pricing data from context');
          const config = backendData.config as BackendSaniscrubConfig;


          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig, forceRefresh);

          console.log('✅ SaniScrub CONFIG loaded from context:', {
            monthlyPricing: config.monthlyPricing,
            bimonthlyPricing: config.bimonthlyPricing,
            quarterlyPricing: config.quarterlyPricing,
            nonBathroomSqFtPricingRule: config.nonBathroomSqFtPricingRule,
            installationPricing: config.installationPricing,
            tripCharges: config.tripCharges,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for SaniScrub, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch SaniScrub config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("saniscrub");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniScrub] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSaniscrubConfig;


          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig, forceRefresh);

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };


  useEffect(() => {
    console.log('�Y"< [SANISCRUB-PRICING] Fetching backend prices for baseline/override detection');
    fetchPricing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing(false);
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  useEffect(() => {
    if (baselineInitialized.current) return;
    if (!backendConfig) return;

    baselineInitialized.current = true;
    baselineValues.current = {
      fixtureRateMonthly: initial?.fixtureRateMonthly ?? backendActiveConfig.fixtureRates?.monthly,
      fixtureRateBimonthly: initial?.fixtureRateBimonthly ?? backendActiveConfig.fixtureRates?.bimonthly,
      fixtureRateQuarterly: initial?.fixtureRateQuarterly ?? backendActiveConfig.fixtureRates?.quarterly,
      minimumMonthly: initial?.minimumMonthly ?? backendActiveConfig.minimums?.monthly,
      minimumBimonthly: initial?.minimumBimonthly ?? backendActiveConfig.minimums?.bimonthly,
      nonBathroomFirstUnitRate: initial?.nonBathroomFirstUnitRate ?? backendActiveConfig.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: initial?.nonBathroomAdditionalUnitRate ?? backendActiveConfig.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: initial?.installMultiplierDirty ?? backendActiveConfig.installMultipliers?.dirty,
      installMultiplierClean: initial?.installMultiplierClean ?? backendActiveConfig.installMultipliers?.clean,
      twoTimesPerMonthDiscount: initial?.twoTimesPerMonthDiscount ?? backendActiveConfig.twoTimesPerMonthDiscountFlat,
    };

    console.log('�o. [SANISCRUB-BASELINE] Initialized baseline values for logging/highlighting:', baselineValues.current);
  }, [backendActiveConfig, initial]);

  const pricingOverrides = useMemo(() => {
    const cfg = backendActiveConfig;
    if (!cfg) return {};

    const isOverride = (current: number | undefined, baseline: number | undefined) =>
      Number(current ?? 0) !== Number(baseline ?? 0);

    return {
      fixtureRateMonthly: isOverride(form.fixtureRateMonthly, cfg.fixtureRates?.monthly),
      fixtureRateBimonthly: isOverride(form.fixtureRateBimonthly, cfg.fixtureRates?.bimonthly),
      fixtureRateQuarterly: isOverride(form.fixtureRateQuarterly, cfg.fixtureRates?.quarterly),
      minimumMonthly: isOverride(form.minimumMonthly, cfg.minimums?.monthly),
      minimumBimonthly: isOverride(form.minimumBimonthly, cfg.minimums?.bimonthly),
      nonBathroomFirstUnitRate: isOverride(form.nonBathroomFirstUnitRate, cfg.nonBathroomFirstUnitRate),
      nonBathroomAdditionalUnitRate: isOverride(form.nonBathroomAdditionalUnitRate, cfg.nonBathroomAdditionalUnitRate),
      installMultiplierDirty: isOverride(form.installMultiplierDirty, cfg.installMultipliers?.dirty),
      installMultiplierClean: isOverride(form.installMultiplierClean, cfg.installMultipliers?.clean),
      twoTimesPerMonthDiscount: isOverride(form.twoTimesPerMonthDiscount, cfg.twoTimesPerMonthDiscountFlat),
    };
  }, [
    backendActiveConfig,
    form.fixtureRateMonthly,
    form.fixtureRateBimonthly,
    form.fixtureRateQuarterly,
    form.minimumMonthly,
    form.minimumBimonthly,
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    form.twoTimesPerMonthDiscount,
  ]);


  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(form.fixtureCount > 0);

  useEffect(() => {
    const isServiceActive = form.fixtureCount > 0;
    const wasActive = wasActiveRef.current;
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {

      console.log(`📅 [SANISCRUB-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [SANISCRUB-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {

      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [SANISCRUB-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    }


    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.fixtureCount, servicesContext]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({ ...prev, contractMonths: months }));
    console.log(`📅 [SANISCRUB-CONTRACT] User override: ${months} months`);
  }, []);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `saniscrub_${fieldName}`,
      productName: `SaniScrub - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.fixtureCount || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [SANISCRUB-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.fixtureCount, form.frequency]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {

      const originalValue = prev[name as keyof SaniscrubFormState];

      let newFormState = prev;

      switch (name as keyof SaniscrubFormState) {
        case "fixtureCount":
        case "nonBathroomSqFt": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num > 0 ? num : 0,
          };
          break;
        }


        case "fixtureRateMonthly":
        case "fixtureRateBimonthly":
        case "fixtureRateQuarterly":
        case "minimumMonthly":
        case "minimumBimonthly":
        case "nonBathroomFirstUnitRate":
        case "nonBathroomAdditionalUnitRate":
        case "installMultiplierDirty":
        case "installMultiplierClean":
        case "twoTimesPerMonthDiscount": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
          break;
        }


        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, customInstallationFee: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }


        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, [name]: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }

        case "frequency":
          newFormState = {
            ...prev,
            frequency: clampFrequency(String(value)),
          };
          break;

        case "contractMonths":
          newFormState = {
            ...prev,
            contractMonths: clampContractMonths(value),
          };
          break;

        case "hasSaniClean":
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactNonBathroomSqft":
        case "applyMinimum":
          newFormState = {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };
          break;

        case "location":
          newFormState = {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };
          break;

        case "notes":
          newFormState = {
            ...prev,
            notes: String(value ?? ""),
          };
          break;

        default:
          newFormState = prev;
          break;
      }


      if (
        name === 'fixtureCount' ||
        name === 'nonBathroomSqFt' ||
        name === 'frequency' ||
        name === 'hasSaniClean' ||
        name === 'includeInstall' ||
        name === 'isDirtyInstall' ||
        name === 'contractMonths' ||
        name === 'useExactNonBathroomSqft'
      ) {

        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }


      if (
        name === 'fixtureRateMonthly' ||
        name === 'fixtureRateBimonthly' ||
        name === 'fixtureRateQuarterly' ||
        name === 'minimumMonthly' ||
        name === 'minimumBimonthly' ||
        name === 'nonBathroomFirstUnitRate' ||
        name === 'nonBathroomAdditionalUnitRate' ||
        name === 'installMultiplierDirty' ||
        name === 'installMultiplierClean' ||
        name === 'twoTimesPerMonthDiscount'
      ) {

        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }


      const baseEditableFields = [
        'fixtureRateMonthly', 'fixtureRateBimonthly', 'fixtureRateQuarterly',
        'minimumMonthly', 'minimumBimonthly', 'nonBathroomFirstUnitRate',
        'nonBathroomAdditionalUnitRate', 'installMultiplierDirty', 'installMultiplierClean',
        'twoTimesPerMonthDiscount'
      ];

      const customOverrideFields = [
        'customInstallationFee', 'customPerVisitPrice', 'customMonthlyRecurring',
        'customFirstMonthPrice', 'customContractTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customOverrideFields];

      if (allPricingFields.includes(name)) {
        const newValue = newFormState[name as keyof SaniscrubFormState] as number | undefined;

        let baselineValue = baselineValues.current[name];
        if (baselineValue === undefined && name.startsWith('custom')) {
          const baseFieldMap: Record<string, string> = {
            customInstallationFee: 'installMultiplierDirty',
            customPerVisitPrice: 'minimumMonthly',
            customMonthlyRecurring: 'minimumMonthly',
            customFirstMonthPrice: 'minimumMonthly',
            customContractTotal: 'minimumMonthly',
          };

          const mappedBase = baseFieldMap[name];
          if (mappedBase) {
            baselineValue = baselineValues.current[mappedBase];
          }
        }

        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          console.log("�Y\"? [SANISCRUB-BASELINE-LOG] Logging change for " + name + ":", {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
          });
          addServiceFieldChange(name, baselineValue, newValue);
        }
      }

      return newFormState;
    });
  };

  const {
    fixtureMonthly,
    fixtureBaseAmount, 
    fixturePerVisit,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    monthlyBase,
    perVisitTrip,
    monthlyTrip,
    monthlyTotal,
    annualTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitEffective,
    installOneTime,
    firstMonthTotal,
    contractTotal,
    originalContractTotal,

    frequency,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,

    nonBathroomUnitSqFt,
  } = useMemo(() => {


    const activeConfig = backendActiveConfig;

    if (!backendConfig) {
      console.warn('⚠️ [SaniScrub] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [SaniScrub] Using backend config:', {
        fixtureRates: activeConfig.fixtureRates,
        minimums: activeConfig.minimums,
        nonBathroomPricing: {
          firstBlock: activeConfig.nonBathroomFirstUnitRate,
          additionalBlock: activeConfig.nonBathroomAdditionalUnitRate,
          blockSize: activeConfig.nonBathroomUnitSqFt,
        },
      });
    }

    const freq = clampFrequency(form.frequency);


    const getFrequencyMultiplier = (frequency: string) => {
      if (activeConfig.frequencyMetadata && activeConfig.frequencyMetadata[frequency]) {
        const metadata = activeConfig.frequencyMetadata[frequency];

        if (typeof metadata.monthlyRecurringMultiplier === 'number') {
          return metadata.monthlyRecurringMultiplier;
        }

        if (typeof metadata.cycleMonths === 'number') {
          return 1 / metadata.cycleMonths;
        }
      }

      return activeConfig.frequencyMultipliers[frequency] ?? 1;
    };

    const monthlyVisits = getFrequencyMultiplier(freq);
    const visitsPerYear = monthlyVisits * 12;
    const visitsPerMonth = visitsPerYear / 12;


    const isVisitBasedFrequency = freq === "oneTime" ||
                                   freq === "quarterly" ||
                                   freq === "biannual" ||
                                   freq === "annual" ||
                                   freq === "bimonthly";

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;


    let fixtureMonthly = 0;
    let fixturePerVisit = 0;
    let fixtureBaseAmount = 0; 

    if (fixtureCount > 0) {

      let baseRate = 0;
      let minimumAmount = 0;


      if (freq === "oneTime" || freq === "weekly" || freq === "biweekly" ||
          freq === "twicePerMonth" || freq === "monthly") {

        baseRate = form.fixtureRateMonthly; 
        minimumAmount = form.minimumMonthly; 
      } else if (freq === "bimonthly") {

        baseRate = form.fixtureRateBimonthly; 
        minimumAmount = form.minimumBimonthly; 
      } else if (freq === "quarterly") {

        baseRate = form.fixtureRateQuarterly; 
        minimumAmount = activeConfig.minimums.quarterly;
      } else {

        baseRate = form.fixtureRateQuarterly; 
        minimumAmount = activeConfig.minimums.quarterly;
      }

      const rawAmount = fixtureCount * baseRate;


      fixtureBaseAmount = fixtureCount > 0 ? (form.applyMinimum !== false ? Math.max(rawAmount, minimumAmount) : rawAmount) : 0;


      if (freq === "oneTime") {

        fixtureMonthly = 0; 
        fixturePerVisit = fixtureBaseAmount;
      } else if (freq === "weekly" || freq === "biweekly") {

        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; 
      } else if (freq === "monthly") {

        fixtureMonthly = fixtureBaseAmount;
        fixturePerVisit = fixtureBaseAmount;
      } else if (freq === "twicePerMonth") {

        fixtureMonthly = fixtureBaseAmount; 
        fixturePerVisit = fixtureBaseAmount / 2; 
      } else if (freq === "bimonthly") {

        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; 
      } else if (freq === "quarterly") {

        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; 
      } else {

        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; 
      }
    }


    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (nonBathSqFt > 0) {


      if (nonBathSqFt <= activeConfig.nonBathroomUnitSqFt) {

        nonBathroomPerVisit = form.nonBathroomFirstUnitRate;
      } else {

        const extraSqFt = nonBathSqFt - activeConfig.nonBathroomUnitSqFt;

        if (form.useExactNonBathroomSqft) {

          const ratePerSqFt = form.nonBathroomAdditionalUnitRate / activeConfig.nonBathroomUnitSqFt;
          nonBathroomPerVisit = form.nonBathroomFirstUnitRate + (extraSqFt * ratePerSqFt);
        } else {

          const additionalBlocks = Math.ceil(extraSqFt / activeConfig.nonBathroomUnitSqFt);
          nonBathroomPerVisit = form.nonBathroomFirstUnitRate + (additionalBlocks * form.nonBathroomAdditionalUnitRate);
        }
      }

      nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
    }


    const baseTrip = 0; 
    const parkingCharge = 0; 
    const perVisitTrip = baseTrip + parkingCharge;
    const monthlyTrip = perVisitTrip * visitsPerMonth;


    let adjustedFixtureMonthly = fixtureMonthly;


    if (freq === "twicePerMonth") {

      adjustedFixtureMonthly = fixtureMonthly * 2;
      if (form.hasSaniClean) {
        adjustedFixtureMonthly = Math.max(0, adjustedFixtureMonthly - form.twoTimesPerMonthDiscount); 
      }
    }


    const monthlyBase = adjustedFixtureMonthly + nonBathroomMonthly;
    const perVisitWithoutTrip = fixturePerVisit + nonBathroomPerVisit;
    const perVisitWithTrip = perVisitWithoutTrip + perVisitTrip;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;


    const monthlyRecurring = monthlyBase + monthlyTrip;


    const basePerVisitCost = (fixtureCount > 0 ? fixtureBaseAmount : 0) +
                            (nonBathSqFt > 0 ? nonBathroomPerVisit : 0);


    const installationFixtureBase = fixtureCount > 0 ? fixtureBaseAmount : 0;
    const installationNonBathroomBase = nonBathSqFt > 0 ? nonBathroomPerVisit : 0;
    const installationBasePrice = installationFixtureBase + installationNonBathroomBase;

    const installMultiplier = form.isDirtyInstall
      ? form.installMultiplierDirty  
      : form.installMultiplierClean; 

    const calculatedInstallOneTime = serviceActive && form.includeInstall
      ? installationBasePrice * installMultiplier
      : 0;


    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;


    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "oneTime") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip; 
        }
      } else if (freq === "weekly") {

        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; 
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biweekly") {

        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; 
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "monthly") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip; 
        }
      } else if (freq === "bimonthly") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "quarterly") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "biannual") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "annual") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "twicePerMonth") {

        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; 
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));


          if (form.hasSaniClean) {
            calculatedFirstMonthTotal = Math.max(0, calculatedFirstMonthTotal - form.twoTimesPerMonthDiscount); 
          }
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            calculatedFirstMonthTotal = Math.max(0, calculatedFirstMonthTotal - form.twoTimesPerMonthDiscount); 
          }
        }
      }
    }


    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;


    const contractMonths = clampContractMonths(form.contractMonths);
    let calculatedContractTotal = 0;
    let monthsPerVisit = 1;
    let totalVisitsForContract = 0;

    if (serviceActive && contractMonths > 0) {
      if (freq === "oneTime") {

        calculatedContractTotal = firstMonthTotal;
        totalVisitsForContract = 1;
      } else if (freq === "weekly") {

        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biweekly") {

        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "monthly") {

        totalVisitsForContract = contractMonths;

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = contractMonths * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "bimonthly") {

        const totalVisits = Math.round(contractMonths / 2);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {

          const remainingVisits = Math.max(totalVisits - 1, 0); 
          calculatedContractTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "quarterly") {

        const totalVisits = Math.round(contractMonths / 3);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {

          const remainingVisits = Math.max(totalVisits - 1, 0); 
          calculatedContractTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biannual") {

        const totalServices = Math.round((contractMonths / 12) * 2);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {

          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingServices * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "annual") {

        const totalServices = Math.round(contractMonths / 12);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {

          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = installOneTime + (remainingServices * (basePerVisitCost + perVisitTrip));
        } else {

          calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "twicePerMonth") {

        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            monthlyRecurringWithDiscount = Math.max(0, monthlyRecurringWithDiscount - form.twoTimesPerMonthDiscount); 
          }
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurringWithDiscount);
        } else {

          let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            monthlyRecurringWithDiscount = Math.max(0, monthlyRecurringWithDiscount - form.twoTimesPerMonthDiscount); 
          }
          calculatedContractTotal = contractMonths * monthlyRecurringWithDiscount;
        }
      }
    }


    const contractTotalBeforeCustomFields = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotal = contractTotalBeforeCustomFields + customFieldsTotal;

    console.log(`📊 [SANISCRUB-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotalBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotal.toFixed(2)
    });


    const monthlyTotal = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : monthlyRecurring;

    const annualTotal = contractTotal;


    const perVisitEffective = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (basePerVisitCost + perVisitTrip); 


    const frequency = freq;
    monthsPerVisit = freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : freq === "biannual" ? 6 : freq === "annual" ? 12 : 1;
    totalVisitsForContract = isVisitBasedFrequency && contractMonths > 0
      ? Math.round((contractMonths / 12) * visitsPerYear)
      : Math.round(contractMonths * monthlyVisits);

    return {
      fixtureMonthly, 
      fixtureBaseAmount, 
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase, 
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      originalContractTotal: (() => {

        if (!serviceActive) return 0;
        const baselineFixtureRate = freq === "monthly" || freq === "weekly" || freq === "biweekly" || freq === "twicePerMonth"
          ? activeConfig.fixtureRates.monthly
          : freq === "bimonthly"
          ? activeConfig.fixtureRates.bimonthly
          : activeConfig.fixtureRates.quarterly; 
        const baselineMinimum = freq === "monthly" || freq === "weekly" || freq === "biweekly" || freq === "twicePerMonth"
          ? activeConfig.minimums.monthly
          : freq === "bimonthly"
          ? activeConfig.minimums.bimonthly
          : activeConfig.minimums.quarterly;
        const baselineRawAmount = fixtureCount > 0 ? fixtureCount * baselineFixtureRate : 0;
        const baselineBaseAmount = fixtureCount > 0 ? (form.applyMinimum !== false ? Math.max(baselineRawAmount, baselineMinimum) : baselineRawAmount) : 0;
        const baselinePerVisit = baselineBaseAmount;
        const baselineMonthlyTwice = baselineBaseAmount * 2;
        let baselineContractTotal = 0;
        if (freq === "oneTime") {
          baselineContractTotal = baselinePerVisit;
        } else if (freq === "weekly" || freq === "biweekly") {
          baselineContractTotal = contractMonths * monthlyVisits * baselinePerVisit;
        } else if (freq === "monthly") {
          baselineContractTotal = contractMonths * baselinePerVisit;
        } else if (freq === "twicePerMonth") {
          baselineContractTotal = contractMonths * baselineMonthlyTwice;
        } else {

          baselineContractTotal = totalVisitsForContract * baselinePerVisit;
        }
        return baselineContractTotal;
      })(),
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      nonBathroomUnitSqFt: activeConfig.nonBathroomUnitSqFt,
    };
  }, [
    backendActiveConfig,  
    form.fixtureCount,
    form.nonBathroomSqFt,
    form.useExactNonBathroomSqft,  
    form.frequency,
    form.hasSaniClean,
    form.needsParking,
    form.includeInstall,
    form.isDirtyInstall,
    form.contractMonths,
    form.customInstallationFee,

    form.fixtureRateMonthly,      
    form.fixtureRateBimonthly,    
    form.fixtureRateQuarterly,    
    form.minimumMonthly,          
    form.minimumBimonthly,        
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,  
    form.installMultiplierClean,  
    form.twoTimesPerMonthDiscount, 

    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,

    calcFieldsTotal,
    dollarFieldsTotal,
    form.applyMinimum,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal, 
      annual: annualTotal, 
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, annualTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      fixtureMonthly,
      fixtureBaseAmount, 
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      originalContractTotal,

      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,

      nonBathroomUnitSqFt,
    },
    pricingOverrides,
    refreshConfig: () => fetchPricing(true),
    isLoadingConfig,
    setContractMonths, 
  };
}
