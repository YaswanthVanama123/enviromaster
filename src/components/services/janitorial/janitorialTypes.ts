
import type { BaseServiceFormState, ServiceQuoteResult } from "../common/serviceTypes";


export type JanitorialFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "oneTime";
export type JanitorialServiceType = "recurringService" | "oneTimeService";
export type JanitorialLocation = "insideBeltway" | "outsideBeltway" | "paidParking";


export interface JanitorialPricingConfig {
  baseRates: {
    recurringService: number;
    oneTimeService: number;
  };
  additionalServices: {
    vacuuming: {
      baseHours: number;
      ratePerHour: number;
    };
    dusting: {
      baseHours: number;
      ratePerHour: number;
    };
  };
  frequencyMultipliers: Record<JanitorialFrequency, number>;
  billingConversions: Record<string, number>;
  minimums: {
    perVisit: number;
    recurringContract: number;
  };
  tripCharges: {
    standard: number;
    insideBeltway: number;
    paidParking: number;
  };
}


export interface JanitorialFormState extends BaseServiceFormState {
  serviceId: "janitorial";


  serviceType: JanitorialServiceType;
  frequency: JanitorialFrequency;
  location: JanitorialLocation;
  contractMonths: number;


  baseHours: number;


  vacuumingHours: number;
  dustingHours: number;


  needsParking: boolean;
  parkingCost: number;


  recurringServiceRate: number;
  oneTimeServiceRate: number;
  vacuumingRatePerHour: number;
  dustingRatePerHour: number;


  dailyMultiplier: number;
  weeklyMultiplier: number;
  biweeklyMultiplier: number;
  monthlyMultiplier: number;
  oneTimeMultiplier: number;


  perVisitMinimum: number;
  recurringContractMinimum: number;


  standardTripCharge: number;
  beltwayTripCharge: number;
  paidParkingTripCharge: number;


  customRecurringServiceRate?: number;
  customOneTimeServiceRate?: number;
  customVacuumingRatePerHour?: number;
  customDustingRatePerHour?: number;
  customDailyMultiplier?: number;
  customWeeklyMultiplier?: number;
  customBiweeklyMultiplier?: number;
  customMonthlyMultiplier?: number;
  customOneTimeMultiplier?: number;
  customPerVisitMinimum?: number;
  customRecurringContractMinimum?: number;
  customStandardTripCharge?: number;
  customBeltwayTripCharge?: number;
  customPaidParkingTripCharge?: number;


  customPerVisitTotal?: number;
  customMonthlyTotal?: number;
  customAnnualTotal?: number;
  customContractTotal?: number;
}


export interface JanitorialQuoteResult extends ServiceQuoteResult {
  perVisitPrice: number;
  monthlyPrice: number;
  annualPrice: number;
  contractTotal: number;
  detailsBreakdown: string[];
}


export interface JanitorialCalcDetails {
  baseServiceCost: number;
  vacuumingCost: number;
  dustingCost: number;
  subtotal: number;
  frequencyMultiplier: number;
  adjustedSubtotal: number;
  tripCharge: number;
  perVisitTotal: number;
  monthlyTotal: number;
  annualTotal: number;
  contractTotal: number;
  appliedRules: string[];
}
