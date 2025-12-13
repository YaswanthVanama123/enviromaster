import { useState, useEffect, useCallback } from 'react';
import { pricingBackupApi } from '../api/pricingBackupApi';
import type {
  PricingBackup,
  BackupSystemHealth,
  BackupStatistics,
  BackupSnapshot,
  CreateBackupPayload,
  RestoreBackupPayload,
  BackupListResponse
} from '../types/pricingBackup.types';

export interface UsePricingBackupsResult {
  // Data state
  backups: PricingBackup[];
  health: BackupSystemHealth | null;
  statistics: BackupStatistics | null;

  // Loading states
  loading: boolean;
  healthLoading: boolean;
  statisticsLoading: boolean;

  // Error states
  error: string | null;
  healthError: string | null;
  statisticsError: string | null;

  // Actions
  fetchBackups: (limit?: number) => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  createBackup: (payload?: CreateBackupPayload) => Promise<{ success: boolean; error?: string; data?: any }>;
  restoreBackup: (payload: RestoreBackupPayload) => Promise<{ success: boolean; error?: string; data?: any }>;
  deleteBackups: (changeDayIds: string[]) => Promise<{ success: boolean; error?: string; data?: any }>;
  enforceRetentionPolicy: () => Promise<{ success: boolean; error?: string; data?: any }>;
  getBackupSnapshot: (changeDayId: string, preview?: boolean) => Promise<{ success: boolean; error?: string; data?: any }>;

  // Utility actions
  refreshAll: () => Promise<void>;
  clearErrors: () => void;
}

/**
 * Custom hook for managing pricing backups
 * Follows the same pattern as useServiceConfigs and useProductCatalog
 */
export function usePricingBackups(autoFetch: boolean = true): UsePricingBackupsResult {
  // Data state
  const [backups, setBackups] = useState<PricingBackup[]>([]);
  const [health, setHealth] = useState<BackupSystemHealth | null>(null);
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);

  /**
   * Fetch list of backups
   */
  const fetchBackups = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pricingBackupApi.getBackups(limit);

      if (response.error) {
        setError(response.error);
      } else if (response.data?.success && response.data.data) {
        setBackups(response.data.data.backups);
      } else {
        setError('Failed to fetch backups');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch system health
   */
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);

    try {
      const response = await pricingBackupApi.getHealth();

      if (response.error) {
        setHealthError(response.error);
      } else if (response.data?.success && response.data.data) {
        setHealth(response.data.data);
      } else {
        setHealthError('Failed to fetch health status');
      }
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  /**
   * Fetch backup statistics
   */
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

  /**
   * Create a manual backup
   */
  const createBackup = useCallback(async (payload: CreateBackupPayload = {}) => {
    try {
      const response = await pricingBackupApi.createBackup(payload);

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        // Refresh backups list after creation
        await fetchBackups();
        return { success: true, data: response.data.data };
      } else if (response.status === 409 && response.data?.requiresConfirmation) {
        // Handle confirmation needed (409 status)
        return {
          success: false,
          requiresConfirmation: true,
          existingBackup: response.data.existingBackup,
          error: response.data.message || 'Manual backup already exists for today'
        };
      } else {
        return { success: false, error: 'Failed to create backup' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  /**
   * Restore pricing data from a backup
   */
  const restoreBackup = useCallback(async (payload: RestoreBackupPayload) => {
    try {
      const response = await pricingBackupApi.restoreBackup(payload);

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        // Refresh backups list after restoration
        await fetchBackups();
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: 'Failed to restore backup' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  /**
   * Delete specific backups
   */
  const deleteBackups = useCallback(async (changeDayIds: string[]) => {
    try {
      const response = await pricingBackupApi.deleteBackups(changeDayIds);

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        // Refresh backups list after deletion
        await fetchBackups();
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: 'Failed to delete backups' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  /**
   * Enforce retention policy
   */
  const enforceRetentionPolicy = useCallback(async () => {
    try {
      const response = await pricingBackupApi.enforceRetentionPolicy();

      if (response.error) {
        return { success: false, error: response.error };
      } else if (response.data?.success) {
        // Refresh backups list after enforcement
        await fetchBackups();
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: 'Failed to enforce retention policy' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }, [fetchBackups]);

  /**
   * Get backup snapshot
   */
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

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchBackups(),
      fetchHealth(),
      fetchStatistics()
    ]);
  }, [fetchBackups, fetchHealth, fetchStatistics]);

  /**
   * Clear all error states
   */
  const clearErrors = useCallback(() => {
    setError(null);
    setHealthError(null);
    setStatisticsError(null);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      refreshAll();
    }
  }, [autoFetch, refreshAll]);

  return {
    // Data state
    backups,
    health,
    statistics,

    // Loading states
    loading,
    healthLoading,
    statisticsLoading,

    // Error states
    error,
    healthError,
    statisticsError,

    // Actions
    fetchBackups,
    fetchHealth,
    fetchStatistics,
    createBackup,
    restoreBackup,
    deleteBackups,
    enforceRetentionPolicy,
    getBackupSnapshot,

    // Utility actions
    refreshAll,
    clearErrors
  };
}

/**
 * Hook for managing a single backup's details
 */
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
      // Fetch backup details and snapshot in parallel
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