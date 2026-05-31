
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { SanicleanFormState } from "./saniclean/sanicleanTypes";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import type { AccountType } from "../../backendservice/api/accountTypeApi";
import {
  calculateCommissionableRevenue,
  formatCurrency,
} from "../../backendservice/utils/commissionCalculatorV2";
import { DEFAULT_COMMISSION_RULES_V2 } from "../../backendservice/types/commission.types.v2";
import type { AgreementTerm } from "../../backendservice/types/commission.types.v2";

export type QuotaLevel = 'below' | 'above' | 'double';

export const QUOTA_COMMISSION_RATES: Record<QuotaLevel, number> = {
  below: 3,
  above: 6,
  double: 9,
};

export interface QuotaLevelData {
  quotaLevel: QuotaLevel;
  quotaPercentage: number;
  quotaTarget: number;
  actualSales: number;
  commissionRate: number;
  salesPersonId: string;
  salesPersonName: string;
}

export interface AccountTypeCacheEntry {
  accountType: AccountType;
  confidence: 'high' | 'low';
  reason: string;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  cachedAt: number;
  usedFallback?: boolean;
  fallbackReason?: string;
}

export interface AccountTypeCache {
  [frequencyKey: number]: AccountTypeCacheEntry;
}

export interface CommissionDataForSave {
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;
  finalCommissionRate: number;
  agreementMultiplier: number;
  baseRate: number;
  serviceBreakdown: Array<{
    serviceName: string;
    accountType: AccountType | null;
    perVisitRevenue: number;
    commissionableRevenue: number;
    weeklyCommission: number;
    annualCommission: number;
  }>;
}

export interface ServicesState {
  saniclean?: any;
  foamingDrain?: any;
  saniscrub?: any;
  microfiberMopping?: any;
  rpmWindows?: any;
  refreshPowerScrub?: any;
  sanipod?: any;
  carpetclean?: any;
  pureJanitorial?: any;
  stripwax?: any;
  greaseTrap?: any;
  electrostaticSpray?: any;
  customServices?: any;
}

interface ServicesContextValue {
  servicesState: ServicesState;
  updateSaniclean: (update: Partial<ServicesState["saniclean"]>) => void;
  updateService: (serviceName: keyof ServicesState, data: any) => void;

  backendPricingData: ServiceConfig[];
  getBackendPricingForService: (serviceId: string) => ServiceConfig | null;

  isSanicleanAllInclusive: boolean;
  sanicleanPaperCreditPerWeek: number;

  globalContractMonths: number;
  setGlobalContractMonths: (months: number) => void;
  getTotalAgreementAmount: () => number;
  getTotalPerVisitAmount: () => number;
  getTotalMonthlyRecurringRevenue: () => number;
  allServicesOneTime: boolean;

  getTotalOriginalContractTotal: () => number;

  globalTripCharge: number;
  setGlobalTripCharge: (charge: number) => void;
  globalParkingCharge: number;
  setGlobalParkingCharge: (charge: number) => void;

  globalTripChargeFrequency: number;
  setGlobalTripChargeFrequency: (frequency: number) => void;
  globalParkingChargeFrequency: number;
  setGlobalParkingChargeFrequency: (frequency: number) => void;

  biginCompanyId: string | null;
  setBiginCompanyId: (id: string | null) => void;
  agreementId: string | null;
  setAgreementId: (id: string | null) => void;
  accountTypeCache: AccountTypeCache;
  setAccountTypeForFrequency: (frequencyKey: number, entry: AccountTypeCacheEntry) => void;
  getAccountTypeForFrequency: (frequencyKey: number) => AccountTypeCacheEntry | null;
  initializeAccountTypeCache: (cache: AccountTypeCache) => void;
  clearAccountTypeCache: () => void;
  isDetectingAccountTypes: boolean;
  setIsDetectingAccountTypes: (detecting: boolean) => void;
  accountTypeDetectionError: string | null;
  setAccountTypeDetectionError: (error: string | null) => void;
  
  accountTypeCacheLoadedFromSaved: boolean;
  
