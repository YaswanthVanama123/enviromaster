// servicePricingFieldMappings.ts
// Comprehensive field mappings for all services matching the new backend JSON structure

export interface PricingField {
  label: string;
  value: number;
  path: string[];
  unit?: string;
  description?: string;
}

type ServiceId =
  | "carpetCleaning"
  | "electrostaticSpray"
  | "foamingDrain"
  | "microfiberMopping"
  | "pureJanitorial"
  | "refreshPowerScrub"
  | "rpmWindows"
  | "saniclean"
  | "sanipod"
  | "saniscrub"
  | "stripWax";

/**
 * Helper to get nested value from config object
 */
function getValue(config: any, path: string[]): any {
  let current: any = config;
  for (const key of path) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Get all pricing fields for a service organized by category
 */
export function getServicePricingFields(
  serviceId: ServiceId,
  config: any
): Record<string, PricingField[]> {
  const categories: Record<string, PricingField[]> = {};

  switch (serviceId) {
    case "electrostaticSpray":
      return getElectrostaticSprayFields(config);
    case "foamingDrain":
      return getFoamingDrainFields(config);
    case "pureJanitorial":
      return getPureJanitorialFields(config);
    case "saniclean":
      return getSaniCleanFields(config);
    case "sanipod":
      return getSaniPodFields(config);
    case "saniscrub":
      return getSaniScrubFields(config);
    case "stripWax":
      return getStripWaxFields(config);
    case "refreshPowerScrub":
      return getRefreshPowerScrubFields(config);
    default:
      return {};
  }
}

/**
 * FOAMING DRAIN - Complete field mapping
 */
function getFoamingDrainFields(config: any): Record<string, PricingField[]> {
  const standardPricing = getValue(config, []) || {};
  const volumePricing = getValue(config, ["volumePricing"]) || {};
  const greasePricing = getValue(config, ["grease"]) || {};
  const greenPricing = getValue(config, ["green"]) || {};
  const plumbingPricing = getValue(config, ["plumbing"]) || {};
  const billingConv = getValue(config, ["billingConversions"]) || {};
  const contractSettings = getValue(config, ["contract"]) || {};
  const tripCharges = getValue(config, ["tripCharges"]) || {};

  return {
    standardRates: [
      {
        label: "Standard Drain Rate",
        value: config.standardDrainRate ?? 0,
        path: ["standardDrainRate"],
        unit: "$ per drain",
        description: "Standard rate per drain (typically $10)",
      },
      {
        label: "Alternative Base Charge",
        value: config.altBaseCharge ?? 0,
        path: ["altBaseCharge"],
        unit: "$",
        description: "Alternative base charge (typically $20)",
      },
      {
        label: "Alternative Extra Per Drain",
        value: config.altExtraPerDrain ?? 0,
        path: ["altExtraPerDrain"],
        unit: "$ per drain",
        description: "Alternative extra charge per drain (typically $4)",
      },
    ],
    volumePricing: [
      {
        label: "Volume Pricing - Minimum Drains",
        value: volumePricing.minimumDrains ?? 0,
        path: ["volumePricing", "minimumDrains"],
        unit: "drains",
        description: "Minimum drains for volume pricing (typically 10)",
      },
      {
        label: "Volume Pricing - Weekly Rate Per Drain",
        value: volumePricing.weekly?.ratePerDrain ?? 0,
        path: ["volumePricing", "weekly", "ratePerDrain"],
        unit: "$ per drain",
        description: "Weekly rate per drain for volume pricing (typically $20)",
      },
      {
        label: "Volume Pricing - Bimonthly Rate Per Drain",
        value: volumePricing.bimonthly?.ratePerDrain ?? 0,
        path: ["volumePricing", "bimonthly", "ratePerDrain"],
        unit: "$ per drain",
        description: "Bimonthly rate per drain for volume pricing (typically $10)",
      },
    ],
    greaseTraps: [
      {
        label: "Grease Trap - Weekly Rate Per Trap",
        value: greasePricing.weeklyRatePerTrap ?? 0,
        path: ["grease", "weeklyRatePerTrap"],
        unit: "$ per trap",
        description: "Weekly rate per grease trap (typically $125)",
      },
      {
        label: "Grease Trap - Install Per Trap",
        value: greasePricing.installPerTrap ?? 0,
        path: ["grease", "installPerTrap"],
        unit: "$",
        description: "One-time installation per grease trap (typically $300)",
      },
    ],
    greenDrains: [
      {
        label: "Green Drain - Weekly Rate Per Drain",
        value: greenPricing.weeklyRatePerDrain ?? 0,
        path: ["green", "weeklyRatePerDrain"],
        unit: "$ per drain",
        description: "Weekly rate per green drain (typically $5)",
      },
      {
        label: "Green Drain - Install Per Drain",
        value: greenPricing.installPerDrain ?? 0,
        path: ["green", "installPerDrain"],
        unit: "$",
        description: "One-time installation per green drain (typically $100)",
      },
    ],
    plumbingAddon: [
      {
        label: "Plumbing Add-on Per Drain Per Week",
        value: plumbingPricing.weeklyAddonPerDrain ?? 0,
        path: ["plumbing", "weeklyAddonPerDrain"],
        unit: "$ per drain",
        description: "Weekly plumbing add-on per drain (typically $10)",
      },
    ],
    tripCharges: [
      {
        label: "Standard Trip Charge",
        value: tripCharges.standard ?? 0,
        path: ["tripCharges", "standard"],
        unit: "$",
        description: "Standard trip charge",
      },
      {
        label: "Beltway Trip Charge",
        value: tripCharges.beltway ?? 0,
        path: ["tripCharges", "beltway"],
        unit: "$",
        description: "Beltway area trip charge",
      },
    ],
    contractTerms: [
      {
        label: "Minimum Contract Months",
        value: contractSettings.minMonths ?? 0,
        path: ["contract", "minMonths"],
        unit: "months",
        description: "Minimum contract duration (typically 2 months)",
      },
      {
        label: "Maximum Contract Months",
        value: contractSettings.maxMonths ?? 0,
        path: ["contract", "maxMonths"],
        unit: "months",
        description: "Maximum contract duration (typically 36 months)",
      },
      {
        label: "Default Contract Months",
        value: contractSettings.defaultMonths ?? 0,
        path: ["contract", "defaultMonths"],
        unit: "months",
        description: "Default contract duration (typically 12 months)",
      },
    ],
    frequencyConversions: [
      {
        label: "Weekly - Monthly Recurring Multiplier",
        value: billingConv.weekly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "weekly", "monthlyMultiplier"],
        unit: "×",
        description: "Multiply weekly rate to get monthly billing (typically 4.33)",
      },
      {
        label: "Weekly - First Month Extra Multiplier",
        value: billingConv.weekly?.monthlyVisits ?? 0,
        path: ["billingConversions", "weekly", "monthlyVisits"],
        unit: "×",
        description: "Additional multiplier for first month (typically 3.33)",
      },
      {
        label: "Biweekly - Monthly Recurring Multiplier",
        value: billingConv.biweekly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "biweekly", "monthlyMultiplier"],
        unit: "×",
        description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
      },
      {
        label: "Biweekly - First Month Extra Multiplier",
        value: (billingConv.biweekly?.monthlyMultiplier ?? 0) - 1,
        path: ["billingConversions", "biweekly", "monthlyMultiplier"],
        unit: "×",
        description: "Additional multiplier for first month (typically 1.165)",
      },
      {
        label: "Monthly - Cycle Months",
        value: billingConv.monthly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "monthly", "monthlyMultiplier"],
        unit: "months",
        description: "Monthly billing cycle multiplier (typically 1)",
      },
      {
        label: "Bimonthly - Cycle Months",
        value: 1 / (billingConv.bimonthly?.monthlyMultiplier ?? 1),
        path: ["billingConversions", "bimonthly", "monthlyMultiplier"],
        unit: "months",
        description: "Billing cycle in months (typically 2)",
      },
      {
        label: "Quarterly - Cycle Months",
        value: 1 / (billingConv.quarterly?.monthlyMultiplier ?? 1),
        path: ["billingConversions", "quarterly", "monthlyMultiplier"],
        unit: "months",
        description: "Billing cycle in months (typically 3)",
      },
      {
        label: "Biannual - Monthly Multiplier",
        value: billingConv.biannual?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "biannual", "monthlyMultiplier"],
        unit: "×",
        description: "Biannual to monthly conversion (typically 0.167)",
      },
      {
        label: "Annual - Monthly Multiplier",
        value: billingConv.annual?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "annual", "monthlyMultiplier"],
        unit: "×",
        description: "Annual to monthly conversion (typically 0.083)",
      },
    ],
  };
}

