// src/components/services/electrostaticSpray/electrostaticSprayTypes.ts

export type ElectrostaticSprayFrequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly";

export interface ElectrostaticSprayPricingConfig {
  // Room-based pricing
  ratePerRoom: number; // $20 per moderately sized room

  // Square footage pricing
  ratePerThousandSqFt: number; // $50 per 1000 sq ft
  sqFtUnit: number; // 1000

  // Trip charge (same as Sani-Clean)
  tripCharges: {
    insideBeltway: number;
    outsideBeltway: number;
    standard: number;
  };

  // Frequency conversions
  billingConversions: {
    weekly: { monthlyMultiplier: number; annualMultiplier: number };
    biweekly: { monthlyMultiplier: number; annualMultiplier: number };
    monthly: { monthlyMultiplier: number; annualMultiplier: number };
    bimonthly: { monthlyMultiplier: number; annualMultiplier: number };
    quarterly: { monthlyMultiplier: number; annualMultiplier: number };
    actualWeeksPerMonth: number;
  };

  // Contract settings
  minContractMonths: number;
  maxContractMonths: number;

  // Value proposition
  valueProposition: {
    bacteriaReduction: string; // "99.4%"
    cleanlinessLevel: string; // "Almost surgically clean"
    applicableAreas: string[]; // ["air", "walls", "surfaces"]
  };

  defaultFrequency: ElectrostaticSprayFrequency;
  allowedFrequencies: ElectrostaticSprayFrequency[];
}

export interface ElectrostaticSprayFormState {
  serviceId: "electrostaticSpray";

  // Pricing method
  pricingMethod: "byRoom" | "bySqFt";

  // Room-based pricing
  roomCount: number;

  // Square footage pricing
  squareFeet: number;

  // Exact calculation checkbox for square feet pricing
  useExactCalculation: boolean;

  // Service frequency
  frequency: ElectrostaticSprayFrequency;

  // Location for trip charge
  location: "insideBeltway" | "outsideBeltway" | "standard";

  // Combined with Sani-Clean?
  isCombinedWithSaniClean: boolean;

  // Contract length
  contractMonths: number;

  // Notes
  notes: string;

  // Editable pricing rates (fetched from backend or config)
  ratePerRoom: number;
  ratePerThousandSqFt: number;
  tripChargePerVisit: number;

  // Custom overrides
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customContractTotal?: number;
}

export interface ElectrostaticSprayCalcResult {
  // Per visit calculations
  serviceCharge: number; // Room or sq ft based charge
  tripCharge: number; // Trip charge (0 if combined with Sani-Clean)
  perVisit: number; // Service + trip

  // Recurring calculations
  monthlyRecurring: number; // Based on frequency
  contractTotal: number; // Total for contract period

  // Breakdown info
  effectiveRate: number; // Effective rate per room or per 1000 sq ft
  pricingMethodUsed: "byRoom" | "bySqFt";

  // Frequency-specific UI helpers
  isVisitBasedFrequency: boolean; // True for bi-monthly/quarterly
  monthsPerVisit: number; // 2 for bi-monthly, 3 for quarterly, 1 for others
}
