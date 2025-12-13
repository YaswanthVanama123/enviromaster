import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePricingBackups } from '../../backendservice/hooks/usePricingBackups';
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import type { PricingBackup, BackupViewMode } from '../../backendservice/types/pricingBackup.types';
import { Toast } from './Toast';
import { BackupListView } from './BackupListView';
import { BackupStatisticsView } from './BackupStatisticsView';
import { BackupHealthView } from './BackupHealthView';
import { CreateBackupModal } from './CreateBackupModal';
import { RestoreBackupModal } from './RestoreBackupModal';

type ToastMessage = {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

interface PricingBackupManagerProps {
  isEmbedded?: boolean;
  parentPath?: string;
  initialView?: BackupViewMode;
}

export const PricingBackupManager: React.FC<PricingBackupManagerProps> = ({
  isEmbedded = false,
  parentPath = '/admin-panel/pricing-backup',
  initialView = 'list'
}) => {
  const navigate = useNavigate();
  const { modalType, itemId } = useParams();
  const location = useLocation();

  // Backup hook
  const {
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
    refreshAll,
    clearErrors
  } = usePricingBackups(true);

  // Local state
  const [activeView, setActiveView] = useState<BackupViewMode>(initialView);
  const [selectedBackups, setSelectedBackups] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<PricingBackup | null>(null);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Sync view with URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const viewFromUrl = pathSegments[pathSegments.length - 1] as BackupViewMode;

    if (['list', 'statistics', 'health', 'compare'].includes(viewFromUrl)) {
      setActiveView(viewFromUrl);
    }
  }, [location.pathname]);

  // Handle modal actions from URL
  useEffect(() => {
    if (modalType === 'restore' && itemId && backups.length > 0) {
      const backup = backups.find(b => b.changeDayId === itemId);
      if (backup) {
        setRestoreCandidate(backup);
        setShowRestoreModal(true);
      }
    } else if (modalType === 'create') {
      setShowCreateModal(true);
    }
  }, [modalType, itemId, backups]);

  // Handle view changes
  const handleViewChange = (newView: BackupViewMode) => {
    setActiveView(newView);
    const newPath = newView === 'list' ? parentPath : `${parentPath}/${newView}`;
    navigate(newPath, { replace: true });
  };

  // Handle backup actions
  const handleCreateBackup = async (description?: string) => {
    setActionLoading(true);
    clearErrors();

    try {
      const result = await createBackup({ changeDescription: description });

      if (result.success) {
        setToastMessage({
          message: result.data?.created
            ? 'Backup created successfully!'
            : 'Backup skipped (already exists for today)',
          type: result.data?.created ? 'success' : 'info'
        });
        setShowCreateModal(false);
      } else {
        setToastMessage({
          message: result.error || 'Failed to create backup',
          type: 'error'
        });
      }
    } catch (err) {
      setToastMessage({
        message: 'An unexpected error occurred',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreBackup = async (changeDayId: string, notes?: string) => {
    if (!restoreCandidate) return;

    setActionLoading(true);
    clearErrors();

    try {
      const result = await restoreBackup({
        changeDayId,
        restorationNotes: notes
      });

      if (result.success) {
        setToastMessage({
          message: `Successfully restored ${result.data?.totalRestored} documents from ${restoreCandidate.changeDay}`,
          type: 'success'
        });
        setShowRestoreModal(false);
        setRestoreCandidate(null);
      } else {
        setToastMessage({
          message: result.error || 'Failed to restore backup',
          type: 'error'
        });
      }
    } catch (err) {
      setToastMessage({
        message: 'An unexpected error occurred during restoration',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBackups = async (changeDayIds: string[]) => {
    if (changeDayIds.length === 0) return;

    setActionLoading(true);
    clearErrors();

    try {
      const result = await deleteBackups(changeDayIds);

      if (result.success) {
        setToastMessage({
          message: `Successfully deleted ${result.data?.deletedCount} backup(s)`,
          type: 'success'
        });
        setSelectedBackups([]);
      } else {
        setToastMessage({
          message: result.error || 'Failed to delete backups',
          type: 'error'
        });
      }
    } catch (err) {
      setToastMessage({
        message: 'An unexpected error occurred during deletion',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnforceRetention = async () => {
    setActionLoading(true);
    clearErrors();

    try {
      const result = await enforceRetentionPolicy();

      if (result.success) {
        setToastMessage({
          message: result.data?.message || 'Retention policy enforced',
          type: 'success'
        });
      } else {
        setToastMessage({
          message: result.error || 'Failed to enforce retention policy',
          type: 'error'
        });
      }
    } catch (err) {
      setToastMessage({
        message: 'An unexpected error occurred',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Close modals
  const closeModals = () => {
    setShowCreateModal(false);
    setShowRestoreModal(false);
    setRestoreCandidate(null);
    navigate(parentPath, { replace: true });
  };

  // Styles
  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      padding: '20px'
    },
    header: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#1f2937',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      margin: '0 0 24px 0'
    },
    tabContainer: {
      display: 'flex',
      gap: '4px',
      borderBottom: '2px solid #f3f4f6',
      paddingBottom: '0'
    },
    tab: {
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: '2px solid transparent',
      cursor: 'pointer',
      borderRadius: '6px 6px 0 0',
      transition: 'all 0.2s ease'
    },
    activeTab: {
      color: '#3b82f6',
      borderBottomColor: '#3b82f6',
      backgroundColor: '#f8fafc'
    },
    inactiveTab: {
      color: '#6b7280',
      borderBottomColor: 'transparent'
    },
    content: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    },
    actionBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    button: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    dangerButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    refreshButton: {
      backgroundColor: '#10b981',
      color: 'white'
    }
  };

  // Add hover styles dynamically
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .backup-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .backup-tab:hover:not(.active) {
        background-color: #f9fafb;
        color: #374151;
      }
      .backup-danger:hover {
        background-color: #dc2626;
      }
      .backup-primary:hover {
        background-color: #2563eb;
      }
      .backup-secondary:hover {
        background-color: #e5e7eb;
      }
      .backup-refresh:hover {
        background-color: #059669;
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Pricing Backup Management</h1>
        <p style={styles.subtitle}>
          Manage and restore pricing data backups. The system automatically maintains backups of the last 10 days with pricing changes.
        </p>

        {/* Navigation Tabs */}
        <div style={styles.tabContainer}>
          {[
            { key: 'list', label: 'Backup List' },
            { key: 'statistics', label: 'Statistics' },
            { key: 'health', label: 'System Health' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`backup-tab ${activeView === tab.key ? 'active' : ''}`}
              style={{
                ...styles.tab,
                ...(activeView === tab.key ? styles.activeTab : styles.inactiveTab)
              }}
              onClick={() => handleViewChange(tab.key as BackupViewMode)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {/* Action Bar */}
        <div style={styles.actionBar}>
          <div style={styles.actionButtons}>
            <button
              className="backup-button backup-primary"
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => setShowCreateModal(true)}
              disabled={actionLoading}
            >
              Create Manual Backup
            </button>

            <button
              className="backup-button backup-refresh"
              style={{ ...styles.button, ...styles.refreshButton }}
              onClick={refreshAll}
              disabled={loading || healthLoading || statisticsLoading}
            >
              {loading || healthLoading || statisticsLoading ? 'Refreshing...' : 'Refresh All'}
            </button>

            {selectedBackups.length > 0 && (
              <button
                className="backup-button backup-danger"
                style={{ ...styles.button, ...styles.dangerButton }}
                onClick={() => handleDeleteBackups(selectedBackups)}
                disabled={actionLoading}
              >
                Delete Selected ({selectedBackups.length})
              </button>
            )}
          </div>

          <div style={styles.actionButtons}>
            <button
              className="backup-button backup-secondary"
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={handleEnforceRetention}
              disabled={actionLoading}
            >
              Enforce Retention Policy
            </button>
          </div>
        </div>

        {/* Main Content */}
        {activeView === 'list' && (
          <BackupListView
            backups={backups}
            loading={loading}
            error={error}
            selectedBackups={selectedBackups}
            onSelectionChange={setSelectedBackups}
            onRestoreClick={(backup) => {
              setRestoreCandidate(backup);
              setShowRestoreModal(true);
            }}
            onRefresh={() => fetchBackups()}
          />
        )}

        {activeView === 'statistics' && (
          <BackupStatisticsView
            statistics={statistics}
            loading={statisticsLoading}
            error={statisticsError}
            onRefresh={() => fetchStatistics()}
          />
        )}

        {activeView === 'health' && (
          <BackupHealthView
            health={health}
            loading={healthLoading}
            error={healthError}
            onRefresh={() => fetchHealth()}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateBackupModal
          onClose={closeModals}
          onCreate={handleCreateBackup}
          loading={actionLoading}
        />
      )}

      {showRestoreModal && restoreCandidate && (
        <RestoreBackupModal
          backup={restoreCandidate}
          onClose={closeModals}
          onRestore={handleRestoreBackup}
          loading={actionLoading}
        />
      )}

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};