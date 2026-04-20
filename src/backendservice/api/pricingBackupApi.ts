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

export const pricingBackupApi = {
  async getHealth() {
    return apiClient.get<BackupApiResponse<BackupSystemHealth>>('/api/pricing-backup/health');
  },

  async getStatistics() {
    return apiClient.get<BackupApiResponse<BackupStatistics>>('/api/pricing-backup/statistics');
  },

  async getBackups(limit: number = 10) {
    const endpoint = `/api/pricing-backup/list?limit=${Math.min(limit, 50)}`;
    return apiClient.get<BackupApiResponse<BackupListResponse>>(endpoint);
  },

  async getBackupDetails(changeDayId: string) {
    return apiClient.get<BackupApiResponse<PricingBackup>>(`/api/pricing-backup/details/${changeDayId}`);
  },

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

  async createBackup(payload: CreateBackupPayload = {}) {
    return apiClient.post<BackupApiResponse<{
      success: boolean;
      created?: boolean;
      skipped?: boolean;
      replaced?: boolean;
      requiresConfirmation?: boolean;
      existingBackup?: {
        changeDayId: string;
        createdAt: string;
        changeDescription?: string;
      };
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

  async deleteBackups(changeDayIds: string[]) {
    return apiClient.delete<BackupApiResponse<{
      deletedCount: number;
      deletedBackups: string[];
      deletedBy: string;
    }>>('/api/pricing-backup/delete', {
      body: { changeDayIds }
    });
  },

  async enforceRetentionPolicy() {
    return apiClient.post<BackupApiResponse<{
      deletedCount: number;
      deletedChangeDays?: string[];
      message: string;
    }>, {}>('/api/pricing-backup/enforce-retention', {});
  }
};

export const backupUtils = {
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  formatCompressionRatio(ratio: number): string {
    const percentage = Math.round((1 - ratio) * 100);
    return `${percentage}% reduction`;
  },

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

  getHealthStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'healthy': '#10b981',
      'warning': '#f59e0b',
      'unhealthy': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatChangeDay(changeDay: string): string {
    return new Date(changeDay + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  getDaysAgo(changeDay: string): number {
    const backupDate = new Date(changeDay + 'T00:00:00');
    const today = new Date();

    backupDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - backupDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  },

  isValidChangeDayId(changeDayId: string): boolean {
    return /^backup_\d{4}-\d{2}-\d{2}_\d+$/.test(changeDayId);
  },

  extractChangeDay(changeDayId: string): string | null {
    const match = changeDayId.match(/^backup_(\d{4}-\d{2}-\d{2})_\d+$/);
    return match ? match[1] : null;
  },

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
