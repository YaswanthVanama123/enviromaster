

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { biginAuditApi, type BiginAuditLog, type ScrapeStatus, type AuditStats } from '../../../backendservice/api/biginAuditApi';
import './BiginAuditTab.css';

export const BiginAuditTab: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<BiginAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [selectedLog, setSelectedLog] = useState<BiginAuditLog | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    saved?: number;
    skipped?: number;
    errors?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteUnnecessaryModal, setShowDeleteUnnecessaryModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    const result = await biginAuditApi.getAll({
      search: searchTerm || undefined,
      user: userFilter || undefined,
      action: actionFilter || undefined,
      module: moduleFilter || undefined,
      pipeline: pipelineFilter || undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setAuditLogs(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, userFilter, actionFilter, moduleFilter, pipelineFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await biginAuditApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadScrapeStatus = useCallback(async () => {
    const result = await biginAuditApi.getScrapeStatus();
    if (result) {
      setScrapeStatus(result);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
    loadStats();
    loadScrapeStatus();
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    if (scrapeStatus?.isRunning) {
      const interval = setInterval(() => {
        loadScrapeStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (scrapeStatus?.lastScrapeResult === 'success') {
      
      loadAuditLogs();
      loadStats();
    }
  }, [scrapeStatus?.isRunning, scrapeStatus?.lastScrapeResult, loadScrapeStatus, loadAuditLogs, loadStats]);

  const handleScrape = async () => {
    const result = await biginAuditApi.startScrape();
    if (result) {
      loadScrapeStatus();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadAuditLogs();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await biginAuditApi.uploadCsv(file);
      if (result) {
        setUploadResult({
          success: true,
          message: result.message,
          saved: result.data?.saved,
          skipped: result.data?.skipped,
          errors: result.data?.errors,
        });
        
        loadAuditLogs();
        loadStats();
      } else {
        setUploadResult({
          success: false,
          message: 'Failed to upload CSV file',
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Error uploading file: ' + (error as Error).message,
      });
    } finally {
      setUploading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadResult(null);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      const result = await biginAuditApi.deleteAll();
      if (result) {
        setDeleteResult({ success: true, message: result.message });
        loadAuditLogs();
        loadStats();
      } else {
        setDeleteResult({ success: false, message: 'Failed to delete audit logs' });
      }
    } catch (error) {
      setDeleteResult({ success: false, message: 'Error deleting audit logs' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteUnnecessary = async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      const result = await biginAuditApi.deleteUnnecessary();
      if (result) {
        setDeleteResult({ success: true, message: result.message });
        loadAuditLogs();
        loadStats();
      } else {
        setDeleteResult({ success: false, message: 'Failed to delete unnecessary audit logs' });
      }
    } catch (error) {
      setDeleteResult({ success: false, message: 'Error deleting unnecessary audit logs' });
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteAllModal(false);
    setShowDeleteUnnecessaryModal(false);
    setDeleteResult(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create') || lowerAction.includes('add')) return 'action-create';
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) return 'action-delete';
    if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('modify')) return 'action-update';
    if (lowerAction.includes('login') || lowerAction.includes('logout')) return 'action-auth';
    return 'action-other';
  };

  return (
    <div className="bigin-audit-tab">
      {}
      <div className="ba-header">
        <div className="ba-header-content">
          <h2>Bigin Audit History</h2>
          <p className="ba-subtitle">View audit logs from Zoho Bigin CRM</p>
        </div>
        <div className="ba-header-actions">
          <button
            className="ba-upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload CSV
          </button>
          <button
            className={`ba-scrape-btn ${scrapeStatus?.isRunning ? 'scraping' : ''}`}
            onClick={handleScrape}
            disabled={scrapeStatus?.isRunning}
          >
            {scrapeStatus?.isRunning ? (
              <>
                <span className="scrape-spinner"></span>
                Scraping... {scrapeStatus.progress}%
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Fetch Audit Logs
              </>
            )}
          </button>
          <button
            className="ba-delete-unnecessary-btn"
            onClick={() => setShowDeleteUnnecessaryModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Unnecessary
          </button>
          <button
            className="ba-delete-all-btn"
            onClick={() => setShowDeleteAllModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
            </svg>
            Delete All
          </button>
        </div>
      </div>

      {}
      <div className="ba-stats-grid">
        <div className="ba-stat-card">
          <div className="ba-stat-value">{stats?.total || 0}</div>
          <div className="ba-stat-label">Total Logs</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value ba-stat-storage">{formatBytes(stats?.storageSize || 0)}</div>
          <div className="ba-stat-label">Storage Size</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value ba-stat-24h">{stats?.last24Hours || 0}</div>
          <div className="ba-stat-label">Last 24 Hours</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value ba-stat-7d">{stats?.last7Days || 0}</div>
          <div className="ba-stat-label">Last 7 Days</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value">{stats?.uniqueUsers || 0}</div>
          <div className="ba-stat-label">Unique Users</div>
        </div>
      </div>

      {}
      {scrapeStatus && (
        <div className={`ba-scrape-status ${scrapeStatus.lastScrapeResult || ''}`}>
          <div className="ba-scrape-info">
            <span className="ba-scrape-label">Last Scrape:</span>
            <span className="ba-scrape-time">{formatDate(scrapeStatus.lastScrapeAt)}</span>
            {scrapeStatus.lastScrapeResult && (
              <span className={`ba-scrape-result ${scrapeStatus.lastScrapeResult}`}>
                {scrapeStatus.lastScrapeResult === 'success' ? '✓ Success' : '✗ Failed'}
              </span>
            )}
            {scrapeStatus.totalLogs > 0 && (
              <span className="ba-total-logs">{scrapeStatus.totalLogs} logs stored</span>
            )}
          </div>
          {scrapeStatus.isRunning && (
            <div className="ba-scrape-progress">
              <div className="ba-progress-bar">
                <div className="ba-progress-fill" style={{ width: `${scrapeStatus.progress}%` }}></div>
              </div>
              <span className="ba-progress-text">{scrapeStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="ba-filters">
        <form onSubmit={handleSearch} className="ba-search-form">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ba-search-input"
          />
          <button type="submit" className="ba-search-btn">Search</button>
        </form>

        <select
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">All Users</option>
          {stats?.users.map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">All Actions</option>
          {stats?.actions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">All Modules</option>
          {stats?.modules.map(module => (
            <option key={module} value={module}>{module}</option>
          ))}
        </select>

        <select
          value={pipelineFilter}
          onChange={(e) => {
            setPipelineFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">All Pipelines</option>
          {stats?.pipelines?.map(pipeline => (
            <option key={pipeline} value={pipeline}>{pipeline}</option>
          ))}
        </select>

        <span className="ba-results-count">
          {pagination.total} logs found
        </span>
      </div>

      {}
      {loading ? (
        <div className="ba-loading">
          <div className="ba-loading-spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="ba-empty">
          <div className="ba-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3>No Audit Logs Found</h3>
          <p>Click "Fetch Audit Logs" to scrape audit history from your Bigin account.</p>
        </div>
      ) : (
        <div className="ba-table-container">
          <table className="ba-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Record</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id}>
                  <td className="ba-timestamp">{formatDate(log.timestamp)}</td>
                  <td className="ba-user">
                    <strong>{log.user}</strong>
                    {log.userEmail && <span className="ba-email">{log.userEmail}</span>}
                  </td>
                  <td>
                    <span className={`ba-action-badge ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.module || '-'}</td>
                  <td className="ba-record">{log.recordName || '-'}</td>
                  <td className="ba-details">{log.details || '-'}</td>
                  <td className="ba-ip">{log.ipAddress || '-'}</td>
                  <td className="ba-actions">
                    <button
                      className="ba-view-btn"
                      onClick={() => setSelectedLog(log)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {}
      {pagination.total > pagination.limit && (
        <div className="ba-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="ba-page-btn"
          >
            Previous
          </button>
          <span className="ba-page-info">
            {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="ba-page-btn"
          >
            Next
          </button>
        </div>
      )}

      {}
      {selectedLog && (
        <div className="ba-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="ba-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header">
              <h3>Audit Log Details</h3>
              <button className="ba-close-btn" onClick={() => setSelectedLog(null)}>x</button>
            </div>
            <div className="ba-modal-body">
              <div className="ba-detail-grid">
                <div className="ba-detail-item">
                  <label>Timestamp</label>
                  <span>{formatDate(selectedLog.timestamp)}</span>
                </div>
                <div className="ba-detail-item">
                  <label>User</label>
                  <span>{selectedLog.user}</span>
                </div>
                {selectedLog.userEmail && (
                  <div className="ba-detail-item">
                    <label>User Email</label>
                    <span>{selectedLog.userEmail}</span>
                  </div>
                )}
                <div className="ba-detail-item">
                  <label>Action</label>
                  <span className={`ba-action-badge ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="ba-detail-item">
                  <label>Module</label>
                  <span>{selectedLog.module || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>Record Name</label>
                  <span>{selectedLog.recordName || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>Record ID</label>
                  <span className="ba-mono">{selectedLog.recordId || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>IP Address</label>
                  <span>{selectedLog.ipAddress || '-'}</span>
                </div>
                <div className="ba-detail-item full-width">
                  <label>Details</label>
                  <span>{selectedLog.details || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>Bigin ID</label>
                  <span className="ba-mono">{selectedLog.biginId || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>Scraped At</label>
                  <span>{formatDate(selectedLog.scrapedAt)}</span>
                </div>
              </div>
              {selectedLog.rawData && Object.keys(selectedLog.rawData).length > 0 && (
                <div className="ba-raw-data">
                  <label>Raw Data</label>
                  <pre>{JSON.stringify(selectedLog.rawData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showUploadModal && (
        <div className="ba-modal-overlay" onClick={closeUploadModal}>
          <div className="ba-modal ba-upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header">
              <h3>Upload Audit Logs CSV</h3>
              <button className="ba-close-btn" onClick={closeUploadModal}>x</button>
            </div>
            <div className="ba-modal-body">
              <div className="ba-upload-area">
                <div className="ba-upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h4>Upload CSV File</h4>
                <p className="ba-upload-hint">
                  Upload a CSV file exported from Bigin with the following columns:
                </p>
                <div className="ba-csv-columns">
                  <span>Done By</span>
                  <span>Action</span>
                  <span>Module</span>
                  <span>Record Name</span>
                  <span>Related Module</span>
                  <span>Related Name</span>
                  <span>Account Name</span>
                  <span>Audited Time</span>
                  <span>Pipeline</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="ba-file-input"
                  id="csv-upload"
                  disabled={uploading}
                />
                <label htmlFor="csv-upload" className={`ba-file-label ${uploading ? 'disabled' : ''}`}>
                  {uploading ? (
                    <>
                      <span className="scrape-spinner"></span>
                      Uploading...
                    </>
                  ) : (
                    <>Choose CSV File</>
                  )}
                </label>
              </div>

              {uploadResult && (
                <div className={`ba-upload-result ${uploadResult.success ? 'success' : 'error'}`}>
                  <div className="ba-result-icon">
                    {uploadResult.success ? '✓' : '✗'}
                  </div>
                  <div className="ba-result-content">
                    <strong>{uploadResult.success ? 'Upload Successful' : 'Upload Failed'}</strong>
                    <p>{uploadResult.message}</p>
                    {uploadResult.success && (
                      <div className="ba-result-stats">
                        <span className="ba-stat-saved">{uploadResult.saved} saved</span>
                        <span className="ba-stat-skipped">{uploadResult.skipped} skipped</span>
                        {uploadResult.errors ? (
                          <span className="ba-stat-errors">{uploadResult.errors} errors</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showDeleteAllModal && (
        <div className="ba-modal-overlay" onClick={closeDeleteModal}>
          <div className="ba-modal ba-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header ba-modal-header-danger">
              <h3>Delete All Audit Logs</h3>
              <button className="ba-close-btn" onClick={closeDeleteModal}>x</button>
            </div>
            <div className="ba-modal-body">
              {!deleteResult ? (
                <div className="ba-delete-warning">
                  <div className="ba-warning-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <h4>Are you sure?</h4>
                  <p>This action will permanently delete <strong>ALL {stats?.total || 0} audit logs</strong> from the database. This action cannot be undone.</p>
                  <div className="ba-delete-actions">
                    <button className="ba-cancel-btn" onClick={closeDeleteModal} disabled={deleting}>
                      Cancel
                    </button>
                    <button className="ba-confirm-delete-btn" onClick={handleDeleteAll} disabled={deleting}>
                      {deleting ? (
                        <>
                          <span className="scrape-spinner"></span>
                          Deleting...
                        </>
                      ) : (
                        'Yes, Delete All'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`ba-delete-result ${deleteResult.success ? 'success' : 'error'}`}>
                  <div className="ba-result-icon">
                    {deleteResult.success ? '✓' : '✗'}
                  </div>
                  <div className="ba-result-content">
                    <strong>{deleteResult.success ? 'Deletion Successful' : 'Deletion Failed'}</strong>
                    <p>{deleteResult.message}</p>
                  </div>
                  <button className="ba-close-result-btn" onClick={closeDeleteModal}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showDeleteUnnecessaryModal && (
        <div className="ba-modal-overlay" onClick={closeDeleteModal}>
          <div className="ba-modal ba-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header ba-modal-header-warning">
              <h3>Delete Unnecessary Data</h3>
              <button className="ba-close-btn" onClick={closeDeleteModal}>x</button>
            </div>
            <div className="ba-modal-body">
              {!deleteResult ? (
                <div className="ba-delete-warning">
                  <div className="ba-warning-icon ba-warning-icon-orange">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </div>
                  <h4>Delete Unnecessary Records?</h4>
                  <p>This will delete all audit logs <strong>except</strong> records created by <strong>Lisa Rothwell</strong>.</p>
                  <p className="ba-keep-note">Lisa Rothwell's records will be preserved.</p>
                  <div className="ba-delete-actions">
                    <button className="ba-cancel-btn" onClick={closeDeleteModal} disabled={deleting}>
                      Cancel
                    </button>
                    <button className="ba-confirm-delete-unnecessary-btn" onClick={handleDeleteUnnecessary} disabled={deleting}>
                      {deleting ? (
                        <>
                          <span className="scrape-spinner"></span>
                          Deleting...
                        </>
                      ) : (
                        'Yes, Delete Unnecessary'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`ba-delete-result ${deleteResult.success ? 'success' : 'error'}`}>
                  <div className="ba-result-icon">
                    {deleteResult.success ? '✓' : '✗'}
                  </div>
                  <div className="ba-result-content">
                    <strong>{deleteResult.success ? 'Deletion Successful' : 'Deletion Failed'}</strong>
                    <p>{deleteResult.message}</p>
                  </div>
                  <button className="ba-close-result-btn" onClick={closeDeleteModal}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiginAuditTab;
