// src/components/services/common/dataTransformers.ts
/**
 * Transforms structured service data (from backend/saved PDF) back into form state
 * that the service forms can use to initialize their fields.
 */

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

  // Extract service (carpet area)
  if (structuredData.service) {
    formState.areaSqFt = structuredData.service.qty || 0;
    formState.firstUnitRate = structuredData.service.rate || 0;
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

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

  return formState;
}

export function transformJanitorialData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

  // Extract frequency
  if (structuredData.frequency) {
    formState.frequency = structuredData.frequency.value?.toLowerCase() || "weekly";
  }

  // Extract scheduling mode
  if (structuredData.schedulingMode) {
    formState.schedulingMode = structuredData.schedulingMode.value?.includes("Normal") ? "normalRoute" : "standalone";
  }

  // Extract service (hours)
  if (structuredData.service) {
    formState.manualHours = structuredData.service.qty || 0;
  }

  // Extract vacuuming
  if (structuredData.vacuuming) {
    const hoursMatch = structuredData.vacuuming.value?.match(/(\d+)/);
    if (hoursMatch) {
      formState.vacuumingHours = parseInt(hoursMatch[1]);
    }
  }

  // Extract dusting
  if (structuredData.dusting) {
    const placesMatch = structuredData.dusting.value?.match(/(\d+)/);
    if (placesMatch) {
      formState.dustingPlaces = parseInt(placesMatch[1]);
    }
  }

  // Extract contract months
  if (structuredData.totals && structuredData.totals.contract) {
    formState.contractMonths = structuredData.totals.contract.months || 12;
  }

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

  return formState;
}

export function transformRefreshPowerScrubData(structuredData: any): any {
  if (!structuredData || !structuredData.isActive) return undefined;

  const formState: any = {
    notes: structuredData.notes || "",
  };

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

  return formState;
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
    default:
      console.warn(`No transformer found for service: ${serviceId}`);
      return undefined;
  }
}
