import type {
  CarpetPricingConfig,
  CarpetFrequency,
} from "./carpetTypes";


export const carpetFrequencyList: CarpetFrequency[] = [
  "oneTime",
  "weekly",
  "biweekly",
  "twicePerMonth",
  "monthly",
  "everyFourWeeks",
  "bimonthly",
  "quarterly",
  "biannual",
  "annual",
];

export const carpetFrequencyLabels: Record<CarpetFrequency, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month",
  monthly: "Monthly",
  everyFourWeeks: "Every 4 Weeks",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};


export const carpetPricingConfig: CarpetPricingConfig = {

  unitSqFt: 500,
  firstUnitRate: 250, 
  additionalUnitRate: 125, 
  perVisitMinimum: 250, 


  installMultipliers: {
    dirty: 3,
    clean: 1,
  },


  billingConversions: {
    oneTime: { annualMultiplier: 1, monthlyMultiplier: 0 },
    weekly: { annualMultiplier: 52, monthlyMultiplier: 4.33 },
    biweekly: { annualMultiplier: 26, monthlyMultiplier: 2.165 },
    twicePerMonth: { annualMultiplier: 24, monthlyMultiplier: 2 },
    monthly: { annualMultiplier: 12, monthlyMultiplier: 1 },
    everyFourWeeks: { annualMultiplier: 13, monthlyMultiplier: 1.0833 },
    bimonthly: { annualMultiplier: 6, monthlyMultiplier: 0.5 },
    quarterly: { annualMultiplier: 4, monthlyMultiplier: 0.333 },
    biannual: { annualMultiplier: 2, monthlyMultiplier: 0.167 },
    annual: { annualMultiplier: 1, monthlyMultiplier: 0.083 },
  },


  minContractMonths: 2,
  maxContractMonths: 36,


  frequencyMeta: {
    oneTime: { visitsPerYear: 1, monthlyMultiplier: 0 },
    weekly: { visitsPerYear: 52, monthlyMultiplier: 4.33 }, 
    biweekly: { visitsPerYear: 26, monthlyMultiplier: 2.165 }, 
    twicePerMonth: { visitsPerYear: 24, monthlyMultiplier: 2 }, 
    monthly: { visitsPerYear: 12, monthlyMultiplier: 1 },
    everyFourWeeks: { visitsPerYear: 13, monthlyMultiplier: 1.0833 },
    bimonthly: { visitsPerYear: 6, monthlyMultiplier: 0.5 },
    quarterly: { visitsPerYear: 4, monthlyMultiplier: 0.333 }, 
    biannual: { visitsPerYear: 2, monthlyMultiplier: 0.167 }, 
    annual: { visitsPerYear: 1, monthlyMultiplier: 0.083 }, 
  },
};


export function getContractOptions(frequency: CarpetFrequency): number[] {
  switch (frequency) {
    case "bimonthly":
      return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32 ,34, 36]; 
    case "quarterly":
      return [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]; 
    default:
      return [1, 2, 3, 6, 12, 18, 24, 36]; 
  }
}


export function calculateCarpetBasePrice(sqft: number, option: "option1" | "option2" = "option1"): number {
  const config = carpetPricingConfig;

  if (sqft <= config.unitSqFt) {
    return config.firstUnitRate; 
  }

  const excessSqft = sqft - config.unitSqFt;

  if (option === "option1") {

    const additionalBlocks = Math.ceil(excessSqft / config.unitSqFt);
    return config.firstUnitRate + (additionalBlocks * config.additionalUnitRate);
  } else {

    const remainderRate = 0.25; 
    return config.firstUnitRate + (excessSqft * remainderRate);
  }
}


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
    case "bimonthly": 
      totalVisits = Math.round(contractMonths / 2); 
      contractTotal = installFee + (perVisit * totalVisits);
      calculation = `${installFee} (install) + ${perVisit} × ${totalVisits} (visits) = ${contractTotal}`;
      break;

    case "quarterly": 
      totalVisits = Math.round(contractMonths / 3); 
      contractTotal = installFee + (perVisit * totalVisits);
      calculation = `${installFee} (install) + ${perVisit} × ${totalVisits} (visits) = ${contractTotal}`;
      break;

    default: 
      const visitsPerYear = carpetPricingConfig.frequencyMeta[frequency].visitsPerYear;
      const visitsPerMonth = carpetPricingConfig.frequencyMeta[frequency].monthlyMultiplier; 
      totalVisits = Math.round(contractMonths * visitsPerMonth);
      contractTotal = (perVisit * visitsPerMonth * contractMonths) + installFee;
      calculation = `${perVisit} × ${visitsPerMonth} × ${contractMonths} + ${installFee} (install) = ${contractTotal}`;
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
