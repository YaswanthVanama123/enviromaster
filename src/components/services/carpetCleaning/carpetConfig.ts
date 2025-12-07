import type {
  CarpetPricingConfig,
  CarpetFrequency,
} from "./carpetTypes";

/**
 * Allowed frequency values in UI order.
 * Added weekly for carpet cleaning.
 */
export const carpetFrequencyList: CarpetFrequency[] = [
  "weekly",
  "monthly",
  "twicePerMonth",
  "bimonthly",
  "quarterly",
];

export const carpetFrequencyLabels: Record<CarpetFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  twicePerMonth: "2× / Month",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
};

/**
 * Canonical Carpet Cleaning pricing config.
 * Fixed calculations based on requirements:
 * - Bimonthly (every 2 months): 12 months = 6 visits, total = install + pervisit * 5
 * - Quarterly: 12 months = 4 visits, total = install + pervisit * 3
 */
export const carpetPricingConfig: CarpetPricingConfig = {
  // Block pricing - $250 for first 500 sq ft, $125 for each additional 500 sq ft
  unitSqFt: 500,
  firstUnitRate: 250, // first 500 sq ft
  additionalUnitRate: 125, // each additional 500 sq ft
  perVisitMinimum: 250, // per-visit minimum

  // Installation multipliers (same as SaniScrub)
  // Install = 1× clean, 3× dirty of MONTHLY BASE (no trip)
  installMultipliers: {
    dirty: 3,
    clean: 1,
  },

  // Corrected visits per year and calculation logic
  frequencyMeta: {
    weekly: { visitsPerYear: 52 }, // 52 weeks per year = 4.33 visits per month
    monthly: { visitsPerYear: 12 }, // 1× per month
    twicePerMonth: { visitsPerYear: 24 }, // 2× per month
    bimonthly: { visitsPerYear: 6 }, // every 2 months (6 visits per year)
    quarterly: { visitsPerYear: 4 }, // quarterly (4 visits per year)
  },
};

/**
 * Get contract options based on frequency
 * - Bimonthly: even numbers
 * - Quarterly: quarterly multiples (3,6,9,12,15)
 */
export function getContractOptions(frequency: CarpetFrequency): number[] {
  switch (frequency) {
    case "bimonthly":
      return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]; // Even numbers
    case "quarterly":
      return [3, 6, 9, 12, 15, 18, 21, 24]; // Quarterly multiples
    default:
      return [1, 2, 3, 6, 12, 18, 24, 36]; // Standard months
  }
}

/**
 * Calculate carpet cleaning price with option 1 (full blocks) or option 2 (remainder rate)
 */
export function calculateCarpetBasePrice(sqft: number, option: "option1" | "option2" = "option1"): number {
  const config = carpetPricingConfig;

  if (sqft <= config.unitSqFt) {
    return config.firstUnitRate; // $250 for first 500 sq ft or less
  }

  const excessSqft = sqft - config.unitSqFt;

  if (option === "option1") {
    // Option 1: Additional full 500 sq ft blocks
    const additionalBlocks = Math.ceil(excessSqft / config.unitSqFt);
    return config.firstUnitRate + (additionalBlocks * config.additionalUnitRate);
  } else {
    // Option 2: Per sq ft rate for remainder
    const remainderRate = 0.25; // $0.25 per sq ft
    return config.firstUnitRate + (excessSqft * remainderRate);
  }
}

/**
 * Calculate contract total with corrected logic for bimonthly and quarterly
 */
export function calculateContractTotal(
  basePrice: number,
  tripCharge: number,
  installFee: number,
  frequency: CarpetFrequency,
  contractMonths: number
): {
  perVisit: number;
  firstVisitTotal: number;
  totalVisits: number;
  contractTotal: number;
  calculation: string;
} {
  const perVisit = basePrice + tripCharge;
  const firstVisitTotal = perVisit + installFee;

  let totalVisits: number;
  let contractTotal: number;
  let calculation: string;

  switch (frequency) {
    case "bimonthly": // Every 2 months
      totalVisits = Math.round(contractMonths / 2); // 12 months = 6 visits
      contractTotal = installFee + (perVisit * totalVisits);
      calculation = `${installFee} (install) + ${perVisit} × ${totalVisits} (visits) = ${contractTotal}`;
      break;

    case "quarterly": // Every 3 months
      totalVisits = Math.round(contractMonths / 3); // 12 months = 4 visits
      contractTotal = installFee + (perVisit * totalVisits);
      calculation = `${installFee} (install) + ${perVisit} × ${totalVisits} (visits) = ${contractTotal}`;
      break;

    default: // Weekly, Monthly, TwicePerMonth
      const visitsPerYear = carpetPricingConfig.frequencyMeta[frequency].visitsPerYear;
      const visitsPerMonth = visitsPerYear / 12;
      totalVisits = Math.round(contractMonths * visitsPerMonth);
      contractTotal = (perVisit * visitsPerMonth * contractMonths) + installFee;
      calculation = `${perVisit} × ${visitsPerMonth.toFixed(2)} × ${contractMonths} + ${installFee} (install) = ${contractTotal}`;
      break;
  }

  return {
    perVisit,
    firstVisitTotal,
    totalVisits,
    contractTotal,
    calculation
  };
}
