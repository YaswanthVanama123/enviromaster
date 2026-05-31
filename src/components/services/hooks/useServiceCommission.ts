import { useEffect, useMemo, useState } from 'react';
import { useServicesContext, AccountTypeCacheEntry } from '../ServicesContext';
import { getFrequencyNumber, BACKEND_TO_FREQUENCY } from './useAccountTypeDetection';
import {
  calculateCommissionableRevenue,
  formatCurrency,
  getVisitsPerYear,
} from '../../../backendservice/utils/commissionCalculatorV2';
import { DEFAULT_COMMISSION_RULES_V2 } from '../../../backendservice/types/commission.types.v2';
import {
  COMMISSION_RULES_V2,
  ACCOUNT_TYPE_REVENUE_RULES,
  ANCHOR_BONUS_MULTIPLIER,
  ANCHOR_PER_VISIT_THRESHOLD,
  PIT_PER_VISIT_THRESHOLD,
  DEFAULT_QUOTA_TIER_CUTOFFS,
  getPricingTierFromList,
  PRICING_TIERS,
  resolveCommissionRules,
  type ResolvedCommissionRules,
} from '../../../backendservice/types/commission.types';
import { commissionApi } from '../../../backendservice/api/commissionApi';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';
import type { ServiceFrequency, AgreementTerm } from '../../../backendservice/types/commission.types.v2';

// Revenue deductions by account type
export const ACCOUNT_TYPE_DEDUCTIONS: Record<AccountType, number> = {
  Anchor: 0,
  Bread5: 50,
  Bread15: 75,
  Pit: 100,
};

// Helper to map contract months to agreement term
function getAgreementTerm(contractMonths: number): AgreementTerm {
  if (contractMonths >= 36) return '3-year';
  if (contractMonths >= 12) return '1-year';
  // MTM - assume with install for now
  return 'MTM-with-install';
}

