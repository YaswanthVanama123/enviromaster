// src/components/services/janitorial/janitorialTypes.ts
import type { BaseServiceFormState, ServiceQuoteResult } from "../common/serviceTypes";

// Enumerated type unions for specific choices
export type JanitorialFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "oneTime";
export type JanitorialServiceType = "recurringService" | "oneTimeService";
export type JanitorialLocation = "insideBeltway" | "outsideBeltway" | "paidParking";

// Config type interface (matches janitorialConfig.ts structure)
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

// Form state interface (THE CRITICAL ONE!)
export interface JanitorialFormState extends BaseServiceFormState {
  serviceId: "janitorial";

  // ========== BUSINESS LOGIC FIELDS (inputs) ==========
  serviceType: JanitorialServiceType;
  frequency: JanitorialFrequency;
  location: JanitorialLocation;
  contractMonths: number;

  // Main service hours
  baseHours: number;

  // Additional services
  vacuumingHours: number;
  dustingHours: number;

  // Trip charge details
  needsParking: boolean;
  parkingCost: number;

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  // ALL pricing rates that can be changed by backend or admin
  recurringServiceRate: number;
  oneTimeServiceRate: number;
  vacuumingRatePerHour: number;
  dustingRatePerHour: number;

  // Frequency multipliers (editable)
  dailyMultiplier: number;
  weeklyMultiplier: number;
  biweeklyMultiplier: number;
  monthlyMultiplier: number;
  oneTimeMultiplier: number;

  // Minimums (editable)
  perVisitMinimum: number;
  recurringContractMinimum: number;

  // Trip charges (editable)
  standardTripCharge: number;
  beltwayTripCharge: number;
  paidParkingTripCharge: number;

  // ========== CUSTOM RATE OVERRIDES (for edit mode yellow highlighting) ==========
  // These fields are set when loaded values differ from backend defaults
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

  // ========== CUSTOM TOTAL OVERRIDES (user can manually set totals) ==========
  customPerVisitTotal?: number;
  customMonthlyTotal?: number;
  customAnnualTotal?: number;
  customContractTotal?: number;
}

// Result types
export interface JanitorialQuoteResult extends ServiceQuoteResult {
  perVisitPrice: number;
  monthlyPrice: number;
  annualPrice: number;
  contractTotal: number;
  detailsBreakdown: string[];
}

// Calculation details (internal)
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