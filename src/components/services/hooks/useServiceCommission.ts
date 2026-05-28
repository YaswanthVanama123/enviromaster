import { useMemo } from 'react';
import { useServicesContext, AccountTypeCacheEntry } from '../ServicesContext';
import { getFrequencyNumber, BACKEND_TO_FREQUENCY } from './useAccountTypeDetection';
import {
  calculateCommissionableRevenue,
  formatCurrency,
  getVisitsPerYear,
} from '../../../backendservice/utils/commissionCalculatorV2';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';
import type { ServiceFrequency } from '../../../backendservice/types/commission.types.v2';

// Revenue deductions by account type
export const ACCOUNT_TYPE_DEDUCTIONS: Record<AccountType, number> = {
  Anchor: 0,
  Bread5: 50,
  Bread15: 75,
  Pit: 100,
};

// Extended frequency type for internal mapping
type ExtendedFrequency = ServiceFrequency | 'bi-weekly' | 'semi-annual' | 'annual' | 'twice-per-month' | 'bi-monthly';

// Visits per year for extended frequencies
const EXTENDED_FREQUENCY_VISITS: Record<ExtendedFrequency, number> = {
  'weekly': 52,
  'biweekly': 26,
  'bi-weekly': 26,
  'monthly': 12,
  'quarterly': 4,
  'semi-annual': 2,
  'annual': 1,
  'twice-per-month': 24,
  'bi-monthly': 6,
  'one-time': 1,
};

// Helper to map backend frequency number to frequency string
export function backendFrequencyToServiceFrequency(freqNum: number): ExtendedFrequency {
  const mapping: Record<number, ExtendedFrequency> = {
    1: 'weekly',
    2: 'bi-weekly',
    3: 'monthly',
    4: 'quarterly',
    5: 'semi-annual',
    6: 'annual',
    13: 'twice-per-month',
    14: 'bi-monthly',
    0: 'one-time',
  };
  return mapping[freqNum] || 'monthly';
}

// Get visits per year, with fallback to standard getVisitsPerYear for core frequencies
function getVisitsPerYearExtended(frequency: ExtendedFrequency): number {
  // First try extended mapping
  if (EXTENDED_FREQUENCY_VISITS[frequency] !== undefined) {
    return EXTENDED_FREQUENCY_VISITS[frequency];
  }
  // Fallback to standard V2 function for core frequencies
  try {
    return getVisitsPerYear(frequency as ServiceFrequency);
  } catch {
    return 12; // Default to monthly
  }
}

export interface ServiceCommissionResult {
  // Account type info
  accountType: AccountType | null;
  accountTypeLabel: string;
  confidence: 'high' | 'low' | null;
  reason: string | null;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  usedFallback: boolean;

  // Revenue breakdown
  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;

  // Commission amounts
  commissionRate: number;
  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;

  // Frequency info
  frequencyNumber: number | null;
  frequencyLabel: string;
  visitsPerYear: number;

  // Formatted values for display
  formatted: {
    perVisitRevenue: string;
    revenueDeduction: string;
    commissionableRevenue: string;
    perVisitCommission: string;
    weeklyCommission: string;
    annualCommission: string;
  };

  // Status flags
  isDetected: boolean;
  isOneTime: boolean;
}

export interface UseServiceCommissionOptions {
  serviceData: any;
  commissionRate?: number; // Default 6%
}

