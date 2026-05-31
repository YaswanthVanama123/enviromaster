

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
  
  quotaLevel: QuotaLevel;
  quotaData: QuotaLevelData | null;

  commissionRate: number;

  isLoading: boolean;
  error: string | null;

  refreshQuotaLevel: () => Promise<void>;
}

const QUOTA_COMMISSION_RATES: Record<QuotaLevel, number> = {
  below: 3,
  above: 6,
  double: 9,
};

export function useQuotaLevel(): UseQuotaLevelReturn {
  const { user, isAuthenticated } = useAuthContext();

  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>('above'); 
  const [quotaData, setQuotaData] = useState<QuotaLevelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaLevel = useCallback(async () => {
    if (!user?.username) {
      
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
      
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, user?.fullName]);

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
