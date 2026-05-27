/**
 * useCommissionCalcV2 - React Hook for Commission Calculation V2
 * Based on Solange Commission Draft v2 (June 2026)
 */

import { useMemo, useCallback, useState } from 'react';
import {
  AccountType,
  AgreementTerm,
  ServiceFrequency,
  BusinessType,
  QuotaLevel,
  CommissionCalculationInputV2,
  CommissionCalculationResultV2,
  CommissionBreakdownV2,
  FREQUENCY_VISITS_PER_YEAR,
} from '../types/commission.types.v2';
import {
  calculateCommissionV2,
  detectAccountType,
  calculateMonthsEmployed,
  getQuotaThreshold,
  getPricingTier,
  calculateCommissionableRevenue,
  isGreenline,
  formatCurrency,
  formatPercentage,
} from '../utils/commissionCalculatorV2';

// ============================================================
// HOOK INPUT INTERFACE
// ============================================================

export interface UseCommissionCalcV2Input {
  // Revenue
  perVisitRevenue: number;
  redlinePrice: number;
  frequency: ServiceFrequency;

  // Account
  accountType: AccountType;
  drivingTimeMinutes?: number;
  nearestAnchorName?: string;

  // Agreement
  agreementTerm: AgreementTerm;
  contractMonths: number;

  // Business
  businessType: BusinessType;
  yearsAsCustomer?: number;
  totalRenewalValue?: number;

  // Sales
  isInsideSales: boolean;

  // Employee (for quota)
  employeeHireDate?: string;
  periodSalesTotal?: number;
  newRooftopCount?: number;

  // Customer
  customerName?: string;
}

// ============================================================
// HOOK RETURN INTERFACE
// ============================================================

export interface UseCommissionCalcV2Return {
  // Full calculation result
  result: CommissionCalculationResultV2 | null;

  // Key values for easy access
  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;
  totalCommission: number;
  renewalBonus: number;

  // Breakdown values
  finalCommissionRate: number;
  baseRate: number;
  effectiveRate: number;
  quotaLevel: QuotaLevel;
  pricingTier: string;
  pricingMultiplier: number;
  commissionableRevenue: number;

  // Flags
  isGreenline: boolean;
  requiresApproval: boolean;
  autoQuotaQualified: boolean;

  // Formatted strings
  formatted: {
    perVisitCommission: string;
    weeklyCommission: string;
    annualCommission: string;
    contractCommission: string;
    totalCommission: string;
    renewalBonus: string;
    finalCommissionRate: string;
    baseRate: string;
    commissionableRevenue: string;
    quotaCredit: string;
  };

