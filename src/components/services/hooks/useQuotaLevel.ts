/**
 * useQuotaLevel - Hook to fetch and manage user's quota level for commission calculation
 *
 * Quota levels determine the base commission rate:
 * - Below Quota: 3%
 * - Above Quota: 6%
 * - Double Quota: 9%
 */

import { useState, useEffect, useCallback } from 'react';
import { quotaApi } from '../../../backendservice/api/quotaApi';
import { useAuthContext } from '../../auth/AuthProvider';

export type QuotaLevel = 'below' | 'above' | 'double';

export interface QuotaLevelData {
  quotaLevel: QuotaLevel;
  quotaPercentage: number;
  quotaTarget: number;
  actualSales: number;
  commissionRate: number;
  salesPersonId: string;
  salesPersonName: string;
}

export interface UseQuotaLevelReturn {
  // Current quota level
  quotaLevel: QuotaLevel;
  quotaData: QuotaLevelData | null;

  // Commission rate based on quota level
  commissionRate: number;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshQuotaLevel: () => Promise<void>;
}

// Map quota level to commission rate
const QUOTA_COMMISSION_RATES: Record<QuotaLevel, number> = {
  below: 3,
  above: 6,
  double: 9,
};

export function useQuotaLevel(): UseQuotaLevelReturn {
  const { user, isAuthenticated } = useAuthContext();

  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>('above'); // Default to "above" (6%)
  const [quotaData, setQuotaData] = useState<QuotaLevelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaLevel = useCallback(async () => {
    if (!user?.username) {
      // Not authenticated, use default
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await quotaApi.getCurrentLevel(user.username);

      if (result) {
        const level = (result.quotaLevel as QuotaLevel) || 'above';
        setQuotaLevel(level);
        setQuotaData({
          quotaLevel: level,
          quotaPercentage: result.quotaPercentage || 0,
          quotaTarget: result.quotaTarget || 0,
          actualSales: result.actualSales || 0,
          commissionRate: QUOTA_COMMISSION_RATES[level],
          salesPersonId: result.salesPersonId || user.username,
          salesPersonName: result.salesPersonName || user.fullName || user.username,
        });
      }
    } catch (err) {
      console.error('[QUOTA-LEVEL] Failed to fetch quota level:', err);
      setError('Failed to fetch quota level');
      // Keep default "above" level on error
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, user?.fullName]);

  // Fetch quota level on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      fetchQuotaLevel();
    }
  }, [isAuthenticated, user?.username, fetchQuotaLevel]);

  const commissionRate = QUOTA_COMMISSION_RATES[quotaLevel];

  return {
    quotaLevel,
    quotaData,
    commissionRate,
    isLoading,
    error,
    refreshQuotaLevel: fetchQuotaLevel,
  };
}

export default useQuotaLevel;
