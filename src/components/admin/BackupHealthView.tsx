import React from 'react';
import {
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faQuestionCircle,
  faDatabase,
  faClipboard,
  faChartLine,
  faCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import type { BackupSystemHealth } from '../../backendservice/types/pricingBackup.types';
import './BackupHealthView.css';

interface BackupHealthViewProps {
  health: BackupSystemHealth | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const BackupHealthView: React.FC<BackupHealthViewProps> = ({
  health,
  loading,
  error,
  onRefresh
}) => {
  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: '100%'
    },
    overallHealth: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      marginBottom: '32px',
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '2px solid #e5e7eb'
    },
    healthIcon: {
      fontSize: '48px',
      marginRight: '16px'
    },
    healthText: {
      fontSize: '24px',
      fontWeight: '600',
      textTransform: 'capitalize'
    },
    healthHealthy: {
      color: '#10b981',
      borderColor: '#10b981'
    },
    healthWarning: {
      color: '#f59e0b',
      borderColor: '#f59e0b'
    },
    healthUnhealthy: {
      color: '#ef4444',
      borderColor: '#ef4444'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    checkItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #f3f4f6'
    },
    checkLabel: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: '500'
    },
    checkValue: {
      fontSize: '14px',
      fontWeight: '600'
    },
    checkPass: {
      color: '#10b981'
    },
    checkFail: {
      color: '#ef4444'
    },
    checkWarning: {
      color: '#f59e0b'
    },
    checkNeutral: {
      color: '#6b7280'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase'
    },
    statusPass: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    statusFail: {
      backgroundColor: '#fef2f2',
      color: '#dc2626'
    },
    statusWarning: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    warningsContainer: {
      marginTop: '24px'
    },
    warningsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    warningItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: '#fef3c7',
      borderRadius: '6px',
      border: '1px solid #fde68a'
    },
    warningIcon: {
      fontSize: '16px',
      marginTop: '2px'
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e',
      lineHeight: '1.5'
    },
    recentBackupContainer: {
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      border: '1px solid #f3f4f6'
    },
    recentBackupTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    },
    recentBackupDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    recentBackupRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: '#6b7280'
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
    },
    refreshButton: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      marginBottom: '24px'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    progressFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    }
  };

  if (loading) {
    return (
      <div className="bhv-loading-state" style={styles.loadingState}>
        <div>Checking system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bhv-error-state" style={styles.errorState}>
        <strong>Error checking system health:</strong> {error}
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

  if (!health) {
    return (
      <div className="bhv-loading-state" style={styles.loadingState}>
        <div>No health information available</div>
        <button className="bhv-refresh-button" style={styles.refreshButton} onClick={onRefresh}>
          Check System Health
        </button>
      </div>
    );
  }

  const getHealthColor = () => {
    switch (health.status) {
      case 'healthy':
        return styles.healthHealthy;
      case 'warning':
        return styles.healthWarning;
      case 'unhealthy':
        return styles.healthUnhealthy;
      default:
        return styles.checkNeutral;
    }
  };

  const getHealthIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <FontAwesomeIcon icon={faCheckCircle} />;
      case 'warning':
        return <FontAwesomeIcon icon={faExclamationTriangle} />;
      case 'unhealthy':
        return <FontAwesomeIcon icon={faTimesCircle} />;
      default:
        return <FontAwesomeIcon icon={faQuestionCircle} />;
    }
  };

  const renderCheckStatus = (value: boolean | number, goodValue?: boolean | number) => {
    let isGood: boolean;

    if (typeof value === 'boolean') {
      isGood = goodValue !== undefined ? value === goodValue : value;
    } else {
      isGood = goodValue !== undefined ? value === goodValue : value > 0;
    }

    return (
      <span
        className="bhv-status-badge"
        style={{
          ...styles.statusBadge,
          ...(isGood ? styles.statusPass : styles.statusFail)
        }}
      >
        {isGood ? <><FontAwesomeIcon icon={faCheck} /> Pass</> : <><FontAwesomeIcon icon={faTimes} /> Fail</>}
      </span>
    );
  };

  return (
    <div className="bhv-container" style={styles.container}>
      {/* Overall Health Status */}
      <div className="bhv-overall-health" style={{ ...styles.overallHealth, ...getHealthColor() }}>
        <div className="bhv-health-icon" style={styles.healthIcon}>{getHealthIcon()}</div>
        <div className="bhv-health-text" style={{ ...styles.healthText, ...getHealthColor() }}>
          System {health.status}
        </div>
      </div>

      {/* Health Checks Grid */}
      <div className="bhv-grid" style={styles.grid}>
        {/* Database Connectivity */}
        <div className="bhv-card" style={styles.card}>
          <h3 className="bhv-card-title" style={styles.cardTitle}>
            <FontAwesomeIcon icon={faDatabase} /> Database Connectivity
          </h3>

          <div className="bhv-check-item" style={styles.checkItem}>
            <span className="bhv-check-label" style={styles.checkLabel}>Backup Model Accessible</span>
            {renderCheckStatus(health.checks.backupModelAccessible, true)}
          </div>

          <div className="bhv-check-item" style={styles.checkItem}>
            <span className="bhv-check-label" style={styles.checkLabel}>Total Backups Available</span>
            <span className="bhv-check-value" style={{ ...styles.checkValue, ...styles.checkNeutral }}>
              {health.checks.totalBackups}
            </span>
          </div>
        </div>

        {/* Retention Policy Compliance */}
        <div className="bhv-card" style={styles.card}>
          <h3 className="bhv-card-title" style={styles.cardTitle}>
            <FontAwesomeIcon icon={faClipboard} /> Retention Policy
          </h3>

          <div className="bhv-check-item" style={styles.checkItem}>
            <span className="bhv-check-label" style={styles.checkLabel}>Change Days Stored</span>
            <span className="bhv-check-value" style={{
              ...styles.checkValue,
              ...(health.checks.retentionPolicyCompliant ? styles.checkPass : styles.checkWarning)
            }}>
              {health.checks.uniqueChangeDays} / 10
            </span>
          </div>

          <div className="bhv-check-item" style={styles.checkItem}>
            <span className="bhv-check-label" style={styles.checkLabel}>Policy Compliant</span>
            {renderCheckStatus(health.checks.retentionPolicyCompliant, true)}
          </div>

          {/* Progress bar for retention */}
          <div className="bhv-progress-bar" style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min((health.checks.uniqueChangeDays / 10) * 100, 100)}%`,
                backgroundColor: health.checks.retentionPolicyCompliant ? '#10b981' : '#f59e0b'
              }}
            />
          </div>
        </div>

        {/* Backup Activity */}
        <div className="bhv-card" style={styles.card}>
          <h3 className="bhv-card-title" style={styles.cardTitle}>
            <FontAwesomeIcon icon={faChartLine} /> Backup Activity
          </h3>

          <div className="bhv-check-item" style={styles.checkItem}>
            <span className="bhv-check-label" style={styles.checkLabel}>Backup Created Today</span>
            {renderCheckStatus(health.checks.hasBackupToday, true)}
          </div>

          {health.checks.mostRecentBackup && (
            <div className="bhv-recent-backup-container" style={styles.recentBackupContainer}>
              <div className="bhv-recent-backup-title" style={styles.recentBackupTitle}>Most Recent Backup</div>
              <div className="bhv-recent-backup-details" style={styles.recentBackupDetails}>
                <div className="bhv-recent-backup-row" style={styles.recentBackupRow}>
                  <span>Date:</span>
                  <span>{backupUtils.formatChangeDay(health.checks.mostRecentBackup.changeDay)}</span>
                </div>
                <div className="bhv-recent-backup-row" style={styles.recentBackupRow}>
                  <span>Time:</span>
                  <span>{backupUtils.formatDate(health.checks.mostRecentBackup.createdAt)}</span>
                </div>
                <div className="bhv-recent-backup-row" style={styles.recentBackupRow}>
                  <span>Trigger:</span>
                  <span>{backupUtils.formatBackupTrigger(health.checks.mostRecentBackup.trigger)}</span>
                </div>
                <div className="bhv-recent-backup-row" style={styles.recentBackupRow}>
                  <span>Days Ago:</span>
                  <span>{backupUtils.getDaysAgo(health.checks.mostRecentBackup.changeDay)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warnings Section */}
      {health.warnings.length > 0 && (
        <div className="bhv-warnings-container" style={styles.warningsContainer}>
          <h3 className="bhv-card-title" style={styles.cardTitle}>
            <FontAwesomeIcon icon={faExclamationTriangle} /> System Warnings
          </h3>
          <div className="bhv-card" style={styles.card}>
            <div className="bhv-warnings-list" style={styles.warningsList}>
              {health.warnings.map((warning, index) => (
                <div key={index} className="bhv-warning-item" style={styles.warningItem}>
                  <div className="bhv-warning-icon" style={styles.warningIcon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                  <div className="bhv-warning-text" style={styles.warningText}>{warning}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          className="bhv-refresh-button"
          style={styles.refreshButton}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Health Status'}
        </button>
      </div>
    </div>
  );
};