

import React, { useState, useEffect, useRef } from 'react';
import { mapDistanceApi, MapDistanceSyncJob, MapDistanceStats, MapDistanceRecord, RouteStarCustomerOption } from '../../../backendservice/api/mapDistanceApi';
import { MdRefresh, MdCancel, MdStorage, MdHistory, MdPerson, MdCalendarToday, MdLocationOn, MdStraighten, MdCheckCircle, MdError, MdSchedule, MdSync, MdPlayArrow, MdPause, MdFilterList, MdClose, MdExpandMore, MdDeleteForever } from 'react-icons/md';
import './MapDistanceUpdateTab.css';

export const MapDistanceUpdateTab: React.FC = () => {
  
  const [syncStatus, setSyncStatus] = useState<{ isRunning: boolean; isInterrupted: boolean; isPaused: boolean; job: MapDistanceSyncJob | null }>({
    isRunning: false,
    isInterrupted: false,
    isPaused: false,
    job: null
  });
  const [stats, setStats] = useState<MapDistanceStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<MapDistanceSyncJob[]>([]);
  const [storedRecords, setStoredRecords] = useState<MapDistanceRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'records' | 'history'>('records');

  const [customersWithData, setCustomersWithData] = useState<RouteStarCustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    checkSyncStatus();
    loadStoredRecords(1);
    loadCustomersWithData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (syncStatus.isRunning) {
      pollIntervalRef.current = setInterval(() => {
        checkSyncStatus();
      }, 2000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      
      loadStats();
      loadStoredRecords(currentPage);
      loadCustomersWithData();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [syncStatus.isRunning]);

  const loadStats = async () => {
    const data = await mapDistanceApi.getStats();
    setStats(data);
  };

  const checkSyncStatus = async () => {
    const status = await mapDistanceApi.getSyncStatus();
    setSyncStatus({
      isRunning: status.isRunning,
      isInterrupted: status.isInterrupted,
      isPaused: status.isPaused,
      job: status.job
    });
  };

  const loadSyncHistory = async () => {
    const history = await mapDistanceApi.getSyncHistory();
    setSyncHistory(history);
  };

  const loadCustomersWithData = async () => {
    const customers = await mapDistanceApi.getCustomersWithData();
    setCustomersWithData(customers);
  };

  const loadStoredRecords = async (page: number, customerId?: string | null) => {
    const filterCustomerId = customerId !== undefined ? customerId : selectedCustomerId;
    const result = await mapDistanceApi.getStoredRecords({
      page,
      limit: 50,
      customerId: filterCustomerId || undefined
    });
    setStoredRecords(result.records);
    setTotalRecords(result.total);
    setCurrentPage(page);
  };

  const handleCustomerFilterSelect = (customerId: string | null) => {
    setSelectedCustomerId(customerId);
    setFilterDropdownOpen(false);
    setFilterSearch('');
    loadStoredRecords(1, customerId);
  };

  const getSelectedCustomerName = () => {
    if (!selectedCustomerId) return 'All Customers';
    const customer = customersWithData.find(c => c._id === selectedCustomerId);
    return customer?.name || 'Unknown';
  };

  const filteredCustomers = customersWithData.filter(c =>
    c.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(filterSearch.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(filterSearch.toLowerCase()))
  );

  const handleDeleteAllRecords = async () => {
    setIsDeleting(true);
    setError(null);
    const result = await mapDistanceApi.deleteAllRecords();
    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (result.success) {
      
      loadStats();
      loadStoredRecords(1);
      loadCustomersWithData();
      checkSyncStatus();
      setSelectedCustomerId(null);
    } else {
      setError(result.error || 'Failed to delete records');
    }
  };

  const handleStartUpdateSync = async () => {
    setError(null);
    const result = await mapDistanceApi.startUpdateSync();
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || 'Failed to start update sync');
    }
  };

  const handleCancelSync = async () => {
    const result = await mapDistanceApi.cancelSync();
    if (result.success) {
      checkSyncStatus();
      loadSyncHistory();
    }
  };

  const handlePauseSync = async () => {
    const result = await mapDistanceApi.pauseSync();
    if (result.success) {
      checkSyncStatus();
      loadSyncHistory();
    } else {
      setError(result.error || 'Failed to pause sync');
    }
  };

  const handleResetStuckJob = async () => {
    const result = await mapDistanceApi.resetStuckJobs();
    if (result.success) {
      checkSyncStatus();
      loadSyncHistory();
    }
  };

  const handleResumeSync = async (jobId: string) => {
    setError(null);
    const result = await mapDistanceApi.resumeSync(jobId);
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || 'Failed to resume sync');
    }
  };

  const getSyncProgress = () => {
    if (!syncStatus.job) return 0;
    const { processedCustomers, totalCustomers } = syncStatus.job;
    if (totalCustomers === 0) return 0;
    return Math.round((processedCustomers / totalCustomers) * 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case 'single_fetch': return 'Single Fetch';
      case 'full_sync': return 'Full Sync';
      case 'update_sync': return 'Update Sync';
      default: return jobType;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <MdCheckCircle size={16} color="#059669" />;
      case 'failed': return <MdError size={16} color="#dc2626" />;
      case 'running': return <MdSync size={16} color="#2563eb" className="mdu-spin" />;
      case 'cancelled': return <MdCancel size={16} color="#f59e0b" />;
      default: return <MdSchedule size={16} color="#64748b" />;
    }
  };

  const totalPages = Math.ceil(totalRecords / 50);
  const isJobRunning = syncStatus.isRunning;
  const isJobInterrupted = syncStatus.isInterrupted;
  const isJobPaused = syncStatus.isPaused;
  const isUpdateSyncRunning = isJobRunning && syncStatus.job?.jobType === 'update_sync';
  const isUpdateSyncInterrupted = isJobInterrupted && syncStatus.job?.jobType === 'update_sync';
  const isUpdateSyncPaused = isJobPaused && syncStatus.job?.jobType === 'update_sync';

  return (
    <div className="md-update-tab">
      {}
      <div className="mdu-header">
        <div className="mdu-header-top">
          <div>
            <h2>Update Distance Data</h2>
            <p className="mdu-subtitle">
              Refresh and update existing map distance records from RouteStar
            </p>
          </div>
          <div className="mdu-header-actions">
            {isUpdateSyncRunning ? (
              <>
                <button className="mdu-pause-btn" onClick={handlePauseSync}>
                  <MdPause size={18} />
                  Pause
                </button>
                <button className="mdu-cancel-btn" onClick={handleCancelSync}>
                  <MdCancel size={18} />
                  Cancel
                </button>
              </>
            ) : (isUpdateSyncInterrupted || isUpdateSyncPaused) ? (
              <button className="mdu-resume-btn" onClick={() => syncStatus.job && handleResumeSync(syncStatus.job._id)}>
                <MdPlayArrow size={18} />
                Resume Update ({syncStatus.job?.processedCustomers}/{syncStatus.job?.totalCustomers})
              </button>
            ) : (
              <>
                <button
                  className="mdu-update-btn"
                  onClick={handleStartUpdateSync}
                  disabled={!stats || stats.customersWithData === 0 || isJobRunning || isJobInterrupted || isJobPaused}
                >
                  <MdRefresh size={18} />
                  {stats && stats.customersWithData > 0
                    ? `Update All Data (${stats.customersWithData} customers)`
                    : 'No Data to Update'
                  }
                </button>
                <button
                  className="mdu-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!stats || stats.totalRecords === 0 || isJobRunning}
                  title="Delete all records and start fresh"
                >
                  <MdDeleteForever size={18} />
                  Delete All
                </button>
              </>
            )}
          </div>
        </div>

        {}
        {showDeleteConfirm && (
          <div className="mdu-modal-overlay">
            <div className="mdu-modal">
              <div className="mdu-modal-header">
                <MdDeleteForever size={24} color="#dc2626" />
                <h3>Delete All Records?</h3>
              </div>
              <p className="mdu-modal-text">
                This will permanently delete all {stats?.totalRecords.toLocaleString()} distance records
                and sync history. You'll need to run a new sync to get fresh data.
              </p>
              <div className="mdu-modal-actions">
                <button
                  className="mdu-modal-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="mdu-modal-delete"
                  onClick={handleDeleteAllRecords}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="mdu-stats-bar">
            <div className="mdu-stat">
              <span className="mdu-stat-value">{stats.totalRecords.toLocaleString()}</span>
              <span className="mdu-stat-label">Total Records</span>
            </div>
            <div className="mdu-stat">
              <span className="mdu-stat-value">{stats.customersWithData.toLocaleString()}</span>
              <span className="mdu-stat-label">Customers with Data</span>
            </div>
            <div className="mdu-stat">
              <span className="mdu-stat-value">{stats.lastSyncAt ? formatDate(stats.lastSyncAt) : 'Never'}</span>
              <span className="mdu-stat-label">Last Sync</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mdu-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Sync Progress */}
        {isUpdateSyncRunning && syncStatus.job && (
          <div className="mdu-sync-progress">
            <div className="mdu-sync-progress-header">
              <span className="mdu-sync-progress-title">
                <MdRefresh className="mdu-spin" size={16} />
                Updating: {syncStatus.job.currentCustomerName || 'Starting...'}
              </span>
              <span className="mdu-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="mdu-progress-bar">
              <div
                className="mdu-progress-fill"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="mdu-sync-stats">
              <span className="mdu-sync-stat success">
                {syncStatus.job.successfulCustomers} successful
              </span>
              <span className="mdu-sync-stat failed">
                {syncStatus.job.failedCustomers} failed
              </span>
              <span className="mdu-sync-stat records">
                {syncStatus.job.recordsCreated} records updated
              </span>
            </div>
          </div>
        )}

        {/* Interrupted Sync - Show Resume Option */}
        {isUpdateSyncInterrupted && syncStatus.job && (
          <div className="mdu-sync-interrupted">
            <div className="mdu-sync-progress-header">
              <span className="mdu-sync-progress-title">
                <MdError size={16} color="#f59e0b" />
                Update Interrupted: {syncStatus.job.currentCustomerName || 'Unknown'}
              </span>
              <span className="mdu-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="mdu-progress-bar">
              <div
                className="mdu-progress-fill interrupted"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="mdu-sync-stats">
              <span className="mdu-sync-stat success">
                {syncStatus.job.successfulCustomers} successful
              </span>
              <span className="mdu-sync-stat failed">
                {syncStatus.job.failedCustomers} failed
              </span>
              <span className="mdu-sync-stat records">
                {syncStatus.job.recordsCreated} records updated
              </span>
            </div>
            <div className="mdu-sync-actions">
              <button className="mdu-resume-btn" onClick={() => handleResumeSync(syncStatus.job!._id)}>
                <MdPlayArrow size={16} />
                Resume Update
              </button>
              <button className="mdu-reset-btn" onClick={handleResetStuckJob}>
                <MdCancel size={16} />
                Cancel & Reset
              </button>
            </div>
          </div>
        )}

        {/* Paused Sync - Show Resume Option */}
        {isUpdateSyncPaused && syncStatus.job && (
          <div className="mdu-sync-paused">
            <div className="mdu-sync-progress-header">
              <span className="mdu-sync-progress-title">
                <MdPause size={16} color="#6366f1" />
                Update Paused: {syncStatus.job.currentCustomerName || 'Unknown'}
              </span>
              <span className="mdu-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="mdu-progress-bar">
              <div
                className="mdu-progress-fill paused"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="mdu-sync-stats">
              <span className="mdu-sync-stat success">
                {syncStatus.job.successfulCustomers} successful
              </span>
              <span className="mdu-sync-stat failed">
                {syncStatus.job.failedCustomers} failed
              </span>
              <span className="mdu-sync-stat records">
                {syncStatus.job.recordsCreated} records updated
              </span>
            </div>
            <div className="mdu-sync-actions">
              <button className="mdu-resume-btn" onClick={() => handleResumeSync(syncStatus.job!._id)}>
                <MdPlayArrow size={16} />
                Resume Update
              </button>
              <button className="mdu-reset-btn" onClick={handleResetStuckJob}>
                <MdCancel size={16} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="mdu-view-tabs">
        <button
          className={`mdu-view-tab ${viewMode === 'records' ? 'active' : ''}`}
          onClick={() => setViewMode('records')}
        >
          <MdStorage size={16} />
          Stored Records
        </button>
        <button
          className={`mdu-view-tab ${viewMode === 'history' ? 'active' : ''}`}
          onClick={() => { setViewMode('history'); loadSyncHistory(); }}
        >
          <MdHistory size={16} />
          Update History
        </button>
      </div>

      {/* Stored Records View */}
      {viewMode === 'records' && (
        <div className="mdu-records-section">
          {/* Customer Filter */}
          {customersWithData.length > 0 && (
            <div className="mdu-filter-section">
              <div className="mdu-filter-label">
                <MdFilterList size={16} />
                Select Source Customer:
              </div>
              <div className="mdu-filter-dropdown" ref={filterDropdownRef}>
                <button
                  className="mdu-filter-trigger"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  <span className="mdu-filter-value">
                    {getSelectedCustomerName()}
                  </span>
                  <MdExpandMore size={20} className={filterDropdownOpen ? 'mdu-rotate' : ''} />
                </button>

                {filterDropdownOpen && (
                  <div className="mdu-filter-menu">
                    <input
                      type="text"
                      className="mdu-filter-search"
                      placeholder="Search customers..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="mdu-filter-options">
                      <div
                        className={`mdu-filter-option ${selectedCustomerId === null ? 'selected' : ''}`}
                        onClick={() => handleCustomerFilterSelect(null)}
                      >
                        <span className="mdu-option-name">All Customers</span>
                        <span className="mdu-option-details">{customersWithData.length} customers with data</span>
                      </div>
                      {filteredCustomers.map(customer => (
                        <div
                          key={customer._id}
                          className={`mdu-filter-option ${selectedCustomerId === customer._id ? 'selected' : ''}`}
                          onClick={() => handleCustomerFilterSelect(customer._id)}
                        >
                          <span className="mdu-option-name">{customer.name}</span>
                          <span className="mdu-option-details">
                            {customer.city && <span>{customer.city}</span>}
                            {customer.company && <span>{customer.company}</span>}
                          </span>
                        </div>
                      ))}
                      {filteredCustomers.length === 0 && filterSearch && (
                        <div className="mdu-filter-empty">No customers found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedCustomerId && (
                <button
                  className="mdu-filter-clear"
                  onClick={() => handleCustomerFilterSelect(null)}
                  title="Clear filter"
                >
                  <MdClose size={16} />
                  Clear
                </button>
              )}
            </div>
          )}

          {storedRecords.length === 0 ? (
            <div className="mdu-empty">
              <div className="mdu-empty-icon">
                <MdStorage size={48} />
              </div>
              <h3>{selectedCustomerId ? 'No Distance Data' : 'No Stored Records'}</h3>
              <p>
                {selectedCustomerId
                  ? `No distance data found for ${getSelectedCustomerName()}. This customer may need to be re-synced.`
                  : 'No distance records found. Run a full sync from the Map Distance tab first, then select a source customer to view distances.'
                }
              </p>
              {selectedCustomerId && (
                <button
                  className="mdu-filter-clear"
                  style={{ marginTop: '16px' }}
                  onClick={() => handleCustomerFilterSelect(null)}
                >
                  <MdClose size={16} />
                  Clear Selection
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mdu-records-header">
                <span>
                  {selectedCustomerId
                    ? `Showing ${storedRecords.length} of ${totalRecords} destinations from ${getSelectedCustomerName()} (50 per page)`
                    : `Showing ${storedRecords.length} of ${totalRecords} records (select a source customer to filter)`
                  }
                </span>
                {totalPages > 1 && (
                  <div className="mdu-pagination">
                    <button
                      onClick={() => loadStoredRecords(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                      onClick={() => loadStoredRecords(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
              <div className="mdu-table-container">
                <table className="mdu-table">
                  <thead>
                    <tr>
                      <th><MdLocationOn size={14} /> Destination Customer</th>
                      <th><MdPerson size={14} /> Assigned To</th>
                      <th>Frequency</th>
                      <th><MdCalendarToday size={14} /> Date</th>
                      <th>Day</th>
                      <th>Stop</th>
                      <th><MdStraighten size={14} /> Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storedRecords.map((record) => (
                      <tr key={record._id}>
                        <td className="mdu-customer-cell">
                          <div className="mdu-customer-name">{record.destinationCustomerName || '-'}</div>
                        </td>
                        <td>{record.assignedTo || '-'}</td>
                        <td>{record.frequency || '-'}</td>
                        <td>{record.serviceDate ? new Date(record.serviceDate).toLocaleDateString() : '-'}</td>
                        <td>{record.dayOfWeek || '-'}</td>
                        <td>{record.stopNumber || '-'}</td>
                        <td className="mdu-distance">
                          {record.distanceMiles ? `${record.distanceMiles.toFixed(2)} mi` : record.distanceRaw || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Update History View */}
      {viewMode === 'history' && (
        <div className="mdu-history-section">
          {syncHistory.length === 0 ? (
            <div className="mdu-empty">
              <div className="mdu-empty-icon">
                <MdHistory size={48} />
              </div>
              <h3>No Update History</h3>
              <p>No sync jobs have been run yet.</p>
            </div>
          ) : (
            <div className="mdu-table-container">
              <table className="mdu-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Customers</th>
                    <th>Records</th>
                    <th>Errors</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <span className={`mdu-job-type ${job.jobType}`}>
                          {getJobTypeLabel(job.jobType)}
                        </span>
                      </td>
                      <td>
                        <span className={`mdu-status-badge ${job.status}`}>
                          {getStatusIcon(job.status)}
                          <span style={{ marginLeft: 4 }}>{job.status}</span>
                        </span>
                      </td>
                      <td>{formatDate(job.startedAt)}</td>
                      <td>{formatDate(job.completedAt)}</td>
                      <td>{job.successfulCustomers}/{job.totalCustomers}</td>
                      <td>{job.recordsCreated}</td>
                      <td>{job.failedCustomers}</td>
                      <td>
                        {job.status === 'paused' && (
                          <button
                            className="mdu-resume-btn"
                            onClick={() => handleResumeSync(job._id)}
                            title="Resume sync"
                            disabled={isJobRunning}
                          >
                            <MdPlayArrow size={16} />
                            Resume
                          </button>
                        )}
                        {job.status === 'running' && !syncStatus.isRunning && (
                          <button
                            className="mdu-resume-btn"
                            onClick={() => handleResumeSync(job._id)}
                            title="Resume interrupted sync"
                          >
                            <MdPlayArrow size={16} />
                            Resume
                          </button>
                        )}
                        {job.status === 'running' && syncStatus.isRunning && (
                          <button
                            className="mdu-reset-btn"
                            onClick={handleResetStuckJob}
                            title="Reset stuck job"
                          >
                            <MdCancel size={16} />
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapDistanceUpdateTab;
