import React, { useMemo } from 'react';
import {
  faBox,
  faHdd,
  faChartBar,
  faHeartbeat,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import type { BackupStatistics } from '../../backendservice/types/pricingBackup.types';
import './BackupStatisticsView.css';

interface BackupStatisticsViewProps {
  statistics: BackupStatistics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const BackupStatisticsView: React.FC<BackupStatisticsViewProps> = ({
  statistics,
  loading,
  error,
  onRefresh
}) => {
  // Process statistics for display
  const processedStats = useMemo(() => {
    if (!statistics || !statistics.sizeStatistics) return null;

    const sizeStats = statistics.sizeStatistics;
    const totalSavings = (sizeStats.totalOriginalSize || 0) - (sizeStats.totalCompressedSize || 0);
    const avgSavingsPercent = sizeStats.avgCompressionRatio
      ? Math.round((1 - sizeStats.avgCompressionRatio) * 100)
      : 0;

    return {
      ...statistics,
      totalSavings,
      avgSavingsPercent,
      avgBackupSize: statistics.totalBackups > 0 && sizeStats.totalCompressedSize
        ? Math.round(sizeStats.totalCompressedSize / statistics.totalBackups)
        : 0
    };
  }, [statistics]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: '100%'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    },
    card: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    cardIcon: {
      width: '20px',
      height: '20px',
      opacity: 0.6
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#6b7280'
    },
    statSubtext: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '12px'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#10b981',
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    },
    healthIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase'
    },
    healthHealthy: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    healthWarning: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    healthUnhealthy: {
      backgroundColor: '#fef2f2',
      color: '#dc2626'
    },
    chartContainer: {
      marginTop: '24px'
    },
    chartTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '16px'
    },
    triggerChart: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    triggerItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    triggerBar: {
      flex: 1,
      height: '24px',
      backgroundColor: '#f3f4f6',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative'
    },
    triggerFill: {
      height: '100%',
      borderRadius: '12px',
      transition: 'width 0.3s ease'
    },
    triggerLabel: {
      minWidth: '140px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    triggerCount: {
      minWidth: '40px',
      fontSize: '14px',
      color: '#6b7280',
      textAlign: 'right'
    },
    recentBackupsContainer: {
      marginTop: '24px'
    },
    recentBackupsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    recentBackupItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      border: '1px solid #f3f4f6'
    },
    recentBackupInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    recentBackupDate: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    recentBackupTrigger: {
      fontSize: '12px',
      color: '#6b7280'
    },
    recentBackupCounts: {
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'right'
    },
    warningsList: {
      marginTop: '16px'
    },
    warningItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#fef3c7',
      borderRadius: '6px',
      marginBottom: '8px'
    },
    warningIcon: {
      width: '16px',
      height: '16px',
      color: '#f59e0b'
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e'
    },
    loadingState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    },
    errorState: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '16px',
      color: '#dc2626',
      marginBottom: '24px'
    }
  };

  if (loading) {
    return (
      <div className="bsv-loading-state" style={styles.loadingState}>
        <div className="bsv-spinner-inline">
          <span className="bsv-sr-only">Loading statistics…</span>
        </div>
        <p className="bsv-loading-text">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bsv-error-state" style={styles.errorState}>
        <strong>Error loading statistics:</strong> {error}
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

  if (!processedStats) {
    return (
      <div className="bsv-loading-state" style={styles.loadingState}>
        <div>No statistics available</div>
      </div>
    );
  }

  const triggerColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#f97316'  // orange
  ];

  const maxTriggerCount = processedStats?.triggerStatistics?.length
    ? Math.max(...processedStats.triggerStatistics.map(t => t.count))
    : 0;

  return (
    <div className="bsv-container" style={styles.container}>
      {/* Overview Cards */}
      <div className="bsv-grid" style={styles.grid}>
        {/* Total Backups */}
        <div className="bsv-card" style={styles.card}>
          <div className="bsv-card-header" style={styles.cardHeader}>
            <h3 className="bsv-card-title" style={styles.cardTitle}>Total Backups</h3>
            <div className="bsv-card-icon" style={styles.cardIcon}><FontAwesomeIcon icon={faBox} /></div>
          </div>
          <div className="bsv-stat-value" style={styles.statValue}>{processedStats?.totalBackups || 0}</div>
          <div className="bsv-stat-label" style={styles.statLabel}>Across {processedStats?.uniqueChangeDays || 0} change days</div>
          {(processedStats?.uniqueChangeDays || 0) <= 10 && (
            <div className="bsv-progress-bar" style={styles.progressBar}>
              <div
                className="bsv-progress-fill"
                style={{
                  ...styles.progressFill,
                  width: `${((processedStats?.uniqueChangeDays || 0) / 10) * 100}%`
                }}
              />
            </div>
          )}
          <div className="bsv-stat-subtext" style={styles.statSubtext}>
            {processedStats?.retentionCompliance ? 'Within retention limit' : 'Exceeds retention limit'}
          </div>
        </div>

        {/* Storage Efficiency */}
        <div className="bsv-card" style={styles.card}>
          <div className="bsv-card-header" style={styles.cardHeader}>
            <h3 className="bsv-card-title" style={styles.cardTitle}>Storage Efficiency</h3>
            <div className="bsv-card-icon" style={styles.cardIcon}><FontAwesomeIcon icon={faHdd} /></div>
          </div>
          <div className="bsv-stat-value" style={styles.statValue}>{processedStats?.avgSavingsPercent || 0}%</div>
          <div className="bsv-stat-label" style={styles.statLabel}>Average compression savings</div>
          <div className="bsv-progress-bar" style={styles.progressBar}>
            <div
              className="bsv-progress-fill"
              style={{
                ...styles.progressFill,
                width: `${processedStats?.avgSavingsPercent || 0}%`
              }}
            />
          </div>
          <div className="bsv-stat-subtext" style={styles.statSubtext}>
            Saved {backupUtils.formatFileSize(processedStats?.totalSavings || 0)} total
          </div>
        </div>

        {/* Total Size */}
        <div className="bsv-card" style={styles.card}>
          <div className="bsv-card-header" style={styles.cardHeader}>
            <h3 className="bsv-card-title" style={styles.cardTitle}>Storage Usage</h3>
            <div className="bsv-card-icon" style={styles.cardIcon}><FontAwesomeIcon icon={faChartBar} /></div>
          </div>
          <div className="bsv-stat-value" style={styles.statValue}>
            {backupUtils.formatFileSize(processedStats?.sizeStatistics?.totalCompressedSize || 0)}
          </div>
          <div className="bsv-stat-label" style={styles.statLabel}>Total compressed storage</div>
          <div className="bsv-stat-subtext" style={styles.statSubtext}>
            Average: {backupUtils.formatFileSize(processedStats?.avgBackupSize || 0)} per backup
          </div>
          <div className="bsv-stat-subtext" style={styles.statSubtext}>
            Original size: {backupUtils.formatFileSize(processedStats?.sizeStatistics?.totalOriginalSize || 0)}
          </div>
        </div>

        {/* System Health */}
        <div className="bsv-card" style={styles.card}>
          <div className="bsv-card-header" style={styles.cardHeader}>
            <h3 className="bsv-card-title" style={styles.cardTitle}>System Health</h3>
            <div className="bsv-card-icon" style={styles.cardIcon}><FontAwesomeIcon icon={faHeartbeat} /></div>
          </div>
          <div>
            <span
              className="bsv-health-indicator"
              style={{
                ...styles.healthIndicator,
                ...(processedStats?.systemHealth?.isHealthy
                  ? styles.healthHealthy
                  : (processedStats?.systemHealth?.warnings?.length || 0) > 0
                  ? styles.healthWarning
                  : styles.healthUnhealthy
                )
              }}
            >
              ● {processedStats?.systemHealth?.isHealthy ? 'Healthy' : 'Warning'}
            </span>
          </div>
          {(processedStats?.systemHealth?.warnings?.length || 0) > 0 && (
            <div className="bsv-warnings-list" style={styles.warningsList}>
              {processedStats.systemHealth?.warnings?.map((warning, index) => (
                <div key={index} className="bsv-warning-item" style={styles.warningItem}>
                  <div className="bsv-warning-icon" style={styles.warningIcon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                  <div className="bsv-warning-text" style={styles.warningText}>{warning}</div>
                </div>
              )) || []}
            </div>
          )}
        </div>
      </div>

      {/* Backup Triggers Chart */}
      <div className="bsv-chart-container" style={styles.chartContainer}>
        <h3 className="bsv-chart-title" style={styles.chartTitle}>Backup Triggers</h3>
        <div className="bsv-card" style={styles.card}>
          <div className="bsv-trigger-chart" style={styles.triggerChart}>
            {(processedStats?.triggerStatistics || []).map((trigger, index) => (
              <div key={trigger._id} className="bsv-trigger-item" style={styles.triggerItem}>
                <div className="bsv-trigger-label" style={styles.triggerLabel}>
                  {backupUtils.formatBackupTrigger(trigger._id)}
                </div>
                <div className="bsv-trigger-bar" style={styles.triggerBar}>
                  <div
                    className="bsv-trigger-fill"
                    style={{
                      ...styles.triggerFill,
                      width: maxTriggerCount > 0 ? `${(trigger.count / maxTriggerCount) * 100}%` : '0%',
                      backgroundColor: triggerColors[index % triggerColors.length]
                    }}
                  />
                </div>
                <div className="bsv-trigger-count" style={styles.triggerCount}>{trigger.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Backups */}
      <div className="bsv-recent-backups-container" style={styles.recentBackupsContainer}>
        <h3 className="bsv-chart-title" style={styles.chartTitle}>Recent Backups</h3>
        <div className="bsv-card" style={styles.card}>
          {(processedStats?.recentBackups?.length || 0) === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
              No recent backups available
            </div>
          ) : (
            <div className="bsv-recent-backups-list" style={styles.recentBackupsList}>
              {(processedStats?.recentBackups || []).map((backup, index) => (
                <div key={backup.changeDayId} className="bsv-recent-backup-item" style={styles.recentBackupItem}>
                  <div className="bsv-recent-backup-info" style={styles.recentBackupInfo}>
                    <div className="bsv-recent-backup-date" style={styles.recentBackupDate}>
                      {backupUtils.formatChangeDay(backup.changeDay)}
                    </div>
                    <div className="bsv-recent-backup-trigger" style={styles.recentBackupTrigger}>
                      {backupUtils.formatBackupTrigger(backup.backupTrigger)}
                    </div>
                  </div>
                  <div className="bsv-recent-backup-counts" style={styles.recentBackupCounts}>
                    <div>
                      PF: {backup.snapshotMetadata?.documentCounts?.priceFixCount || 0} |
                      PC: {backup.snapshotMetadata?.documentCounts?.productCatalogCount || 0} |
                      SC: {backup.snapshotMetadata?.documentCounts?.serviceConfigCount || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compression Details */}
      <div className="bsv-chart-container" style={styles.chartContainer}>
        <h3 className="bsv-chart-title" style={styles.chartTitle}>Compression Analysis</h3>
        <div className="bsv-card" style={styles.card}>
          <div className="bsv-grid" style={styles.grid}>
            <div>
              <div className="bsv-stat-label" style={styles.statLabel}>Best Compression</div>
              <div className="bsv-stat-value" style={styles.statValue}>
                {processedStats?.sizeStatistics?.minCompressionRatio
                  ? Math.round((1 - processedStats.sizeStatistics.minCompressionRatio) * 100)
                  : 0}%
              </div>
              <div className="bsv-stat-subtext" style={styles.statSubtext}>
                Ratio: {processedStats?.sizeStatistics?.minCompressionRatio?.toFixed(2) || 'N/A'}
              </div>
            </div>
            <div>
              <div className="bsv-stat-label" style={styles.statLabel}>Worst Compression</div>
              <div className="bsv-stat-value" style={styles.statValue}>
                {processedStats?.sizeStatistics?.maxCompressionRatio
                  ? Math.round((1 - processedStats.sizeStatistics.maxCompressionRatio) * 100)
                  : 0}%
              </div>
              <div className="bsv-stat-subtext" style={styles.statSubtext}>
                Ratio: {processedStats?.sizeStatistics?.maxCompressionRatio?.toFixed(2) || 'N/A'}
              </div>
            </div>
            <div>
              <div className="bsv-stat-label" style={styles.statLabel}>Average Compression</div>
              <div className="bsv-stat-value" style={styles.statValue}>
                {processedStats?.sizeStatistics?.avgCompressionRatio
                  ? Math.round((1 - processedStats.sizeStatistics.avgCompressionRatio) * 100)
                  : 0}%
              </div>
              <div className="bsv-stat-subtext" style={styles.statSubtext}>
                Ratio: {processedStats?.sizeStatistics?.avgCompressionRatio?.toFixed(2) || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};