  // Helpers
  detectAccountType: (perVisitRevenue: number, drivingTimeMinutes: number | null) => AccountType;
  recalculate: () => void;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useCommissionCalcV2(input: UseCommissionCalcV2Input): UseCommissionCalcV2Return {
  const [recalcTrigger, setRecalcTrigger] = useState(0);

  // Calculate months employed
  const monthsEmployed = useMemo(() => {
    if (input.employeeHireDate) {
      return calculateMonthsEmployed(input.employeeHireDate);
    }
    return 5; // Default to 5+ months if not provided
  }, [input.employeeHireDate]);

  // Build full calculation input
  const calcInput: CommissionCalculationInputV2 = useMemo(() => ({
    perVisitRevenue: input.perVisitRevenue,
    redlinePrice: input.redlinePrice,
    frequency: input.frequency,
    accountType: input.accountType,
    isNearAnchor: input.drivingTimeMinutes !== undefined && input.drivingTimeMinutes <= 15,
    drivingTimeMinutes: input.drivingTimeMinutes,
    nearestAnchorName: input.nearestAnchorName,
    agreementTerm: input.agreementTerm,
    contractMonths: input.contractMonths,
    businessType: input.businessType,
    yearsAsCustomer: input.yearsAsCustomer,
    totalRenewalValue: input.totalRenewalValue,
    isInsideSales: input.isInsideSales,
    employeeMonthsEmployed: monthsEmployed,
    periodSalesTotal: input.periodSalesTotal,
    newRooftopCount: input.newRooftopCount,
    customerName: input.customerName,
  }), [input, monthsEmployed]);

  // Perform calculation
  const result = useMemo(() => {
    // Skip calculation if no revenue
    if (input.perVisitRevenue <= 0) {
      return null;
    }

    return calculateCommissionV2(calcInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcInput, recalcTrigger]);

  // Extract key values
  const perVisitCommission = result?.perVisitCommission ?? 0;
  const weeklyCommission = result?.weeklyCommission ?? 0;
  const annualCommission = result?.annualCommission ?? 0;
  const contractCommission = result?.contractCommission ?? 0;
  const totalCommission = result?.totalCommission ?? 0;
  const renewalBonus = result?.renewalBonus ?? 0;

  const finalCommissionRate = result?.breakdown.finalCommissionRate ?? 0;
  const baseRate = result?.breakdown.baseRate ?? 0;
  const effectiveRate = result?.breakdown.effectiveRate ?? 0;
  const quotaLevel = result?.breakdown.quotaLevel ?? 'below';
  const pricingTier = result?.breakdown.pricingTier ?? 'Redline';
  const pricingMultiplier = result?.breakdown.pricingMultiplier ?? 1;
  const commissionableRevenue = result?.breakdown.commissionableRevenue ?? 0;

  const isGreenlineFlag = isGreenline(input.perVisitRevenue, input.redlinePrice);
  const requiresApproval = result?.breakdown.requiresApproval ?? false;
  const autoQuotaQualified = result?.breakdown.autoQuotaQualified ?? false;

  // Formatted strings
  const formatted = useMemo(() => ({
    perVisitCommission: formatCurrency(perVisitCommission),
    weeklyCommission: formatCurrency(weeklyCommission),
    annualCommission: formatCurrency(annualCommission),
    contractCommission: formatCurrency(contractCommission),
    totalCommission: formatCurrency(totalCommission),
    renewalBonus: formatCurrency(renewalBonus),
    finalCommissionRate: formatPercentage(finalCommissionRate),
    baseRate: formatPercentage(baseRate),
    commissionableRevenue: formatCurrency(commissionableRevenue),
    quotaCredit: formatCurrency(result?.breakdown.annualQuotaCredit ?? 0),
  }), [
    perVisitCommission,
    weeklyCommission,
    annualCommission,
    contractCommission,
    totalCommission,
    renewalBonus,
    finalCommissionRate,
    baseRate,
    commissionableRevenue,
    result?.breakdown.annualQuotaCredit,
  ]);

  // Helper to detect account type
  const detectAccountTypeHelper = useCallback(
    (perVisitRevenue: number, drivingTimeMinutes: number | null) => {
      return detectAccountType(perVisitRevenue, drivingTimeMinutes, isGreenlineFlag);
    },
    [isGreenlineFlag]
  );

  // Force recalculation
  const recalculate = useCallback(() => {
    setRecalcTrigger((prev) => prev + 1);
  }, []);

  return {
    result,
    perVisitCommission,
    weeklyCommission,
    annualCommission,
    contractCommission,
    totalCommission,
    renewalBonus,
    finalCommissionRate,
    baseRate,
    effectiveRate,
    quotaLevel,
    pricingTier,
    pricingMultiplier,
    commissionableRevenue,
    isGreenline: isGreenlineFlag,
    requiresApproval,
    autoQuotaQualified,
    formatted,
    detectAccountType: detectAccountTypeHelper,
    recalculate,
  };
}

// ============================================================
// SIMPLIFIED HOOK FOR FORM FILLING
// ============================================================

export interface UseFormFillingCommissionInput {
  // Auto-derived from agreement
  totalContractValue: number;
  contractMonths: number;
  pricingIndicator: 'red' | 'green';

  // User selections
  quotaLevel: QuotaLevel;
  accountType: AccountType;
  isInsideSales: boolean;

  // Optional for enhanced calculation
  redlinePrice?: number;
  frequency?: ServiceFrequency;
  employeeHireDate?: string;
  periodSalesTotal?: number;
  newRooftopCount?: number;
}

export interface UseFormFillingCommissionReturn {
  // Calculated values
  monthlyValue: number;
  agreementTerm: AgreementTerm;
  pricingLine: 'Redline' | 'Greenline';

  // Breakdown
  baseRate: number;
  agreementMultiplier: number;
  accountTypeDeduction: number;
  greenlineMultiplier: number;
  insideSalesDeduction: number;
  effectiveBaseRate: number;
  finalCommissionRate: number;

  // Amounts
  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;

  // Formatted
  formatted: {
    monthlyValue: string;
    perVisitCommission: string;
    weeklyCommission: string;
    annualCommission: string;
    contractCommission: string;
    finalCommissionRate: string;
  };
}

export function useFormFillingCommission(
  input: UseFormFillingCommissionInput
): UseFormFillingCommissionReturn {
  return useMemo(() => {
    const {
      totalContractValue,
      contractMonths,
      pricingIndicator,
      quotaLevel,
      accountType,
      isInsideSales,
      frequency = 'monthly',
    } = input;

    // Calculate monthly value
    const monthlyValue = contractMonths > 0 ? totalContractValue / contractMonths : totalContractValue;

    // Derive agreement term from contract months
    const getAgreementTerm = (): AgreementTerm => {
      if (contractMonths >= 36) return '3-year';
      if (contractMonths >= 12) return '1-year';
      return 'MTM-with-install';
    };

    const agreementTerm = getAgreementTerm();
    const pricingLine = pricingIndicator === 'green' ? 'Greenline' : 'Redline';
    const isGreenlineFlag = pricingIndicator === 'green';

    // Get base rate from quota level
    const QUOTA_RATES = { below: 3, above: 6, double: 9 };
    const baseRate = QUOTA_RATES[quotaLevel];

    // Get agreement multiplier
    const AGREEMENT_MULTIPLIERS = {
      '3-year': 135,
      '1-year': 100,
      'MTM-with-install': 100,
      'MTM-no-install': 50,
    };
    const agreementMultiplier = AGREEMENT_MULTIPLIERS[agreementTerm];

    // Calculate commissionable revenue using v2 rules
    const { commissionableRevenue, revenueDeduction } = calculateCommissionableRevenue(
      monthlyValue,
      accountType
    );

    // Account type deduction (for display - shows how much was deducted)
    const accountTypeDeduction = revenueDeduction;

    // Greenline multiplier (2x for Greenline in v2)
    const greenlineMultiplier = isGreenlineFlag ? 2.0 : 1.0;

    // Inside sales deduction
    const insideSalesDeduction = isInsideSales ? -3 : 0;

    // Effective base rate (before agreement multiplier)
    const effectiveBaseRate = baseRate + insideSalesDeduction;

    // Final commission rate (with agreement multiplier)
    const finalCommissionRate = effectiveBaseRate * (agreementMultiplier / 100);

    // Calculate commission amounts
    // In v2, commission is based on commissionable revenue, then multiplied by greenline factor
    const effectiveCommissionableRevenue = commissionableRevenue * greenlineMultiplier;
    const perVisitCommission = effectiveCommissionableRevenue * (finalCommissionRate / 100);

    const visitsPerYear = FREQUENCY_VISITS_PER_YEAR[frequency];
    const weeklyCommission = (perVisitCommission * visitsPerYear) / 12;
    const annualCommission = perVisitCommission * visitsPerYear;
    const contractCommission = annualCommission * (contractMonths / 12);

    return {
      monthlyValue,
      agreementTerm,
      pricingLine,
      baseRate,
      agreementMultiplier,
      accountTypeDeduction,
      greenlineMultiplier,
      insideSalesDeduction,
      effectiveBaseRate,
      finalCommissionRate,
      perVisitCommission,
      weeklyCommission,
      annualCommission,
      contractCommission,
      formatted: {
        monthlyValue: formatCurrency(monthlyValue),
        perVisitCommission: formatCurrency(perVisitCommission),
        weeklyCommission: formatCurrency(weeklyCommission),
        annualCommission: formatCurrency(annualCommission),
        contractCommission: formatCurrency(contractCommission),
        finalCommissionRate: formatPercentage(finalCommissionRate),
      },
    };
  }, [input]);
}

export default useCommissionCalcV2;
