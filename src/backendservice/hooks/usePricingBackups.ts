import { useState, useEffect, useCallback } from 'react';
import { pricingBackupApi } from '../api/pricingBackupApi';
import type {
  PricingBackup,
  BackupSystemHealth,
  BackupStatistics,
  BackupSnapshot,
  CreateBackupPayload,
  RestoreBackupPayload
} from '../types/pricingBackup.types';

export interface UsePricingBackupsResult {
  backups: PricingBackup[];
  health: BackupSystemHealth | null;
  statistics: BackupStatistics | null;

  loading: boolean;
  healthLoading: boolean;
  statisticsLoading: boolean;

  error: string | null;
  healthError: string | null;
  statisticsError: string | null;

  fetchBackups: (limit?: number) => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  createBackup: (payload?: CreateBackupPayload) => Promise<{
    success: boolean;
    error?: string;
    data?: any;
    requiresConfirmation?: boolean;
    existingBackup?: any;
  }>;
  restoreBackup: (payload: RestoreBackupPayload) => Promise<{ success: boolean; error?: string; data?: any }>;
  deleteBackups: (changeDayIds: string[]) => Promise<{ success: boolean; error?: string; data?: any }>;
  enforceRetentionPolicy: () => Promise<{ success: boolean; error?: string; data?: any }>;
  getBackupSnapshot: (changeDayId: string, preview?: boolean) => Promise<{ success: boolean; error?: string; data?: any }>;

  refreshAll: () => Promise<void>;
  clearErrors: () => void;
}

