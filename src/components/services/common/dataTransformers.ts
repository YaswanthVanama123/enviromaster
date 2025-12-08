// src/components/services/common/dataTransformers.ts
/**
 * Transforms structured service data (from backend/saved PDF) back into form state
 * that the service forms can use to initialize their fields.
 */

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

export function transformRpmWindowsData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract quantities from windows array
  if (structuredData.windows && Array.isArray(structuredData.windows)) {
    structuredData.windows.forEach((window: any) => {
      if (window.label === "Small Windows") {
        formState.smallQty = window.qty || 0;
        formState.smallWindowRate = window.rate || 0;
      } else if (window.label === "Medium Windows") {
        formState.mediumQty = window.qty || 0;
        formState.mediumWindowRate = window.rate || 0;
      } else if (window.label === "Large Windows") {
        formState.largeQty = window.qty || 0;
        formState.largeWindowRate = window.rate || 0;
      }
    });
  }

  // Extract installation fee
  if (structuredData.installationFee) {
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

  // Extract totals (custom overrides)
  if (structuredData.totals) {
    if (structuredData.totals.perVisit) {
      formState.customPerVisitPrice = structuredData.totals.perVisit.amount;
    }
    if (structuredData.totals.monthlyRecurring) {
      formState.customMonthlyRecurring = structuredData.totals.monthlyRecurring.amount;
    }
    if (structuredData.totals.annual) {
      formState.contractMonths = structuredData.totals.annual.months || 12;
      formState.customAnnualPrice = structuredData.totals.annual.amount;
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

  // Extract pricing mode
  if (structuredData.pricingMode) {
    if (structuredData.pricingMode.value?.includes("All Inclusive")) {
      formState.pricingMode = "all_inclusive";
    } else if (structuredData.pricingMode.value?.includes("Geographic")) {
      formState.pricingMode = "geographic_standard";
    } else {
      formState.pricingMode = "auto";
    }
  }

  // Extract location
  if (structuredData.location) {
    formState.location = structuredData.location.value?.includes("Inside") ? "insideBeltway" : "outsideBeltway";
  }

  // Extract fixture breakdown
  if (structuredData.fixtureBreakdown && Array.isArray(structuredData.fixtureBreakdown)) {
    structuredData.fixtureBreakdown.forEach((fixture: any) => {
      if (fixture.label === "Sinks") {
        formState.sinks = fixture.qty || 0;
      } else if (fixture.label === "Urinals") {
        formState.urinals = fixture.qty || 0;
      } else if (fixture.label === "Male Toilets") {
        formState.maleToilets = fixture.qty || 0;
      } else if (fixture.label === "Female Toilets") {
        formState.femaleToilets = fixture.qty || 0;
      }
    });
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

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract location
  if (structuredData.location) {
    formState.location = structuredData.location.value?.includes("Inside") ? "beltway" : "standard";
  }

  // Extract drain breakdown
  if (structuredData.drainBreakdown && Array.isArray(structuredData.drainBreakdown)) {
    structuredData.drainBreakdown.forEach((drain: any) => {
      if (drain.label === "Standard Drains") {
        formState.standardDrainCount = drain.qty || 0;
        formState.standardDrainRate = drain.rate || 0;
      } else if (drain.label === "Grease Trap Drains") {
        formState.greaseTrapCount = drain.qty || 0;
        formState.greaseWeeklyRate = drain.rate || 0;
      } else if (drain.label === "Green Drains") {
        formState.greenDrainCount = drain.qty || 0;
        formState.greenWeeklyRate = drain.rate || 0;
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

export function transformCarpetCleanData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

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

  // Extract service (carpet area)
  if (structuredData.service) {
    formState.areaSqFt = structuredData.service.qty || 0;
    formState.firstUnitRate = structuredData.service.rate || 0;
  }

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

    // Extract custom installation fee if set
    if (structuredData.installation.total != null) {
      formState.customInstallationFee = structuredData.installation.total;
    }
  }

  // Extract totals
  if (structuredData.totals) {
    // Per visit
    if (structuredData.totals.perVisit) {
      formState.customPerVisitPrice = structuredData.totals.perVisit.amount;
    }

    // Monthly
    if (structuredData.totals.monthly) {
      formState.customMonthlyRecurring = structuredData.totals.monthly.amount;
    }

    // First month (with installation)
    if (structuredData.totals.firstMonth) {
      formState.customFirstMonthPrice = structuredData.totals.firstMonth.amount;
    }

    // Contract
    if (structuredData.totals.contract) {
      formState.contractMonths = structuredData.totals.contract.months || 12;
      formState.customContractTotal = structuredData.totals.contract.amount;
    }
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

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract service (floor area)
  if (structuredData.service) {
    formState.floorAreaSqFt = structuredData.service.qty || 0;
    formState.ratePerSqFt = structuredData.service.rate || 0;
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
    const placesMatch = structuredData.dusting.value?.match(/(\d+(?:\.\d+)?)/);
    if (placesMatch) {
      dustingPlaces = parseInt(placesMatch[1]);
      formState.dustingPlaces = dustingPlaces;
    }
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
    const dustingPlacesPerHour = 4; // Default from purejanitorial config
    const dustingHours = dustingPlaces / dustingPlacesPerHour;

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

  // Extract restroom fixtures
  if (structuredData.restroomFixtures) {
    formState.fixtureCount = structuredData.restroomFixtures.qty || 0;
  }

  // Extract non-bathroom area
  if (structuredData.nonBathroomArea) {
    formState.nonBathroomSqFt = structuredData.nonBathroomArea.qty || 0;
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

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract service breakdown
  if (structuredData.serviceBreakdown && Array.isArray(structuredData.serviceBreakdown)) {
    structuredData.serviceBreakdown.forEach((item: any) => {
      if (item.label === "Bathrooms") {
        formState.bathroomCount = item.qty || 0;
        if (item.rate != null) {
          formState.includedBathroomRate = item.rate;
        }
      } else if (item.label === "Huge Bathrooms") {
        formState.hugeBathroomSqFt = item.qty || 0;
        if (item.rate != null) {
          formState.hugeBathroomRatePerSqFt = item.rate;
        }
      } else if (item.label === "Extra Area") {
        formState.extraAreaSqFt = item.qty || 0;
        if (item.rate != null) {
          formState.extraAreaRatePerUnit = item.rate;
        }
      } else if (item.label === "Standalone Service") {
        formState.standaloneSqFt = item.qty || 0;
        if (item.rate != null) {
          formState.standaloneRatePerUnit = item.rate;
        }
      } else if (item.label === "Chemical Supply") {
        formState.chemicalGallons = item.qty || 0;
        if (item.rate != null) {
          formState.dailyChemicalPerGallon = item.rate;
        }
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

export function transformSanipodData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract service (sanipods)
  if (structuredData.service) {
    formState.podQuantity = structuredData.service.qty || 0;
    // Note: Don't extract rate here as it's calculated from totals
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

  // Extract service (grease traps)
  if (structuredData.service) {
    formState.numberOfTraps = structuredData.service.qty || 0;
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

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Handle NEW CONVERTED FORMAT (from backend edit-format endpoint)
  if (structuredData.hourlyRate !== undefined || structuredData.minimumVisit !== undefined) {
    console.log('🔄 [transformRefreshPowerScrubData] Using NEW converted format');

    // Direct values from converted format
    formState.hourlyRate = structuredData.hourlyRate || 200;
    formState.minimumVisit = structuredData.minimumVisit || 400;
    formState.frequency = structuredData.frequency || "monthly";
    formState.contractMonths = structuredData.contractMonths || 12;

    // Handle area objects directly with defaults
    const areaKeys = ['dumpster', 'patio', 'walkway', 'foh', 'boh', 'other'];
    for (const areaKey of areaKeys) {
      if (structuredData[areaKey]) {
        // Ensure all required fields are present with proper defaults
        formState[areaKey] = {
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
          contractMonths: 12,
          // Override with actual stored values
          ...structuredData[areaKey]
        };
        console.log(`🔄 [transformRefreshPowerScrubData] Mapped ${areaKey}:`, formState[areaKey]);
      } else {
        // Provide complete default area object
        formState[areaKey] = {
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
      }
    }

    // Extract custom fields
    formState.customFields = extractCustomFields(structuredData);

    console.log('🔄 [transformRefreshPowerScrubData] Converted form state:', formState);
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

  // Extract pricing method
  if (structuredData.pricingMethod) {
    formState.pricingMethod = structuredData.pricingMethod.value?.includes("Room") ? "byRoom" : "bySqFt";
  }

  // Extract service data
  if (structuredData.service) {
    if (formState.pricingMethod === "byRoom") {
      formState.roomCount = structuredData.service.qty || 0;
      if (structuredData.service.rate != null) {
        formState.ratePerRoom = structuredData.service.rate;
      }
    } else {
      formState.squareFeet = structuredData.service.qty || 0;
      if (structuredData.service.rate != null) {
        formState.ratePerThousandSqFt = structuredData.service.rate;
      }
    }
  }

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract location
  if (structuredData.location) {
    const loc = structuredData.location.value?.toLowerCase();
    formState.location = loc?.includes("inside") ? "insideBeltway" :
                        loc?.includes("outside") ? "outsideBeltway" : "standard";
  }

  // Extract combined flag
  if (structuredData.combinedService) {
    formState.isCombinedWithSaniClean = structuredData.combinedService.value?.includes("Sani-Clean");
  }

  // Extract trip charge if present
  if (structuredData.tripCharge) {
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
