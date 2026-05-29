import { useCallback, useEffect, useRef } from 'react';
import { useServicesContext } from '../ServicesContext';
import { accountTypeApi } from '../../../backendservice/api/accountTypeApi';
import { pdfApi } from '../../../backendservice/api';
import type { AccountType, FrequencyDetectionResult } from '../../../backendservice/api/accountTypeApi';
import type { AccountTypeCacheEntry } from '../ServicesContext';

// Frequency key to backend number mapping
// These map to the backend FREQUENCY_MAP values
export const FREQUENCY_TO_BACKEND: Record<string, number> = {
  weekly: 1,
  biweekly: 2,
  twicepermonth: 13,
  monthly: 3,
  bimonthly: 14,
  quarterly: 4,
  semiannual: 5,
  annual: 6,
  onetime: 0,
  // Additional variations
  'bi-weekly': 2,
  'bi-monthly': 14,
  'semi-annual': 5,
  'one-time': 0,
  '1time': 0,
  everyfourweeks: 3,
  'every four weeks': 3,
};

// Reverse mapping for display
export const BACKEND_TO_FREQUENCY: Record<number, string> = {
  1: 'Weekly',
  2: 'Bi-Weekly',
  3: 'Monthly',
  4: 'Quarterly',
  5: 'Semi-Annual',
  6: 'Annual',
  13: 'Twice per Month',
  14: 'Bi-Monthly',
  0: 'One-Time',
};

// Helper to normalize frequency value from service data
export function normalizeFrequencyKey(value: any): string | null {
  if (value === undefined || value === null) return null;

  // Handle object with various possible keys
  const raw = typeof value === 'object'
    ? value.frequencyKey ?? value.value ?? value.label ?? value.name ?? value.frequency ?? ''
    : value;

  // Normalize to lowercase without special chars
  const text = String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return text || null;
}

// Helper to get backend frequency number from service data
export function getFrequencyNumber(serviceData: any): number | null {
  if (!serviceData) return null;

  const candidates = [
    serviceData.frequency,
    serviceData.frequencyKey,
    serviceData.frequency?.frequencyKey,
    serviceData.frequency?.value,
    serviceData.frequency?.label,
    serviceData.frequencyDisplay?.frequencyKey,
    serviceData.frequencyDisplay?.value,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeFrequencyKey(candidate);
    if (normalized && FREQUENCY_TO_BACKEND[normalized] !== undefined) {
      return FREQUENCY_TO_BACKEND[normalized];
    }
  }

  return null;
}

export interface UseAccountTypeDetectionOptions {
  // Auto-detect account types when biginCompanyId is available and frequencies change
  autoDetect?: boolean;
}

export interface UseAccountTypeDetectionResult {
  // Detect account types for all active services
  detectAccountTypes: () => Promise<void>;

  // Get account type for a specific service based on its frequency
  getAccountTypeForService: (serviceData: any) => AccountType | null;

  // Get full cache entry for a service
  getCacheEntryForService: (serviceData: any) => AccountTypeCacheEntry | null;

  // Check if detection is in progress
  isDetecting: boolean;

  // Any detection error
  error: string | null;

  // Whether the company is mapped for detection
  isCompanyMapped: boolean;
}