export function useServiceCommission({
  serviceData,
  commissionRate = 6,
}: UseServiceCommissionOptions): ServiceCommissionResult {
  const { accountTypeCache } = useServicesContext();

  return useMemo(() => {
    // Default result for inactive or one-time services
    const defaultResult: ServiceCommissionResult = {
      accountType: null,
      accountTypeLabel: 'Unknown',
      confidence: null,
      reason: null,
      drivingTimeMinutes: null,
      nearestDestination: null,
      usedFallback: false,

      perVisitRevenue: 0,
      revenueDeduction: 0,
      commissionableRevenue: 0,
      anchorBonus: 0,

      commissionRate,
      perVisitCommission: 0,
      weeklyCommission: 0,
      annualCommission: 0,

      frequencyNumber: null,
      frequencyLabel: 'Unknown',
      visitsPerYear: 0,

      formatted: {
        perVisitRevenue: '$0.00',
        revenueDeduction: '$0.00',
        commissionableRevenue: '$0.00',
        perVisitCommission: '$0.00',
        weeklyCommission: '$0.00',
        annualCommission: '$0.00',
      },

      isDetected: false,
      isOneTime: false,
    };

    if (!serviceData?.isActive) {
      return defaultResult;
    }

    // Get frequency number
    const freqNum = getFrequencyNumber(serviceData);
    const isOneTime = freqNum === 0;

    // Get per-visit revenue
    const perVisitRevenue =
      serviceData.perVisit ??
      serviceData.totals?.perVisit?.amount ??
      serviceData.perVisitCharge ??
      serviceData.calc?.perVisit ??
      0;

    // If one-time service, return basic info without account type detection
    if (isOneTime || freqNum === null) {
      const oneTimePrice =
        serviceData.totalPrice ??
        serviceData.totals?.totalPrice?.amount ??
        perVisitRevenue;

      return {
        ...defaultResult,
        perVisitRevenue: oneTimePrice,
        frequencyNumber: 0,
        frequencyLabel: 'One-Time',
        isOneTime: true,
        formatted: {
          ...defaultResult.formatted,
          perVisitRevenue: formatCurrency(oneTimePrice),
        },
      };
    }

    // Look up account type from cache
    const cacheEntry = accountTypeCache[freqNum] as AccountTypeCacheEntry | undefined;
    const accountType = cacheEntry?.accountType || null;
    const frequencyLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';
    const serviceFrequency = backendFrequencyToServiceFrequency(freqNum);
    const visitsPerYear = getVisitsPerYearExtended(serviceFrequency);

    // If no account type detected, return partial info
    if (!accountType) {
      return {
        ...defaultResult,
        perVisitRevenue,
        frequencyNumber: freqNum,
        frequencyLabel,
        visitsPerYear,
        formatted: {
          ...defaultResult.formatted,
          perVisitRevenue: formatCurrency(perVisitRevenue),
        },
      };
    }

    // Calculate commissionable revenue using V2 rules
    const { commissionableRevenue, revenueDeduction, anchorBonus } =
      calculateCommissionableRevenue(perVisitRevenue, accountType);

    // Calculate commission
    const perVisitCommission = commissionableRevenue * (commissionRate / 100);
    const annualCommission = perVisitCommission * visitsPerYear;
    const weeklyCommission = annualCommission / 52;

    return {
      accountType,
      accountTypeLabel: accountType,
      confidence: cacheEntry?.confidence || null,
      reason: cacheEntry?.reason || null,
      drivingTimeMinutes: cacheEntry?.drivingTimeMinutes || null,
      nearestDestination: cacheEntry?.nearestDestination || null,
      usedFallback: cacheEntry?.usedFallback || false,

      perVisitRevenue,
      revenueDeduction,
      commissionableRevenue,
      anchorBonus,

      commissionRate,
      perVisitCommission,
      weeklyCommission,
      annualCommission,

      frequencyNumber: freqNum,
      frequencyLabel,
      visitsPerYear,

      formatted: {
        perVisitRevenue: formatCurrency(perVisitRevenue),
        revenueDeduction: formatCurrency(revenueDeduction),
        commissionableRevenue: formatCurrency(commissionableRevenue),
        perVisitCommission: formatCurrency(perVisitCommission),
        weeklyCommission: formatCurrency(weeklyCommission),
        annualCommission: formatCurrency(annualCommission),
      },

      isDetected: true,
      isOneTime: false,
    };
  }, [serviceData, commissionRate, accountTypeCache]);
}

// Hook to calculate combined commission for all services
export interface ServiceCommissionDetail {
  serviceName: string;
  accountType: AccountType | null;
  confidence: 'high' | 'low' | null;
  reason: string | null;
  // Revenue breakdown
  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;
  // Frequency info
  frequencyNumber: number;
  frequencyLabel: string;
  visitsPerYear: number;
  // Commission amounts
  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  // Formatted values
  formatted: {
    perVisitRevenue: string;
    revenueDeduction: string;
    commissionableRevenue: string;
    perVisitCommission: string;
    weeklyCommission: string;
    annualCommission: string;
  };
}

export interface GlobalCommissionResult {
  // Totals
  totalPerVisitCommission: number;
  totalWeeklyCommission: number;
  totalAnnualCommission: number;
  totalPerVisitRevenue: number;
  totalCommissionableRevenue: number;

