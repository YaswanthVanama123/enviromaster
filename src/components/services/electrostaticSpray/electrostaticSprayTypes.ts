

export type ElectrostaticSprayFrequency = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "bimonthly" | "quarterly" | "biannual" | "annual";

export interface ElectrostaticSprayPricingConfig {

  ratePerRoom: number; 


  ratePerThousandSqFt: number; 
  sqFtUnit: number; 


  tripCharges: {
    insideBeltway: number;
    outsideBeltway: number;
    standard: number;
  };


  billingConversions: {
    oneTime: { monthlyMultiplier: number; annualMultiplier: number };
    weekly: { monthlyMultiplier: number; annualMultiplier: number };
    biweekly: { monthlyMultiplier: number; annualMultiplier: number };
    twicePerMonth: { monthlyMultiplier: number; annualMultiplier: number };
    monthly: { monthlyMultiplier: number; annualMultiplier: number };
    bimonthly: { monthlyMultiplier: number; annualMultiplier: number };
    quarterly: { monthlyMultiplier: number; annualMultiplier: number };
    biannual: { monthlyMultiplier: number; annualMultiplier: number };
    annual: { monthlyMultiplier: number; annualMultiplier: number };
    actualWeeksPerMonth: number;
  };


  minContractMonths: number;
  maxContractMonths: number;


  valueProposition: {
    bacteriaReduction: string; 
    cleanlinessLevel: string; 
    applicableAreas: string[]; 
  };

  defaultFrequency: ElectrostaticSprayFrequency;
  allowedFrequencies: ElectrostaticSprayFrequency[];
}

export interface ElectrostaticSprayFormState {
  serviceId: "electrostaticSpray";


  pricingMethod: "byRoom" | "bySqFt";


  roomCount: number;


  squareFeet: number;


  useExactCalculation: boolean;


  frequency: ElectrostaticSprayFrequency;


  location: "insideBeltway" | "outsideBeltway" | "standard";


  isCombinedWithSaniClean: boolean;


  contractMonths: number;


  notes: string;


  ratePerRoom: number;
  ratePerThousandSqFt: number;
  tripChargePerVisit: number;


  customRatePerRoom?: number;
  customRatePerThousandSqFt?: number;
  customTripChargePerVisit?: number;


  customServiceCharge?: number;
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customContractTotal?: number;
  customFirstMonthTotal?: number;

  applyMinimum?: boolean;
}

export interface ElectrostaticSprayCalcResult {

  serviceCharge: number; 
  tripCharge: number; 
  perVisit: number; 


  monthlyRecurring: number; 
  contractTotal: number; 
  originalContractTotal: number; 


  effectiveRate: number; 
  pricingMethodUsed: "byRoom" | "bySqFt";


  isVisitBasedFrequency: boolean; 
  monthsPerVisit: number; 


  minimumChargePerVisit: number;
}