export function usePricingBackups(autoFetch: 'none' | 'list' | 'health' | 'statistics' | 'all' = 'none'): UsePricingBackupsResult {
  const [backups, setBackups] = useState<PricingBackup[]>([]);
  const [health, setHealth] = useState<BackupSystemHealth | null>(null);
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);

  const [loading, setLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);

  const fetchBackups = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pricingBackupApi.getBackups(limit);
      console.log('[BACKUP-HOOK] Raw API response:', response);

      if (response.error) {
        setError(response.error);
        return;
      }

      const responseData = response.data;
      if (!responseData?.success) {
        setError(responseData?.message || 'Failed to fetch backups');
        return;
      }

      const rawBackups = responseData.data || [];
      console.log('[BACKUP-HOOK] Raw backups:', rawBackups);

      if (!Array.isArray(rawBackups)) {
        console.error('[BACKUP-HOOK] Expected array but got:', typeof rawBackups);
        setError('Invalid response format');
        return;
      }

      const mappedBackups: PricingBackup[] = rawBackups.map((b: any) => ({
        
        changeDayId: b.changeDayId,
        changeDay: b.changeDay,
        firstChangeTimestamp: b.firstChangeTimestamp,
        backupTrigger: b.backupTrigger,
        changedBy: b.changedBy,
        changeContext: b.changeContext || {
          changedAreas: [],
          changeDescription: '',
          changeCount: 0
        },
        snapshotMetadata: b.snapshotMetadata || {
          includedDataTypes: { priceFix: false, productCatalog: false, serviceConfigs: false },
          documentCounts: { priceFixCount: 0, productCatalogCount: 0, serviceConfigCount: 0 },
          originalSize: 0,
          compressedSize: 0,
          compressionRatio: 0
        },
        restorationInfo: b.restorationInfo || {
          hasBeenRestored: false
        },
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        
        id: b.changeDayId,
        _id: b.changeDayId
      }));

      console.log('[BACKUP-HOOK] Mapped backups:', mappedBackups);
      setBackups(mappedBackups);

    } catch (err) {
      console.error('[BACKUP-HOOK] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);

    try {
      const response = await pricingBackupApi.getHealth();

      if (response.error) {
        setHealthError(response.error);
      } else if (response.data?.success) {
        
        const healthData = response.data.data || response.data.health;
        if (healthData) {
          setHealth({
            status: healthData.status || 'healthy',
            checks: {
              backupModelAccessible: true,
              totalBackups: response.data.metrics?.totalBackups || 0,
              uniqueChangeDays: response.data.metrics?.completeBackups || 0,
              retentionPolicyCompliant: true,
              hasBackupToday: !!response.data.metrics?.latestBackup,
              mostRecentBackup: response.data.metrics?.latestBackup
            },
            warnings: healthData.issues || []
          });
        }
      } else {
        setHealthError('Failed to fetch health status');
      }
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    setStatisticsLoading(true);
    setStatisticsError(null);

    try {
      const response = await pricingBackupApi.getStatistics();

      if (response.error) {
        setStatisticsError(response.error);
      } else if (response.data?.success && response.data.data) {
        setStatistics(response.data.data);
      } else {
        setStatisticsError('Failed to fetch statistics');
      }
    } catch (err) {
      setStatisticsError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (payload: CreateBackupPayload = {}) => {
    try {
      const response = await pricingBackupApi.createBackup(payload);

      if (response.error) {
        return { success: false, error: response.error };
      }

      if (response.status === 409 || response.data?.requiresConfirmation) {
        return {
          success: false,
          requiresConfirmation: true,
          existingBackup: response.data?.existingBackup,
          error: response.data?.message || 'Manual backup already exists for today'
        };
      }

      if (response.data?.success) {
        await fetchBackups();
        return { success: true, data: response.data.data };
      }

      return { success: false, error: response.data?.message || 'Failed to create backup' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  const restoreBackup = useCallback(async (payload: RestoreBackupPayload) => {
    try {
      const response = await pricingBackupApi.restoreBackup(payload);

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        await fetchBackups();
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: response.data?.message || 'Failed to restore backup' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  const deleteBackups = useCallback(async (changeDayIds: string[]) => {
    try {
      const response = await pricingBackupApi.deleteBackups(changeDayIds);

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        await fetchBackups();
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: response.data?.message || 'Failed to delete backups' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  const enforceRetentionPolicy = useCallback(async () => {
    try {
      const response = await pricingBackupApi.enforceRetentionPolicy();

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        await fetchBackups();
        return { success: true, data: response.data.data || response.data.result };
      } else {
        return { success: false, error: response.data?.message || 'Failed to enforce retention policy' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  const getBackupSnapshot = useCallback(async (changeDayId: string, preview: boolean = true) => {
    try {
      const response = await pricingBackupApi.getBackupSnapshot(changeDayId, preview);

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: 'Failed to get backup snapshot' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchBackups(),
      fetchHealth(),
      fetchStatistics()
    ]);
  }, [fetchBackups, fetchHealth, fetchStatistics]);

  const clearErrors = useCallback(() => {
    setError(null);
    setHealthError(null);
    setStatisticsError(null);
  }, []);

  useEffect(() => {
    const performAutoFetch = async () => {
      console.log(`[PRICING-BACKUPS] Auto-fetch mode: ${autoFetch}`);

      switch (autoFetch) {
        case 'list':
          await fetchBackups();
          break;
        case 'health':
          await fetchHealth();
          break;
        case 'statistics':
          await fetchStatistics();
          break;
        case 'all':
          await refreshAll();
          break;
        case 'none':
        default:
          break;
      }
    };

    performAutoFetch();
  }, []);

  return {
    backups,
    health,
    statistics,

    loading,
    healthLoading,
    statisticsLoading,

    error,
    healthError,
    statisticsError,

    fetchBackups,
    fetchHealth,
    fetchStatistics,
    createBackup,
    restoreBackup,
    deleteBackups,
    enforceRetentionPolicy,
    getBackupSnapshot,

    refreshAll,
    clearErrors
  };
}

export function usePricingBackupDetails(changeDayId?: string) {
  const [backup, setBackup] = useState<PricingBackup | null>(null);
  const [snapshot, setSnapshot] = useState<BackupSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!changeDayId) return;

    setLoading(true);
    setError(null);

    try {
      const [detailsResponse, snapshotResponse] = await Promise.all([
        pricingBackupApi.getBackupDetails(changeDayId),
        pricingBackupApi.getBackupSnapshot(changeDayId, true)
      ]);

      if (detailsResponse.error) {
        setError(detailsResponse.error);
      } else if (detailsResponse.data?.success && detailsResponse.data.data) {
        setBackup(detailsResponse.data.data);
      }

      if (snapshotResponse.data?.success && snapshotResponse.data.data?.preview) {
        setSnapshot(snapshotResponse.data.data.preview);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [changeDayId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    backup,
    snapshot,
    loading,
    error,
    refetch: fetchDetails
  };
}