// Get agreement multiplier from contract months
function getAgreementMultiplier(contractMonths: number): number {
  const term = getAgreementTerm(contractMonths);
  return DEFAULT_COMMISSION_RULES_V2.agreementMultipliers[term];
}

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
  // Pricing tier (per Solange Draft):
  //   Below Redline 0.5×, Redline 1.0×, 110% 1.25×, 120% 1.5×, Greenline 2.0×
  annualOriginalRevenue: number;     // 12-month redline figure for the group
  priceRatio: number;                // current ÷ original (≥1 = above redline)
  pricingTierLabel: string;          // e.g. "Redline", "Greenline (130%+)"
  pricingMultiplier: number;         // 0.5 / 1.0 / 1.25 / 1.5 / 2.0
  adjustedAnnualRevenue: number;     // annualCurrent × pricingMultiplier
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
    annualOriginalRevenue: string;
    adjustedAnnualRevenue: string;
    priceRatio: string;
    pricingMultiplier: string;
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

  // Agreement multiplier info
  agreementMultiplier: number;
  effectiveCommissionRate: number;

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
  const { servicesState, accountTypeCache, globalContractMonths } = useServicesContext();

  // Live rules from MongoDB (admin-editable). Defaults until the fetch resolves.
  const [activeRules, setActiveRules] = useState<ResolvedCommissionRules>(() =>
    resolveCommissionRules(null),
  );

  useEffect(() => {
    let cancelled = false;
    commissionApi
      .getActiveRules()
      .then(response => {
        if (cancelled) return;
        if (response?.data) {
          setActiveRules(resolveCommissionRules(response.data));
        }
      })
      .catch(err => {
        console.error('[RULES] useGlobalCommission failed to load active rules:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    // Use live admin-editable rules (per-visit penalties, Anchor thresholds,
    // pricing tiers, frequency visits-per-year, weeksPerAnnualCommission, etc.).
    const rules = activeRules;

    // Visits per year per frequency, sourced from rules.
    const visitsPerYearOf = (freqStr: string): number => {
      const v: any = rules.frequencyVisitsPerYear;
      const norm = (freqStr || 'monthly').toLowerCase().replace(/-/g, '');
      if (norm === 'weekly') return v.weekly;
      if (norm === 'biweekly') return v.biweekly;
      if (norm === 'monthly') return v.monthly;
      if (norm === 'quarterly') return v.quarterly;
      if (norm === 'onetime') return v['one-time'];
      // Fallback to backend-frequency table for extended types
      return EXTENDED_FREQUENCY_VISITS[freqStr as ExtendedFrequency] ?? 12;
    };

    // Agreement multiplier (e.g. 135% for 36 months)
    const agreementTerm = getAgreementTerm(globalContractMonths);
    const agreementMultiplier = rules.agreementMultipliers[agreementTerm];

    // === STEP 1 — Walk all active recurring services and bucket them by
    // frequency. Per service, derive its 1-YEAR contract total (current and
    // original/redline) by prorating the multi-year contractTotal down to a
    // single year. No per-visit math anywhere.
    type ServiceRow = {
      serviceName: string;
      serviceData: any;
      freqNum: number;
      freqLabel: string;
      freqStr: ExtendedFrequency;
      annualCurrent: number;
      annualOriginal: number;
      accountType: AccountType | null;
      cacheEntry: AccountTypeCacheEntry | undefined;
    };

    const rows: ServiceRow[] = [];

    Object.entries(servicesState).forEach(([serviceName, serviceData]: [string, any]) => {
      if (!serviceData?.isActive) return;

      const freqNum = getFrequencyNumber(serviceData);
      if (freqNum === null || freqNum === 0) return; // one-time excluded from frequency rollup

      // Service contract total (multi-year) — current and redline
      const serviceCurrent =
        (typeof serviceData.contractTotal === 'number' && serviceData.contractTotal) ||
        serviceData.totals?.contract?.amount ||
        serviceData.totals?.annual?.amount ||
        0;
      const serviceOriginal =
        (typeof serviceData.originalContractTotal === 'number' && serviceData.originalContractTotal) ||
        serviceCurrent;

      if (serviceCurrent <= 0) return;

      // 1-YEAR slice of the contract (regardless of contractMonths)
      const annualCurrent =
        globalContractMonths > 0 ? (serviceCurrent / globalContractMonths) * 12 : serviceCurrent;
      const annualOriginal =
        globalContractMonths > 0 ? (serviceOriginal / globalContractMonths) * 12 : serviceOriginal;

      const cacheEntry = accountTypeCache[freqNum] as AccountTypeCacheEntry | undefined;
      const accountType = cacheEntry?.accountType || null;
      const freqStr = backendFrequencyToServiceFrequency(freqNum);
      const freqLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';

      rows.push({
        serviceName,
        serviceData,
        freqNum,
        freqLabel,
        freqStr,
        annualCurrent,
        annualOriginal,
        accountType,
        cacheEntry,
      });
    });

    // === STEP 2 — Group rows by frequency and run the contract-total calc per
    // group. Penalties / Anchor zones are expressed as ANNUAL dollar amounts
    // (per-visit threshold × visitsPerYear for that group) so a single
    // deduction applies once per visit, not once per service-per-visit.
    const groups = new Map<
      string,
      {
        freqStr: ExtendedFrequency;
        freqLabel: string;
        rows: ServiceRow[];
        accountType: AccountType | null;
        annualCurrent: number;
        annualOriginal: number;
        priceRatio: number;
        pricingTier: ReturnType<typeof getPricingTierFromList>;
        pricingMultiplier: number;
        adjustedAnnual: number;
        revenueDeduction: number;
        anchorBonus: number;
        commissionableAnnual: number;
        annualCommission: number;
      }
    >();

    rows.forEach(row => {
      const key = row.freqStr;
      if (!groups.has(key)) {
        groups.set(key, {
          freqStr: row.freqStr,
          freqLabel: row.freqLabel,
          rows: [],
          accountType: row.accountType,
          annualCurrent: 0,
          annualOriginal: 0,
          priceRatio: 1,
          pricingTier: PRICING_TIERS[1],
          pricingMultiplier: 1,
          adjustedAnnual: 0,
          revenueDeduction: 0,
          anchorBonus: 0,
          commissionableAnnual: 0,
          annualCommission: 0,
        });
      }
      const g = groups.get(key)!;
      g.rows.push(row);
      g.annualCurrent += row.annualCurrent;
      g.annualOriginal += row.annualOriginal;
      // Prefer the first non-null accountType for this frequency
      if (!g.accountType && row.accountType) g.accountType = row.accountType;
    });

    let totalCommissionableAnnual = 0;
    let totalQuotaCredit = 0;

    // === AGREEMENT-LEVEL PRICING TIER ===
    // Per Solange Draft, the pricing multiplier is determined by the WHOLE
    // agreement's price ratio, not per-frequency-group ratios. Sum every
    // service's 1-year contract (current + redline), compute the ratio once,
    // and apply that single multiplier to every group.
    let agreementCurrentAnnual = 0;
    let agreementOriginalAnnual = 0;
    rows.forEach(r => {
      agreementCurrentAnnual += r.annualCurrent;
      agreementOriginalAnnual += r.annualOriginal;
    });
    const agreementPriceRatio =
      agreementOriginalAnnual > 0 ? agreementCurrentAnnual / agreementOriginalAnnual : 1;
    const agreementPricingTier = getPricingTierFromList(
      agreementCurrentAnnual,
      agreementOriginalAnnual,
      rules.pricingTiers,
    );
    const agreementPricingMultiplier = agreementPricingTier.quotaMultiplier;
    const agreementIsGreenline = agreementPricingTier.label === 'Greenline (130%+)';

    groups.forEach(g => {
      // Use the AGREEMENT-level tier for every group (one ratio, one multiplier).
      g.pricingTier = agreementPricingTier;
      g.pricingMultiplier = agreementPricingMultiplier;
      g.priceRatio = agreementPriceRatio;
      const isGreenline = agreementIsGreenline;

      // Annual base after pricing multiplier ONLY (agreement multiplier stays
      // in the rate via effectiveCommissionRate, matching the existing UI's
      // "commissionableRevenue × effectiveRate%" display contract).
      g.adjustedAnnual = g.annualCurrent * g.pricingMultiplier;

      // Annualized account-type thresholds for this frequency group
      const visits = visitsPerYearOf(g.freqStr);
      const pitZoneAnnual = rules.pitPerVisitThreshold * visits;
      const anchorZoneAnnual = (isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold) * visits;
      const pen = rules.perVisitPenalties;
      const bread5Annual = pen.Bread5 * visits;
      const bread15Annual = pen.Bread15 * visits;
      const pitAnnual = pen.Pit * visits;

      // Account-type adjustment at the annual contract-total level.
      // (NOTE: isNewLocation flag isn't surfaced into this hook today; we
      // default to "new location" semantics, matching the previous behavior
      // which always applied the deduction. The FormFilling calc reads the
      // isNewLocation flag directly.)
      const isNewLocation = true;
      const adjusted = g.adjustedAnnual;

      switch (g.accountType) {
        case 'Anchor': {
          if (isNewLocation) {
            const pitPart = Math.min(adjusted, pitZoneAnnual);
            const stdPart = Math.min(Math.max(0, adjusted - pitZoneAnnual), anchorZoneAnnual - pitZoneAnnual);
            const anchorPart = Math.max(0, adjusted - anchorZoneAnnual);
            g.commissionableAnnual = Math.max(0, stdPart) + anchorPart * rules.anchorBonusMultiplier;
            g.revenueDeduction = pitPart;
            g.anchorBonus = anchorPart * (rules.anchorBonusMultiplier - 1);
          } else {
            const stdPart = Math.min(adjusted, anchorZoneAnnual);
            const anchorPart = Math.max(0, adjusted - anchorZoneAnnual);
            g.commissionableAnnual = stdPart + anchorPart * rules.anchorBonusMultiplier;
            g.revenueDeduction = 0;
            g.anchorBonus = anchorPart * (rules.anchorBonusMultiplier - 1);
          }
          break;
        }
        case 'Bread5': {
          g.revenueDeduction = isNewLocation ? bread5Annual : 0;
          g.commissionableAnnual = Math.max(0, adjusted - g.revenueDeduction);
          break;
        }
        case 'Bread15': {
          g.revenueDeduction = isNewLocation ? bread15Annual : 0;
          g.commissionableAnnual = Math.max(0, adjusted - g.revenueDeduction);
          break;
        }
        case 'Pit': {
          if (isNewLocation || adjusted <= pitAnnual) {
            g.revenueDeduction = pitAnnual;
            g.commissionableAnnual = Math.max(0, adjusted - pitAnnual);
          } else {
            g.revenueDeduction = 0;
            g.commissionableAnnual = adjusted;
          }
          break;
        }
        default: {
          // Account type not detected → fall through with no adjustment
          g.revenueDeduction = 0;
          g.commissionableAnnual = adjusted;
        }
      }

      totalCommissionableAnnual += g.commissionableAnnual;
      totalQuotaCredit += g.annualCurrent * g.pricingMultiplier;
    });

    // === STEP 3 — Distribute the GROUP-level commissionable back to the
    // individual services proportional to their share of the group's annual
    // current revenue. This keeps the per-service display rows in sync with
    // the group-level math while charging deductions only once per visit.
    let totalAnnualCommission = 0;
    let totalWeeklyCommission = 0;
    let totalPerVisitCommission = 0;
    let totalPerVisitRevenue = 0;
    let totalCommissionableRevenue = 0;

    const services: ServiceCommissionDetail[] = [];
    // effectiveRate = base × agreement multiplier (e.g. 3% × 135% = 4.05%)
    // Applied to commissionableAnnual (which has pricingMultiplier baked in).
    const effectiveCommissionRate = commissionRate * (agreementMultiplier / 100);

    groups.forEach(g => {
      // Commission for the group at the EFFECTIVE rate (base × agreement).
      g.annualCommission = g.commissionableAnnual * (effectiveCommissionRate / 100);
      const groupVisits = visitsPerYearOf(g.freqStr);
      const groupWeekly = g.annualCommission / rules.weeksPerAnnualCommission;
      const groupPerVisit = groupVisits > 0 ? g.annualCommission / groupVisits : 0;

      g.rows.forEach(row => {
        const share = g.annualCurrent > 0 ? row.annualCurrent / g.annualCurrent : 0;
        const rowAnnualCommission = g.annualCommission * share;
        const rowCommissionable = g.commissionableAnnual * share;
        const rowDeduction = g.revenueDeduction * share;
        const rowAnchorBonus = g.anchorBonus * share;
        const rowWeekly = rowAnnualCommission / rules.weeksPerAnnualCommission;
        const rowPerVisit = groupVisits > 0 ? rowAnnualCommission / groupVisits : 0;

        totalAnnualCommission += rowAnnualCommission;
        totalWeeklyCommission += rowWeekly;
        totalPerVisitCommission += rowPerVisit;
        totalPerVisitRevenue += row.annualCurrent;     // now reports ANNUAL revenue, not per-visit
        totalCommissionableRevenue += rowCommissionable;

        // Per-service share of the group's pricing-multiplied revenue
        const rowAdjusted = row.annualCurrent * g.pricingMultiplier;
        const rowOriginal = row.annualOriginal;

        services.push({
          serviceName: row.serviceName,
          accountType: row.accountType,
          confidence: row.cacheEntry?.confidence || null,
          reason: row.cacheEntry?.reason || null,
          perVisitRevenue: row.annualCurrent,
          revenueDeduction: rowDeduction,
          commissionableRevenue: rowCommissionable,
          anchorBonus: rowAnchorBonus,
          // Pricing tier (group-level, surfaced per service for display)
          annualOriginalRevenue: rowOriginal,
          priceRatio: g.priceRatio,
          pricingTierLabel: g.pricingTier.label,
          pricingMultiplier: g.pricingMultiplier,
          adjustedAnnualRevenue: rowAdjusted,
          frequencyNumber: row.freqNum,
          frequencyLabel: row.freqLabel,
          visitsPerYear: groupVisits,
          perVisitCommission: rowPerVisit,
          weeklyCommission: rowWeekly,
          annualCommission: rowAnnualCommission,
          formatted: {
            perVisitRevenue: formatCurrency(row.annualCurrent),
            revenueDeduction: formatCurrency(rowDeduction),
            commissionableRevenue: formatCurrency(rowCommissionable),
            annualOriginalRevenue: formatCurrency(rowOriginal),
            adjustedAnnualRevenue: formatCurrency(rowAdjusted),
            priceRatio: `${(g.priceRatio * 100).toFixed(1)}%`,
            pricingMultiplier: `${g.pricingMultiplier.toFixed(2)}×`,
            perVisitCommission: formatCurrency(rowPerVisit),
            weeklyCommission: formatCurrency(rowWeekly),
            annualCommission: formatCurrency(rowAnnualCommission),
          },
        });
      });
    });

    return {
      totalPerVisitCommission,
      totalWeeklyCommission,
      totalAnnualCommission,
      totalPerVisitRevenue,
      totalCommissionableRevenue,

      agreementMultiplier,
      effectiveCommissionRate,

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
  }, [servicesState, accountTypeCache, commissionRate, globalContractMonths, activeRules]);
}

export default useServiceCommission;