/**
 * ELECTROSTATIC SPRAY - Complete field mapping
 */
function getElectrostaticSprayFields(config: any): Record<string, PricingField[]> {
  const standardSprayPricing = getValue(config, ["standardSprayPricing"]) || {};
  const tripCharges = getValue(config, ["tripCharges"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};

  return {
    standardRates: [
      {
        label: "Spray Rate Per Room",
        value: standardSprayPricing.sprayRatePerRoom ?? 0,
        path: ["standardSprayPricing", "sprayRatePerRoom"],
        unit: "$ per room",
        description: "Rate per room when pricing by room count",
      },
      {
        label: "Sq-ft Unit",
        value: standardSprayPricing.sqFtUnit ?? 0,
        path: ["standardSprayPricing", "sqFtUnit"],
        unit: "sq ft",
        description: "Square footage unit for pricing (typically 1000 sq ft)",
      },
      {
        label: "Spray Rate Per Sq-ft Unit",
        value: standardSprayPricing.sprayRatePerSqFtUnit ?? 0,
        path: ["standardSprayPricing", "sprayRatePerSqFtUnit"],
        unit: "$ per unit",
        description: "Rate per square footage unit",
      },
      {
        label: "Minimum Price Optional",
        value: standardSprayPricing.minimumPriceOptional ?? 0,
        path: ["standardSprayPricing", "minimumPriceOptional"],
        unit: "$",
        description: "Optional minimum price per visit",
      },
      {
        label: "Minimum Charge Per Visit",
        value: getValue(config, ["minimumChargePerVisit"]) ?? 0,
        path: ["minimumChargePerVisit"],
        unit: "$",
        description: "Minimum charge per service visit",
      },
    ],
    tripCharges: [
      {
        label: "Standard Trip Charge",
        value: tripCharges.standard ?? 0,
        path: ["tripCharges", "standard"],
        unit: "$",
        description: "Standard trip charge for service visits",
      },
      {
        label: "Beltway Trip Charge",
        value: tripCharges.beltway ?? 0,
        path: ["tripCharges", "beltway"],
        unit: "$",
        description: "Trip charge for beltway locations",
      },
    ],
    frequencyConversions: [
      {
        label: "Weekly - Monthly Recurring Multiplier",
        value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Weekly to monthly conversion (typically 4.33)",
      },
      {
        label: "Biweekly - Monthly Recurring Multiplier",
        value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Biweekly to monthly conversion (typically 2.165)",
      },
      {
        label: "Monthly - Cycle Months",
        value: freqMeta.monthly?.cycleMonths ?? 0,
        path: ["frequencyMetadata", "monthly", "cycleMonths"],
        unit: "months",
        description: "Billing cycle in months",
      },
    ],
  };
}

/**
 * PURE JANITORIAL - Complete field mapping
 */
function getPureJanitorialFields(config: any): Record<string, PricingField[]> {
  const standardHourly = getValue(config, ["standardHourlyPricing"]) || {};
  const shortJob = getValue(config, ["shortJobHourlyPricing"]) || {};
  const vacuuming = getValue(config, ["vacuuming"]) || {};
  const dusting = getValue(config, ["dusting"]) || {};
  const contract = getValue(config, ["contract"]) || {};
  const tripCharges = getValue(config, ["tripCharges"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};
  const smoothBreakdown = getValue(config, ["smoothBreakdownPricingTable"]) || [];

  const baseRates: PricingField[] = [
    {
      label: "Standard Hourly Rate",
      value: standardHourly.standardHourlyRate ?? 0,
      path: ["standardHourlyPricing", "standardHourlyRate"],
      unit: "$ per hour",
      description: "Standard hourly rate for janitorial services (typically $30)",
    },
    {
      label: "Minimum Hours Per Trip",
      value: standardHourly.minimumHoursPerTrip ?? 0,
      path: ["standardHourlyPricing", "minimumHoursPerTrip"],
      unit: "hours",
      description: "Minimum billable hours per visit (typically 4 hours)",
    },
    {
      label: "Short Job Hourly Rate",
      value: shortJob.shortJobHourlyRate ?? 0,
      path: ["shortJobHourlyPricing", "shortJobHourlyRate"],
      unit: "$ per hour",
      description: "Premium hourly rate for short jobs (typically $50)",
    },
    {
      label: "Minimum Charge Per Visit",
      value: getValue(config, ["minimumChargePerVisit"]) ?? 0,
      path: ["minimumChargePerVisit"],
      unit: "$",
      description: "Minimum charge per service visit",
    },
  ];

  const dustingVacuuming: PricingField[] = [
    {
      label: "Dusting - Items Per Hour",
      value: dusting.itemsPerHour ?? 0,
      path: ["dusting", "itemsPerHour"],
      unit: "items/hour",
      description: "Number of items that can be dusted per hour (typically 30)",
    },
    {
      label: "Dusting - Price Per Item",
      value: dusting.pricePerItem ?? 0,
      path: ["dusting", "pricePerItem"],
      unit: "$",
      description: "Price per individual dusting item",
    },
    {
      label: "Dusting - Dirty First Time Multiplier",
      value: dusting.dirtyFirstTimeMultiplier ?? 0,
      path: ["dusting", "dirtyFirstTimeMultiplier"],
      unit: "×",
      description: "Multiplier for first-time dirty facilities (typically 3x)",
    },
    {
      label: "Dusting - Infrequent Service Multiplier (4/Year)",
      value: dusting.infrequentServiceMultiplier4PerYear ?? 0,
      path: ["dusting", "infrequentServiceMultiplier4PerYear"],
      unit: "×",
      description: "Multiplier for infrequent service (typically 3x)",
    },
    {
      label: "Vacuuming - Estimated Time Hours Per Job",
      value: vacuuming.estimatedTimeHoursPerJob ?? 0,
      path: ["vacuuming", "estimatedTimeHoursPerJob"],
      unit: "hours",
      description: "Estimated hours for vacuuming job",
    },
    {
      label: "Vacuuming - Large Job Minimum Time Hours",
      value: vacuuming.largeJobMinimumTimeHours ?? 0,
      path: ["vacuuming", "largeJobMinimumTimeHours"],
      unit: "hours",
      description: "Minimum hours for large vacuuming jobs",
    },
  ];

  const contractTerms: PricingField[] = [
    {
      label: "Minimum Contract Months",
      value: contract.minMonths ?? 0,
      path: ["contract", "minMonths"],
      unit: "months",
      description: "Minimum contract duration (typically 2 months)",
    },
    {
      label: "Maximum Contract Months",
      value: contract.maxMonths ?? 0,
      path: ["contract", "maxMonths"],
      unit: "months",
      description: "Maximum contract duration (typically 36 months)",
    },
  ];

  const tripChargeFields: PricingField[] = [
    {
      label: "Standard Trip Charge",
      value: tripCharges.standard ?? 0,
      path: ["tripCharges", "standard"],
      unit: "$",
      description: "Standard trip charge",
    },
    {
      label: "Beltway Trip Charge",
      value: tripCharges.beltway ?? 0,
      path: ["tripCharges", "beltway"],
      unit: "$",
      description: "Beltway area trip charge",
    },
  ];

  const frequencyConversions: PricingField[] = [
    {
      label: "Weekly - Monthly Recurring Multiplier",
      value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
      path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
      unit: "×",
      description: "Weekly to monthly conversion (typically 4.33)",
    },
    {
      label: "Biweekly - Monthly Recurring Multiplier",
      value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
      path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
      unit: "×",
      description: "Biweekly to monthly conversion (typically 2.165)",
    },
  ];

  return {
    baseRates,
    dustingVacuuming,
    contractTerms,
    tripCharges: tripChargeFields,
    frequencyConversions,
  };
}

/**
 * SANICLEAN - Complete field mapping
 */
function getSaniCleanFields(config: any): Record<string, PricingField[]> {
  const standardALaCarte = getValue(config, ["standardALaCartePricing"]) || {};
  const insideBeltway = standardALaCarte.insideBeltway || {};
  const outsideBeltway = standardALaCarte.outsideBeltway || {};
  const allInclusive = getValue(config, ["allInclusivePricing"]) || {};
  const smallBathroom = getValue(config, ["smallBathroomMinimums"]) || {};
  const soapUpgrades = getValue(config, ["soapUpgrades"]) || {};
  const excessUsage = soapUpgrades.excessUsageCharges || {};
  const warrantyFees = getValue(config, ["warrantyFees"]) || {};
  const paperCredit = getValue(config, ["paperCredit"]) || {};
  const monthlyAddOns = getValue(config, ["monthlyAddOnSupplyPricing"]) || {};
  const microfiberMopping = getValue(config, ["microfiberMoppingIncludedWithSaniClean"]) || {};
  const tripCharges = getValue(config, ["tripChargesNonAllInclusiveOnly"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};

  return {
    insideBeltway: [
      {
        label: "Price Per Fixture",
        value: insideBeltway.pricePerFixture ?? 0,
        path: ["standardALaCartePricing", "insideBeltway", "pricePerFixture"],
        unit: "$ per fixture",
        description: "Rate per fixture for inside beltway locations (typically $7)",
      },
      {
        label: "Minimum Price",
        value: insideBeltway.minimumPrice ?? 0,
        path: ["standardALaCartePricing", "insideBeltway", "minimumPrice"],
        unit: "$",
        description: "Minimum weekly charge (typically $40)",
      },
      {
        label: "Trip Charge",
        value: insideBeltway.tripCharge ?? 0,
        path: ["standardALaCartePricing", "insideBeltway", "tripCharge"],
        unit: "$",
        description: "Trip charge for inside beltway",
      },
      {
        label: "Parking Fee Add-On",
        value: insideBeltway.parkingFeeAddOn ?? 0,
        path: ["standardALaCartePricing", "insideBeltway", "parkingFeeAddOn"],
        unit: "$",
        description: "Pass-through parking fee",
      },
    ],
    outsideBeltway: [
      {
        label: "Price Per Fixture",
        value: outsideBeltway.pricePerFixture ?? 0,
        path: ["standardALaCartePricing", "outsideBeltway", "pricePerFixture"],
        unit: "$ per fixture",
        description: "Rate per fixture for outside beltway (typically $6)",
      },
      {
        label: "Trip Charge",
        value: outsideBeltway.tripCharge ?? 0,
        path: ["standardALaCartePricing", "outsideBeltway", "tripCharge"],
        unit: "$",
        description: "Trip charge for outside beltway",
      },
    ],
    allInclusive: [
      {
        label: "Price Per Fixture",
        value: allInclusive.pricePerFixture ?? 0,
        path: ["allInclusivePricing", "pricePerFixture"],
        unit: "$ per fixture",
        description: "All-inclusive rate per fixture (typically $20)",
      },
      {
        label: "Include All Add-Ons",
        value: allInclusive.includeAllAddOns ? 1 : 0,
        path: ["allInclusivePricing", "includeAllAddOns"],
        unit: "boolean",
        description: "Whether all add-ons are included",
      },
      {
        label: "Waive Trip Charge",
        value: allInclusive.waiveTripCharge ? 1 : 0,
        path: ["allInclusivePricing", "waiveTripCharge"],
        unit: "boolean",
        description: "Trip charge is waived",
      },
      {
        label: "Auto All-Inclusive Min Fixtures",
        value: allInclusive.autoAllInclusiveMinFixtures ?? 0,
        path: ["allInclusivePricing", "autoAllInclusiveMinFixtures"],
        unit: "fixtures",
        description: "Minimum fixtures to auto-trigger all-inclusive (typically 10)",
      },
    ],
    smallFacility: [
      {
        label: "Minimum Fixtures Threshold",
        value: smallBathroom.minimumFixturesThreshold ?? 0,
        path: ["smallBathroomMinimums", "minimumFixturesThreshold"],
        unit: "fixtures",
        description: "Max fixtures for small facility pricing (typically 5)",
      },
      {
        label: "Minimum Price Under Threshold",
        value: smallBathroom.minimumPriceUnderThreshold ?? 0,
        path: ["smallBathroomMinimums", "minimumPriceUnderThreshold"],
        unit: "$",
        description: "Minimum charge for small facilities (typically $50)",
      },
    ],
    soapUpgrades: [
      {
        label: "Standard to Luxury Per Dispenser Per Week",
        value: soapUpgrades.standardToLuxuryPerDispenserPerWeek ?? 0,
        path: ["soapUpgrades", "standardToLuxuryPerDispenserPerWeek"],
        unit: "$ per dispenser",
        description: "Upgrade charge from standard to luxury soap (typically $5)",
      },
      {
        label: "Excess Standard Soap Per Gallon",
        value: excessUsage.standardSoapPerGallon ?? 0,
        path: ["soapUpgrades", "excessUsageCharges", "standardSoapPerGallon"],
        unit: "$ per gallon",
        description: "Charge for excess standard soap usage (typically $13)",
      },
      {
        label: "Excess Luxury Soap Per Gallon",
        value: excessUsage.luxurySoapPerGallon ?? 0,
        path: ["soapUpgrades", "excessUsageCharges", "luxurySoapPerGallon"],
        unit: "$ per gallon",
        description: "Charge for excess luxury soap usage (typically $30)",
      },
    ],
    warrantyCredits: [
      {
        label: "Air Freshener Warranty Fee Per Week",
        value: warrantyFees.airFreshenerDispenserWarrantyFeePerWeek ?? 0,
        path: ["warrantyFees", "airFreshenerDispenserWarrantyFeePerWeek"],
        unit: "$ per week",
        description: "Weekly warranty fee for air freshener dispenser (typically $1)",
      },
      {
        label: "Soap Warranty Fee Per Week",
        value: warrantyFees.soapDispenserWarrantyFeePerWeek ?? 0,
        path: ["warrantyFees", "soapDispenserWarrantyFeePerWeek"],
        unit: "$ per week",
        description: "Weekly warranty fee for soap dispenser (typically $1)",
      },
      {
        label: "Paper Credit Per Fixture Per Week",
        value: paperCredit.creditPerFixturePerWeek ?? 0,
        path: ["paperCredit", "creditPerFixturePerWeek"],
        unit: "$ per fixture",
        description: "Weekly paper product credit per fixture (typically $5)",
      },
    ],
    monthlyAddOns: [
      {
        label: "Urinal Mat Monthly Price",
        value: monthlyAddOns.urinalMatMonthlyPrice ?? 0,
        path: ["monthlyAddOnSupplyPricing", "urinalMatMonthlyPrice"],
        unit: "$ per month",
        description: "Monthly charge for urinal mat (typically $16)",
      },
      {
        label: "Toilet Clip Monthly Price",
        value: monthlyAddOns.toiletClipMonthlyPrice ?? 0,
        path: ["monthlyAddOnSupplyPricing", "toiletClipMonthlyPrice"],
        unit: "$ per month",
        description: "Monthly charge for toilet clip (typically $4)",
      },
      {
        label: "SaniPod Monthly Price Per Pod",
        value: monthlyAddOns.sanipodMonthlyPricePerPod ?? 0,
        path: ["monthlyAddOnSupplyPricing", "sanipodMonthlyPricePerPod"],
        unit: "$ per month",
        description: "Monthly charge per SaniPod unit (typically $12)",
      },
    ],
    microfiberMopping: [
      {
        label: "Price Per Bathroom",
        value: microfiberMopping.pricePerBathroom ?? 0,
        path: ["microfiberMoppingIncludedWithSaniClean", "pricePerBathroom"],
        unit: "$ per bathroom",
        description: "Mopping charge per bathroom when bundled (typically $10)",
      },
      {
        label: "Huge Bathroom Sq-ft Unit",
        value: microfiberMopping.hugeBathroomSqFtUnit ?? 0,
        path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomSqFtUnit"],
        unit: "sq ft",
        description: "Threshold for huge bathroom (typically 300 sq ft)",
      },
      {
        label: "Huge Bathroom Rate",
        value: microfiberMopping.hugeBathroomRate ?? 0,
        path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomRate"],
        unit: "$ per unit",
        description: "Rate for huge bathrooms",
      },
    ],
    tripCharges: [
      {
        label: "Standard Trip Charge (Non-All-Inclusive)",
        value: tripCharges.standard ?? 0,
        path: ["tripChargesNonAllInclusiveOnly", "standard"],
        unit: "$",
        description: "Standard trip charge when not all-inclusive (typically $8)",
      },
      {
        label: "Beltway Trip Charge (Non-All-Inclusive)",
        value: tripCharges.beltway ?? 0,
        path: ["tripChargesNonAllInclusiveOnly", "beltway"],
        unit: "$",
        description: "Beltway trip charge when not all-inclusive (typically $8)",
      },
    ],
    frequencyConversions: [
      {
        label: "Weekly - Monthly Recurring Multiplier",
        value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Weekly to monthly conversion (typically 4.33)",
      },
      {
        label: "Biweekly - Monthly Recurring Multiplier",
        value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Biweekly to monthly conversion (typically 2.165)",
      },
    ],
  };
}

/**
 * SANIPOD - Complete field mapping
 */
function getSaniPodFields(config: any): Record<string, PricingField[]> {
  const corePricing = getValue(config, ["corePricingIncludedWithSaniClean"]) || {};
  const extraBagPricing = getValue(config, ["extraBagPricing"]) || {};
  const standalonePricing = getValue(config, ["standalonePricingWithoutSaniClean"]) || {};
  const tripCharges = getValue(config, ["tripChargesStandaloneOnly"]) || {};
  const rateCategories = getValue(config, ["rateCategories"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};

  return {
    podRates: [
      {
        label: "Weekly Price Per Unit (With SaniClean)",
        value: corePricing.weeklyPricePerUnit ?? 0,
        path: ["corePricingIncludedWithSaniClean", "weeklyPricePerUnit"],
        unit: "$ per unit",
        description: "Weekly rate per pod when bundled with SaniClean (typically $3)",
      },
      {
        label: "Install Price Per Unit",
        value: corePricing.installPricePerUnit ?? 0,
        path: ["corePricingIncludedWithSaniClean", "installPricePerUnit"],
        unit: "$",
        description: "One-time installation charge per pod (typically $25)",
      },
      {
        label: "Included Weekly Refills",
        value: corePricing.includedWeeklyRefills ?? 0,
        path: ["corePricingIncludedWithSaniClean", "includedWeeklyRefills"],
        unit: "refills",
        description: "Number of weekly refills included",
      },
    ],
    extraBags: [
      {
        label: "Price Per Bag",
        value: extraBagPricing.pricePerBag ?? 0,
        path: ["extraBagPricing", "pricePerBag"],
        unit: "$ per bag",
        description: "Price per additional waste bag (typically $2)",
      },
    ],
    standaloneService: [
      {
        label: "Price Per Unit Per Week (Standalone)",
        value: standalonePricing.pricePerUnitPerWeek ?? 0,
        path: ["standalonePricingWithoutSaniClean", "pricePerUnitPerWeek"],
        unit: "$ per unit",
        description: "Weekly rate when standalone (typically $8)",
      },
      {
        label: "Alternate Price Per Unit Per Week",
        value: standalonePricing.alternatePricePerUnitPerWeek ?? 0,
        path: ["standalonePricingWithoutSaniClean", "alternatePricePerUnitPerWeek"],
        unit: "$ per unit",
        description: "Alternate pricing model rate (typically $3)",
      },
      {
        label: "Weekly Minimum Price",
        value: standalonePricing.weeklyMinimumPrice ?? 0,
        path: ["standalonePricingWithoutSaniClean", "weeklyMinimumPrice"],
        unit: "$",
        description: "Minimum weekly charge for standalone (typically $40)",
      },
      {
        label: "Use Cheapest Option",
        value: standalonePricing.useCheapestOption ? 1 : 0,
        path: ["standalonePricingWithoutSaniClean", "useCheapestOption"],
        unit: "boolean",
        description: "Automatically use the cheaper pricing option",
      },
    ],
    tripCharges: [
      {
        label: "Standard Trip Charge (Standalone)",
        value: tripCharges.standard ?? 0,
        path: ["tripChargesStandaloneOnly", "standard"],
        unit: "$",
        description: "Trip charge for standalone service",
      },
      {
        label: "Beltway Trip Charge (Standalone)",
        value: tripCharges.beltway ?? 0,
        path: ["tripChargesStandaloneOnly", "beltway"],
        unit: "$",
        description: "Beltway trip charge for standalone service",
      },
    ],
    contractTerms: [
      {
        label: "Min Contract Months",
        value: getValue(config, ["minContractMonths"]) ?? 0,
        path: ["minContractMonths"],
        unit: "months",
        description: "Minimum contract duration (typically 2 months)",
      },
      {
        label: "Max Contract Months",
        value: getValue(config, ["maxContractMonths"]) ?? 0,
        path: ["maxContractMonths"],
        unit: "months",
        description: "Maximum contract duration (typically 36 months)",
      },
    ],
    rateTiers: [
      {
        label: "Red Rate Multiplier",
        value: rateCategories.redRate?.multiplier ?? 0,
        path: ["rateCategories", "redRate", "multiplier"],
        unit: "×",
        description: "Standard rate multiplier (typically 1.0)",
      },
      {
        label: "Green Rate Multiplier",
        value: rateCategories.greenRate?.multiplier ?? 0,
        path: ["rateCategories", "greenRate", "multiplier"],
        unit: "×",
        description: "Premium rate multiplier (typically 1.3)",
      },
    ],
    frequencyConversions: [
      {
        label: "Weekly - Monthly Recurring Multiplier",
        value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Weekly to monthly conversion (typically 4.33)",
      },
      {
        label: "Biweekly - Monthly Recurring Multiplier",
        value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Biweekly to monthly conversion (typically 2.165)",
      },
    ],
  };
}

/**
 * SANISCRUB - Complete field mapping
 */
function getSaniScrubFields(config: any): Record<string, PricingField[]> {
  const monthlyPricing = getValue(config, ["monthlyPricing"]) || {};
  const bimonthlyPricing = getValue(config, ["bimonthlyPricing"]) || {};
  const quarterlyPricing = getValue(config, ["quarterlyPricing"]) || {};
  const twicePerMonth = getValue(config, ["twicePerMonthPricing"]) || {};
  const nonBathroom = getValue(config, ["nonBathroomSqFtPricingRule"]) || {};
  const installation = getValue(config, ["installationPricing"]) || {};
  const tripCharges = getValue(config, ["tripCharges"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};

  return {
    fixtureRates: [
      {
        label: "Monthly - Price Per Fixture",
        value: monthlyPricing.pricePerFixture ?? 0,
        path: ["monthlyPricing", "pricePerFixture"],
        unit: "$ per fixture",
        description: "Monthly rate per fixture (typically $25)",
      },
      {
        label: "Monthly - Minimum Price",
        value: monthlyPricing.minimumPrice ?? 0,
        path: ["monthlyPricing", "minimumPrice"],
        unit: "$",
        description: "Monthly minimum charge (typically $175)",
      },
      {
        label: "Bimonthly - Price Per Fixture",
        value: bimonthlyPricing.pricePerFixture ?? 0,
        path: ["bimonthlyPricing", "pricePerFixture"],
        unit: "$ per fixture",
        description: "Bimonthly rate per fixture (typically $35)",
      },
      {
        label: "Bimonthly - Minimum Price",
        value: bimonthlyPricing.minimumPrice ?? 0,
        path: ["bimonthlyPricing", "minimumPrice"],
        unit: "$",
        description: "Bimonthly minimum charge (typically $250)",
      },
      {
        label: "Quarterly - Price Per Fixture",
        value: quarterlyPricing.pricePerFixture ?? 0,
        path: ["quarterlyPricing", "pricePerFixture"],
        unit: "$ per fixture",
        description: "Quarterly rate per fixture (typically $40)",
      },
      {
        label: "Quarterly - Minimum Price",
        value: quarterlyPricing.minimumPrice ?? 0,
        path: ["quarterlyPricing", "minimumPrice"],
        unit: "$",
        description: "Quarterly minimum charge (typically $250)",
      },
    ],
    discountsAndFees: [
      {
        label: "Twice Per Month Discount",
        value: twicePerMonth.discountFromMonthlyRate ?? 0,
        path: ["twicePerMonthPricing", "discountFromMonthlyRate"],
        unit: "$",
        description: "Discount for twice-monthly service (typically $15)",
      },
      {
        label: "Standard Trip Charge",
        value: tripCharges.standard ?? 0,
        path: ["tripCharges", "standard"],
        unit: "$",
        description: "Standard trip charge (typically $8)",
      },
      {
        label: "Beltway Trip Charge",
        value: tripCharges.beltway ?? 0,
        path: ["tripCharges", "beltway"],
        unit: "$",
        description: "Beltway trip charge (typically $8)",
      },
      {
        label: "Parking Fee Add-On",
        value: getValue(config, ["parkingFeeAddOn"]) ?? 0,
        path: ["parkingFeeAddOn"],
        unit: "$",
        description: "Pass-through parking fee",
      },
    ],
    nonBathroomPricing: [
      {
        label: "Sq-ft Block Unit",
        value: nonBathroom.sqFtBlockUnit ?? 0,
        path: ["nonBathroomSqFtPricingRule", "sqFtBlockUnit"],
        unit: "sq ft",
        description: "Square footage unit for non-bathroom areas (typically 500 sq ft)",
      },
      {
        label: "Price First Block",
        value: nonBathroom.priceFirstBlock ?? 0,
        path: ["nonBathroomSqFtPricingRule", "priceFirstBlock"],
        unit: "$",
        description: "Price for first block (typically $250)",
      },
      {
        label: "Price Additional Block",
        value: nonBathroom.priceAdditionalBlock ?? 0,
        path: ["nonBathroomSqFtPricingRule", "priceAdditionalBlock"],
        unit: "$",
        description: "Price for each additional block (typically $125)",
      },
    ],
    installMultipliers: [
      {
        label: "Install Multiplier Dirty/First-Time",
        value: installation.installMultiplierDirtyOrFirstTime ?? 0,
        path: ["installationPricing", "installMultiplierDirtyOrFirstTime"],
        unit: "×",
        description: "Multiplier for dirty/first-time installations (typically 3x)",
      },
      {
        label: "Allow Install Fee Waiver",
        value: installation.allowInstallFeeWaiver ? 1 : 0,
        path: ["installationPricing", "allowInstallFeeWaiver"],
        unit: "boolean",
        description: "Whether installation fee can be waived",
      },
    ],
    frequencyConversions: [
      {
        label: "Weekly - Monthly Recurring Multiplier",
        value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Weekly to monthly conversion (typically 4.33)",
      },
      {
        label: "Monthly - Cycle Months",
        value: freqMeta.monthly?.cycleMonths ?? 0,
        path: ["frequencyMetadata", "monthly", "cycleMonths"],
        unit: "months",
        description: "Monthly billing cycle",
      },
      {
        label: "Bimonthly - Cycle Months",
        value: freqMeta.bimonthly?.cycleMonths ?? 0,
        path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
        unit: "months",
        description: "Bimonthly billing cycle (typically 2 months)",
      },
      {
        label: "Quarterly - Cycle Months",
        value: freqMeta.quarterly?.cycleMonths ?? 0,
        path: ["frequencyMetadata", "quarterly", "cycleMonths"],
        unit: "months",
        description: "Quarterly billing cycle (typically 3 months)",
      },
    ],
  };
}

/**
 * STRIP & WAX - Complete field mapping
 */
function getStripWaxFields(config: any): Record<string, PricingField[]> {
  const variants = getValue(config, ["variants"]) || {};
  const standardFull = variants.standardFull || {};
  const noSealant = variants.noSealant || {};
  const wellMaintained = variants.wellMaintained || {};
  const tripCharges = getValue(config, ["tripCharges"]) || {};
  const rateCategories = getValue(config, ["rateCategories"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};

  return {
    standardFull: [
      {
        label: "Rate Per Sq Ft",
        value: standardFull.ratePerSqFt ?? 0,
        path: ["variants", "standardFull", "ratePerSqFt"],
        unit: "$ per sq ft",
        description: "Standard full strip + sealant rate (typically $0.75)",
      },
      {
        label: "Minimum Charge",
        value: standardFull.minCharge ?? 0,
        path: ["variants", "standardFull", "minCharge"],
        unit: "$",
        description: "Minimum charge for standard service (typically $550)",
      },
      {
        label: "Coats Included",
        value: standardFull.coatsIncluded ?? 0,
        path: ["variants", "standardFull", "coatsIncluded"],
        unit: "coats",
        description: "Number of wax coats included (typically 3)",
      },
      {
        label: "Sealant Included",
        value: standardFull.sealantIncluded ? 1 : 0,
        path: ["variants", "standardFull", "sealantIncluded"],
        unit: "boolean",
        description: "Whether sealant is included",
      },
    ],
    noSealant: [
      {
        label: "Alternate Rate Per Sq Ft",
        value: noSealant.alternateRatePerSqFt ?? 0,
        path: ["variants", "noSealant", "alternateRatePerSqFt"],
        unit: "$ per sq ft",
        description: "No sealant rate (typically $0.70)",
      },
      {
        label: "Minimum Charge",
        value: noSealant.minCharge ?? 0,
        path: ["variants", "noSealant", "minCharge"],
        unit: "$",
        description: "Minimum charge for no-sealant service (typically $550)",
      },
      {
        label: "Include Extra Coat (4th Free)",
        value: noSealant.includeExtraCoatFourthFree ? 1 : 0,
        path: ["variants", "noSealant", "includeExtraCoatFourthFree"],
        unit: "boolean",
        description: "Whether 4th coat is included free",
      },
    ],
    wellMaintained: [
      {
        label: "Rate Per Sq Ft",
        value: wellMaintained.ratePerSqFt ?? 0,
        path: ["variants", "wellMaintained", "ratePerSqFt"],
        unit: "$ per sq ft",
        description: "Well-maintained floor rate (typically $0.40)",
      },
      {
        label: "Minimum Charge",
        value: wellMaintained.minCharge ?? 0,
        path: ["variants", "wellMaintained", "minCharge"],
        unit: "$",
        description: "Minimum charge for well-maintained service (typically $400)",
      },
      {
        label: "Coats Included",
        value: wellMaintained.coatsIncluded ?? 0,
        path: ["variants", "wellMaintained", "coatsIncluded"],
        unit: "coats",
        description: "Number of wax coats included (typically 2)",
      },
    ],
    tripCharges: [
      {
        label: "Standard Trip Charge",
        value: tripCharges.standard ?? 0,
        path: ["tripCharges", "standard"],
        unit: "$",
        description: "Standard trip charge",
      },
      {
        label: "Beltway Trip Charge",
        value: tripCharges.beltway ?? 0,
        path: ["tripCharges", "beltway"],
        unit: "$",
        description: "Beltway trip charge",
      },
    ],
    contractTerms: [
      {
        label: "Min Contract Months",
        value: getValue(config, ["minContractMonths"]) ?? 0,
        path: ["minContractMonths"],
        unit: "months",
        description: "Minimum contract duration (typically 2 months)",
      },
      {
        label: "Max Contract Months",
        value: getValue(config, ["maxContractMonths"]) ?? 0,
        path: ["maxContractMonths"],
        unit: "months",
        description: "Maximum contract duration (typically 36 months)",
      },
      {
        label: "Default Frequency",
        value: 0,
        path: ["defaultFrequency"],
        unit: "string",
        description: `Default frequency: ${getValue(config, ["defaultFrequency"]) || "weekly"}`,
      },
      {
        label: "Default Variant",
        value: 0,
        path: ["defaultVariant"],
        unit: "string",
        description: `Default variant: ${getValue(config, ["defaultVariant"]) || "standardFull"}`,
      },
    ],
    rateTiers: [
      {
        label: "Red Rate Multiplier",
        value: rateCategories.redRate?.multiplier ?? 0,
        path: ["rateCategories", "redRate", "multiplier"],
        unit: "×",
        description: "Standard rate multiplier (typically 1.0)",
      },
      {
        label: "Green Rate Multiplier",
        value: rateCategories.greenRate?.multiplier ?? 0,
        path: ["rateCategories", "greenRate", "multiplier"],
        unit: "×",
        description: "Premium rate multiplier (typically 1.3)",
      },
    ],
    frequencyConversions: [
      {
        label: "Weekly - Monthly Recurring Multiplier",
        value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Weekly to monthly conversion (typically 4.33)",
      },
      {
        label: "Biweekly - Monthly Recurring Multiplier",
        value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
        path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
        unit: "×",
        description: "Biweekly to monthly conversion (typically 2.165)",
      },
    ],
  };
}

/**
 * REFRESH POWER SCRUB - Complete field mapping (already in file, just verify structure)
 */
function getRefreshPowerScrubFields(config: any): Record<string, PricingField[]> {
  const coreRates = getValue(config, ["coreRates"]) || {};
  const areaSpecific = getValue(config, ["areaSpecificPricing"]) || {};
  const sqftPricing = getValue(config, ["squareFootagePricing"]) || {};
  const billingConv = getValue(config, ["billingConversions"]) || {};
  const freqMeta = getValue(config, ["frequencyMetadata"]) || {};

  return {
    defaultRates: [
      {
        label: "Default Hourly Rate",
        value: coreRates.defaultHourlyRate ?? 0,
        path: ["coreRates", "defaultHourlyRate"],
        unit: "$ per hour",
        description: "Standard hourly rate per worker (typically $200)",
      },
      {
        label: "Per Worker Rate",
        value: coreRates.perWorkerRate ?? 0,
        path: ["coreRates", "perWorkerRate"],
        unit: "$ per worker",
        description: "Rate per worker (typically $200)",
      },
      {
        label: "Per Hour Rate",
        value: coreRates.perHourRate ?? 0,
        path: ["coreRates", "perHourRate"],
        unit: "$ per hour",
        description: "Rate per hour (typically $400)",
      },
      {
        label: "Trip Charge",
        value: coreRates.tripCharge ?? 0,
        path: ["coreRates", "tripCharge"],
        unit: "$",
        description: "Trip charge (typically $75)",
      },
      {
        label: "Minimum Visit",
        value: coreRates.minimumVisit ?? 0,
        path: ["coreRates", "minimumVisit"],
        unit: "$",
        description: "Minimum charge per visit (typically $400)",
      },
    ],
    kitchenPricing: [
      {
        label: "Small/Medium Kitchen",
        value: areaSpecific.kitchen?.smallMedium ?? 0,
        path: ["areaSpecificPricing", "kitchen", "smallMedium"],
        unit: "$",
        description: "Package price for small/medium kitchen (typically $1,500)",
      },
      {
        label: "Large Kitchen",
        value: areaSpecific.kitchen?.large ?? 0,
        path: ["areaSpecificPricing", "kitchen", "large"],
        unit: "$",
        description: "Package price for large kitchen (typically $2,500)",
      },
    ],
    fohPricing: [
      {
        label: "Front of House Rate",
        value: areaSpecific.frontOfHouse ?? 0,
        path: ["areaSpecificPricing", "frontOfHouse"],
        unit: "$",
        description: "Package price for front of house (typically $2,500)",
      },
    ],
    patioPricing: [
      {
        label: "Patio Standalone",
        value: areaSpecific.patio?.standalone ?? 0,
        path: ["areaSpecificPricing", "patio", "standalone"],
        unit: "$",
        description: "Standalone patio service (typically $800)",
      },
      {
        label: "Patio Upsell",
        value: areaSpecific.patio?.upsell ?? 0,
        path: ["areaSpecificPricing", "patio", "upsell"],
        unit: "$",
        description: "Upsell price when adding patio to FOH (typically $500)",
      },
    ],
    sqftPricing: [
      {
        label: "Fixed Fee",
        value: sqftPricing.fixedFee ?? 0,
        path: ["squareFootagePricing", "fixedFee"],
        unit: "$",
        description: "Fixed base fee (typically $200)",
      },
      {
        label: "Inside Rate",
        value: sqftPricing.insideRate ?? 0,
        path: ["squareFootagePricing", "insideRate"],
        unit: "$ per sq ft",
        description: "Rate for inside areas (typically $0.60)",
      },
      {
        label: "Outside Rate",
        value: sqftPricing.outsideRate ?? 0,
        path: ["squareFootagePricing", "outsideRate"],
        unit: "$ per sq ft",
        description: "Rate for outside areas (typically $0.40)",
      },
    ],
    billingConversions: [
      {
        label: "Weekly - Monthly Multiplier",
        value: billingConv.weekly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "weekly", "monthlyMultiplier"],
        unit: "×",
        description: "Weekly to monthly conversion (typically 4.33)",
      },
      {
        label: "Weekly - Annual Multiplier",
        value: billingConv.weekly?.annualMultiplier ?? 0,
        path: ["billingConversions", "weekly", "annualMultiplier"],
        unit: "×",
        description: "Weekly to annual conversion (typically 52)",
      },
      {
        label: "Biweekly - Monthly Multiplier",
        value: billingConv.biweekly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "biweekly", "monthlyMultiplier"],
        unit: "×",
        description: "Biweekly to monthly conversion (typically 2.165)",
      },
      {
        label: "Monthly - Monthly Multiplier",
        value: billingConv.monthly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "monthly", "monthlyMultiplier"],
        unit: "×",
        description: "Monthly multiplier (typically 1)",
      },
      {
        label: "Quarterly - Monthly Multiplier",
        value: billingConv.quarterly?.monthlyMultiplier ?? 0,
        path: ["billingConversions", "quarterly", "monthlyMultiplier"],
        unit: "×",
        description: "Quarterly to monthly conversion (typically 0.333)",
      },
    ],
  };
}
