import React, { useState, useMemo } from 'react';
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import type { PricingBackup } from '../../backendservice/types/pricingBackup.types';
import { BackupDetailsModal } from './BackupDetailsModal';

interface BackupListViewProps {
  backups: PricingBackup[];
  loading: boolean;
  error: string | null;
  selectedBackups: string[];
  onSelectionChange: (selected: string[]) => void;
  onRestoreClick: (backup: PricingBackup) => void;
  onRefresh: () => void;
}

type SortConfig = {
  key: keyof PricingBackup | 'size' | 'daysAgo';
  direction: 'asc' | 'desc';
};

export const BackupListView: React.FC<BackupListViewProps> = ({
  backups,
  loading,
  error,
  selectedBackups,
  onSelectionChange,
  onRestoreClick,
  onRefresh
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'changeDay', direction: 'desc' });
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [filterRestored, setFilterRestored] = useState<string>('all');
  const [detailsBackup, setDetailsBackup] = useState<PricingBackup | null>(null);

  // Sort and filter backups
  const processedBackups = useMemo(() => {
    let filtered = [...backups];

    // Apply filters
    if (filterTrigger !== 'all') {
      filtered = filtered.filter(backup => backup.backupTrigger === filterTrigger);
    }

    if (filterRestored !== 'all') {
      const showRestored = filterRestored === 'true';
      filtered = filtered.filter(backup => backup.restorationInfo?.hasBeenRestored === showRestored);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'changeDay':
          aValue = a.changeDay;
          bValue = b.changeDay;
          break;
        case 'backupTrigger':
          aValue = a.backupTrigger;
          bValue = b.backupTrigger;
          break;
        case 'size':
          aValue = a.snapshotMetadata?.compressedSize || 0;
          bValue = b.snapshotMetadata?.compressedSize || 0;
          break;
        case 'daysAgo':
          aValue = backupUtils.getDaysAgo(a.changeDay);
          bValue = backupUtils.getDaysAgo(b.changeDay);
          break;
        default:
          aValue = a[sortConfig.key as keyof PricingBackup];
          bValue = b[sortConfig.key as keyof PricingBackup];
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [backups, sortConfig, filterTrigger, filterRestored]);

  // Handle sorting
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(processedBackups.map(backup => backup.changeDayId));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectBackup = (changeDayId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedBackups, changeDayId]);
    } else {
      onSelectionChange(selectedBackups.filter(id => id !== changeDayId));
    }
  };

  // Get unique triggers for filter
  const uniqueTriggers = useMemo(() => {
    const triggers = [...new Set(backups.map(backup => backup.backupTrigger))];
    return triggers.sort();
  }, [backups]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: '100%'
    },
    filtersContainer: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    filterLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase'
    },
    filterSelect: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      minWidth: '140px'
    },
    tableContainer: {
      overflowX: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: 'white'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    headerRow: {
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb'
    },
    headerCell: {
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#374151',
      textAlign: 'left',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      cursor: 'pointer',
      userSelect: 'none',
      borderRight: '1px solid #e5e7eb',
      whiteSpace: 'nowrap'
    },
    sortableHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    sortIcon: {
      width: '12px',
      height: '12px',
      opacity: 0.5
    },
    row: {
      borderBottom: '1px solid #f3f4f6',
      transition: 'background-color 0.2s ease'
    },
    cell: {
      padding: '12px 16px',
      fontSize: '14px',
      color: '#374151',
      borderRight: '1px solid #f3f4f6',
      verticalAlign: 'top'
    },
    checkboxCell: {
      padding: '12px 16px',
      width: '50px',
      textAlign: 'center'
    },
    checkbox: {
      width: '16px',
      height: '16px',
      cursor: 'pointer'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: '500',
      borderRadius: '4px',
      textTransform: 'uppercase'
    },
    triggerBadge: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    restoredBadge: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    notRestoredBadge: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    compressionInfo: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    actionButton: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    restoreButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    detailsButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    },
    loadingState: {
      textAlign: 'center',
      padding: '48px 24px'
    },
    errorState: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '16px',
      color: '#dc2626',
      marginBottom: '24px'
    },
    metadataContainer: {
      fontSize: '12px',
      color: '#6b7280'
    },
    metadataRow: {
      marginBottom: '2px'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingState}>
        <div>Loading backups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorState}>
        <strong>Error loading backups:</strong> {error}
        <button
          onClick={onRefresh}
          style={{
            marginLeft: '12px',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Trigger Type</label>
          <select
            style={styles.filterSelect}
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
          >
            <option value="all">All Triggers</option>
            {uniqueTriggers.map(trigger => (
              <option key={trigger} value={trigger}>
                {backupUtils.formatBackupTrigger(trigger)}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Restoration Status</label>
          <select
            style={styles.filterSelect}
            value={filterRestored}
            onChange={(e) => setFilterRestored(e.target.value)}
          >
            <option value="all">All Backups</option>
            <option value="false">Not Restored</option>
            <option value="true">Restored</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Results</label>
          <div style={{ fontSize: '14px', color: '#374151', padding: '8px 0' }}>
            {processedBackups.length} of {backups.length} backups
          </div>
        </div>
      </div>

      {/* Table */}
      {processedBackups.length === 0 ? (
        <div style={styles.emptyState}>
          {backups.length === 0
            ? "No backups available. Create your first backup to get started."
            : "No backups match the current filters."
          }
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={processedBackups.length > 0 && selectedBackups.length === processedBackups.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>

                <th style={styles.headerCell} onClick={() => handleSort('changeDay')}>
                  <div style={styles.sortableHeader}>
                    Change Day
                    <span style={styles.sortIcon}>
                      {sortConfig.key === 'changeDay' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th style={styles.headerCell} onClick={() => handleSort('daysAgo')}>
                  <div style={styles.sortableHeader}>
                    Days Ago
                    <span style={styles.sortIcon}>
                      {sortConfig.key === 'daysAgo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th style={styles.headerCell} onClick={() => handleSort('backupTrigger')}>
                  <div style={styles.sortableHeader}>
                    Trigger
                    <span style={styles.sortIcon}>
                      {sortConfig.key === 'backupTrigger' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th style={styles.headerCell}>Data Summary</th>

                <th style={styles.headerCell} onClick={() => handleSort('size')}>
                  <div style={styles.sortableHeader}>
                    Size
                    <span style={styles.sortIcon}>
                      {sortConfig.key === 'size' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th style={styles.headerCell}>Status</th>
                <th style={styles.headerCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedBackups.map((backup, index) => (
                <tr
                  key={backup.changeDayId}
                  style={{
                    ...styles.row,
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                  }}
                >
                  <td style={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={selectedBackups.includes(backup.changeDayId)}
                      onChange={(e) => handleSelectBackup(backup.changeDayId, e.target.checked)}
                    />
                  </td>

                  <td style={styles.cell}>
                    <div>{backupUtils.formatChangeDay(backup.changeDay)}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {backupUtils.formatDate(backup.firstChangeTimestamp)}
                    </div>
                  </td>

                  <td style={styles.cell}>
                    {backupUtils.getDaysAgo(backup.changeDay)} days ago
                  </td>

                  <td style={styles.cell}>
                    <span style={{ ...styles.badge, ...styles.triggerBadge }}>
                      {backupUtils.formatBackupTrigger(backup.backupTrigger)}
                    </span>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {backup.changeContext?.changeDescription || 'No description available'}
                    </div>
                  </td>

                  <td style={styles.cell}>
                    <div style={styles.metadataContainer}>
                      {(backup.snapshotMetadata?.documentCounts?.priceFixCount || 0) > 0 && (
                        <div style={styles.metadataRow}>
                          PriceFix: {backup.snapshotMetadata.documentCounts.priceFixCount}
                        </div>
                      )}
                      {(backup.snapshotMetadata?.documentCounts?.productCatalogCount || 0) > 0 && (
                        <div style={styles.metadataRow}>
                          Products: {backup.snapshotMetadata.documentCounts.productCatalogCount}
                        </div>
                      )}
                      {(backup.snapshotMetadata?.documentCounts?.serviceConfigCount || 0) > 0 && (
                        <div style={styles.metadataRow}>
                          Services: {backup.snapshotMetadata.documentCounts.serviceConfigCount}
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={styles.cell}>
                    <div>{backupUtils.formatFileSize(backup.snapshotMetadata?.compressedSize || 0)}</div>
                    <div style={styles.compressionInfo}>
                      {backupUtils.formatCompressionRatio(backup.snapshotMetadata?.compressionRatio || 0)}
                    </div>
                  </td>

                  <td style={styles.cell}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(backup.restorationInfo?.hasBeenRestored
                          ? styles.restoredBadge
                          : styles.notRestoredBadge
                        )
                      }}
                    >
                      {backup.restorationInfo?.hasBeenRestored ? 'Restored' : 'Available'}
                    </span>
                    {backup.restorationInfo?.hasBeenRestored && backup.restorationInfo?.lastRestoredAt && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {backupUtils.formatDate(backup.restorationInfo.lastRestoredAt)}
                      </div>
                    )}
                  </td>

                  <td style={styles.cell}>
                    <div style={styles.actionButtons}>
                      <button
                        style={{ ...styles.actionButton, ...styles.detailsButton }}
                        onClick={() => setDetailsBackup(backup)}
                        title="View backup details"
                      >
                        View Details
                      </button>
                      <button
                        style={{ ...styles.actionButton, ...styles.restoreButton }}
                        onClick={() => onRestoreClick(backup)}
                        disabled={backup.restorationInfo?.hasBeenRestored}
                        title={backup.restorationInfo?.hasBeenRestored ? 'Already restored' : 'Restore this backup'}
                      >
                        Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Backup Details Modal */}
      {detailsBackup && (
        <BackupDetailsModal
          backup={detailsBackup}
          onClose={() => setDetailsBackup(null)}
        />
      )}
    </div>
  );
};