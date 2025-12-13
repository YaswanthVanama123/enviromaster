import { apiClient } from '../utils/apiClient';
import type {
  PricingBackup,
  BackupSystemHealth,
  BackupStatistics,
  BackupSnapshot,
  CreateBackupPayload,
  RestoreBackupPayload,
  BackupListResponse,
  BackupApiResponse
} from '../types/pricingBackup.types';

/**
 * API client for Pricing Backup management
 * Follows the same pattern as serviceConfigApi.ts and productCatalogApi.ts
 */
export const pricingBackupApi = {
  /**
   * Get system health information
   */
  async getHealth() {
    return apiClient.get<BackupApiResponse<BackupSystemHealth>>('/api/pricing-backup/health');
  },

  /**
   * Get comprehensive backup statistics
   */
  async getStatistics() {
    return apiClient.get<BackupApiResponse<BackupStatistics>>('/api/pricing-backup/statistics');
  },

  /**
   * Get list of available backups
   * @param limit - Maximum number of backups to return (default: 10, max: 50)
   */
  async getBackups(limit: number = 10) {
    const endpoint = `/api/pricing-backup/list?limit=${Math.min(limit, 50)}`;
    return apiClient.get<BackupApiResponse<BackupListResponse>>(endpoint);
  },

  /**
   * Get detailed information about a specific backup
   * @param changeDayId - The unique identifier for the backup
   */
  async getBackupDetails(changeDayId: string) {
    return apiClient.get<BackupApiResponse<PricingBackup>>(`/api/pricing-backup/details/${changeDayId}`);
  },

  /**
   * Get backup snapshot preview (summarized data)
   * @param changeDayId - The unique identifier for the backup
   * @param preview - Whether to get preview (true) or full snapshot (false)
   */
  async getBackupSnapshot(changeDayId: string, preview: boolean = true) {
    const endpoint = `/api/pricing-backup/snapshot/${changeDayId}?preview=${preview}`;
    return apiClient.get<BackupApiResponse<{
      changeDayId: string;
      changeDay: string;
      preview?: BackupSnapshot;
      snapshot?: any;
      fullSnapshotAvailable: boolean;
    }>>(endpoint);
  },

  /**
   * Create a manual backup
   * @param payload - Backup creation options
   */
  async createBackup(payload: CreateBackupPayload = {}) {
    return apiClient.post<BackupApiResponse<{
      success: boolean;
      created?: boolean;
      skipped?: boolean;
      backup?: {
        id: string;
        changeDayId: string;
        changeDay: string;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
      };
      retentionPolicy?: {
        deletedCount: number;
        message: string;
      };
      message: string;
    }>, CreateBackupPayload>('/api/pricing-backup/create', payload);
  },

  /**
   * Restore pricing data from a backup
   * @param payload - Restoration options
   */
  async restoreBackup(payload: RestoreBackupPayload) {
    return apiClient.post<BackupApiResponse<{
      changeDayId: string;
      changeDay: string;
      totalRestored: number;
      results: {
        priceFix: { restored: number; errors: string[] };
        productCatalog: { restored: number; errors: string[] };
        serviceConfigs: { restored: number; errors: string[] };
      };
    }>, RestoreBackupPayload>('/api/pricing-backup/restore', payload);
  },

  /**
   * Delete specific backups
   * @param changeDayIds - Array of backup IDs to delete
   */
  async deleteBackups(changeDayIds: string[]) {
    return apiClient.delete<BackupApiResponse<{
      deletedCount: number;
      deletedBackups: string[];
      deletedBy: string;
    }>>('/api/pricing-backup/delete', {
      body: { changeDayIds }
    });
  },

  /**
   * Manually enforce retention policy
   */
  async enforceRetentionPolicy() {
    return apiClient.post<BackupApiResponse<{
      deletedCount: number;
      deletedChangeDays?: string[];
      message: string;
    }>, {}>('/api/pricing-backup/enforce-retention', {});
  }
};

/**
 * Utility functions for backup management
 */
export const backupUtils = {
  /**
   * Format file size in bytes to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  /**
   * Format compression ratio as percentage
   */
  formatCompressionRatio(ratio: number): string {
    const percentage = Math.round((1 - ratio) * 100);
    return `${percentage}% reduction`;
  },

  /**
   * Format backup trigger for display
   */
  formatBackupTrigger(trigger: string): string {
    const triggerMap: Record<string, string> = {
      'pricefix_update': 'PriceFix Update',
      'product_catalog_update': 'Product Catalog Update',
      'service_config_update': 'Service Config Update',
      'manual': 'Manual Backup',
      'scheduled': 'Scheduled Backup'
    };
    return triggerMap[trigger] || trigger;
  },

  /**
   * Get status color based on backup health
   */
  getHealthStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'healthy': '#10b981', // green
      'warning': '#f59e0b', // yellow
      'unhealthy': '#ef4444' // red
    };
    return colorMap[status] || '#6b7280'; // gray fallback
  },

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format change day (YYYY-MM-DD) for display
   */
  formatChangeDay(changeDay: string): string {
    return new Date(changeDay + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Calculate days ago from change day
   */
  getDaysAgo(changeDay: string): number {
    const backupDate = new Date(changeDay + 'T00:00:00');
    const today = new Date();
    const diffTime = today.getTime() - backupDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Validate changeDayId format
   */
  isValidChangeDayId(changeDayId: string): boolean {
    return /^backup_\d{4}-\d{2}-\d{2}_\d+$/.test(changeDayId);
  },

  /**
   * Extract change day from changeDayId
   */
  extractChangeDay(changeDayId: string): string | null {
    const match = changeDayId.match(/^backup_(\d{4}-\d{2}-\d{2})_\d+$/);
    return match ? match[1] : null;
  },

  /**
   * Sort backups by different criteria
   */
  sortBackups(backups: PricingBackup[], sortBy: 'changeDay' | 'size' | 'trigger', order: 'asc' | 'desc' = 'desc'): PricingBackup[] {
    const sorted = [...backups].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'changeDay':
          comparison = a.changeDay.localeCompare(b.changeDay);
          break;
        case 'size':
          comparison = a.snapshotMetadata.compressedSize - b.snapshotMetadata.compressedSize;
          break;
        case 'trigger':
          comparison = a.backupTrigger.localeCompare(b.backupTrigger);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  },

  /**
   * Filter backups based on criteria
   */
  filterBackups(backups: PricingBackup[], filters: {
    trigger?: string;
    dateFrom?: string;
    dateTo?: string;
    restored?: boolean;
  }): PricingBackup[] {
    return backups.filter(backup => {
      if (filters.trigger && backup.backupTrigger !== filters.trigger) {
        return false;
      }

      if (filters.dateFrom && backup.changeDay < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && backup.changeDay > filters.dateTo) {
        return false;
      }

      if (filters.restored !== undefined && backup.restorationInfo.hasBeenRestored !== filters.restored) {
        return false;
      }

      return true;
    });
  }
};