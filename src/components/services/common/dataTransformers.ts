// src/components/services/common/dataTransformers.ts
/**
 * Transforms structured service data (from backend/saved PDF) back into form state
 * that the service forms can use to initialize their fields.
 */

import {
  parseRefreshPowerScrubDraftPayload,
  REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID,
} from "../refreshPowerScrub/refreshPowerScrubDraftPayload";
import { type RefreshFrequency } from "../refreshPowerScrub/refreshPowerScrubTypes";

/**
 * Helper function to extract and format custom fields for all services
 */
function extractCustomFields(structuredData: any): any[] {
  if (structuredData.customFields && Array.isArray(structuredData.customFields)) {
    console.log('🔄 Processing custom fields for reverse mapping:', structuredData.customFields);
    const customFields = structuredData.customFields.map((field: any) => {
      const baseField = {
        id: field.id || Date.now().toString(),
        type: field.type || 'text',
        name: field.name || field.label || 'Custom Field',
        label: field.label || field.name || 'Custom Field',
      };

      // Handle calc fields with calcValues
      if (field.type === 'calc' && field.calcValues) {
        return {
          ...baseField,
          calcValues: {
            left: field.calcValues.left || '',
            middle: field.calcValues.middle || '',
            right: field.calcValues.right || ''
          }
        };
      } else {
        // Handle text and dollar fields with value
        return {
          ...baseField,
          value: field.value || ''
        };
      }
    });
    console.log(`  ✅ Custom Fields mapped: ${customFields.length} found`);
    return customFields;
  } else {
    console.log('  ⚠️ No custom fields found in structured data');
    return [];
  }
}

const parseDraftPayloadFromCustomFields = (structuredData: any) => {
  const fields = structuredData.customFields;
  if (!Array.isArray(fields)) return undefined;

  const draftField = fields.find(
    (field: any) =>
      (field?.id && field.id === REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID) ||
      (field?.name && field.name === REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID)
  );

  if (!draftField || !draftField.value) return undefined;

  try {
    const value =
      typeof draftField.value === "string"
        ? JSON.parse(draftField.value)
        : draftField.value;
    return parseRefreshPowerScrubDraftPayload(value);
  } catch (err) {
    console.warn("Failed to parse refresh power scrub draft custom field:", err);
    return undefined;
  }
};

function normalizeStructuredValue(rawValue: any): any {
  if (rawValue === undefined || rawValue === null) return undefined;
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== "object") return rawValue;
  if ("value" in rawValue) {
    return normalizeStructuredValue(rawValue.value);
  }
  if ("amount" in rawValue) {
    return normalizeStructuredValue(rawValue.amount);
  }
  if ("qty" in rawValue) {
    return normalizeStructuredValue(rawValue.qty);
  }
  return rawValue;
}

const REFRESH_AREA_KEYS = ["dumpster", "patio", "walkway", "foh", "boh", "other"];

const REFRESH_FALLBACKS = {
  hourlyRate: 200,
  workerRate: 200,
  perHourRate: 400,
  minimumVisit: 400,
  tripCharge: 75,
  insideRate: 0.6,
  outsideRate: 0.4,
  sqFtFixedFee: 200,
  patioStandalone: 800,
  patioUpsell: 500,
};

const normalizeFrequencyLabel = (raw?: string): RefreshFrequency | undefined => {
  if (!raw) return undefined;
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  switch (cleaned) {
    case "onetime":
    case "1time":
      return "oneTime";
    case "weekly":
      return "weekly";
    case "biweekly":
      return "biweekly";
    case "twicepermonth":
    case "2permonth":
    case "2month":
    case "2xmonth":
      return "twicePerMonth";
    case "monthly":
      return "monthly";
    case "bimonthly":
      return "bimonthly";
    case "quarterly":
      return "quarterly";
    case "biannual":
      return "biannual";
    case "annual":
      return "annual";
    default:
      return undefined;
  }
};

const deriveFrequencyFromServices = (structuredData: any): RefreshFrequency | undefined => {
  const explicit = structuredData.frequency && normalizeFrequencyLabel(structuredData.frequency);
  if (explicit) return explicit;

  if (structuredData.services) {
    for (const areaRecord of Object.values(structuredData.services)) {
      const label =
        areaRecord?.frequency?.value ||
        areaRecord?.frequencyLabel ||
        areaRecord?.frequency;
      const normalized = normalizeFrequencyLabel(label);
      if (normalized) return normalized;
    }
  }

  return undefined;
};

const createRefreshAreaTemplate = () => ({
  enabled: false,
  pricingType: "preset",
  workers: 2,
  hours: 0,
  hourlyRate: REFRESH_FALLBACKS.perHourRate,
  workerRate: REFRESH_FALLBACKS.workerRate,
  insideSqFt: 0,
  outsideSqFt: 0,
  insideRate: REFRESH_FALLBACKS.insideRate,
  outsideRate: REFRESH_FALLBACKS.outsideRate,
  sqFtFixedFee: REFRESH_FALLBACKS.sqFtFixedFee,
  customAmount: 0,
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
  presetQuantity: 1,
  presetRate: undefined,
  kitchenSize: "smallMedium",
  smallMediumQuantity: 0,
  smallMediumRate: undefined,
  smallMediumCustomAmount: 0,
  largeQuantity: 0,
  largeRate: undefined,
  largeCustomAmount: 0,
  patioMode: "standalone",
  includePatioAddon: false,
  patioAddonRate: undefined,
  frequencyLabel: "",
  contractMonths: 12,
});

const mergeRefreshAreaState = (data: any = {}) => ({
  ...createRefreshAreaTemplate(),
  ...data,
});