  accountTypeCacheLoadedFromSavedRef: React.MutableRefObject<boolean>;

  getCommissionDataForSave: (baseCommissionRate?: number) => CommissionDataForSave | null;

  quotaLevel: QuotaLevel;
  quotaLevelData: QuotaLevelData | null;
  baseCommissionRate: number;
  setQuotaLevel: (level: QuotaLevel) => void;
  setQuotaLevelData: (data: QuotaLevelData | null) => void;
}

const ServicesContext = createContext<ServicesContextValue | undefined>(
  undefined
);

export const ServicesProvider: React.FC<{
  children: React.ReactNode;
  backendPricingData?: ServiceConfig[];
  biginCompanyId?: string | null;
  initialAccountTypeCache?: AccountTypeCache | null;
}> = ({
  children,
  backendPricingData = [],
  biginCompanyId: initialBiginCompanyId = null,
  initialAccountTypeCache = null,
}) => {
  const [servicesState, setServicesState] = useState<ServicesState>({});

  const [globalContractMonths, setGlobalContractMonths] = useState<number>(36);

  const [globalTripCharge, setGlobalTripCharge] = useState<number>(0);
  const [globalParkingCharge, setGlobalParkingCharge] = useState<number>(0);

  const [globalTripChargeFrequency, setGlobalTripChargeFrequency] = useState<number>(4);
  const [globalParkingChargeFrequency, setGlobalParkingChargeFrequency] = useState<number>(4);

  const [biginCompanyId, setBiginCompanyId] = useState<string | null>(initialBiginCompanyId);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [accountTypeCache, setAccountTypeCache] = useState<AccountTypeCache>({});
  const [isDetectingAccountTypes, setIsDetectingAccountTypes] = useState(false);
  const [accountTypeDetectionError, setAccountTypeDetectionError] = useState<string | null>(null);
  
  const [accountTypeCacheLoadedFromSaved, setAccountTypeCacheLoadedFromSaved] = useState(false);
  
  const accountTypeCacheLoadedFromSavedRef = useRef(false);

  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>('above'); 
  const [quotaLevelData, setQuotaLevelData] = useState<QuotaLevelData | null>(null);
  const baseCommissionRate = QUOTA_COMMISSION_RATES[quotaLevel];

  const setAccountTypeForFrequency = useCallback((frequencyKey: number, entry: AccountTypeCacheEntry) => {
    setAccountTypeCache(prev => ({
      ...prev,
      [frequencyKey]: entry
    }));
  }, []);

  const getAccountTypeForFrequency = useCallback((frequencyKey: number): AccountTypeCacheEntry | null => {
    return accountTypeCache[frequencyKey] || null;
  }, [accountTypeCache]);

  const clearAccountTypeCache = useCallback(() => {
    setAccountTypeCache({});
    setAccountTypeDetectionError(null);
    setAccountTypeCacheLoadedFromSaved(false);
    accountTypeCacheLoadedFromSavedRef.current = false; 
  }, []);

  const initializeAccountTypeCache = useCallback((cache: AccountTypeCache) => {
    if (cache && Object.keys(cache).length > 0) {
      console.log('[ACCOUNT-TYPE] Initializing cache from saved data:', Object.keys(cache));
      
      accountTypeCacheLoadedFromSavedRef.current = true;
      setAccountTypeCache(cache);
      setAccountTypeCacheLoadedFromSaved(true);
    }
  }, []);

  useEffect(() => {
    if (initialAccountTypeCache && Object.keys(initialAccountTypeCache).length > 0) {
      console.log('[ACCOUNT-TYPE] Loading saved account type cache on mount:', initialAccountTypeCache);
      accountTypeCacheLoadedFromSavedRef.current = true; 
      setAccountTypeCache(initialAccountTypeCache);
      setAccountTypeCacheLoadedFromSaved(true);
    }
  }, []); 

  const updateSaniclean = useCallback(
    (update: Partial<ServicesState["saniclean"]>) => {
      setServicesState((prev) => ({
        ...prev,
        saniclean: {
          ...(prev.saniclean ?? {}),
          ...update,
        },
      }));
    },
    []
  );

  const updateService = useCallback(
    (serviceName: keyof ServicesState, data: any) => {
      setServicesState((prev) => ({
        ...prev,
        [serviceName]: data,
      }));
    },
    []
  );

  const getBackendPricingForService = useCallback((serviceId: string): ServiceConfig | null => {
    return backendPricingData.find(config => config.serviceId === serviceId) || null;
  }, [backendPricingData]);

  const normalizeFrequencyKey = (value: any): string | null => {
    if (value === undefined || value === null) return null;
    const raw = typeof value === "object"
      ? value.frequencyKey ?? value.value ?? value.label ?? value.name ?? value.frequency ?? ""
      : value;
    const text = String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return text || null;
  };

  const isOneTimeService = (serviceData: any): boolean => {
    if (!serviceData) return false;
    const candidates = [
      serviceData.frequency,
      serviceData.frequencyKey,
      serviceData.frequency?.frequencyKey,
      serviceData.frequency?.value,
      serviceData.frequency?.label,
      serviceData.frequencyDisplay?.frequencyKey,
      serviceData.frequencyDisplay?.value,
      serviceData.frequencyDisplay?.label,
    ];
    return candidates.some((candidate) => {
      const normalized = normalizeFrequencyKey(candidate);
      return normalized === "onetime" || normalized === "1time";
    });
  };

  const getOneTimePrice = (serviceData: any): number | null => {
    const candidates = [
      serviceData.totalPrice,
      serviceData.calc?.totalPrice,
      serviceData.totals?.totalPrice?.amount,
      serviceData.totals?.perVisit?.amount,
      serviceData.totals?.firstVisit?.amount,
      serviceData.perVisit,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "number" && candidate > 0) {
        return candidate;
      }
    }
    return null;
  };

  const getTotalAgreementAmount = useCallback((): number => {
    let totalAmount = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      if (serviceData?.isActive) {

        let contractTotal = 0;

        if (typeof serviceData.contractTotal === 'number') {
          contractTotal = serviceData.contractTotal;
          console.log(`📊 [TOTAL CALC] ${serviceName} found contractTotal: $${contractTotal.toFixed(2)}`);
        }

        else if (serviceData.totals?.contract?.amount && typeof serviceData.totals.contract.amount === 'number') {
          contractTotal = serviceData.totals.contract.amount;
          console.log(`📊 [TOTAL CALC] ${serviceName} found totals.contract.amount: $${contractTotal.toFixed(2)}`);
        }

        else if (serviceData.totals?.annual?.amount && typeof serviceData.totals.annual.amount === 'number') {
          contractTotal = serviceData.totals.annual.amount;
          console.log(`📊 [TOTAL CALC] ${serviceName} found totals.annual.amount: $${contractTotal.toFixed(2)}`);
        }

        const oneTime = isOneTimeService(serviceData);
        if (oneTime) {
          const oneTimePrice = getOneTimePrice(serviceData);
          if (oneTimePrice !== null) {
            contractTotal = oneTimePrice;
            console.log(`ÐY"S [TOTAL CALC] ${serviceName} one-time override: $${contractTotal.toFixed(2)}`);
          }
        }

        if (contractTotal <= 0) {
          const fallbackFields = [
            serviceData.totals?.firstMonth?.amount,
            serviceData.perVisitCharge,
            serviceData.perVisit,
            serviceData.calc?.perVisit,
            serviceData.calc?.contractTotal,
            serviceData.calc?.total,
            serviceData.totalPrice,
            serviceData.calc?.totalPrice,
            serviceData.totals?.perVisit?.amount,
            serviceData.totals?.perVisit?.total,
          ];
          for (const fallback of fallbackFields) {
            if (typeof fallback === "number" && fallback > 0) {
              contractTotal = fallback;
              console.log(
                `📊 [TOTAL CALC] ${serviceName} fallback contract total: $${contractTotal.toFixed(2)}`
              );
              break;
            }
          }
        }

        if (contractTotal > 0) {
          totalAmount += contractTotal;
        } else {
          console.warn(
            `⚠️ [TOTAL CALC] ${serviceName} is active but no contract total found. Service data keys:`,
            Object.keys(serviceData)
          );
        }
      }
    });

    const tripChargeContractTotal = globalTripChargeFrequency === 0
      ? globalTripCharge 
      : globalTripCharge * globalTripChargeFrequency * globalContractMonths;

    const parkingChargeContractTotal = globalParkingChargeFrequency === 0
      ? globalParkingCharge 
      : globalParkingCharge * globalParkingChargeFrequency * globalContractMonths;

    totalAmount += tripChargeContractTotal;
    totalAmount += parkingChargeContractTotal;

    if (tripChargeContractTotal > 0) {
      const freqLabel = globalTripChargeFrequency === 0 ? 'One-time' :
                       globalTripChargeFrequency === 4 ? 'Weekly' :
                       globalTripChargeFrequency === 2 ? 'Bi-weekly' :
                       globalTripChargeFrequency === 1 ? 'Monthly' :
                       globalTripChargeFrequency === 0.5 ? 'Every 2 months' :
                       globalTripChargeFrequency === 0.33 ? 'Quarterly' :
                       globalTripChargeFrequency === 0.17 ? 'Bi-annually' :
                       globalTripChargeFrequency === 0.08 ? 'Annually' :
                       `${globalTripChargeFrequency}×/mo`;

      console.log(`📊 [TOTAL CALC] Global Trip Charge ($${globalTripCharge} - ${freqLabel}): $${tripChargeContractTotal.toFixed(2)}`);
    }
    if (parkingChargeContractTotal > 0) {
      const freqLabel = globalParkingChargeFrequency === 0 ? 'One-time' :
                       globalParkingChargeFrequency === 4 ? 'Weekly' :
                       globalParkingChargeFrequency === 2 ? 'Bi-weekly' :
                       globalParkingChargeFrequency === 1 ? 'Monthly' :
                       globalParkingChargeFrequency === 0.5 ? 'Every 2 months' :
                       globalParkingChargeFrequency === 0.33 ? 'Quarterly' :
                       globalParkingChargeFrequency === 0.17 ? 'Bi-annually' :
                       globalParkingChargeFrequency === 0.08 ? 'Annually' :
                       `${globalParkingChargeFrequency}×/mo`;

      console.log(`📊 [TOTAL CALC] Global Parking Charge ($${globalParkingCharge} - ${freqLabel}): $${parkingChargeContractTotal.toFixed(2)}`);
    }

    console.log(`📊 [TOTAL CALC] Total Agreement Amount: $${totalAmount.toFixed(2)}`);
    return totalAmount;
  }, [servicesState, globalContractMonths, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency]);

  const getTotalPerVisitAmount = useCallback((): number => {
    let totalPerVisit = 0;
    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];
      if (serviceData?.isActive && !isOneTimeService(serviceData)) {
        const perVisit =
          (typeof serviceData.perVisit === 'number' && serviceData.perVisit > 0
            ? serviceData.perVisit
            : typeof serviceData.totals?.perVisit?.amount === 'number' && serviceData.totals.perVisit.amount > 0
              ? serviceData.totals.perVisit.amount
              : 0);
        if (perVisit > 0) {
          totalPerVisit += perVisit;
        }
      }
    });
    return totalPerVisit;
  }, [servicesState]);

  
  const getTotalMonthlyRecurringRevenue = useCallback((): number => {
    let totalMonthlyRecurring = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      if (serviceData?.isActive && !isOneTimeService(serviceData)) {
        
        const monthlyRecurring =
          serviceData.totals?.monthlyRecurring?.amount ??
          serviceData.monthlyRecurring ??
          serviceData.calc?.monthlyRecurring ??
          serviceData.calc?.monthlyBillRated;

        if (typeof monthlyRecurring === 'number' && monthlyRecurring > 0) {
          totalMonthlyRecurring += monthlyRecurring;
          console.log(`📊 [MONTHLY RECURRING] ${serviceName}: $${monthlyRecurring.toFixed(2)} (from pre-calculated)`);
        } else {
          
          const perVisit =
            (typeof serviceData.perVisit === 'number' && serviceData.perVisit > 0
              ? serviceData.perVisit
              : typeof serviceData.totals?.perVisit?.amount === 'number' && serviceData.totals.perVisit.amount > 0
                ? serviceData.totals.perVisit.amount
                : 0);

          if (perVisit > 0) {
            
            const frequencyKey = normalizeFrequencyKey(
              serviceData.frequency ??
              serviceData.frequencyKey ??
              serviceData.frequencyDisplay?.value
            );

            const frequencyMultipliers: Record<string, number> = {
              'weekly': 4.33,
              'biweekly': 2.17,
              'twicepermonth': 2,
              'monthly': 1,
              'everyfourweeks': 1,
              'bimonthly': 0.5,
              'quarterly': 0.33,
              'biannual': 0.17,
              'annual': 0.08,
            };

            const visitsPerMonth = frequencyMultipliers[frequencyKey || 'monthly'] ?? 1;
            const calculatedMonthly = perVisit * visitsPerMonth;
            totalMonthlyRecurring += calculatedMonthly;
            console.log(`📊 [MONTHLY RECURRING] ${serviceName}: $${calculatedMonthly.toFixed(2)} (perVisit: $${perVisit} × ${visitsPerMonth} visits/month)`);
          }
        }
      }
    });

    console.log(`📊 [MONTHLY RECURRING] Total: $${totalMonthlyRecurring.toFixed(2)}`);
    return totalMonthlyRecurring;
  }, [servicesState]);

  const getTotalOriginalContractTotal = useCallback((): number => {
    let totalOriginal = 0;

    Object.keys(servicesState).forEach((serviceName) => {
      const serviceData = servicesState[serviceName as keyof ServicesState];

      if (serviceData?.isActive) {
        let originalTotal = 0;

        if (typeof serviceData.originalContractTotal === 'number' && serviceData.originalContractTotal > 0) {
          originalTotal = serviceData.originalContractTotal;
        }

        else if (typeof serviceData.contractTotal === 'number') {
          originalTotal = serviceData.contractTotal;
        } else if (serviceData.totals?.contract?.amount && typeof serviceData.totals.contract.amount === 'number') {
          originalTotal = serviceData.totals.contract.amount;
        } else if (serviceData.totals?.annual?.amount && typeof serviceData.totals.annual.amount === 'number') {
          originalTotal = serviceData.totals.annual.amount;
        }

        totalOriginal += originalTotal;
      }
    });

    const tripChargeContractTotal = globalTripChargeFrequency === 0
      ? globalTripCharge
      : globalTripCharge * globalTripChargeFrequency * globalContractMonths;
    const parkingChargeContractTotal = globalParkingChargeFrequency === 0
      ? globalParkingCharge
      : globalParkingCharge * globalParkingChargeFrequency * globalContractMonths;

    totalOriginal += tripChargeContractTotal;
    totalOriginal += parkingChargeContractTotal;

    console.log(`📊 [ORIGINAL CONTRACT TOTAL] $${totalOriginal.toFixed(2)}`);
    return totalOriginal;
  }, [servicesState, globalContractMonths, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency]);

  const getFrequencyNum = (serviceData: any): number | null => {
    
    const freqCandidates = [
      
      serviceData.frequencyKey,
      serviceData.frequencyNum,
      
      serviceData.frequency?.frequencyKey,
      serviceData.frequency?.value,
      serviceData.frequency?.label,
      
      typeof serviceData.frequency === 'string' || typeof serviceData.frequency === 'number'
        ? serviceData.frequency
        : null,
      
      serviceData.frequencyDisplay?.frequencyKey,
      serviceData.frequencyDisplay?.value,
    ];

    const freqMap: Record<string, number> = {
      'weekly': 1, 'biweekly': 2, 'bi-weekly': 2, 'monthly': 3, 'quarterly': 4,
      'semi-annual': 5, 'annual': 6, 'twice-per-month': 13, 'bi-monthly': 14,
      'bimonthly': 14, 'one-time': 0, 'onetime': 0
    };

    for (const candidate of freqCandidates) {
      if (candidate === null || candidate === undefined) continue;

      if (typeof candidate === 'number') return candidate;

      if (typeof candidate === 'string') {
        const normalized = candidate.toLowerCase().trim();
        if (freqMap[normalized] !== undefined) {
          console.log(`[COMMISSION-CALC] getFrequencyNum: Found frequency "${normalized}" -> ${freqMap[normalized]}`);
          return freqMap[normalized];
        }
      }
    }

    console.log(`[COMMISSION-CALC] getFrequencyNum: Could not find frequency in serviceData:`, {
      frequency: serviceData.frequency,
      frequencyKey: serviceData.frequencyKey,
      frequencyDisplay: serviceData.frequencyDisplay,
    });
    return null;
  };

  const getAgreementTerm = (months: number): AgreementTerm => {
    if (months >= 36) return '3-year';
    if (months >= 12) return '1-year';
    return 'MTM-with-install';
  };

  const frequencyVisitsPerYear: Record<number, number> = {
    1: 52,  
    2: 26,  
    3: 12,  
    4: 4,   
    5: 2,   
    6: 1,   
    13: 24, 
    14: 6,  
    0: 1,   
  };

  const getCommissionDataForSave = useCallback((baseCommissionRate: number = 6): CommissionDataForSave | null => {
    console.log('[COMMISSION-CALC] Starting calculation with:', {
      servicesCount: Object.keys(servicesState).length,
      accountTypeCacheKeys: Object.keys(accountTypeCache),
      globalContractMonths,
    });

    const term = getAgreementTerm(globalContractMonths);
    const agreementMultiplier = DEFAULT_COMMISSION_RULES_V2.agreementMultipliers[term];
    const effectiveRate = baseCommissionRate * (agreementMultiplier / 100);

    let totalWeeklyCommission = 0;
    let totalAnnualCommission = 0;
    const serviceBreakdown: CommissionDataForSave['serviceBreakdown'] = [];

    Object.entries(servicesState).forEach(([serviceName, serviceData]: [string, any]) => {
      if (!serviceData?.isActive) {
        console.log(`[COMMISSION-CALC] Skipping ${serviceName}: not active`);
        return;
      }

      const freqNum = getFrequencyNum(serviceData);
      if (freqNum === null || freqNum === 0) {
        console.log(`[COMMISSION-CALC] Skipping ${serviceName}: one-time or no frequency`);
        return; 
      }

      const perVisitRevenue =
        serviceData.perVisit ??
        serviceData.totals?.perVisit?.amount ??
        serviceData.perVisitCharge ??
        serviceData.calc?.perVisit ??
        0;

      console.log(`[COMMISSION-CALC] ${serviceName}: perVisitRevenue=${perVisitRevenue}`, {
        perVisit: serviceData.perVisit,
        totalsPerVisit: serviceData.totals?.perVisit?.amount,
        perVisitCharge: serviceData.perVisitCharge,
        calcPerVisit: serviceData.calc?.perVisit,
      });

      if (perVisitRevenue <= 0) {
        console.log(`[COMMISSION-CALC] Skipping ${serviceName}: no perVisitRevenue`);
        return;
      }

      const cacheEntry = accountTypeCache[freqNum];
      const accountType = cacheEntry?.accountType || null;

      let commissionableRevenue = perVisitRevenue;
      if (accountType) {
        const result = calculateCommissionableRevenue(perVisitRevenue, accountType);
        commissionableRevenue = result.commissionableRevenue;
      }

      const visitsPerYear = frequencyVisitsPerYear[freqNum] || 12;
      const perVisitCommission = commissionableRevenue * (effectiveRate / 100);
      const annualCommission = perVisitCommission * visitsPerYear;
      const weeklyCommission = annualCommission / 52;

      totalWeeklyCommission += weeklyCommission;
      totalAnnualCommission += annualCommission;

      serviceBreakdown.push({
        serviceName,
        accountType,
        perVisitRevenue,
        commissionableRevenue,
        weeklyCommission,
        annualCommission,
      });
    });

    if (serviceBreakdown.length === 0) {
      console.log('[COMMISSION-CALC] No services with commission data, returning null');
      return null;
    }

    const years = globalContractMonths / 12;
    const contractCommission = totalAnnualCommission * years;

    const result = {
      weeklyCommission: totalWeeklyCommission,
      annualCommission: totalAnnualCommission,
      contractCommission,
      finalCommissionRate: effectiveRate,
      agreementMultiplier,
      baseRate: baseCommissionRate,
      serviceBreakdown,
    };

    console.log('[COMMISSION-CALC] Final result:', result);
    return result;
  }, [servicesState, accountTypeCache, globalContractMonths]);

  const value = useMemo<ServicesContextValue>(() => {

    const sanicleanData = servicesState.saniclean;
    const isSanicleanAllInclusive = Boolean(
      sanicleanData?.isActive &&
      (sanicleanData?.pricingMode?.value === "All Inclusive" ||
       sanicleanData?.pricingMode === "all_inclusive")
    );

    const fixtureCount = sanicleanData?.fixtureBreakdown?.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) || 0;
    const sanicleanPaperCreditPerWeek = isSanicleanAllInclusive
      ? fixtureCount * 5 
      : 0;

    const activeServices = Object.values(servicesState).filter((sd: any) => sd?.isActive);
    const allServicesOneTime =
      activeServices.length > 0 &&
      activeServices.every((sd: any) => isOneTimeService(sd));

    return {
      servicesState,
      updateSaniclean,
      updateService,
      backendPricingData,
      getBackendPricingForService,
      isSanicleanAllInclusive,
      sanicleanPaperCreditPerWeek,

      globalContractMonths,
      setGlobalContractMonths,
      getTotalAgreementAmount,
      getTotalPerVisitAmount,
      getTotalMonthlyRecurringRevenue,
      allServicesOneTime,

      getTotalOriginalContractTotal,

      globalTripCharge,
      setGlobalTripCharge,
      globalParkingCharge,
      setGlobalParkingCharge,

      globalTripChargeFrequency,
      setGlobalTripChargeFrequency,
      globalParkingChargeFrequency,
      setGlobalParkingChargeFrequency,

      biginCompanyId,
      setBiginCompanyId,
      agreementId,
      setAgreementId,
      accountTypeCache,
      setAccountTypeForFrequency,
      getAccountTypeForFrequency,
      initializeAccountTypeCache,
      clearAccountTypeCache,
      isDetectingAccountTypes,
      setIsDetectingAccountTypes,
      accountTypeDetectionError,
      setAccountTypeDetectionError,
      accountTypeCacheLoadedFromSaved,
      accountTypeCacheLoadedFromSavedRef,

      getCommissionDataForSave,

      quotaLevel,
      quotaLevelData,
      baseCommissionRate,
      setQuotaLevel,
      setQuotaLevelData,
    };
  }, [servicesState, updateSaniclean, updateService, backendPricingData, getBackendPricingForService, globalContractMonths, getTotalAgreementAmount, getTotalPerVisitAmount, getTotalMonthlyRecurringRevenue, getTotalOriginalContractTotal, globalTripCharge, globalParkingCharge, globalTripChargeFrequency, globalParkingChargeFrequency, biginCompanyId, agreementId, accountTypeCache, setAccountTypeForFrequency, getAccountTypeForFrequency, initializeAccountTypeCache, clearAccountTypeCache, isDetectingAccountTypes, accountTypeDetectionError, accountTypeCacheLoadedFromSaved, accountTypeCacheLoadedFromSavedRef, getCommissionDataForSave, quotaLevel, quotaLevelData, baseCommissionRate]);

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServicesContext = (): ServicesContextValue => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error(
      "useServicesContext must be used within ServicesProvider"
    );
  }
  return context;
};

export const useServicesContextOptional = ():
  | ServicesContextValue
  | undefined => {
  return useContext(ServicesContext);
};
