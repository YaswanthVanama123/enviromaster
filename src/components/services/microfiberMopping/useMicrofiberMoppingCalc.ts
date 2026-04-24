
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  MicrofiberMoppingFormState,
  MicrofiberFrequencyKey,
  MicrofiberMoppingCalcResult,
} from "./microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";


interface BackendMicrofiberConfig {

  includedBathroomRate?: number;
  hugeBathroomPricing?: {
    enabled: boolean;
    ratePerSqFt: number;
    sqFtUnit: number;
    description: string;
  };
  extraAreaPricing?: {
    singleLargeAreaRate: number;
    extraAreaSqFtUnit: number;
    extraAreaRatePerUnit: number;
    useHigherRate: boolean;
  };
  standalonePricing?: {
    standaloneSqFtUnit: number;
    standaloneRatePerUnit: number;
    standaloneMinimum: number;
    includeTripCharge: boolean;
  };
  chemicalProducts?: {
    dailyChemicalPerGallon: number;
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };

  bathroomMoppingPricing?: {
    flatPricePerBathroom: number;
    hugeBathroomSqFtUnit: number;
    hugeBathroomRate: number;
  };
  nonBathroomAddonAreas?: {
    flatPriceSingleLargeArea: number;
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    useHigherRate: boolean;
  };
  standaloneMoppingPricing?: {
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    minimumPrice: number;
    includeTripCharge: boolean;
  };
  tripCharges?: {
    standard: number;
    beltway: number;
  };
  minimumChargePerVisit?: number;
  frequencyMetadata?: any; 
  billingConversions?: {
    oneTime: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    twicePerMonth: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    bimonthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    quarterly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biannual: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    annual: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number;
  };
  rateCategories?: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };
  defaultFrequency?: string;
  allowedFrequencies?: string[];
}

type InputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLSelectElement>;


function mapFrequency(v: string): MicrofiberFrequencyKey {
  if (v === "oneTime" || v === "weekly" || v === "biweekly" || v === "twicePerMonth" ||
      v === "monthly" || v === "everyFourWeeks" || v === "bimonthly" || v === "quarterly" || v === "biannual" || v === "annual") {
    return v;
  }
  return "weekly";
}


function convertFrequencyMetadataToBillingConversions(config: any): BackendMicrofiberConfig {

  if (config.billingConversions) {
    return config as BackendMicrofiberConfig;
  }


  if (config.frequencyMetadata) {
    const freqMeta = config.frequencyMetadata;

    return {
      ...config,
      billingConversions: {
        oneTime: {
          annualMultiplier: 1,
          monthlyMultiplier: 0, 
        },
        weekly: {
          annualMultiplier: 52,
          monthlyMultiplier: freqMeta.weekly?.monthlyRecurringMultiplier ?? 4.33,
        },
        biweekly: {
          annualMultiplier: 26,
          monthlyMultiplier: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 2.165,
        },
        twicePerMonth: {
          annualMultiplier: 24,
          monthlyMultiplier: 2, 
        },
        monthly: {
          annualMultiplier: 12,
          monthlyMultiplier: 1, 
        },
        bimonthly: {
          annualMultiplier: 6,
          monthlyMultiplier: 0.5, 
        },
        quarterly: {
          annualMultiplier: 4,
          monthlyMultiplier: 0, 
        },
        biannual: {
          annualMultiplier: 2,
          monthlyMultiplier: 0, 
        },
        annual: {
          annualMultiplier: 1,
          monthlyMultiplier: 0, 
        },
        actualWeeksPerYear: 52,
        actualWeeksPerMonth: 4.33, 
      },
    } as BackendMicrofiberConfig;
  }


  console.warn('⚠️ Microfiber Mopping config has neither billingConversions nor frequencyMetadata');
  return config as BackendMicrofiberConfig;
}

const DEFAULT_FORM: MicrofiberMoppingFormState = {

  serviceId: "microfiber_mopping",


  frequency: cfg.defaultFrequency,
  contractTermMonths: 36,

  hasExistingSaniService: true,

  bathroomCount: 0,
  isHugeBathroom: false,
  hugeBathroomSqFt: 0,

  extraAreaSqFt: 0,
  useExactExtraAreaSqft: true, 
  standaloneSqFt: 0,
  useExactStandaloneSqft: true, 
  chemicalGallons: 0,

  isAllInclusive: false,

  location: "insideBeltway",
  needsParking: false,


  includedBathroomRate: cfg.includedBathroomRate,
  hugeBathroomRatePerSqFt: cfg.hugeBathroomPricing.ratePerSqFt,
  extraAreaRatePerUnit: cfg.extraAreaPricing.extraAreaRatePerUnit,
  standaloneRatePerUnit: cfg.standalonePricing.standaloneRatePerUnit,
  dailyChemicalPerGallon: cfg.chemicalProducts.dailyChemicalPerGallon,
  applyMinimum: true,
} as MicrofiberMoppingFormState;