export function transformRpmWindowsData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract top-level direct fields (saved from form)
  if (structuredData.smallWindowRate !== undefined) {
    formState.smallWindowRate = structuredData.smallWindowRate;
  }
  if (structuredData.mediumWindowRate !== undefined) {
    formState.mediumWindowRate = structuredData.mediumWindowRate;
  }
  if (structuredData.largeWindowRate !== undefined) {
    formState.largeWindowRate = structuredData.largeWindowRate;
  }
  if (structuredData.tripCharge !== undefined) {
    formState.tripCharge = structuredData.tripCharge;
  }
  if (structuredData.installMultiplierFirstTime !== undefined) {
    formState.installMultiplierFirstTime = structuredData.installMultiplierFirstTime;
  }
  if (structuredData.installMultiplierClean !== undefined) {
    formState.installMultiplierClean = structuredData.installMultiplierClean;
  }
  if (structuredData.contractMonths !== undefined) {
    formState.contractMonths = structuredData.contractMonths;
  }
  if (structuredData.customSmallTotal !== undefined) {
    formState.customSmallTotal = structuredData.customSmallTotal;
  }
  if (structuredData.customMediumTotal !== undefined) {
    formState.customMediumTotal = structuredData.customMediumTotal;
  }
  if (structuredData.customLargeTotal !== undefined) {
    formState.customLargeTotal = structuredData.customLargeTotal;
  }
  if (structuredData.customInstallationFee !== undefined) {
    formState.customInstallationFee = structuredData.customInstallationFee;
  }
  if (structuredData.customPerVisitPrice !== undefined) {
    formState.customPerVisitPrice = structuredData.customPerVisitPrice;
  }
  if (structuredData.customFirstMonthTotal !== undefined) {
    formState.customFirstMonthTotal = structuredData.customFirstMonthTotal;
  }
  if (structuredData.customMonthlyRecurring !== undefined) {
    formState.customMonthlyRecurring = structuredData.customMonthlyRecurring;
  }
  if (structuredData.customAnnualPrice !== undefined) {
    formState.customAnnualPrice = structuredData.customAnnualPrice;
  }
  if (structuredData.customContractTotal !== undefined) {
    formState.customContractTotal = structuredData.customContractTotal;
  }

  // Extract quantities from windows array (✅ FIXED: Extract both quantities AND rates)
  if (structuredData.windows && Array.isArray(structuredData.windows)) {
    structuredData.windows.forEach((window: any) => {
      if (window.label === "Small Windows") {
        formState.smallQty = window.qty || 0;
        if (window.rate !== undefined && window.rate !== null) {
          formState.smallWindowRate = window.rate; // ✅ Preserve saved rate
        }
      } else if (window.label === "Medium Windows") {
        formState.mediumQty = window.qty || 0;
        if (window.rate !== undefined && window.rate !== null) {
          formState.mediumWindowRate = window.rate; // ✅ Preserve saved rate
        }
      } else if (window.label === "Large Windows") {
        formState.largeQty = window.qty || 0;
        if (window.rate !== undefined && window.rate !== null) {
          formState.largeWindowRate = window.rate; // ✅ Preserve saved rate
        }
      }
    });
  }

  // ✅ FIXED: Only set custom installation fee if it was actually overridden
  // Don't set custom fields for normal calculated values
  if (structuredData.installationFee?.amount != null && structuredData.installationFee?.isCustom === true) {
    formState.customInstallationFee = structuredData.installationFee.amount;
  }

  // Extract install type
  if (structuredData.installType) {
    formState.isFirstTimeInstall = structuredData.installType.value?.includes("First Time");
  }

  // Extract frequency
  if (structuredData.serviceFrequency) {
    const freq = structuredData.serviceFrequency.value?.toLowerCase();
    formState.frequency = freq || "weekly";
  }

  // Extract mirror cleaning
  if (structuredData.mirrorCleaning) {
    formState.includeMirrors = structuredData.mirrorCleaning.value?.includes("Include");
  }

  // Extract rate category
  if (structuredData.rateCategory) {
    formState.selectedRateCategory = structuredData.rateCategory.value?.includes("Green") ? "greenRate" : "redRate";
  }

  // Extract extra charges
  if (structuredData.extraCharges && Array.isArray(structuredData.extraCharges)) {
    formState.extraCharges = structuredData.extraCharges.map((charge: any, index: number) => ({
      id: Date.now() + index,
      description: charge.label || "",
      amount: charge.amount || 0,
      calcText: "",
    }));
  }

  // ✅ FIXED: Don't automatically set custom override fields for calculated totals
  // Only set them if they were explicitly marked as custom overrides
  if (structuredData.totals) {
    // Only set custom fields if they were actually overridden by the user
    if (structuredData.totals.perVisit?.isCustom === true) {
      formState.customPerVisitPrice = structuredData.totals.perVisit.amount;
    }
    if (structuredData.totals.monthlyRecurring?.isCustom === true) {
      formState.customMonthlyRecurring = structuredData.totals.monthlyRecurring.amount;
    }
    if (structuredData.totals.annual) {
      formState.contractMonths = structuredData.totals.annual.months || 12;
      if (structuredData.totals.annual?.isCustom === true) {
        formState.customAnnualPrice = structuredData.totals.annual.amount;
      }
    }
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformSanicleanData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract pricing mode (fallback for older structured field formats)
  if (formState.pricingMode === undefined && structuredData.pricingMode) {
    const value = structuredData.pricingMode.value || structuredData.pricingMode;
    if (typeof value === "string") {
      if (value.includes("All Inclusive")) formState.pricingMode = "all_inclusive";
      else formState.pricingMode = "per_item_charge";
    }
  }

  // Extract location (fallback for older structured field formats)
  if (formState.location === undefined && structuredData.location) {
    const value = structuredData.location.value || structuredData.location;
    if (typeof value === "string") {
      formState.location = value.includes("Inside") ? "insideBeltway" : value.includes("Outside") ? "outsideBeltway" : value;
    }
  }
  // Extract direct saved fields for edit mode (top-level values saved from the form)
  if (structuredData.mainServiceFrequency !== undefined) {
    formState.mainServiceFrequency = structuredData.mainServiceFrequency;
  }

  const facilityFrequencyValue = normalizeStructuredValue(structuredData.facilityComponentsFrequency);
  if (facilityFrequencyValue !== undefined) {
    formState.facilityComponentsFrequency = facilityFrequencyValue;
  }
  if (structuredData.frequency !== undefined) {
    formState.frequency = structuredData.frequency;
  }
  if (structuredData.facilityComponentFrequency !== undefined) {
    formState.facilityComponentFrequency = structuredData.facilityComponentFrequency;
  }
  if (structuredData.contractMonths !== undefined) {
    formState.contractMonths = structuredData.contractMonths;
  }
  if (structuredData.rateTier !== undefined) {
    formState.rateTier = structuredData.rateTier;
  }

  const pricingFields = [
    "allInclusiveWeeklyRatePerFixture",
    "luxuryUpgradePerDispenser",
    "excessStandardSoapRate",
    "excessLuxurySoapRate",
    "paperCreditPerFixture",
    "microfiberMoppingPerBathroom",
    "insideBeltwayRatePerFixture",
    "insideBeltwayMinimum",
    "insideBeltwayTripCharge",
    "insideBeltwayParkingFee",
    "outsideBeltwayRatePerFixture",
    "outsideBeltwayTripCharge",
    "smallFacilityThreshold",
    "smallFacilityMinimum",
    "urinalScreenMonthly",
    "urinalMatMonthly",
    "toiletClipsMonthly",
    "seatCoverDispenserMonthly",
    "sanipodServiceMonthly",
    "warrantyFeePerDispenserPerWeek",
    "weeklyToMonthlyMultiplier",
    "weeklyToAnnualMultiplier",
    "redRateMultiplier",
    "greenRateMultiplier",
  ];

  pricingFields.forEach((field) => {
    const resolvedValue = normalizeStructuredValue(structuredData[field]);
    if (resolvedValue !== undefined) {
      formState[field] = resolvedValue;
    }
  });

  const customOverrideFields = [
    "customBaseService",
    "customTripCharge",
    "customFacilityComponents",
    "customSoapUpgrade",
    "customExcessSoap",
    "customMicrofiberMopping",
    "customWarrantyFees",
    "customPaperOverage",
    "customWeeklyTotal",
    "customMonthlyTotal",
    "customContractTotal",
  ];

  customOverrideFields.forEach((field) => {
    const resolvedValue = normalizeStructuredValue(structuredData[field]);
    if (resolvedValue !== undefined) {
      formState[field] = resolvedValue;
    }
  });

  const facilityComponentFields = [
    "addUrinalComponents",
    "urinalScreensQty",
    "urinalMatsQty",
    "addMaleToiletComponents",
    "toiletClipsQty",
    "seatCoverDispensersQty",
    "addFemaleToiletComponents",
    "sanipodsQty",
    "warrantyDispensers",
    "addMicrofiberMopping",
    "microfiberBathrooms",
  ];

  facilityComponentFields.forEach((field) => {
    const resolvedValue = normalizeStructuredValue(structuredData[field]);
    if (resolvedValue !== undefined) {
      formState[field] = resolvedValue;
    }
  });

  const facilityComponentsValue = normalizeStructuredValue(structuredData.facilityComponents);
  if (facilityComponentsValue !== undefined) {
    formState.customFacilityComponents = facilityComponentsValue;
  }

  const facilityMonthlyValue = normalizeStructuredValue(structuredData.facilityComponentsMonthly);
  if (facilityMonthlyValue !== undefined) {
    // preserve for edit mode if needed
    formState.facilityComponentsMonthly = facilityMonthlyValue;
  }

  // Extract fixture breakdown (quantities + rates)
  if (structuredData.fixtureBreakdown && Array.isArray(structuredData.fixtureBreakdown)) {
    structuredData.fixtureBreakdown.forEach((fixture: any) => {
      if (fixture.label === "Sinks") {
        formState.sinks = fixture.qty || 0;
        if (fixture.rate !== undefined && fixture.rate !== null) {
          formState.sinkRate = fixture.rate; // ✅ Preserve saved rate
        }
      } else if (fixture.label === "Urinals") {
        formState.urinals = fixture.qty || 0;
        if (fixture.rate !== undefined && fixture.rate !== null) {
          formState.urinalRate = fixture.rate; // ✅ Preserve saved rate
        }
      } else if (fixture.label === "Male Toilets") {
        formState.maleToilets = fixture.qty || 0;
        if (fixture.rate !== undefined && fixture.rate !== null) {
          formState.maleToiletRate = fixture.rate; // ✅ Preserve saved rate
        }
      } else if (fixture.label === "Female Toilets") {
        formState.femaleToilets = fixture.qty || 0;
        if (fixture.rate !== undefined && fixture.rate !== null) {
          formState.femaleToiletRate = fixture.rate; // ✅ Preserve saved rate
        }
      }
    });
  }

  const fixtureRateFallback =
    formState.sinkRate ??
    formState.urinalRate ??
    formState.maleToiletRate ??
    formState.femaleToiletRate;

  if (fixtureRateFallback !== undefined) {
    if (formState.pricingMode === "all_inclusive" && formState.allInclusiveWeeklyRatePerFixture === undefined) {
      formState.allInclusiveWeeklyRatePerFixture = fixtureRateFallback;
    } else if (formState.location === "outsideBeltway" && formState.outsideBeltwayRatePerFixture === undefined) {
      formState.outsideBeltwayRatePerFixture = fixtureRateFallback;
    } else if (formState.insideBeltwayRatePerFixture === undefined) {
      formState.insideBeltwayRatePerFixture = fixtureRateFallback;
    }
  }

  // Extract soap type
  if (structuredData.soapType) {
    formState.soapType = structuredData.soapType.value?.toLowerCase() === "luxury" ? "luxury" : "standard";
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformFoamingDrainData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // ✅ STEP 1: Extract top-level direct fields (saved from form)
  if (structuredData.frequency !== undefined && typeof structuredData.frequency === 'string') {
    formState.frequency = structuredData.frequency;
  }
  if (structuredData.installFrequency !== undefined && typeof structuredData.installFrequency === 'string') {
    formState.installFrequency = structuredData.installFrequency;
  }
  if (structuredData.location !== undefined && typeof structuredData.location === 'string') {
    formState.location = structuredData.location;
  }
  if (structuredData.contractMonths !== undefined) {
    formState.contractMonths = structuredData.contractMonths;
  }
  if (structuredData.facilityCondition !== undefined) {
    formState.facilityCondition = structuredData.facilityCondition;
  }

  // ✅ Extract top-level pricing fields (custom overrides or base values)
  if (structuredData.standardDrainRate !== undefined) {
    formState.standardDrainRate = structuredData.standardDrainRate;
  }
  if (structuredData.altBaseCharge !== undefined) {
    formState.altBaseCharge = structuredData.altBaseCharge;
  }
  if (structuredData.altExtraPerDrain !== undefined) {
    formState.altExtraPerDrain = structuredData.altExtraPerDrain;
  }
  if (structuredData.volumeWeeklyRate !== undefined) {
    formState.volumeWeeklyRate = structuredData.volumeWeeklyRate;
  }
  if (structuredData.volumeBimonthlyRate !== undefined) {
    formState.volumeBimonthlyRate = structuredData.volumeBimonthlyRate;
  }
  if (structuredData.greaseWeeklyRate !== undefined) {
    formState.greaseWeeklyRate = structuredData.greaseWeeklyRate;
  }
  if (structuredData.greaseInstallRate !== undefined) {
    formState.greaseInstallRate = structuredData.greaseInstallRate;
  }
  if (structuredData.greenWeeklyRate !== undefined) {
    formState.greenWeeklyRate = structuredData.greenWeeklyRate;
  }
  if (structuredData.greenInstallRate !== undefined) {
    formState.greenInstallRate = structuredData.greenInstallRate;
  }
  if (structuredData.plumbingAddonRate !== undefined) {
    formState.plumbingAddonRate = structuredData.plumbingAddonRate;
  }
  if (structuredData.filthyMultiplier !== undefined) {
    formState.filthyMultiplier = structuredData.filthyMultiplier;
  }

  // ✅ Extract quantity inputs
  if (structuredData.standardDrainCount !== undefined) {
    formState.standardDrainCount = structuredData.standardDrainCount;
  }
  if (structuredData.installDrainCount !== undefined) {
    formState.installDrainCount = structuredData.installDrainCount;
  }
  if (structuredData.greaseTrapCount !== undefined) {
    formState.greaseTrapCount = structuredData.greaseTrapCount;
  }
  if (structuredData.greenDrainCount !== undefined) {
    formState.greenDrainCount = structuredData.greenDrainCount;
  }
  if (structuredData.plumbingDrainCount !== undefined) {
    formState.plumbingDrainCount = structuredData.plumbingDrainCount;
  }
  if (structuredData.filthyDrainCount !== undefined) {
    formState.filthyDrainCount = structuredData.filthyDrainCount;
  }

  // ✅ Extract boolean flags
  if (structuredData.useSmallAltPricingWeekly !== undefined) {
    formState.useSmallAltPricingWeekly = structuredData.useSmallAltPricingWeekly;
  }
  if (structuredData.useBigAccountTenWeekly !== undefined) {
    formState.useBigAccountTenWeekly = structuredData.useBigAccountTenWeekly;
  }
  if (structuredData.isAllInclusive !== undefined) {
    formState.isAllInclusive = structuredData.isAllInclusive;
  }
  if (structuredData.chargeGreaseTrapInstall !== undefined) {
    formState.chargeGreaseTrapInstall = structuredData.chargeGreaseTrapInstall;
  }
  if (structuredData.needsPlumbing !== undefined) {
    formState.needsPlumbing = structuredData.needsPlumbing;
  }

  // ✅ STEP 2: FALLBACK - Extract from display fields (for backward compatibility with renamed fields)
  if (formState.frequency === undefined && structuredData.frequencyDisplay?.value) {
    formState.frequency = structuredData.frequencyDisplay.value.toLowerCase();
  }
  if (formState.installFrequency === undefined && structuredData.installFrequencyDisplay?.value) {
    formState.installFrequency = structuredData.installFrequencyDisplay.value.toLowerCase();
  }
  if (formState.location === undefined && structuredData.locationDisplay?.value) {
    formState.location = structuredData.locationDisplay.value.includes("Inside") ? "beltway" : "standard";
  }

  // ✅ STEP 3: FALLBACK - Extract from old structured format (for very old documents)
  if (formState.frequency === undefined && structuredData.frequency?.value) {
    formState.frequency = structuredData.frequency.value.toLowerCase() || "weekly";
  }
  if (formState.location === undefined && structuredData.location?.value) {
    formState.location = structuredData.location.value.includes("Inside") ? "beltway" : "standard";
  }

  // ✅ STEP 4: FALLBACK - Extract from drain breakdown (for old documents without top-level pricing)
  if (structuredData.drainBreakdown && Array.isArray(structuredData.drainBreakdown)) {
    structuredData.drainBreakdown.forEach((drain: any) => {
      if (drain.label === "Standard Drains") {
        if (formState.standardDrainCount === undefined) {
          formState.standardDrainCount = drain.qty || 0;
        }
        if (formState.standardDrainRate === undefined && drain.rate !== undefined) {
          formState.standardDrainRate = drain.rate;
        }
      } else if (drain.label === "Grease Trap Drains") {
        if (formState.greaseTrapCount === undefined) {
          formState.greaseTrapCount = drain.qty || 0;
        }
        if (formState.greaseWeeklyRate === undefined && drain.rate !== undefined) {
          formState.greaseWeeklyRate = drain.rate;
        }
      } else if (drain.label === "Green Drains") {
        if (formState.greenDrainCount === undefined) {
          formState.greenDrainCount = drain.qty || 0;
        }
        if (formState.greenWeeklyRate === undefined && drain.rate !== undefined) {
          formState.greenWeeklyRate = drain.rate;
        }
      }
    });
  }

  // ✅ STEP 5: FALLBACK - Extract contract months from totals (if not already set)
  if (formState.contractMonths === undefined && structuredData.totals?.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformCarpetCleanData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  console.log('🔄 [transformCarpetCleanData] Received structured data:', JSON.stringify(structuredData, null, 2));

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract frequency
  if (structuredData.frequency) {
    const freq = structuredData.frequency.value?.toLowerCase();
    if (freq?.includes("twice")) {
      formState.frequency = "twicePerMonth";
    } else if (freq?.includes("monthly")) {
      formState.frequency = "monthly";
    } else if (freq?.includes("bimonthly")) {
      formState.frequency = "bimonthly";
    } else if (freq?.includes("quarterly")) {
      formState.frequency = "quarterly";
    }
  }

  // Extract location
  if (structuredData.location) {
    formState.location = structuredData.location.value?.includes("Inside") ? "insideBeltway" : "outsideBeltway";
  }

  // ✅ FIXED: Extract top-level editable pricing fields (saved from form)
  // These are the baseline pricing values that should be loaded in edit mode
  if (structuredData.firstUnitRate !== undefined) {
    console.log('🔄 [transformCarpetCleanData] Extracting firstUnitRate:', structuredData.firstUnitRate);
    formState.firstUnitRate = structuredData.firstUnitRate;
  }
  if (structuredData.additionalUnitRate !== undefined) {
    console.log('🔄 [transformCarpetCleanData] Extracting additionalUnitRate:', structuredData.additionalUnitRate);
    formState.additionalUnitRate = structuredData.additionalUnitRate;
  }
  if (structuredData.perVisitMinimum !== undefined) {
    console.log('🔄 [transformCarpetCleanData] Extracting perVisitMinimum:', structuredData.perVisitMinimum);
    formState.perVisitMinimum = structuredData.perVisitMinimum;
  }
  if (structuredData.installMultiplierDirty !== undefined) {
    formState.installMultiplierDirty = structuredData.installMultiplierDirty;
  }
  if (structuredData.installMultiplierClean !== undefined) {
    formState.installMultiplierClean = structuredData.installMultiplierClean;
  }
  if (structuredData.unitSqFt !== undefined) {
    formState.unitSqFt = structuredData.unitSqFt;
  }
  if (structuredData.useExactSqft !== undefined) {
    formState.useExactSqft = structuredData.useExactSqft;
  }

  // Extract service (carpet area)
  if (structuredData.service) {
    formState.areaSqFt = structuredData.service.qty || 0;
    // ✅ FALLBACK: Only use service.rate if top-level firstUnitRate not already set
    if (formState.firstUnitRate === undefined && structuredData.service.rate !== undefined) {
      console.log('🔄 [transformCarpetCleanData] Using fallback firstUnitRate from service.rate:', structuredData.service.rate);
      formState.firstUnitRate = structuredData.service.rate;
    }
  }

  console.log('🔄 [transformCarpetCleanData] Final formState with pricing fields:', {
    firstUnitRate: formState.firstUnitRate,
    additionalUnitRate: formState.additionalUnitRate,
    perVisitMinimum: formState.perVisitMinimum,
    areaSqFt: formState.areaSqFt,
  });

  // Extract installation data
  if (structuredData.installation) {
    formState.includeInstall = true;
    formState.isDirtyInstall = structuredData.installation.isDirty || false;

    // Extract multiplier if available
    if (structuredData.installation.multiplier != null) {
      if (formState.isDirtyInstall) {
        formState.installMultiplierDirty = structuredData.installation.multiplier;
      } else {
        formState.installMultiplierClean = structuredData.installation.multiplier;
      }
    }

    // ✅ FIXED: Only set custom installation fee if it was actually overridden
    // Don't set custom fields for normal calculated values - this was causing
    // override fields to be set in edit mode, preventing calculations from updating the UI
    if (structuredData.installation?.total != null && structuredData.installation?.isCustom === true) {
      formState.customInstallationFee = structuredData.installation.total;
    }
  }

  // ✅ FIXED: Don't automatically set custom override fields for calculated totals
  // Only set them if they were explicitly marked as custom overrides
  // This prevents the yellow background "override active" state in edit mode
  if (structuredData.totals) {
    // Contract months (always safe to set)
    if (structuredData.totals.contract) {
      formState.contractMonths = structuredData.totals.contract.months || 12;

      // Only set custom contract total if it was actually overridden
      if (structuredData.totals.contract.isCustom === true) {
        formState.customContractTotal = structuredData.totals.contract.amount;
      }
    }

    // ✅ REMOVED: Don't set custom override fields for calculated values
    // The following lines were causing the yellow background bug in carpet cleaning:
    // - formState.customPerVisitPrice = structuredData.totals.perVisit.amount;
    // - formState.customMonthlyRecurring = structuredData.totals.monthly.amount;
    // - formState.customFirstMonthPrice = structuredData.totals.firstMonth.amount;
    // - formState.customContractTotal = structuredData.totals.contract.amount;

    // These should ONLY be set if the user explicitly overrode the calculated values
    // in the original form, which would be indicated by an isCustom flag
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformStripWaxData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  if (structuredData.ratePerSqFt !== undefined) {
    formState.ratePerSqFt = structuredData.ratePerSqFt;
  }
  if (structuredData.minCharge !== undefined) {
    formState.minCharge = structuredData.minCharge;
  }
  if (structuredData.serviceVariant !== undefined) {
    formState.serviceVariant = structuredData.serviceVariant;
  }
  if (structuredData.rateCategory !== undefined) {
    formState.rateCategory = structuredData.rateCategory;
  }
  if (structuredData.contractMonths !== undefined) {
    formState.contractMonths = structuredData.contractMonths;
  } else if (structuredData.totals?.contract?.months !== undefined) {
    formState.contractMonths = structuredData.totals.contract.months;
  }

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract service (floor area)
  if (structuredData.service) {
    formState.floorAreaSqFt = structuredData.service.qty || 0;
    if (structuredData.service.rate !== undefined && formState.ratePerSqFt === undefined) {
      formState.ratePerSqFt = structuredData.service.rate;
    }
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformJanitorialData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  console.log('🔄 Transforming janitorial data:', structuredData);

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract service type (recurring vs one-time)
  if (structuredData.serviceType) {
    formState.serviceType = structuredData.serviceType.value?.includes("One-Time") ? "one-time" : "recurring";
  }

  // Extract frequency
  if (structuredData.frequency) {
    const freq = structuredData.frequency.value?.toLowerCase();
    if (freq) {
      // Map display names back to internal values
      const frequencyMap: Record<string, string> = {
        'daily': 'daily',
        'weekly': 'weekly',
        'bi-weekly': 'biweekly',
        'biweekly': 'biweekly',
        'monthly': 'monthly'
      };
      formState.frequency = frequencyMap[freq] || 'weekly';
    }
  }

  // Extract scheduling mode from location (if present)
  if (structuredData.location) {
    const location = structuredData.location.value?.toLowerCase() || '';
    // For now, default to normalRoute - adjust if you have specific location mapping
    formState.schedulingMode = 'normalRoute';
  }

  // STEP 1: Extract individual components first
  let totalHours = 0;
  let manualHours = 0;
  let vacuumingHours = 0;
  let dustingPlaces = 0;
  let dustingHours = 0;
  let addonTimeMinutes = 0;

  // Extract total hours from service
  if (structuredData.service) {
    totalHours = Number(structuredData.service.qty) || 0;

    // Extract rate and set appropriate rate field
    if (structuredData.service.rate) {
      const rate = typeof structuredData.service.rate === 'string'
        ? parseFloat(structuredData.service.rate.replace(/[^0-9.]/g, ''))
        : structuredData.service.rate;

      // Set the hourly rate (adjust based on service type when we have that info)
      formState.baseHourlyRate = rate;
      formState.shortJobHourlyRate = rate; // Set both for consistency
    }
  }

  // Extract manual hours (Other Tasks) directly
  if (structuredData.otherTasks) {
    const hoursMatch = structuredData.otherTasks.value?.match(/(\d+(?:\.\d+)?)/);
    if (hoursMatch) {
      manualHours = parseFloat(hoursMatch[1]);
      formState.manualHours = manualHours;
    }
  }

  // Extract vacuuming hours
  if (structuredData.vacuuming) {
    const hoursMatch = structuredData.vacuuming.value?.match(/(\d+(?:\.\d+)?)/);
    if (hoursMatch) {
      vacuumingHours = parseFloat(hoursMatch[1]);
      formState.vacuumingHours = vacuumingHours;
    }
  }

  // Extract dusting places
  if (structuredData.dusting) {
    const dustingText = structuredData.dusting.value || "";
    const fullMatch = dustingText.match(/(\d+(?:\.\d+)?)\s*places\s*=\s*(\d+(?:\.\d+)?)/i);
    if (fullMatch) {
      dustingPlaces = parseFloat(fullMatch[1]);
      dustingHours = parseFloat(fullMatch[2]);
    } else {
      const placesMatch = dustingText.match(/(\d+(?:\.\d+)?)/);
      if (placesMatch) {
        dustingPlaces = parseFloat(placesMatch[1]);
      }
      const hoursMatch = dustingText.match(/=\s*(\d+(?:\.\d+)?)/);
      if (hoursMatch) {
        dustingHours = parseFloat(hoursMatch[1]);
      }
    }

    formState.dustingTotalPlaces = dustingPlaces;
    formState.dustingCalculatedHours = dustingHours;
    formState.dustingPlacesPerHour = dustingHours > 0
      ? dustingPlaces / dustingHours
      : 4;
  }

  // Extract add-on time
  if (structuredData.addonTime) {
    const minutesMatch = structuredData.addonTime.value?.match(/(\d+(?:\.\d+)?)/);
    if (minutesMatch) {
      addonTimeMinutes = parseInt(minutesMatch[1]);
      formState.addonTimeMinutes = addonTimeMinutes;
    }
  }

  // Extract visits per week (for recurring services)
  if (structuredData.visitsPerWeek) {
    const visitsMatch = structuredData.visitsPerWeek.value?.match(/(\d+)/);
    if (visitsMatch) {
      formState.visitsPerWeek = parseInt(visitsMatch[1]);
    }
  }

  // STEP 2: Validate that the breakdown makes sense
  // If we have individual components but no manual hours extracted, calculate it
  if (!manualHours && totalHours > 0) {
    // Default dustingPlacesPerHour (this should match the backend config default)
    const dustingPlacesPerHour = formState.dustingPlacesPerHour || 4;
    const dustingHours = formState.dustingCalculatedHours || (dustingPlaces / dustingPlacesPerHour);

    const calculatedManualHours = Math.max(0, totalHours - vacuumingHours - dustingHours);
    formState.manualHours = Math.round(calculatedManualHours * 100) / 100; // Round to 2 decimal places
    manualHours = formState.manualHours;
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  // Set defaults for required fields
  formState.rateCategory = formState.rateCategory || 'red';
  formState.dirtyInitial = false; // Default value
  formState.installation = false; // Default value

  console.log('🔄 Janitorial reverse mapping breakdown:');
  console.log(`  Total Hours from PDF: ${totalHours}`);
  console.log(`  Manual Hours (Other Tasks): ${manualHours}`);
  console.log(`  Vacuuming Hours: ${vacuumingHours}`);
  console.log(`  Dusting Places: ${dustingPlaces}`);
  console.log(`  Addon Time Minutes: ${addonTimeMinutes}`);
  console.log(`  Visits per Week: ${formState.visitsPerWeek || 'not set'}`);
  console.log('✅ Final mapped janitorial form state:', formState);

  return formState;
}

export function transformSaniscrubData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // STEP 1: Extract top-level direct fields (saved from form) - PRIORITY
  const directFields = [
    "fixtureCount",
    "nonBathroomSqFt",
    "useExactNonBathroomSqft",
    "hasSaniClean",
    "includeInstall",
    "isDirtyInstall",
    "contractMonths",
    "fixtureRateMonthly",
    "fixtureRateBimonthly",
    "fixtureRateQuarterly",
    "minimumMonthly",
    "minimumBimonthly",
    "nonBathroomFirstUnitRate",
    "nonBathroomAdditionalUnitRate",
    "installMultiplierDirty",
    "installMultiplierClean",
    "twoTimesPerMonthDiscount",
  ];

  for (const field of directFields) {
    if (structuredData[field] !== undefined) {
      formState[field] = structuredData[field];
    }
  }

  // Extract frequency
  if (structuredData.frequency) {
    const freq = structuredData.frequency.value?.toLowerCase();
    if (freq?.includes("twice")) {
      formState.frequency = "twicePerMonth";
    } else if (freq?.includes("monthly")) {
      formState.frequency = "monthly";
    } else if (freq?.includes("bimonthly")) {
      formState.frequency = "bimonthly";
    } else if (freq?.includes("quarterly")) {
      formState.frequency = "quarterly";
    }
  }

  // Extract location
  if (structuredData.location) {
    formState.location = structuredData.location.value?.includes("Inside") ? "insideBeltway" : "outsideBeltway";
  }

  // Extract restroom fixtures (✅ FIXED: Extract both qty AND rate)
  if (structuredData.restroomFixtures) {
    formState.fixtureCount = structuredData.restroomFixtures.qty || 0;
    if (structuredData.restroomFixtures.rate !== undefined && structuredData.restroomFixtures.rate !== null) {
      // Backward compatibility: older documents stored a single per-fixture rate (no monthly/bimonthly split)
      const savedRate = structuredData.restroomFixtures.rate;
      const freq = formState.frequency || "monthly";
      if (freq === "bimonthly") formState.fixtureRateBimonthly = formState.fixtureRateBimonthly ?? savedRate;
      else if (freq === "quarterly" || freq === "biannual" || freq === "annual") formState.fixtureRateQuarterly = formState.fixtureRateQuarterly ?? savedRate;
      else formState.fixtureRateMonthly = formState.fixtureRateMonthly ?? savedRate;
    }
  }

  // Extract non-bathroom area (✅ FIXED: Extract both qty AND rate)
  if (structuredData.nonBathroomArea) {
    formState.nonBathroomSqFt = structuredData.nonBathroomArea.qty || 0;
    if (structuredData.nonBathroomArea.rate !== undefined && structuredData.nonBathroomArea.rate !== null) {
      // Backward compatibility: attempt to parse old string format "250/500+125"
      const rate = structuredData.nonBathroomArea.rate;
      if (typeof rate === "string") {
        const match = rate.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)[+](\d+(?:\.\d+)?)$/);
        if (match) {
          formState.nonBathroomFirstUnitRate = formState.nonBathroomFirstUnitRate ?? Number(match[1]);
          formState.nonBathroomAdditionalUnitRate = formState.nonBathroomAdditionalUnitRate ?? Number(match[3]);
        }
      }
    }
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformMicrofiberMoppingData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  console.log('🔄 [transformMicrofiberMoppingData] Processing structured data:', structuredData);

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // ✅ STEP 1: Extract top-level direct fields (saved from form) - PRIORITY
  // These are the actual saved rate values (including custom overrides)
  if (structuredData.includedBathroomRate !== undefined) {
    formState.includedBathroomRate = structuredData.includedBathroomRate;
    console.log('🔄 [Microfiber] Extracted includedBathroomRate:', structuredData.includedBathroomRate);
  }
  if (structuredData.hugeBathroomRatePerSqFt !== undefined) {
    formState.hugeBathroomRatePerSqFt = structuredData.hugeBathroomRatePerSqFt;
    console.log('🔄 [Microfiber] Extracted hugeBathroomRatePerSqFt:', structuredData.hugeBathroomRatePerSqFt);
  }
  if (structuredData.extraAreaRatePerUnit !== undefined) {
    formState.extraAreaRatePerUnit = structuredData.extraAreaRatePerUnit;
    console.log('🔄 [Microfiber] Extracted extraAreaRatePerUnit:', structuredData.extraAreaRatePerUnit);
  }
  if (structuredData.standaloneRatePerUnit !== undefined) {
    formState.standaloneRatePerUnit = structuredData.standaloneRatePerUnit;
    console.log('🔄 [Microfiber] Extracted standaloneRatePerUnit:', structuredData.standaloneRatePerUnit);
  }
  if (structuredData.dailyChemicalPerGallon !== undefined) {
    formState.dailyChemicalPerGallon = structuredData.dailyChemicalPerGallon;
    console.log('🔄 [Microfiber] Extracted dailyChemicalPerGallon:', structuredData.dailyChemicalPerGallon);
  }

  // ✅ STEP 2: Extract quantity inputs from top-level OR serviceBreakdown
  // Quantities from top-level (saved in useEffect)
  if (structuredData.bathroomCount !== undefined) {
    formState.bathroomCount = structuredData.bathroomCount;
  }
  if (structuredData.hugeBathroomSqFt !== undefined) {
    formState.hugeBathroomSqFt = structuredData.hugeBathroomSqFt;
  }
  if (structuredData.extraAreaSqFt !== undefined) {
    formState.extraAreaSqFt = structuredData.extraAreaSqFt;
  }
  if (structuredData.standaloneSqFt !== undefined) {
    formState.standaloneSqFt = structuredData.standaloneSqFt;
  }
  if (structuredData.chemicalGallons !== undefined) {
    formState.chemicalGallons = structuredData.chemicalGallons;
  }

  // ✅ STEP 3: Extract frequency
  if (structuredData.frequency !== undefined && typeof structuredData.frequency === 'string') {
    formState.frequency = structuredData.frequency;
  } else if (structuredData.frequencyDisplay?.value) {
    // Fallback to display field
    formState.frequency = structuredData.frequencyDisplay.value.toLowerCase() || "weekly";
  }

  // ✅ STEP 4: Extract boolean flags
  if (structuredData.hasExistingSaniService !== undefined) {
    formState.hasExistingSaniService = structuredData.hasExistingSaniService;
  }
  if (structuredData.isAllInclusive !== undefined) {
    formState.isAllInclusive = structuredData.isAllInclusive;
  }
  if (structuredData.isHugeBathroom !== undefined) {
    formState.isHugeBathroom = structuredData.isHugeBathroom;
  }
  if (structuredData.useExactExtraAreaSqft !== undefined) {
    formState.useExactExtraAreaSqft = structuredData.useExactExtraAreaSqft;
  }
  if (structuredData.useExactStandaloneSqft !== undefined) {
    formState.useExactStandaloneSqft = structuredData.useExactStandaloneSqft;
  }

  // ✅ STEP 5: Extract location and parking
  if (structuredData.location !== undefined) {
    formState.location = structuredData.location;
  }
  if (structuredData.needsParking !== undefined) {
    formState.needsParking = structuredData.needsParking;
  }

  // ✅ STEP 6: FALLBACK - Extract from serviceBreakdown (for backward compatibility)
  // Only use these if top-level fields not already set
  if (structuredData.serviceBreakdown && Array.isArray(structuredData.serviceBreakdown)) {
    structuredData.serviceBreakdown.forEach((item: any) => {
      if (item.label === "Bathrooms") {
        if (formState.bathroomCount === undefined) {
          formState.bathroomCount = item.qty || 0;
        }
        if (formState.includedBathroomRate === undefined && item.rate !== undefined) {
          formState.includedBathroomRate = item.rate;
          console.log('🔄 [Microfiber] Using fallback includedBathroomRate from serviceBreakdown:', item.rate);
        }
      } else if (item.label === "Huge Bathrooms") {
        if (formState.hugeBathroomSqFt === undefined) {
          formState.hugeBathroomSqFt = item.qty || 0;
        }
        if (formState.hugeBathroomRatePerSqFt === undefined && item.rate !== undefined) {
          formState.hugeBathroomRatePerSqFt = item.rate;
          console.log('🔄 [Microfiber] Using fallback hugeBathroomRatePerSqFt from serviceBreakdown:', item.rate);
        }
      } else if (item.label === "Extra Area") {
        if (formState.extraAreaSqFt === undefined) {
          formState.extraAreaSqFt = item.qty || 0;
        }
        if (formState.extraAreaRatePerUnit === undefined && item.rate !== undefined) {
          formState.extraAreaRatePerUnit = item.rate;
          console.log('🔄 [Microfiber] Using fallback extraAreaRatePerUnit from serviceBreakdown:', item.rate);
        }
      } else if (item.label === "Standalone Service") {
        if (formState.standaloneSqFt === undefined) {
          formState.standaloneSqFt = item.qty || 0;
        }
        if (formState.standaloneRatePerUnit === undefined && item.rate !== undefined) {
          formState.standaloneRatePerUnit = item.rate;
          console.log('🔄 [Microfiber] Using fallback standaloneRatePerUnit from serviceBreakdown:', item.rate);
        }
      } else if (item.label === "Chemical Supply") {
        if (formState.chemicalGallons === undefined) {
          formState.chemicalGallons = item.qty || 0;
        }
        if (formState.dailyChemicalPerGallon === undefined && item.rate !== undefined) {
          formState.dailyChemicalPerGallon = item.rate;
          console.log('🔄 [Microfiber] Using fallback dailyChemicalPerGallon from serviceBreakdown:', item.rate);
        }
      }
    });
  }

  // ✅ STEP 7: Extract contract months
  if (structuredData.contractMonths !== undefined) {
    formState.contractMonths = structuredData.contractMonths;
  } else if (structuredData.totals?.contract) {
    // Fallback to totals.contract.months
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  console.log('🔄 [transformMicrofiberMoppingData] Final form state:', {
    bathroomCount: formState.bathroomCount,
    includedBathroomRate: formState.includedBathroomRate,
    hugeBathroomSqFt: formState.hugeBathroomSqFt,
    hugeBathroomRatePerSqFt: formState.hugeBathroomRatePerSqFt,
    extraAreaSqFt: formState.extraAreaSqFt,
    extraAreaRatePerUnit: formState.extraAreaRatePerUnit,
    standaloneSqFt: formState.standaloneSqFt,
    standaloneRatePerUnit: formState.standaloneRatePerUnit,
    chemicalGallons: formState.chemicalGallons,
    dailyChemicalPerGallon: formState.dailyChemicalPerGallon,
  });

  return formState;
}

export function transformSanipodData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  const hydrateNumberField = (fieldName: string) => {
    const value = normalizeStructuredValue(structuredData[fieldName]);
    if (value !== undefined) {
      formState[fieldName] = value;
    }
  };

  hydrateNumberField("weeklyRatePerUnit");
  hydrateNumberField("altWeeklyRatePerUnit");
  hydrateNumberField("extraBagPrice");
  hydrateNumberField("standaloneExtraWeeklyCharge");
  hydrateNumberField("tripChargePerVisit");
  hydrateNumberField("installRatePerPod");

  // Extract service (sanipods) (✅ FIXED: Extract rate as well)
  if (structuredData.service) {
    formState.podQuantity = structuredData.service.qty || 0;
    // ✅ Extract rate if available (for recurring service rate per pod)
    if (structuredData.service.rate !== undefined && structuredData.service.rate !== null) {
      formState.recurringPerPod = structuredData.service.rate; // ✅ Preserve saved rate
    }
  }

  // Extract extra bags
  if (structuredData.extraBags) {
    formState.extraBagsPerWeek = structuredData.extraBags.qty || 0;
    formState.extraBagsRecurring = structuredData.extraBags.recurring !== false; // default true
    if (structuredData.extraBags.rate != null) {
      formState.extraBagPrice = structuredData.extraBags.rate;
    }
  }

  // Extract installation
  if (structuredData.installation) {
    formState.isNewInstall = true;
    formState.installQuantity = structuredData.installation.qty || 0;
    if (structuredData.installation.rate != null) {
      formState.installRatePerPod = structuredData.installation.rate;
    }
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Restore saved manual overrides so edit mode can rehydrate overrides/highlights
  const overrideFields = [
    "customInstallationFee",
    "customPerVisitPrice",
    "customMonthlyPrice",
    "customAnnualPrice",
    "customWeeklyPodRate",
    "customPodServiceTotal",
    "customExtraBagsTotal",
  ];
  overrideFields.forEach((key) => {
    if (structuredData[key] !== undefined && structuredData[key] !== null) {
      formState[key] = structuredData[key];
    }
  });

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformGreaseTrapData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract service (grease traps) (✅ FIXED: Extract both qty AND rate)
  if (structuredData.service) {
    formState.numberOfTraps = structuredData.service.qty || 0;
    if (structuredData.service.rate !== undefined && structuredData.service.rate !== null) {
      formState.perTrapWeeklyRate = structuredData.service.rate; // ✅ Preserve saved rate
    }
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformRefreshPowerScrubData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const draftFormState =
    parseRefreshPowerScrubDraftPayload(structuredData) ??
    parseDraftPayloadFromCustomFields(structuredData);
  if (draftFormState) {
    console.log('🔄 [transformRefreshPowerScrubData] Detected draft schema, normalizing form state');
    const normalizedFormState: any = {
      notes: draftFormState.notes ?? "",
      tripCharge: draftFormState.tripCharge ?? REFRESH_FALLBACKS.tripCharge,
      hourlyRate: draftFormState.hourlyRate ?? REFRESH_FALLBACKS.hourlyRate,
      minimumVisit: draftFormState.minimumVisit ?? REFRESH_FALLBACKS.minimumVisit,
      frequency: draftFormState.frequency ?? "monthly",
      contractMonths: draftFormState.contractMonths ?? 12,
      hourlyRateIsCustom: draftFormState.hourlyRateIsCustom,
      minimumVisitIsCustom: draftFormState.minimumVisitIsCustom,
      tripChargeIncluded: draftFormState.tripChargeIncluded ?? true,
    };

    REFRESH_AREA_KEYS.forEach((areaKey) => {
      normalizedFormState[areaKey] = mergeRefreshAreaState(draftFormState[areaKey]);
    });

    normalizedFormState.customFields = draftFormState.customFields ?? [];

    return normalizedFormState;
  }

  console.log('🔄 [transformRefreshPowerScrubData] Processing structured data:', structuredData);

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Handle NEW CONVERTED FORMAT (from backend edit-format endpoint)
  if (!structuredData.services && (structuredData.hourlyRate !== undefined || structuredData.minimumVisit !== undefined)) {
    console.log('?"" [transformRefreshPowerScrubData] Using NEW converted format');

    // Direct values from converted format
    formState.hourlyRate = structuredData.hourlyRate ?? REFRESH_FALLBACKS.hourlyRate;
    formState.minimumVisit = structuredData.minimumVisit ?? REFRESH_FALLBACKS.minimumVisit;
    formState.frequency = structuredData.frequency || "monthly";
    formState.contractMonths = structuredData.contractMonths || 12;
    formState.tripCharge = structuredData.tripCharge ?? REFRESH_FALLBACKS.tripCharge;
    formState.tripChargeIncluded = structuredData.tripChargeIncluded ?? true;

    if (structuredData.hourlyRateIsCustom !== undefined) {
      formState.hourlyRateIsCustom = structuredData.hourlyRateIsCustom;
    }
    if (structuredData.minimumVisitIsCustom !== undefined) {
      formState.minimumVisitIsCustom = structuredData.minimumVisitIsCustom;
    }

    for (const areaKey of REFRESH_AREA_KEYS) {
      const storedArea = structuredData[areaKey] || {};
      const areaState = mergeRefreshAreaState(storedArea);

      if (areaKey === "patio" && storedArea.includePatioAddon === undefined) {
        const patioMode = storedArea.patioMode;
        console.log(`?"" [Patio FIX] includePatioAddon missing, patioMode: ${patioMode}`);
        const inferredAddon = patioMode === "upsell";
        areaState.includePatioAddon = inferredAddon;
        console.log(`?"" [Patio FIX] Inferred includePatioAddon: ${inferredAddon} (from patioMode: ${patioMode})`);
      }

      const savedFieldMap = {
        savedPresetRate: "presetRate",
        savedPresetQuantity: "presetQuantity",
        savedWorkerRate: "workerRate",
        savedHours: "hours",
        savedHourlyRate: "hourlyRate",
        savedInsideRate: "insideRate",
        savedOutsideRate: "outsideRate",
        savedSqFtFixedFee: "sqFtFixedFee",
        savedSmallMediumRate: "smallMediumRate",
        savedLargeRate: "largeRate",
      };

      Object.entries(savedFieldMap).forEach(([sourceKey, targetKey]) => {
        if (storedArea[sourceKey] !== undefined) {
          areaState[targetKey] = storedArea[sourceKey];
        }
      });

      formState[areaKey] = areaState;
      console.log(`?"" [transformRefreshPowerScrubData] Mapped ${areaKey}:`, areaState);
    }

    // Extract custom fields
    formState.customFields = extractCustomFields(structuredData);

    const overrideField = formState.customFields.find(
      (field) => field.name === "refreshPowerScrubOverrides" || field.id === "refreshPowerScrubOverrides"
    );
    if (overrideField) {
      overrideField.isInternal = true;
      try {
        const overrides = JSON.parse(overrideField.value || "{}");
        REFRESH_AREA_KEYS.forEach((key) => {
          const areaOverride = overrides[key];
          if (!areaOverride) return;

          const targetArea = formState[key];
          if (!targetArea) return;

          if (areaOverride.presetRate !== undefined) {
            targetArea.presetRate = areaOverride.presetRate;
          }
          if (areaOverride.presetQuantity !== undefined) {
            targetArea.presetQuantity = areaOverride.presetQuantity;
          }
          if (areaOverride.workerRate !== undefined) {
            targetArea.workerRate = areaOverride.workerRate;
          }
          if (areaOverride.workers !== undefined) {
            targetArea.workers = areaOverride.workers;
          }
          if (areaOverride.hourlyRate !== undefined) {
            targetArea.hourlyRate = areaOverride.hourlyRate;
          }
          if (areaOverride.hours !== undefined) {
            targetArea.hours = areaOverride.hours;
          }
          if (areaOverride.insideRate !== undefined) {
            targetArea.insideRate = areaOverride.insideRate;
          }
          if (areaOverride.outsideRate !== undefined) {
            targetArea.outsideRate = areaOverride.outsideRate;
          }
          if (areaOverride.sqFtFixedFee !== undefined) {
            targetArea.sqFtFixedFee = areaOverride.sqFtFixedFee;
          }
          if (areaOverride.insideSqFt !== undefined) {
            targetArea.insideSqFt = areaOverride.insideSqFt;
          }
          if (areaOverride.outsideSqFt !== undefined) {
            targetArea.outsideSqFt = areaOverride.outsideSqFt;
          }
          if (areaOverride.patioAddonRate !== undefined) {
            targetArea.patioAddonRate = areaOverride.patioAddonRate;
          }
          if (areaOverride.smallMediumRate !== undefined) {
            targetArea.smallMediumRate = areaOverride.smallMediumRate;
          }
          if (areaOverride.largeRate !== undefined) {
            targetArea.largeRate = areaOverride.largeRate;
          }
          if (areaOverride.smallMediumQuantity !== undefined) {
            targetArea.smallMediumQuantity = areaOverride.smallMediumQuantity;
          }
          if (areaOverride.largeQuantity !== undefined) {
            targetArea.largeQuantity = areaOverride.largeQuantity;
          }
          if (areaOverride.smallMediumCustomAmount !== undefined) {
            targetArea.smallMediumCustomAmount = areaOverride.smallMediumCustomAmount;
          }
          if (areaOverride.largeCustomAmount !== undefined) {
            targetArea.largeCustomAmount = areaOverride.largeCustomAmount;
          }
          const overrideCustomFieldMap: Record<string, string> = {
            presetRate: "presetRateIsCustom",
            workerRate: "workerRateIsCustom",
            hourlyRate: "hourlyRateIsCustom",
            insideRate: "insideRateIsCustom",
            outsideRate: "outsideRateIsCustom",
            sqFtFixedFee: "sqFtFixedFeeIsCustom",
            smallMediumRate: "smallMediumRateIsCustom",
            largeRate: "largeRateIsCustom",
          };
          Object.keys(areaOverride).forEach((overrideKey) => {
            const customFlag = overrideCustomFieldMap[overrideKey];
            if (customFlag) {
              targetArea[customFlag] = true;
            }
          });
        });
      } catch (err) {
        console.warn("Failed to parse refresh power scrub overrides:", err);
      }
    }

    console.log('?"" [transformRefreshPowerScrubData] Converted form state:', formState);
    return formState;
  }
  // Handle CURRENT STORAGE FORMAT (services object structure)
  if (structuredData.services) {
    console.log('🔄 [transformRefreshPowerScrubData] Using CURRENT storage format (services object)');

    // Extract global rate info from serviceInfo
    if (structuredData.serviceInfo && structuredData.serviceInfo.value) {
      const rateInfoStr = structuredData.serviceInfo.value;
      const hourlyMatch = rateInfoStr.match(/Hourly Rate: \$(\d+)\/hr/);
      const minMatch = rateInfoStr.match(/Minimum: \$(\d+)/);

      formState.hourlyRate = hourlyMatch ? parseFloat(hourlyMatch[1]) : 200;
      formState.minimumVisit = minMatch ? parseFloat(minMatch[1]) : 400;
      if (structuredData.hourlyRateIsCustom !== undefined) {
        formState.hourlyRateIsCustom = structuredData.hourlyRateIsCustom;
      }
      if (structuredData.minimumVisitIsCustom !== undefined) {
        formState.minimumVisitIsCustom = structuredData.minimumVisitIsCustom;
      }

      console.log(`🔄 Extracted rates - hourly: ${formState.hourlyRate}, minimum: ${formState.minimumVisit}`);
    }

    formState.frequency = deriveFrequencyFromServices(structuredData) ?? "monthly";
    formState.contractMonths = structuredData.contractMonths ?? 12;
    formState.tripCharge = structuredData.tripCharge ?? REFRESH_FALLBACKS.tripCharge;
    formState.tripChargeIncluded = structuredData.tripChargeIncluded ?? true;

    // Map area naming between stored format and form format
    const areaMapping = {
      'dumpster': 'dumpster',
      'patio': 'patio',
      'frontHouse': 'foh',
      'backHouse': 'boh',
      'walkway': 'walkway',
      'other': 'other'
    };

    // Initialize all areas with defaults first
    Object.values(areaMapping).forEach(formAreaKey => {
      formState[formAreaKey] = {
        enabled: false,
        pricingType: "preset",
        workers: 2,
        hours: 0,
        hourlyRate: 200,
        insideSqFt: 0,
        outsideSqFt: 0,
        insideRate: 0.6,
        outsideRate: 0.4,
        sqFtFixedFee: 200,
        customAmount: 0,
        kitchenSize: "smallMedium",
        patioMode: "standalone",
        frequencyLabel: "",
        contractMonths: 12
      };
    });

    // Process each service area from stored data
    Object.entries(structuredData.services).forEach(([storedAreaKey, areaData]: [string, any]) => {
      const formAreaKey = areaMapping[storedAreaKey as keyof typeof areaMapping];
      if (!formAreaKey) {
        console.warn(`🔄 Unknown area key in stored data: ${storedAreaKey}`);
        return;
      }

      console.log(`🔄 Processing area: ${storedAreaKey} -> ${formAreaKey}`, areaData);

      // Map pricing method
      let pricingType = "preset";
      if (areaData.pricingMethod?.value) {
        const methodValue = areaData.pricingMethod.value.toLowerCase();
        if (methodValue.includes("per hour")) pricingType = "perHour";
        else if (methodValue.includes("per worker")) pricingType = "perWorker";
        else if (methodValue.includes("square feet")) pricingType = "squareFeet";
        else if (methodValue.includes("custom")) pricingType = "custom";
        else if (methodValue.includes("preset")) pricingType = "preset";
      }

      // Extract specific data based on pricing method and available fields
      const areaState: any = {
        enabled: areaData.enabled !== false, // Enable if not explicitly false
        pricingType: pricingType,
        workers: 2, // Default
        hours: 0,
        hourlyRate: 200,
        insideSqFt: 0,
        outsideSqFt: 0,
        insideRate: 0.6,
        outsideRate: 0.4,
        sqFtFixedFee: 200,
        customAmount: 0,
        kitchenSize: "smallMedium",
        patioMode: "standalone",
        includePatioAddon: false, // Default to no add-on
        frequencyLabel: areaData.frequency?.value || "",
        contractMonths: areaData.contract?.quantity || 12
      };

      // Extract pricing-specific data
      if (pricingType === "perHour" && areaData.hours) {
        areaState.hours = areaData.hours.quantity || 0;
        if (areaData.hours.priceRate !== undefined) {
          areaState.hourlyRate = areaData.hours.priceRate;
        }
      } else if (pricingType === "perWorker" && areaData.workersCalc) {
        areaState.workers = areaData.workersCalc.quantity || 2;
        if (areaData.workersCalc.priceRate !== undefined) {
          areaState.workerRate = areaData.workersCalc.priceRate;
        }
      } else if (pricingType === "squareFeet") {
        if (areaData.fixedFee?.value) areaState.sqFtFixedFee = areaData.fixedFee.value;
        if (areaData.insideSqft?.quantity) areaState.insideSqFt = areaData.insideSqft.quantity;
        if (areaData.outsideSqft?.quantity) areaState.outsideSqFt = areaData.outsideSqft.quantity;
        if (areaData.insideSqft?.priceRate) areaState.insideRate = areaData.insideSqft.priceRate;
        if (areaData.outsideSqft?.priceRate) areaState.outsideRate = areaData.outsideSqft.priceRate;
      } else if (pricingType === "preset") {
        // Extract preset-specific options
        if (storedAreaKey === 'patio') {
          // For patio, check for add-on selection
          // This could be stored in various ways, so check multiple possible fields
          if (areaData.includePatioAddon !== undefined) {
            if (typeof areaData.includePatioAddon === 'object' && areaData.includePatioAddon.value !== undefined) {
              // Handle new format: { value: boolean, type: "boolean" }
              areaState.includePatioAddon = areaData.includePatioAddon.value;
            } else {
              // Handle direct boolean value
              areaState.includePatioAddon = areaData.includePatioAddon;
            }
          } else if (areaData.patioAddon !== undefined) {
            areaState.includePatioAddon = areaData.patioAddon;
          }

          if (areaData.plan?.value) {
            areaState.patioMode = areaData.plan.value.toLowerCase().includes('upsell') ? 'upsell' : 'standalone';
          }

          console.log(`🔄 [Patio DEBUG] Raw areaData:`, JSON.stringify(areaData, null, 2));
          console.log(`🔄 [Patio] Final mapped state - includePatioAddon: ${areaState.includePatioAddon}, patioMode: ${areaState.patioMode}`);
        } else if (storedAreaKey === 'backHouse' && areaData.plan?.value) {
          areaState.kitchenSize = areaData.plan.value.toLowerCase().includes('large') ? 'large' : 'smallMedium';
        }
      }

      if (areaData.customAmount !== undefined) {
        areaState.customAmount = areaData.customAmount;
      }
      if (areaData.smallMediumCustomAmount !== undefined) {
        areaState.smallMediumCustomAmount = areaData.smallMediumCustomAmount;
      }
      if (areaData.largeCustomAmount !== undefined) {
        areaState.largeCustomAmount = areaData.largeCustomAmount;
      }
      const normalizedSmallMediumQty = normalizeStructuredValue(areaData.smallMediumQuantity);
      if (normalizedSmallMediumQty !== undefined) {
        areaState.smallMediumQuantity = normalizedSmallMediumQty;
      }
      const normalizedLargeQty = normalizeStructuredValue(areaData.largeQuantity);
      if (normalizedLargeQty !== undefined) {
        areaState.largeQuantity = normalizedLargeQty;
      }
      if (areaData.patioAddonRate !== undefined) {
        areaState.patioAddonRate = areaData.patioAddonRate;
      }
      if (areaData.workerRateIsCustom !== undefined) {
        areaState.workerRateIsCustom = areaData.workerRateIsCustom;
      }
      if (areaData.hourlyRateIsCustom !== undefined) {
        areaState.hourlyRateIsCustom = areaData.hourlyRateIsCustom;
      }
      if (areaData.insideRateIsCustom !== undefined) {
        areaState.insideRateIsCustom = areaData.insideRateIsCustom;
      }
      if (areaData.outsideRateIsCustom !== undefined) {
        areaState.outsideRateIsCustom = areaData.outsideRateIsCustom;
      }
      if (areaData.sqFtFixedFeeIsCustom !== undefined) {
        areaState.sqFtFixedFeeIsCustom = areaData.sqFtFixedFeeIsCustom;
      }
      if (areaData.presetRateIsCustom !== undefined) {
        areaState.presetRateIsCustom = areaData.presetRateIsCustom;
      }
      if (areaData.smallMediumRateIsCustom !== undefined) {
        areaState.smallMediumRateIsCustom = areaData.smallMediumRateIsCustom;
      }
      if (areaData.largeRateIsCustom !== undefined) {
        areaState.largeRateIsCustom = areaData.largeRateIsCustom;
      }
      if (areaData.savedPresetRate !== undefined) {
        areaState.presetRate = areaData.savedPresetRate;
      }
      if (areaData.savedPresetQuantity !== undefined) {
        areaState.presetQuantity = areaData.savedPresetQuantity;
      }
      if (areaData.savedWorkerRate !== undefined) {
        areaState.workerRate = areaData.savedWorkerRate;
      }
      if (areaData.savedHours !== undefined) {
        areaState.hours = areaData.savedHours;
      }
      if (areaData.savedHourlyRate !== undefined) {
        areaState.hourlyRate = areaData.savedHourlyRate;
      }
      if (areaData.savedInsideRate !== undefined) {
        areaState.insideRate = areaData.savedInsideRate;
      }
      if (areaData.savedOutsideRate !== undefined) {
        areaState.outsideRate = areaData.savedOutsideRate;
      }
      if (areaData.savedSqFtFixedFee !== undefined) {
        areaState.sqFtFixedFee = areaData.savedSqFtFixedFee;
      }
      if (areaData.savedSmallMediumRate !== undefined) {
        areaState.smallMediumRate = areaData.savedSmallMediumRate;
      }
      if (areaData.savedLargeRate !== undefined) {
        areaState.largeRate = areaData.savedLargeRate;
      }

      formState[formAreaKey] = areaState;
      console.log(`🔄 Mapped ${storedAreaKey} -> ${formAreaKey}:`, areaState);
    });

    // Extract custom fields
    formState.customFields = extractCustomFields(structuredData);

    console.log('🔄 [transformRefreshPowerScrubData] Final form state:', formState);
    return formState;
  }

  // Handle LEGACY FORMAT (old areaBreakdown structure)
  console.log('🔄 [transformRefreshPowerScrubData] Using LEGACY format');

  // Extract rate info
  if (structuredData.rateInfo && structuredData.rateInfo.value) {
    const rateInfoStr = structuredData.rateInfo.value;
    const hourlyMatch = rateInfoStr.match(/\$(\d+)\/hr/);
    const tripMatch = rateInfoStr.match(/Trip: \$(\d+)/);
    const minMatch = rateInfoStr.match(/Minimum: \$(\d+)/);

    if (hourlyMatch) formState.hourlyRate = parseFloat(hourlyMatch[1]);
    if (tripMatch) formState.tripCharge = parseFloat(tripMatch[1]);
    if (minMatch) formState.minimumVisit = parseFloat(minMatch[1]);
  }

  // Extract area breakdown
  if (structuredData.areaBreakdown && Array.isArray(structuredData.areaBreakdown)) {
    structuredData.areaBreakdown.forEach((area: any) => {
      const areaKey = area.label?.toLowerCase();
      if (areaKey && structuredData.areaBreakdown) {
        // Parse the value string: "Weekly - 2 hrs @ $200/hr = $400"
        const valueStr = area.value || "";
        const freqMatch = valueStr.match(/^(\w+(?:-\w+)?)\s*-/);
        const hoursMatch = valueStr.match(/(\d+(?:\.\d+)?)\s*hrs/);

        formState[areaKey] = {
          enabled: true,
          frequency: freqMatch ? freqMatch[1] : "",
          hours: hoursMatch ? parseFloat(hoursMatch[1]) : 0,
        };
      }
    });
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformElectrostaticSprayData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // ✅ FIXED: Extract top-level editable pricing fields (saved from form)
  // These are the baseline pricing values that should be loaded in edit mode
  if (structuredData.ratePerRoom !== undefined) {
    formState.ratePerRoom = structuredData.ratePerRoom;
  }
  if (structuredData.ratePerThousandSqFt !== undefined) {
    formState.ratePerThousandSqFt = structuredData.ratePerThousandSqFt;
  }
  if (structuredData.tripChargePerVisit !== undefined) {
    formState.tripChargePerVisit = structuredData.tripChargePerVisit;
  }

  // ✅ FIXED: Extract top-level quantity/selection inputs (saved from form)
  if (structuredData.pricingMethod !== undefined) {
    formState.pricingMethod = structuredData.pricingMethod;
  }
  if (structuredData.roomCount !== undefined) {
    formState.roomCount = structuredData.roomCount;
  }
  if (structuredData.squareFeet !== undefined) {
    formState.squareFeet = structuredData.squareFeet;
  }
  if (structuredData.useExactCalculation !== undefined) {
    formState.useExactCalculation = structuredData.useExactCalculation;
  }
  if (structuredData.isCombinedWithSaniClean !== undefined) {
    formState.isCombinedWithSaniClean = structuredData.isCombinedWithSaniClean;
  }
  if (structuredData.frequency !== undefined) {
    formState.frequency = structuredData.frequency;
  }
  if (structuredData.contractMonths !== undefined) {
    formState.contractMonths = structuredData.contractMonths;
  }
  if (structuredData.location !== undefined) {
    formState.location = structuredData.location;
  }

  // ✅ FALLBACK: Extract from structured fields (for backward compatibility)
  // Only use these if top-level fields not already set

  // Extract pricing method (fallback) - check both new and old field names
  if (formState.pricingMethod === undefined) {
    if (structuredData.pricingMethodDisplay?.value) {
      formState.pricingMethod = structuredData.pricingMethodDisplay.value.includes("Room") ? "byRoom" : "bySqFt";
    } else if (structuredData.pricingMethod?.value) {
      // Old format for backward compatibility
      formState.pricingMethod = structuredData.pricingMethod.value.includes("Room") ? "byRoom" : "bySqFt";
    }
  }

  // Extract service data (fallback)
  if (structuredData.service) {
    if (formState.pricingMethod === "byRoom") {
      if (formState.roomCount === undefined) {
        formState.roomCount = structuredData.service.qty || 0;
      }
      if (formState.ratePerRoom === undefined && structuredData.service.rate != null) {
        formState.ratePerRoom = structuredData.service.rate;
      }
    } else {
      if (formState.squareFeet === undefined) {
        formState.squareFeet = structuredData.service.qty || 0;
      }
      if (formState.ratePerThousandSqFt === undefined && structuredData.service.rate != null) {
        formState.ratePerThousandSqFt = structuredData.service.rate;
      }
    }
  }

  // Extract frequency (fallback) - check both new and old field names
  if (formState.frequency === undefined) {
    if (structuredData.frequencyDisplay?.value) {
      formState.frequency = structuredData.frequencyDisplay.value.toLowerCase();
    } else if (structuredData.frequency?.value) {
      // Old format for backward compatibility
      formState.frequency = structuredData.frequency.value.toLowerCase() || "weekly";
    }
  }

  // Extract location (fallback) - check both new and old field names
  if (formState.location === undefined) {
    if (structuredData.locationDisplay?.value) {
      const loc = structuredData.locationDisplay.value.toLowerCase();
      formState.location = loc.includes("inside") ? "insideBeltway" :
                          loc.includes("outside") ? "outsideBeltway" : "standard";
    } else if (structuredData.location) {
      if (typeof structuredData.location === 'string') {
        // Top-level direct value (already handled above, but keep for safety)
        formState.location = structuredData.location;
      } else if (structuredData.location.value) {
        // Old structured field format
        const loc = structuredData.location.value.toLowerCase();
        formState.location = loc.includes("inside") ? "insideBeltway" :
                            loc.includes("outside") ? "outsideBeltway" : "standard";
      }
    }
  }

  // Extract combined flag (fallback)
  if (formState.isCombinedWithSaniClean === undefined && structuredData.combinedService) {
    formState.isCombinedWithSaniClean = structuredData.combinedService.value?.includes("Sani-Clean");
  }

  // Extract trip charge if present (fallback)
  if (formState.tripChargePerVisit === undefined && structuredData.tripCharge) {
    formState.tripChargePerVisit = structuredData.tripCharge.amount || 0;
  }

  // Extract contract months
  if (structuredData.totals?.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

  // Extract custom fields
  formState.customFields = extractCustomFields(structuredData);

  return formState;
}

export function transformCustomServicesData(structuredData: any): any {
  if (!structuredData || !Array.isArray(structuredData)) return [];

  console.log('🔄 Transforming custom services data:', structuredData);

  return structuredData.map((customService: any) => ({
    id: customService.id || Date.now().toString(),
    name: customService.name || customService.label || 'Custom Service',
    fields: extractCustomFields({ customFields: customService.fields || [] })
  }));
}

/**
 * Main transformer function that routes to the appropriate service transformer
 */
export function transformServiceData(serviceId: string, structuredData: any): any {
  if (!structuredData) return undefined;

  switch (serviceId) {
    case "rpmWindows":
      return transformRpmWindowsData(structuredData);
    case "saniclean":
      return transformSanicleanData(structuredData);
    case "foamingDrain":
      return transformFoamingDrainData(structuredData);
    case "carpetclean":
    case "carpetCleaning":
      return transformCarpetCleanData(structuredData);
    case "stripwax":
    case "stripWax":
      return transformStripWaxData(structuredData);
    case "janitorial":
    case "pureJanitorial":
      return transformJanitorialData(structuredData);
    case "saniscrub":
      return transformSaniscrubData(structuredData);
    case "microfiberMopping":
      return transformMicrofiberMoppingData(structuredData);
    case "sanipod":
      return transformSanipodData(structuredData);
    case "greaseTrap":
      return transformGreaseTrapData(structuredData);
    case "refreshPowerScrub":
      return transformRefreshPowerScrubData(structuredData);
    case "electrostaticSpray":
      return transformElectrostaticSprayData(structuredData);
    case "customServices":
      return transformCustomServicesData(structuredData);
    default:
      console.warn(`No transformer found for service: ${serviceId}`);
      return undefined;
  }
}

