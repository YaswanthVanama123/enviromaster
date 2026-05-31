

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

export interface UseCommissionCalcV2Input {
  
  perVisitRevenue: number;
  redlinePrice: number;
  frequency: ServiceFrequency;

  accountType: AccountType;
  drivingTimeMinutes?: number;
  nearestAnchorName?: string;

  agreementTerm: AgreementTerm;
  contractMonths: number;

  businessType: BusinessType;
  yearsAsCustomer?: number;
  totalRenewalValue?: number;

  isInsideSales: boolean;

  employeeHireDate?: string;
  periodSalesTotal?: number;
  newRooftopCount?: number;

  customerName?: string;
}

export interface UseCommissionCalcV2Return {
  
  result: CommissionCalculationResultV2 | null;

  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;
  totalCommission: number;
  renewalBonus: number;

  finalCommissionRate: number;
  baseRate: number;
  effectiveRate: number;
  quotaLevel: QuotaLevel;
  pricingTier: string;
  pricingMultiplier: number;
  commissionableRevenue: number;

  isGreenline: boolean;
  requiresApproval: boolean;
  autoQuotaQualified: boolean;

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

  detectAccountType: (perVisitRevenue: number, drivingTimeMinutes: number | null) => AccountType;
  recalculate: () => void;
}

export function useCommissionCalcV2(input: UseCommissionCalcV2Input): UseCommissionCalcV2Return {
  const [recalcTrigger, setRecalcTrigger] = useState(0);

  const monthsEmployed = useMemo(() => {
    if (input.employeeHireDate) {
      return calculateMonthsEmployed(input.employeeHireDate);
    }
    return 5; 
  }, [input.employeeHireDate]);

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

  const result = useMemo(() => {
    
    if (input.perVisitRevenue <= 0) {
      return null;
    }

    return calculateCommissionV2(calcInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcInput, recalcTrigger]);

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

  const detectAccountTypeHelper = useCallback(
    (perVisitRevenue: number, drivingTimeMinutes: number | null) => {
      return detectAccountType(perVisitRevenue, drivingTimeMinutes, isGreenlineFlag);
    },
    [isGreenlineFlag]
  );

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

export interface UseFormFillingCommissionInput {
  
  totalContractValue: number;
  contractMonths: number;
  pricingIndicator: 'red' | 'green';

  quotaLevel: QuotaLevel;
  accountType: AccountType;
  isInsideSales: boolean;

  redlinePrice?: number;
  frequency?: ServiceFrequency;
  employeeHireDate?: string;
  periodSalesTotal?: number;
  newRooftopCount?: number;
}

export interface UseFormFillingCommissionReturn {
  
  monthlyValue: number;
  agreementTerm: AgreementTerm;
  pricingLine: 'Redline' | 'Greenline';

  baseRate: number;
  agreementMultiplier: number;
  accountTypeDeduction: number;
  greenlineMultiplier: number;
  insideSalesDeduction: number;
  effectiveBaseRate: number;
  finalCommissionRate: number;

  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;

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

    const monthlyValue = contractMonths > 0 ? totalContractValue / contractMonths : totalContractValue;

    const getAgreementTerm = (): AgreementTerm => {
      if (contractMonths >= 36) return '3-year';
      if (contractMonths >= 12) return '1-year';
      return 'MTM-with-install';
    };

    const agreementTerm = getAgreementTerm();
    const pricingLine = pricingIndicator === 'green' ? 'Greenline' : 'Redline';
    const isGreenlineFlag = pricingIndicator === 'green';

    const QUOTA_RATES = { below: 3, above: 6, double: 9 };
    const baseRate = QUOTA_RATES[quotaLevel];

    const AGREEMENT_MULTIPLIERS = {
      '3-year': 135,
      '1-year': 100,
      'MTM-with-install': 100,
      'MTM-no-install': 50,
    };
    const agreementMultiplier = AGREEMENT_MULTIPLIERS[agreementTerm];

    const { commissionableRevenue, revenueDeduction } = calculateCommissionableRevenue(
      monthlyValue,
      accountType
    );

    const accountTypeDeduction = revenueDeduction;

    const greenlineMultiplier = isGreenlineFlag ? 2.0 : 1.0;

    const insideSalesDeduction = isInsideSales ? -3 : 0;

    const effectiveBaseRate = baseRate + insideSalesDeduction;

    const finalCommissionRate = effectiveBaseRate * (agreementMultiplier / 100);

    
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
