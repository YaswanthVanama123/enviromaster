// Types for the Pricing Backup system
export interface PricingBackup {
  _id?: string;
  changeDayId: string;
  changeDay: string; // YYYY-MM-DD format
  firstChangeTimestamp: string;
  backupTrigger: 'pricefix_update' | 'product_catalog_update' | 'service_config_update' | 'manual' | 'scheduled';
  changedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  changeContext: {
    changedAreas: string[];
    changeDescription: string;
    changeCount: number;
  };
  snapshotMetadata: {
    includedDataTypes: {
      priceFix: boolean;
      productCatalog: boolean;
      serviceConfigs: boolean;
    };
    documentCounts: {
      priceFixCount: number;
      productCatalogCount: number;
      serviceConfigCount: number;
    };
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  restorationInfo: {
    hasBeenRestored: boolean;
    lastRestoredAt?: string;
    restoredBy?: {
      _id: string;
      username: string;
      email: string;
    };
    restorationNotes?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BackupSystemHealth {
  status: 'healthy' | 'warning' | 'unhealthy';
  checks: {
    backupModelAccessible: boolean;
    totalBackups: number;
    uniqueChangeDays: number;
    retentionPolicyCompliant: boolean;
    hasBackupToday: boolean;
    mostRecentBackup?: {
      changeDay: string;
      createdAt: string;
      trigger: string;
    };
  };
  warnings: string[];
}

export interface BackupStatistics {
  totalBackups: number;
  uniqueChangeDays: number;
  retentionCompliance: boolean;
  sizeStatistics: {
    totalOriginalSize: number;
    totalCompressedSize: number;
    avgCompressionRatio: number;
    minCompressionRatio: number;
    maxCompressionRatio: number;
  };
  triggerStatistics: Array<{
    _id: string;
    count: number;
  }>;
  recentBackups: Array<{
    changeDayId: string;
    changeDay: string;
    backupTrigger: string;
    snapshotMetadata: {
      documentCounts: {
        priceFixCount: number;
        productCatalogCount: number;
        serviceConfigCount: number;
      };
    };
  }>;
  systemHealth: {
    isHealthy: boolean;
    warnings: string[];
  };
}

export interface BackupSnapshot {
  timestamp: string;
  backupVersion: string;
  totalDocuments: number;
  dataTypes: {
    priceFix: {
      count: number;
      hasData: boolean;
    };
    productCatalog: {
      activeCount: number;
      totalCount: number;
      hasData: boolean;
    };
    serviceConfigs: {
      count: number;
      activeCount: number;
      hasData: boolean;
    };
  };
}

export interface CreateBackupPayload {
  changeDescription?: string;
}

export interface RestoreBackupPayload {
  changeDayId: string;
  restorationNotes?: string;
}

export interface BackupListResponse {
  backups: PricingBackup[];
  totalChangeDays: number;
  requestedLimit: number;
}

export interface BackupApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BackupComparisonData {
  original: BackupSnapshot;
  current: BackupSnapshot;
  differences: {
    priceFix: {
      added: number;
      modified: number;
      removed: number;
    };
    productCatalog: {
      added: number;
      modified: number;
      removed: number;
    };
    serviceConfigs: {
      added: number;
      modified: number;
      removed: number;
    };
  };
}

// UI State types
export type BackupViewMode = 'list' | 'statistics' | 'health' | 'compare' | 'restore';

export type BackupSortBy = 'changeDay' | 'backupTrigger' | 'compressionRatio' | 'totalSize';
export type SortOrder = 'asc' | 'desc';

export interface BackupFilters {
  trigger?: string;
  dateFrom?: string;
  dateTo?: string;
  hasErrors?: boolean;
  restored?: boolean;
}

export interface BackupTableColumn {
  key: keyof PricingBackup | string;
  label: string;
  sortable: boolean;
  width?: string;
  render?: (backup: PricingBackup) => React.ReactNode;
}