export function useMicrofiberMoppingCalc(
  initialData?: unknown,
  customFields?: any[]
): {
  form: MicrofiberMoppingFormState;
  setForm: React.Dispatch<React.SetStateAction<MicrofiberMoppingFormState>>;
  onChange: (ev: InputChangeEvent) => void;
  quote: ServiceQuoteResult;
  calc: MicrofiberMoppingCalcResult;
} {

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

    console.log(`💰 [MICROFIBER-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [MICROFIBER-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<MicrofiberMoppingFormState>(() => {
    const maybe = (initialData as any) || {};
    const initialForm =
      maybe && typeof maybe === "object" && "form" in maybe ? maybe.form : maybe;


    const initialInputCount = (initialForm?.bathroomCount || 0) +
                               (initialForm?.hugeBathroomSqFt || 0) +
                               (initialForm?.extraAreaSqFt || 0) +
                               (initialForm?.standaloneSqFt || 0) +
                               (initialForm?.chemicalGallons || 0);
    const isInitiallyActive = initialInputCount > 0;


    const defaultContractMonths = initialForm?.contractTermMonths
      ? initialForm.contractTermMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : DEFAULT_FORM.contractTermMonths;

    console.log(`📅 [MICROFIBER-INIT] Initializing contract months:`, {
      initialInputCount,
      isInitiallyActive,
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initialForm?.contractTermMonths
    });

    return {
      ...DEFAULT_FORM,
      ...(initialForm as Partial<MicrofiberMoppingFormState>),
      contractTermMonths: defaultContractMonths,
    };
  });


  const [backendConfig, setBackendConfig] = useState<BackendMicrofiberConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const isEditMode = useRef(!!initialData);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);


  const updateFormWithConfig = (config: BackendMicrofiberConfig, forceUpdate: boolean = false) => {


    if (initialData && !forceUpdate) {
      console.log('📋 [MICROFIBER-MOPPING] Edit mode: Skipping form update to preserve loaded values');
      return; 
    }

    console.log('📋 [MICROFIBER-MOPPING] Updating state with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setForm((prev) => ({
      ...prev,


      includedBathroomRate: config.bathroomMoppingPricing?.flatPricePerBathroom ??
                            config.includedBathroomRate ??
                            prev.includedBathroomRate,


      hugeBathroomRatePerSqFt: config.bathroomMoppingPricing?.hugeBathroomRate ??
                                config.hugeBathroomPricing?.ratePerSqFt ??
                                prev.hugeBathroomRatePerSqFt,


      extraAreaRatePerUnit: config.nonBathroomAddonAreas?.ratePerSqFtUnit ??
                            config.extraAreaPricing?.extraAreaRatePerUnit ??
                            prev.extraAreaRatePerUnit,


      standaloneRatePerUnit: config.standaloneMoppingPricing?.ratePerSqFtUnit ??
                             config.standalonePricing?.standaloneRatePerUnit ??
                             prev.standaloneRatePerUnit,


      dailyChemicalPerGallon: config.chemicalProducts?.dailyChemicalPerGallon ??
                               prev.dailyChemicalPerGallon,
    }));
  };


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("microfiberMopping");
        if (backendData?.config) {
          console.log('✅ [Microfiber Mopping] Using cached pricing data from context');
          const config = convertFrequencyMetadataToBillingConversions(backendData.config);
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [MICROFIBER-MOPPING] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,

              customIncludedBathroomRate: undefined,
              customHugeBathroomRatePerSqFt: undefined,
              customExtraAreaRatePerUnit: undefined,
              customStandaloneRatePerUnit: undefined,
              customDailyChemicalPerGallon: undefined,

              customStandardBathroomTotal: undefined,
              customHugeBathroomTotal: undefined,
              customExtraAreaTotal: undefined,
              customStandaloneTotal: undefined,
              customChemicalTotal: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ Microfiber Mopping CONFIG loaded from context:', {
            pricing: {
              bathroomRate: config.includedBathroomRate,
              hugeBathroomRate: config.hugeBathroomPricing?.ratePerSqFt,
              extraAreaRate: config.extraAreaPricing?.extraAreaRatePerUnit,
              standaloneRate: config.standalonePricing?.standaloneRatePerUnit,
              chemicalRate: config.chemicalProducts?.dailyChemicalPerGallon,
            },
            hugeBathroomPricing: config.hugeBathroomPricing,
            extraAreaPricing: config.extraAreaPricing,
            standalonePricing: config.standalonePricing,
            rateCategories: config.rateCategories,
            billingConversions: config.billingConversions,
            allowedFrequencies: config.allowedFrequencies,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for Microfiber Mopping, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch Microfiber Mopping config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("microfiberMopping");
        if (fallbackConfig?.config) {
          console.log('✅ [Microfiber Mopping] Using backend pricing data from context after error');
          const config = convertFrequencyMetadataToBillingConversions(fallbackConfig.config);
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [MICROFIBER-MOPPING] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,

              customIncludedBathroomRate: undefined,
              customHugeBathroomRatePerSqFt: undefined,
              customExtraAreaRatePerUnit: undefined,
              customStandaloneRatePerUnit: undefined,
              customDailyChemicalPerGallon: undefined,

              customStandardBathroomTotal: undefined,
              customHugeBathroomTotal: undefined,
              customExtraAreaTotal: undefined,
              customStandaloneTotal: undefined,
              customChemicalTotal: undefined,
              customPerVisitPrice: undefined,
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

    console.log('📋 [MICROFIBER-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!backendConfig) return;


    if (!baselineInitialized.current) {
      baselineInitialized.current = true;


      baselineValues.current = {
        includedBathroomRate: (initialData as any)?.includedBathroomRate ?? backendConfig.bathroomMoppingPricing?.flatPricePerBathroom ?? backendConfig.includedBathroomRate ?? form.includedBathroomRate,
        hugeBathroomRatePerSqFt: (initialData as any)?.hugeBathroomRatePerSqFt ?? backendConfig.bathroomMoppingPricing?.hugeBathroomRate ?? backendConfig.hugeBathroomPricing?.ratePerSqFt ?? form.hugeBathroomRatePerSqFt,
        extraAreaRatePerUnit: (initialData as any)?.extraAreaRatePerUnit ?? backendConfig.nonBathroomAddonAreas?.ratePerSqFtUnit ?? backendConfig.extraAreaPricing?.extraAreaRatePerUnit ?? form.extraAreaRatePerUnit,
        standaloneRatePerUnit: (initialData as any)?.standaloneRatePerUnit ?? backendConfig.standaloneMoppingPricing?.ratePerSqFtUnit ?? backendConfig.standalonePricing?.standaloneRatePerUnit ?? form.standaloneRatePerUnit,
        dailyChemicalPerGallon: (initialData as any)?.dailyChemicalPerGallon ?? backendConfig.chemicalProducts?.dailyChemicalPerGallon ?? form.dailyChemicalPerGallon,
      };

      console.log('✅ [MICROFIBER-BASELINE] Initialized baseline values for logging (ALL fields):', {
        includedBathroomRate: baselineValues.current.includedBathroomRate,
        hugeBathroomRatePerSqFt: baselineValues.current.hugeBathroomRatePerSqFt,
        extraAreaRatePerUnit: baselineValues.current.extraAreaRatePerUnit,
        standaloneRatePerUnit: baselineValues.current.standaloneRatePerUnit,
        dailyChemicalPerGallon: baselineValues.current.dailyChemicalPerGallon,
        note: initialData ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });


      if (initialData) {
        console.log('🔍 [MICROFIBER-PRICING] Detecting price overrides for yellow highlighting...');

        const initialDataTyped = initialData as any;


        const overrides = {
          customIncludedBathroomRate: (initialDataTyped.includedBathroomRate !== undefined &&
                                       initialDataTyped.includedBathroomRate !== (backendConfig.bathroomMoppingPricing?.flatPricePerBathroom ?? backendConfig.includedBathroomRate))
                                       ? initialDataTyped.includedBathroomRate : undefined,

          customHugeBathroomRatePerSqFt: (initialDataTyped.hugeBathroomRatePerSqFt !== undefined &&
                                          initialDataTyped.hugeBathroomRatePerSqFt !== (backendConfig.bathroomMoppingPricing?.hugeBathroomRate ?? backendConfig.hugeBathroomPricing?.ratePerSqFt))
                                          ? initialDataTyped.hugeBathroomRatePerSqFt : undefined,

          customExtraAreaRatePerUnit: (initialDataTyped.extraAreaRatePerUnit !== undefined &&
                                       initialDataTyped.extraAreaRatePerUnit !== (backendConfig.nonBathroomAddonAreas?.ratePerSqFtUnit ?? backendConfig.extraAreaPricing?.extraAreaRatePerUnit))
                                       ? initialDataTyped.extraAreaRatePerUnit : undefined,

          customStandaloneRatePerUnit: (initialDataTyped.standaloneRatePerUnit !== undefined &&
                                        initialDataTyped.standaloneRatePerUnit !== (backendConfig.standaloneMoppingPricing?.ratePerSqFtUnit ?? backendConfig.standalonePricing?.standaloneRatePerUnit))
                                        ? initialDataTyped.standaloneRatePerUnit : undefined,

          customDailyChemicalPerGallon: (initialDataTyped.dailyChemicalPerGallon !== undefined &&
                                         initialDataTyped.dailyChemicalPerGallon !== backendConfig.chemicalProducts?.dailyChemicalPerGallon)
                                         ? initialDataTyped.dailyChemicalPerGallon : undefined,
        };


        const hasAnyOverrides = Object.values(overrides).some(v => v !== undefined);

        if (hasAnyOverrides) {
          setForm(prev => ({
            ...prev,
            ...overrides, 
          }));

          console.log('✅ [MICROFIBER-PRICING] Set custom override fields for yellow highlighting:',
            Object.fromEntries(
              Object.entries(overrides).filter(([_, value]) => value !== undefined)
            )
          );
        } else {
          console.log('ℹ️ [MICROFIBER-PRICING] No price overrides detected - using backend defaults');
        }
      }
    }
  }, [backendConfig, initialData]);


  useEffect(() => {

    if (initialData) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);


  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(() => {
    const inputCount = form.bathroomCount + form.hugeBathroomSqFt +
                       form.extraAreaSqFt + form.standaloneSqFt + form.chemicalGallons;
    return inputCount > 0;
  });

  useEffect(() => {
    const inputCount = form.bathroomCount + form.hugeBathroomSqFt +
                       form.extraAreaSqFt + form.standaloneSqFt + form.chemicalGallons;
    const isServiceActive = inputCount > 0;
    const wasActive = wasActiveRef.current();
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {

      console.log(`📅 [MICROFIBER-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [MICROFIBER-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractTermMonths: globalMonths }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {

      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractTermMonths !== globalMonths) {
        console.log(`📅 [MICROFIBER-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractTermMonths: globalMonths }));
      }
    }


    wasActiveRef.current = () => isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractTermMonths,
      form.bathroomCount, form.hugeBathroomSqFt, form.extraAreaSqFt,
      form.standaloneSqFt, form.chemicalGallons, servicesContext]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({ ...prev, contractTermMonths: months }));
    console.log(`📅 [MICROFIBER-CONTRACT] User override: ${months} months`);
  }, []);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `microfiberMopping_${fieldName}`,
      productName: `Microfiber Mopping - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: (form.bathroomCount + form.hugeBathroomSqFt + form.extraAreaSqFt + form.standaloneSqFt) || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [MICROFIBER-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.frequency, form.bathroomCount, form.hugeBathroomSqFt, form.extraAreaSqFt, form.standaloneSqFt]);

  const onChange = (ev: InputChangeEvent) => {
    const target = ev.target as HTMLInputElement;
    const { name, type, value, checked } = target;

    setForm((prev) => {

      const originalValue = prev[name as keyof MicrofiberMoppingFormState];

      let nextValue: unknown = value;

      if (type === "checkbox") {
        nextValue = checked;
      } else if (

        name === "customIncludedBathroomRate" ||
        name === "customHugeBathroomRatePerSqFt" ||
        name === "customExtraAreaRatePerUnit" ||
        name === "customStandaloneRatePerUnit" ||
        name === "customDailyChemicalPerGallon" ||
        name === "customStandardBathroomTotal" ||
        name === "customHugeBathroomTotal" ||
        name === "customExtraAreaTotal" ||
        name === "customStandaloneTotal" ||
        name === "customChemicalTotal" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyRecurring" ||
        name === "customFirstMonthPrice" ||
        name === "customContractTotal"
      ) {
        if (value === '') {
          nextValue = undefined;
        } else {
          const numVal = parseFloat(value);
          if (!isNaN(numVal)) {
            nextValue = numVal;
          } else {
            return prev; 
          }
        }
      } else if (type === "number") {
        const raw = value.trim();
        if (raw === "") {
          nextValue = 0;
        } else {
          const num = Number(raw);
          nextValue = Number.isFinite(num) && num >= 0 ? num : 0;
        }
      }

      const next: MicrofiberMoppingFormState = {
        ...prev,
        [name]: nextValue as any,
      };


      if (name === "hugeBathroomSqFt") {
        const sq = Number(nextValue) || 0;
        if (sq > 0) {
          next.bathroomCount = 0;
          next.isHugeBathroom = true;
        } else if (sq === 0) {
          next.isHugeBathroom = false;
        }
      }

      if (name === "isHugeBathroom" && nextValue === true) {
        next.bathroomCount = 0;
      }


      const baseEditableFields = [
        'includedBathroomRate', 'hugeBathroomRatePerSqFt', 'extraAreaRatePerUnit',
        'standaloneRatePerUnit', 'dailyChemicalPerGallon'
      ];


      const customRateOverrideFields = [
        'customIncludedBathroomRate', 'customHugeBathroomRatePerSqFt',
        'customExtraAreaRatePerUnit', 'customStandaloneRatePerUnit', 'customDailyChemicalPerGallon'
      ];


      const customTotalOverrideFields = [
        'customStandardBathroomTotal', 'customHugeBathroomTotal', 'customExtraAreaTotal',
        'customStandaloneTotal', 'customChemicalTotal', 'customPerVisitPrice',
        'customMonthlyRecurring', 'customFirstMonthPrice', 'customContractTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customRateOverrideFields, ...customTotalOverrideFields];


      const customToBaseFieldMap: Record<string, string> = {
        'customIncludedBathroomRate': 'includedBathroomRate',
        'customHugeBathroomRatePerSqFt': 'hugeBathroomRatePerSqFt',
        'customExtraAreaRatePerUnit': 'extraAreaRatePerUnit',
        'customStandaloneRatePerUnit': 'standaloneRatePerUnit',
        'customDailyChemicalPerGallon': 'dailyChemicalPerGallon',
        'customStandardBathroomTotal': 'includedBathroomRate',
        'customHugeBathroomTotal': 'hugeBathroomRatePerSqFt',
        'customExtraAreaTotal': 'extraAreaRatePerUnit',
        'customStandaloneTotal': 'standaloneRatePerUnit',
        'customChemicalTotal': 'dailyChemicalPerGallon',
        'customPerVisitPrice': 'includedBathroomRate',
        'customMonthlyRecurring': 'includedBathroomRate',
        'customFirstMonthPrice': 'includedBathroomRate',
        'customContractTotal': 'includedBathroomRate',
      };

      if (allPricingFields.includes(name)) {
        const newValue = nextValue as number | undefined;
        const keyStr = name;


        const baseFieldForLookup = customToBaseFieldMap[keyStr] || keyStr;
        const baselineValue = baselineValues.current[baseFieldForLookup];

        console.log(`🔍 [MICROFIBER-LOGGING] Field: ${keyStr}`, {
          newValue,
          baseFieldForLookup,
          baselineValue,
          isCustomField: keyStr.startsWith('custom'),
        });


        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          console.log(`📝 [MICROFIBER-BASELINE-LOG] Logging change for ${keyStr}:`, {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
            changePercent: ((newValue - baselineValue) / baselineValue * 100).toFixed(1) + '%'
          });
          addServiceFieldChange(keyStr, baselineValue, newValue);
        } else {
          console.log(`⚠️ [MICROFIBER-LOGGING] NOT logging for ${keyStr}:`, {
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

        'bathrooms', 'hugeSqFtPerBathroom', 'contractMonths',

        'frequency', 'rateTier'
      ];


      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          'microfiberMopping',
          'Microfiber Mopping',
          { [name]: next[name as keyof MicrofiberMoppingFormState] },
          { [name]: originalValue },
          [name],
          next.bathrooms || 1,
          next.frequency || 'weekly'
        );
      }

      return next;
    });
  };

  const { calc, quote } = useMemo(() => {


    const activeConfig = {

      includedBathroomRate: backendConfig?.bathroomMoppingPricing?.flatPricePerBathroom ??
                            backendConfig?.includedBathroomRate ??
                            cfg.includedBathroomRate,


      hugeBathroomPricing: {
        enabled: true, 
        ratePerSqFt: backendConfig?.bathroomMoppingPricing?.hugeBathroomRate ??
                     backendConfig?.hugeBathroomPricing?.ratePerSqFt ??
                     cfg.hugeBathroomPricing.ratePerSqFt,
        sqFtUnit: backendConfig?.bathroomMoppingPricing?.hugeBathroomSqFtUnit ??
                  backendConfig?.hugeBathroomPricing?.sqFtUnit ??
                  cfg.hugeBathroomPricing.sqFtUnit,
        description: backendConfig?.hugeBathroomPricing?.description ?? cfg.hugeBathroomPricing.description,
      },


      extraAreaPricing: {
        singleLargeAreaRate: backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
                             backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
                             cfg.extraAreaPricing.singleLargeAreaRate,
        extraAreaSqFtUnit: backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
                           backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
                           cfg.extraAreaPricing.extraAreaSqFtUnit,
        extraAreaRatePerUnit: backendConfig?.nonBathroomAddonAreas?.ratePerSqFtUnit ??
                              backendConfig?.extraAreaPricing?.extraAreaRatePerUnit ??
                              cfg.extraAreaPricing.extraAreaRatePerUnit,
        useHigherRate: backendConfig?.nonBathroomAddonAreas?.useHigherRate ??
                       backendConfig?.extraAreaPricing?.useHigherRate ??
                       cfg.extraAreaPricing.useHigherRate,
      },


      standalonePricing: {
        standaloneSqFtUnit: backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
                            backendConfig?.standalonePricing?.standaloneSqFtUnit ??
                            cfg.standalonePricing.standaloneSqFtUnit,
        standaloneRatePerUnit: backendConfig?.standaloneMoppingPricing?.ratePerSqFtUnit ??
                               backendConfig?.standalonePricing?.standaloneRatePerUnit ??
                               cfg.standalonePricing.standaloneRatePerUnit,
        standaloneMinimum: backendConfig?.standaloneMoppingPricing?.minimumPrice ??
                           backendConfig?.minimumChargePerVisit ??
                           backendConfig?.standalonePricing?.standaloneMinimum ??
                           cfg.standalonePricing.standaloneMinimum,
        includeTripCharge: backendConfig?.standaloneMoppingPricing?.includeTripCharge ??
                           backendConfig?.standalonePricing?.includeTripCharge ??
                           cfg.standalonePricing.includeTripCharge,
      },


      chemicalProducts: backendConfig?.chemicalProducts ?? cfg.chemicalProducts,


      billingConversions: backendConfig?.billingConversions ?? cfg.billingConversions,


      rateCategories: backendConfig?.rateCategories ?? cfg.rateCategories,


      defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
      allowedFrequencies: backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies,


      minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? cfg.minimumChargePerVisit,
    };

    const freq: MicrofiberFrequencyKey = mapFrequency(form.frequency ?? activeConfig.defaultFrequency);


    const conv = activeConfig.billingConversions[freq] || activeConfig.billingConversions.weekly;


    const effectiveIncludedBathroomRate = form.customIncludedBathroomRate ?? form.includedBathroomRate;
    const effectiveHugeBathroomRatePerSqFt = form.customHugeBathroomRatePerSqFt ?? form.hugeBathroomRatePerSqFt;
    const effectiveExtraAreaRatePerUnit = form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit;
    const effectiveStandaloneRatePerUnit = form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit;
    const effectiveDailyChemicalPerGallon = form.customDailyChemicalPerGallon ?? form.dailyChemicalPerGallon;

    console.log('🔧 [MICROFIBER-CALC] Using effective values:', {
      effectiveIncludedBathroomRate,
      effectiveHugeBathroomRatePerSqFt,
      effectiveExtraAreaRatePerUnit,
      effectiveStandaloneRatePerUnit,
      effectiveDailyChemicalPerGallon,
    });

    const { actualWeeksPerYear, actualWeeksPerMonth } = activeConfig.billingConversions;
    const isAllInclusive = !!form.isAllInclusive;


    const bathroomCount = Number(form.bathroomCount) || 0;
    const hugeBathroomSqFt = Number(form.hugeBathroomSqFt) || 0;
    const extraAreaSqFt = Number(form.extraAreaSqFt) || 0;
    const standaloneSqFt = Number(form.standaloneSqFt) || 0;
    const chemicalGallons = Number(form.chemicalGallons) || 0;

    const isServiceInactive = bathroomCount === 0 && hugeBathroomSqFt === 0 &&
                              extraAreaSqFt === 0 && standaloneSqFt === 0 &&
                              chemicalGallons === 0;

    if (isServiceInactive) {
      console.log('📊 [Microfiber Mopping] Service is inactive (no inputs), returning $0 totals');
      return {
        calc: {
          bathroomPrice: 0,
          extraAreaPrice: 0,
          standaloneTotal: 0,
          chemicalSupplyMonthly: 0,
          perVisitPrice: 0,
          monthlyRecurring: 0,
          firstMonthPrice: 0,
          contractTotal: 0,
          originalContractTotal: 0,
          minimumChargePerVisit: 0,
          isVisitBasedFrequency: false,
          monthsPerVisit: 1,
        },
        quote: {
          serviceId: "microfiberMopping",
          displayName: "Microfiber Mopping",
          perVisit: 0,
          monthly: 0,
          annual: 0,
        },
      };
    }


    let calculatedStandardBathroomPrice = 0;
    let calculatedHugeBathroomPrice = 0;

    if (!isAllInclusive && form.hasExistingSaniService) {
      const standardBathCount = Math.max(0, Number(form.bathroomCount) || 0);


      if (standardBathCount > 0) {
        calculatedStandardBathroomPrice =
          standardBathCount * effectiveIncludedBathroomRate;  
      }


      const hugeSqFt = Math.max(0, Number(form.hugeBathroomSqFt) || 0);
      if (
        form.isHugeBathroom &&
        activeConfig.hugeBathroomPricing.enabled &&  
        hugeSqFt > 0
      ) {
        const units = Math.ceil(
          hugeSqFt / activeConfig.hugeBathroomPricing.sqFtUnit  
        );
        calculatedHugeBathroomPrice =
          units * effectiveHugeBathroomRatePerSqFt;  
      }
    }


    const standardBathroomPrice = form.customStandardBathroomTotal !== undefined
      ? form.customStandardBathroomTotal
      : calculatedStandardBathroomPrice;

    const hugeBathroomPrice = form.customHugeBathroomTotal !== undefined
      ? form.customHugeBathroomTotal
      : calculatedHugeBathroomPrice;

    const bathroomPrice = standardBathroomPrice + hugeBathroomPrice;


    let calculatedExtraAreaPrice = 0;

    if (!isAllInclusive && form.extraAreaSqFt > 0) {
      const unitSqFt = activeConfig.extraAreaPricing.extraAreaSqFtUnit; 
      const firstUnitRate = activeConfig.extraAreaPricing.singleLargeAreaRate; 
      const additionalUnitRate = effectiveExtraAreaRatePerUnit;  

      if (form.useExactExtraAreaSqft) {


        const unitsInMinimum = Math.floor(firstUnitRate / additionalUnitRate); 
        const minimumCoverageSqFt = unitsInMinimum * unitSqFt; 

        if (form.extraAreaSqFt <= minimumCoverageSqFt) {

          calculatedExtraAreaPrice = firstUnitRate;
        } else {


          const totalUnits = Math.ceil(form.extraAreaSqFt / unitSqFt);
          calculatedExtraAreaPrice = totalUnits * additionalUnitRate;
        }
      } else {

        const minimumUnits = Math.floor(firstUnitRate / additionalUnitRate); 
        const minimumCoverageSqFt = minimumUnits * unitSqFt; 

        if (form.extraAreaSqFt <= minimumCoverageSqFt) {

          calculatedExtraAreaPrice = firstUnitRate;
        } else {

          const extraSqFt = form.extraAreaSqFt - minimumCoverageSqFt; 
          const ratePerSqFt = additionalUnitRate / unitSqFt; 
          calculatedExtraAreaPrice = firstUnitRate + (extraSqFt * ratePerSqFt);
        }
      }


      if (activeConfig.extraAreaPricing.useHigherRate) {
        calculatedExtraAreaPrice = Math.max(calculatedExtraAreaPrice, firstUnitRate);
      }
    }


    const extraAreaPrice = form.customExtraAreaTotal !== undefined
      ? form.customExtraAreaTotal
      : calculatedExtraAreaPrice;


    let calculatedStandaloneServicePrice = 0;
    let standaloneTripCharge = 0;
    let calculatedStandaloneTotal = 0;

    if (!isAllInclusive && form.standaloneSqFt > 0) {
      const unitSqFt = activeConfig.standalonePricing.standaloneSqFtUnit; 
      const minimumRate = activeConfig.standalonePricing.standaloneMinimum; 
      const additionalUnitRate = effectiveStandaloneRatePerUnit;  

      if (form.useExactStandaloneSqft) {


        const unitsInMinimum = Math.floor(minimumRate / additionalUnitRate); 
        const minimumCoverageSqFt = unitsInMinimum * unitSqFt; 

        if (form.standaloneSqFt <= minimumCoverageSqFt) {

          calculatedStandaloneServicePrice = minimumRate;
        } else {


          const totalUnits = Math.ceil(form.standaloneSqFt / unitSqFt);
          calculatedStandaloneServicePrice = totalUnits * additionalUnitRate;
        }
      } else {

        const minimumUnits = Math.floor(minimumRate / additionalUnitRate); 
        const minimumCoverageSqFt = minimumUnits * unitSqFt; 

        if (form.standaloneSqFt <= minimumCoverageSqFt) {

          calculatedStandaloneServicePrice = minimumRate;
        } else {

          const extraSqFt = form.standaloneSqFt - minimumCoverageSqFt; 
          const ratePerSqFt = additionalUnitRate / unitSqFt; 
          calculatedStandaloneServicePrice = minimumRate + (extraSqFt * ratePerSqFt);
        }
      }


      standaloneTripCharge = 0;
      calculatedStandaloneTotal = calculatedStandaloneServicePrice;
    }


    const standaloneServicePrice = form.customStandaloneTotal !== undefined
      ? form.customStandaloneTotal
      : calculatedStandaloneServicePrice;

    const standaloneTotal = standaloneServicePrice;


    const calculatedChemicalSupplyMonthly =
      form.chemicalGallons > 0
        ? form.chemicalGallons * effectiveDailyChemicalPerGallon  
        : 0;


    const chemicalSupplyMonthly = form.customChemicalTotal !== undefined
      ? form.customChemicalTotal
      : calculatedChemicalSupplyMonthly;


    const calculatedPerVisitServiceTotal =
      bathroomPrice + extraAreaPrice + standaloneTotal;


    const minimumChargePerVisit = activeConfig.minimumChargePerVisit;
    const calculatedPerVisitWithMinimum = form.applyMinimum !== false ? Math.max(calculatedPerVisitServiceTotal, minimumChargePerVisit) : calculatedPerVisitServiceTotal;


    const perVisitPrice = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitWithMinimum;


    const isVisitBasedFrequency = freq === "oneTime" || freq === "quarterly" ||
      freq === "biannual" || freq === "annual" || freq === "bimonthly" || freq === "everyFourWeeks";

    const monthlyVisits = conv.monthlyMultiplier; 
    const calculatedMonthlyService = perVisitPrice * monthlyVisits;
    const calculatedMonthlyRecurring = calculatedMonthlyService + chemicalSupplyMonthly;


    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;


    const installFee = 0;
    const firstVisitPrice = installFee; 


    let calculatedFirstMonthPrice = 0;
    if (isVisitBasedFrequency) {

      calculatedFirstMonthPrice = perVisitPrice;
    } else {

      const calculatedFirstMonthService = Math.max(monthlyVisits, 0) * perVisitPrice;
      calculatedFirstMonthPrice = firstVisitPrice + calculatedFirstMonthService + chemicalSupplyMonthly;
    }


    const firstMonthPrice = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthPrice;


    let contractMonths = Number(form.contractTermMonths) || 0;
    if (contractMonths < 2) contractMonths = 2;
    if (contractMonths > 36) contractMonths = 36;


    let calculatedContractTotal = 0;
    if (freq === "oneTime") {

      calculatedContractTotal = firstMonthPrice;
    } else if (isVisitBasedFrequency) {

      const visitsPerYear = conv.annualMultiplier ?? 1;
      const totalVisits = (contractMonths / 12) * visitsPerYear;


      calculatedContractTotal = totalVisits * perVisitPrice + (contractMonths * (chemicalSupplyMonthly / monthlyVisits || 0));
    } else {

      const remainingMonths = Math.max(contractMonths - 1, 0);
      calculatedContractTotal = firstMonthPrice + remainingMonths * monthlyRecurring;
    }


    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [MICROFIBER-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });


    const annualPrice = monthlyRecurring * 12;

    const weeklyServiceTotal =
      calculatedMonthlyService / (actualWeeksPerMonth || 4.33);
    const weeklyTotalWithChemicals =
      annualPrice / actualWeeksPerYear;

    const calc: MicrofiberMoppingCalcResult = {
      standardBathroomPrice,
      hugeBathroomPrice,
      bathroomPrice,
      extraAreaPrice,
      standaloneServicePrice,
      standaloneTripCharge,
      standaloneTotal,
      chemicalSupplyMonthly,
      weeklyServiceTotal,
      weeklyTotalWithChemicals,
      perVisitPrice,
      annualPrice,
      monthlyRecurring,
      firstVisitPrice,
      firstMonthPrice,
      contractMonths,
      contractTotal: contractTotalWithCustomFields,  
      originalContractTotal: (() => {

        const baselineBathroomRate = activeConfig.includedBathroomRate;
        const baselineExtraAreaRatePerUnit = activeConfig.extraAreaPricing.extraAreaRatePerUnit;
        const baselineStandaloneRatePerUnit = activeConfig.standalonePricing.standaloneRatePerUnit;

        let baselineStandardBathroom = 0;
        if (!isAllInclusive && form.hasExistingSaniService && bathroomCount > 0) {
          baselineStandardBathroom = bathroomCount * baselineBathroomRate;
        }
        let baselineHugeBathroom = 0;
        if (!isAllInclusive && form.hasExistingSaniService && form.isHugeBathroom && activeConfig.hugeBathroomPricing.enabled && hugeBathroomSqFt > 0) {
          const units = Math.ceil(hugeBathroomSqFt / activeConfig.hugeBathroomPricing.sqFtUnit);
          baselineHugeBathroom = units * activeConfig.hugeBathroomPricing.ratePerSqFt;
        }

        let baselineExtraArea = 0;
        if (!isAllInclusive && extraAreaSqFt > 0) {
          const unitSqFt = activeConfig.extraAreaPricing.extraAreaSqFtUnit;
          const firstUnitRate = activeConfig.extraAreaPricing.singleLargeAreaRate;
          const unitsInMinimum = Math.floor(firstUnitRate / baselineExtraAreaRatePerUnit);
          const minimumCoverageSqFt = unitsInMinimum * unitSqFt;
          if (extraAreaSqFt <= minimumCoverageSqFt) {
            baselineExtraArea = firstUnitRate;
          } else {
            const totalUnits = Math.ceil(extraAreaSqFt / unitSqFt);
            baselineExtraArea = totalUnits * baselineExtraAreaRatePerUnit;
          }
        }

        let baselineStandalone = 0;
        if (!isAllInclusive && standaloneSqFt > 0) {
          const unitSqFt = activeConfig.standalonePricing.standaloneSqFtUnit;
          const minimumRate = activeConfig.standalonePricing.standaloneMinimum;
          const unitsInMinimum = Math.floor(minimumRate / baselineStandaloneRatePerUnit);
          const minimumCoverageSqFt = unitsInMinimum * unitSqFt;
          if (standaloneSqFt <= minimumCoverageSqFt) {
            baselineStandalone = minimumRate;
          } else {
            const totalUnits = Math.ceil(standaloneSqFt / unitSqFt);
            baselineStandalone = totalUnits * baselineStandaloneRatePerUnit;
          }
        }

        const baselineRaw = baselineStandardBathroom + baselineHugeBathroom + baselineExtraArea + baselineStandalone;
        const baselinePerVisit = form.applyMinimum !== false ? Math.max(baselineRaw, minimumChargePerVisit) : baselineRaw;
        const baselineMonthlyService = baselinePerVisit * monthlyVisits;

        let baselineContractTotal = 0;
        if (freq === "oneTime") {
          baselineContractTotal = baselinePerVisit;
        } else if (isVisitBasedFrequency) {
          const visitsPerYear = conv.annualMultiplier ?? 1;
          const totalVisits = (contractMonths / 12) * visitsPerYear;
          baselineContractTotal = totalVisits * baselinePerVisit;
        } else {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          baselineContractTotal = baselineMonthlyService + remainingMonths * baselineMonthlyService;
        }
        return baselineContractTotal;
      })(),
      minimumChargePerVisit,
    };

    const quote: ServiceQuoteResult = {
      ...(calc as any),
      serviceId: (form as any).serviceId ?? cfg.serviceType,
      serviceKey: "microfiberMopping",
      serviceLabel: "Microfiber Mopping",
      frequency: freq,
      perVisit: perVisitPrice,
      monthly: monthlyRecurring,
    } as unknown as ServiceQuoteResult;

    return { calc, quote };
  }, [
    backendConfig,  
    form,

    calcFieldsTotal,
    dollarFieldsTotal,

    form.customIncludedBathroomRate,
    form.customHugeBathroomRatePerSqFt,
    form.customExtraAreaRatePerUnit,
    form.customStandaloneRatePerUnit,
    form.customDailyChemicalPerGallon,
  ]);

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
    refreshConfig: () => fetchPricing(true), 
    isLoadingConfig,

    activeConfig: {
      extraAreaPricing: {
        singleLargeAreaRate: backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
                             backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
                             cfg.extraAreaPricing.singleLargeAreaRate,
        extraAreaSqFtUnit: backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
                           backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
                           cfg.extraAreaPricing.extraAreaSqFtUnit,
      },
      standalonePricing: {
        standaloneSqFtUnit: backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
                            backendConfig?.standalonePricing?.standaloneSqFtUnit ??
                            cfg.standalonePricing.standaloneSqFtUnit,
        standaloneMinimum: backendConfig?.standaloneMoppingPricing?.minimumPrice ??
                           backendConfig?.minimumChargePerVisit ??
                           backendConfig?.standalonePricing?.standaloneMinimum ??
                           cfg.standalonePricing.standaloneMinimum,
      },
    },
    setContractMonths, 
  };
}