  // Service breakdown (extended)
  services: ServiceCommissionDetail[];

  // Formatted values
  formatted: {
    totalPerVisitCommission: string;
    totalWeeklyCommission: string;
    totalAnnualCommission: string;
    totalPerVisitRevenue: string;
    totalCommissionableRevenue: string;
  };

  // Status
  hasDetectedServices: boolean;
  serviceCount: number;
}

export function useGlobalCommission(commissionRate: number = 6): GlobalCommissionResult {
  const { servicesState, accountTypeCache } = useServicesContext();

  return useMemo(() => {
    let totalPerVisitCommission = 0;
    let totalWeeklyCommission = 0;
    let totalAnnualCommission = 0;
    let totalPerVisitRevenue = 0;
    let totalCommissionableRevenue = 0;

    const services: ServiceCommissionDetail[] = [];

    Object.entries(servicesState).forEach(([serviceName, serviceData]: [string, any]) => {
      if (!serviceData?.isActive) return;

      const freqNum = getFrequencyNumber(serviceData);
      if (freqNum === null || freqNum === 0) return; // Skip one-time services

      const perVisitRevenue =
        serviceData.perVisit ??
        serviceData.totals?.perVisit?.amount ??
        serviceData.perVisitCharge ??
        serviceData.calc?.perVisit ??
        0;

      if (perVisitRevenue <= 0) return;

      const cacheEntry = accountTypeCache[freqNum] as AccountTypeCacheEntry | undefined;
      const accountType = cacheEntry?.accountType || null;
      const confidence = cacheEntry?.confidence || null;
      const reason = cacheEntry?.reason || null;

      let commissionableRevenue = perVisitRevenue;
      let revenueDeduction = 0;
      let anchorBonus = 0;

      if (accountType) {
        const result = calculateCommissionableRevenue(perVisitRevenue, accountType);
        commissionableRevenue = result.commissionableRevenue;
        revenueDeduction = result.revenueDeduction;
        anchorBonus = result.anchorBonus || 0;
      }

      const serviceFrequency = backendFrequencyToServiceFrequency(freqNum);
      const frequencyLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';
      const visitsPerYear = getVisitsPerYearExtended(serviceFrequency);

      const perVisitCommission = commissionableRevenue * (commissionRate / 100);
      const annualCommission = perVisitCommission * visitsPerYear;
      const weeklyCommission = annualCommission / 52;

      totalPerVisitCommission += perVisitCommission;
      totalWeeklyCommission += weeklyCommission;
      totalAnnualCommission += annualCommission;
      totalPerVisitRevenue += perVisitRevenue;
      totalCommissionableRevenue += commissionableRevenue;

      services.push({
        serviceName,
        accountType,
        confidence,
        reason,
        perVisitRevenue,
        revenueDeduction,
        commissionableRevenue,
        anchorBonus,
        frequencyNumber: freqNum,
        frequencyLabel,
        visitsPerYear,
        perVisitCommission,
        weeklyCommission,
        annualCommission,
        formatted: {
          perVisitRevenue: formatCurrency(perVisitRevenue),
          revenueDeduction: formatCurrency(revenueDeduction),
          commissionableRevenue: formatCurrency(commissionableRevenue),
          perVisitCommission: formatCurrency(perVisitCommission),
          weeklyCommission: formatCurrency(weeklyCommission),
          annualCommission: formatCurrency(annualCommission),
        },
      });
    });

    return {
      totalPerVisitCommission,
      totalWeeklyCommission,
      totalAnnualCommission,
      totalPerVisitRevenue,
      totalCommissionableRevenue,

      services,

      formatted: {
        totalPerVisitCommission: formatCurrency(totalPerVisitCommission),
        totalWeeklyCommission: formatCurrency(totalWeeklyCommission),
        totalAnnualCommission: formatCurrency(totalAnnualCommission),
        totalPerVisitRevenue: formatCurrency(totalPerVisitRevenue),
        totalCommissionableRevenue: formatCurrency(totalCommissionableRevenue),
      },

      hasDetectedServices: services.some(s => s.accountType !== null),
      serviceCount: services.length,
    };
  }, [servicesState, accountTypeCache, commissionRate]);
}

export default useServiceCommission;