export function useAccountTypeDetection(
  options: UseAccountTypeDetectionOptions = {}
): UseAccountTypeDetectionResult {
  const { autoDetect = true } = options;

  const {
    servicesState,
    biginCompanyId,
    agreementId,
    accountTypeCache,
    setAccountTypeForFrequency,
    isDetectingAccountTypes,
    setIsDetectingAccountTypes,
    accountTypeDetectionError,
    setAccountTypeDetectionError,
    clearAccountTypeCache,
    accountTypeCacheLoadedFromSaved,
    accountTypeCacheLoadedFromSavedRef,
  } = useServicesContext();

  // Track previous biginCompanyId to clear cache on change
  const prevBiginCompanyIdRef = useRef<string | null>(null);
  // Track previous frequencies to detect changes
  const prevFrequenciesRef = useRef<string>('');
  // Track if initial detection has been done
  const initialDetectionDoneRef = useRef(false);
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear cache when company changes
  useEffect(() => {
    if (prevBiginCompanyIdRef.current !== null && prevBiginCompanyIdRef.current !== biginCompanyId) {
      clearAccountTypeCache();
      initialDetectionDoneRef.current = false;
    }
    prevBiginCompanyIdRef.current = biginCompanyId;
  }, [biginCompanyId, clearAccountTypeCache]);

  // Extract unique frequency numbers from all active services
  const getUniqueFrequencies = useCallback((): number[] => {
    const frequencies = new Set<number>();

    Object.values(servicesState).forEach((serviceData: any) => {
      if (serviceData?.isActive) {
        const freqNum = getFrequencyNumber(serviceData);
        // Skip one-time services (0) - they don't need account type detection
        if (freqNum !== null && freqNum !== 0) {
          frequencies.add(freqNum);
        }
      }
    });

    return Array.from(frequencies).sort((a, b) => a - b);
  }, [servicesState]);

  // Get frequencies that aren't in the cache yet
  const getMissingFrequencies = useCallback((): number[] => {
    const allFrequencies = getUniqueFrequencies();
    return allFrequencies.filter(freq => !accountTypeCache[freq]);
  }, [getUniqueFrequencies, accountTypeCache]);

  // Detect account types for all active services and save to backend
  const detectAccountTypes = useCallback(async () => {
    if (!biginCompanyId) {
      console.log('[ACCOUNT-TYPE] No biginCompanyId, skipping detection');
      return;
    }

    const missingFrequencies = getMissingFrequencies();

    if (missingFrequencies.length === 0) {
      console.log('[ACCOUNT-TYPE] All frequencies already cached');
      return;
    }

    console.log('[ACCOUNT-TYPE] Detecting for frequencies:', missingFrequencies);

    setIsDetectingAccountTypes(true);
    setAccountTypeDetectionError(null);

    try {
      const result = await accountTypeApi.detectWithMapboxBatch(biginCompanyId, missingFrequencies);

      if (!result.success) {
        setAccountTypeDetectionError(result.error || 'Failed to detect account types');
        console.error('[ACCOUNT-TYPE] Detection failed:', result.error);
        return;
      }

      // Build updated cache with new results
      const updatedCache: Record<number, AccountTypeCacheEntry> = { ...accountTypeCache };

      // Process results and update cache
      if (result.results) {
        Object.entries(result.results).forEach(([freqKey, detection]) => {
          const freqNum = parseInt(freqKey, 10);
          const entry: AccountTypeCacheEntry = {
            accountType: detection.accountType,
            confidence: detection.confidence,
            reason: detection.reason,
            drivingTimeMinutes: detection.drivingTimeMinutes,
            nearestDestination: detection.nearestDestination,
            cachedAt: Date.now(),
            usedFallback: detection.usedFallback,
            fallbackReason: detection.fallbackReason,
          };

          setAccountTypeForFrequency(freqNum, entry);
          updatedCache[freqNum] = entry;
          console.log(`[ACCOUNT-TYPE] Cached freq ${freqNum}: ${detection.accountType}`);
        });
      }

      console.log('[ACCOUNT-TYPE] Detection complete, thresholds:', result.thresholds);

      // Auto-save to backend if we have an agreementId
      if (agreementId && Object.keys(updatedCache).length > 0) {
        try {
          console.log('[ACCOUNT-TYPE] Auto-saving cache to backend for agreement:', agreementId);
          await pdfApi.saveAccountTypeCache(agreementId, updatedCache);
          console.log('[ACCOUNT-TYPE] Cache saved to backend successfully');
        } catch (saveErr) {
          console.error('[ACCOUNT-TYPE] Failed to save cache to backend:', saveErr);
          // Don't fail the detection if save fails - cache is still in memory
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during detection';
      setAccountTypeDetectionError(errorMsg);
      console.error('[ACCOUNT-TYPE] Detection error:', err);
    } finally {
      setIsDetectingAccountTypes(false);
    }
  }, [biginCompanyId, agreementId, accountTypeCache, getMissingFrequencies, setIsDetectingAccountTypes, setAccountTypeDetectionError, setAccountTypeForFrequency]);

  // Track if cache was loaded from saved data (to abort pending detection)
  // We use both the ref from context (for synchronous check) and update our local ref
  const cacheLoadedFromSavedRef = useRef(accountTypeCacheLoadedFromSavedRef.current);
  useEffect(() => {
    cacheLoadedFromSavedRef.current = accountTypeCacheLoadedFromSavedRef.current || accountTypeCacheLoadedFromSaved;
  }, [accountTypeCacheLoadedFromSaved, accountTypeCacheLoadedFromSavedRef]);

  // Auto-detect on load and when frequencies change
  useEffect(() => {
    if (!autoDetect || !biginCompanyId || isDetectingAccountTypes) {
      return;
    }

    const currentFrequencies = getUniqueFrequencies();
    const currentFreqKey = currentFrequencies.join(',');
    const missingFrequencies = getMissingFrequencies();

    // Check if we have new frequencies that need detection
    const hasNewFrequencies = missingFrequencies.length > 0;
    const isInitialLoad = prevFrequenciesRef.current === '';
    const frequenciesChanged = !isInitialLoad && prevFrequenciesRef.current !== currentFreqKey;

    // Check if cache was loaded from saved data (synchronous ref check)
    const cacheWasLoadedFromSaved = accountTypeCacheLoadedFromSavedRef.current || accountTypeCacheLoadedFromSaved;

    // CASE 1: Initial load with saved cache → skip detection, use saved data
    if (isInitialLoad && cacheWasLoadedFromSaved) {
      console.log('[ACCOUNT-TYPE] Initial load with saved cache, skipping detection');
      initialDetectionDoneRef.current = true;
      prevFrequenciesRef.current = currentFreqKey;
      return;
    }

    // CASE 2: Initial load WITHOUT saved cache → auto-detect for first time setup
    if (isInitialLoad && !cacheWasLoadedFromSaved && hasNewFrequencies) {
      console.log('[ACCOUNT-TYPE] First time setup - auto-detecting for frequencies:', missingFrequencies);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        // Re-check if cache was loaded during debounce (e.g., slow network)
        if (accountTypeCacheLoadedFromSavedRef.current) {
          console.log('[ACCOUNT-TYPE] Cache was loaded during debounce, skipping first-time detection');
          return;
        }
        console.log('[ACCOUNT-TYPE] Executing first-time detection for:', missingFrequencies);
        detectAccountTypes();
      }, 500);

      prevFrequenciesRef.current = currentFreqKey;
      initialDetectionDoneRef.current = true;
      return;
    }

    // CASE 3: Frequency changed (service added or frequency modified) → detect missing only
    if (frequenciesChanged && hasNewFrequencies) {
      console.log('[ACCOUNT-TYPE] Frequency change detected - new frequencies:', missingFrequencies);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        console.log('[ACCOUNT-TYPE] Executing detection for changed frequencies:', missingFrequencies);
        detectAccountTypes();
      }, 500);
    }

    // Update previous frequencies ref
    if (prevFrequenciesRef.current !== currentFreqKey) {
      prevFrequenciesRef.current = currentFreqKey;
    }
    initialDetectionDoneRef.current = true;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [autoDetect, biginCompanyId, getUniqueFrequencies, getMissingFrequencies, detectAccountTypes, isDetectingAccountTypes, accountTypeCacheLoadedFromSaved, accountTypeCacheLoadedFromSavedRef]);

  // Get account type for a specific service
  const getAccountTypeForService = useCallback((serviceData: any): AccountType | null => {
    if (!serviceData?.isActive) return null;

    const freqNum = getFrequencyNumber(serviceData);
    if (freqNum === null || freqNum === 0) return null;

    const cached = accountTypeCache[freqNum];
    return cached?.accountType || null;
  }, [accountTypeCache]);

  // Get full cache entry for a service
  const getCacheEntryForService = useCallback((serviceData: any): AccountTypeCacheEntry | null => {
    if (!serviceData?.isActive) return null;

    const freqNum = getFrequencyNumber(serviceData);
    if (freqNum === null || freqNum === 0) return null;

    return accountTypeCache[freqNum] || null;
  }, [accountTypeCache]);

  return {
    detectAccountTypes,
    getAccountTypeForService,
    getCacheEntryForService,
    isDetecting: isDetectingAccountTypes,
    error: accountTypeDetectionError,
    isCompanyMapped: !!biginCompanyId,
  };
}

export default useAccountTypeDetection;
