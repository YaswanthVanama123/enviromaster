

import React, { useState, useEffect, useCallback } from 'react';
import { routestarCustomersApi, type RouteStarCustomer, type CustomerSyncStatus, type CustomerStats } from '../../../backendservice/api/routestarCustomersApi';
import './RouteStarCustomersTab.css';

export const RouteStarCustomersTab: React.FC = () => {
  const [customers, setCustomers] = useState<RouteStarCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<CustomerSyncStatus | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [selectedCustomer, setSelectedCustomer] = useState<RouteStarCustomer | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const result = await routestarCustomersApi.getAll({
      search: searchTerm || undefined,
      state: stateFilter || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setCustomers(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, stateFilter, activeFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await routestarCustomersApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    const result = await routestarCustomersApi.getSyncStatus();
    if (result) {
      setSyncStatus(result);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadStats();
    loadSyncStatus();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (syncStatus?.isRunning) {
      const interval = setInterval(() => {
        loadSyncStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [syncStatus?.isRunning, loadSyncStatus]);

  const handleSync = async () => {
    const result = await routestarCustomersApi.startSync();
    if (result) {
      loadSyncStatus();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadCustomers();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="routestar-customers-tab">
      {}
      <div className="rs-header">
        <div className="rs-header-content">
          <h2>RouteStar Customers</h2>
          <p className="rs-subtitle">Sync and manage customers from RouteStar</p>
        </div>
        <button
          className={`rs-sync-btn ${syncStatus?.isRunning ? 'syncing' : ''}`}
          onClick={handleSync}
          disabled={syncStatus?.isRunning}
        >
          {syncStatus?.isRunning ? (
            <>
              <span className="sync-spinner"></span>
              Syncing... {syncStatus.progress}%
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Sync from RouteStar
            </>
          )}
        </button>
      </div>

      {}
      <div className="rs-stats-grid">
        <div className="rs-stat-card">
          <div className="rs-stat-value">{stats?.total || 0}</div>
          <div className="rs-stat-label">Total Customers</div>
        </div>
        <div className="rs-stat-card">
          <div className="rs-stat-value rs-stat-active">{stats?.active || 0}</div>
          <div className="rs-stat-label">Active</div>
        </div>
        <div className="rs-stat-card">
          <div className="rs-stat-value rs-stat-inactive">{stats?.inactive || 0}</div>
          <div className="rs-stat-label">Inactive</div>
        </div>
        <div className="rs-stat-card">
          <div className="rs-stat-value">{stats?.uniqueStates || 0}</div>
          <div className="rs-stat-label">States</div>
        </div>
      </div>

      {}
      {syncStatus && (
        <div className={`rs-sync-status ${syncStatus.lastSyncResult || ''}`}>
          <div className="rs-sync-info">
            <span className="rs-sync-label">Last Sync:</span>
            <span className="rs-sync-time">{formatDate(syncStatus.lastSyncAt)}</span>
            {syncStatus.lastSyncResult && (
              <span className={`rs-sync-result ${syncStatus.lastSyncResult}`}>
                {syncStatus.lastSyncResult === 'success' ? '✓ Success' :
                 syncStatus.lastSyncResult === 'partial' ? '⚠ Partial' : '✗ Failed'}
              </span>
            )}
          </div>
          {syncStatus.isRunning && (
            <div className="rs-sync-progress">
              <div className="rs-progress-bar">
                <div className="rs-progress-fill" style={{ width: `${syncStatus.progress}%` }}></div>
              </div>
              <span className="rs-progress-text">{syncStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="rs-filters">
        <form onSubmit={handleSearch} className="rs-search-form">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rs-search-input"
          />
          <button type="submit" className="rs-search-btn">Search</button>
        </form>

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="rs-filter-select"
        >
          <option value="">All States</option>
          {stats?.states.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="rs-filter-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <span className="rs-results-count">
          {pagination.total} customers found
        </span>
      </div>

      {}
      {loading ? (
        <div className="rs-loading">
          <div className="rs-loading-spinner"></div>
          <p>Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rs-empty">
          <div className="rs-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>No Customers Found</h3>
          <p>Click "Sync from RouteStar" to fetch customers from your RouteStar account.</p>
        </div>
      ) : (
        <div className="rs-table-container">
          <table className="rs-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Company</th>
                <th>Address</th>
                <th>City</th>
                <th>State</th>
                <th>Phone</th>
                <th>Route</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id} className={!customer.isActive ? 'inactive-row' : ''}>
                  <td className="rs-customer-name">
                    <strong>{customer.name}</strong>
                  </td>
                  <td>{customer.company || '-'}</td>
                  <td className="rs-address">{customer.address || '-'}</td>
                  <td>{customer.city || '-'}</td>
                  <td>{customer.state || '-'}</td>
                  <td>
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="rs-phone-link">{customer.phone}</a>
                    ) : '-'}
                  </td>
                  <td>{customer.onRoute || '-'}</td>
                  <td>
                    <span className={`rs-status-badge ${customer.isActive ? 'active' : 'inactive'}`}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="rs-actions">
                    <button
                      className="rs-view-btn"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      View
                    </button>
                    {customer.detailUrl && (
                      <a
                        href={customer.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rs-external-link"
                        title="Open in RouteStar"
                      >
                        ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {}
      {pagination.total > pagination.limit && (
        <div className="rs-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="rs-page-btn"
          >
            Previous
          </button>
          <span className="rs-page-info">
            {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="rs-page-btn"
          >
            Next
          </button>
        </div>
      )}

      {}
      {selectedCustomer && (
        <div className="rs-modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rs-modal-header">
              <h3>{selectedCustomer.name}</h3>
              <button className="rs-close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
            </div>
            <div className="rs-modal-body">
              <div className="rs-detail-grid">
                <div className="rs-detail-item">
                  <label>Company</label>
                  <span>{selectedCustomer.company || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>RouteStar ID</label>
                  <span className="rs-mono">{selectedCustomer.routeStarId}</span>
                </div>
                <div className="rs-detail-item full-width">
                  <label>Address</label>
                  <span>{selectedCustomer.address || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>City</label>
                  <span>{selectedCustomer.city || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>State</label>
                  <span>{selectedCustomer.state || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Zip Code</label>
                  <span>{selectedCustomer.zipCode || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Phone</label>
                  <span>{selectedCustomer.phone || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Email</label>
                  <span>{selectedCustomer.email || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>On Route</label>
                  <span>{selectedCustomer.onRoute || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Grouping</label>
                  <span>{selectedCustomer.grouping || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Sales Rep</label>
                  <span>{selectedCustomer.salesRep || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Status</label>
                  <span className={`rs-status-badge ${selectedCustomer.isActive ? 'active' : 'inactive'}`}>
                    {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="rs-detail-item">
                  <label>Created in RouteStar</label>
                  <span>{formatDate(selectedCustomer.createdInRouteStar)}</span>
                </div>
                <div className="rs-detail-item">
                  <label>Last Synced</label>
                  <span>{formatDate(selectedCustomer.lastSyncedAt)}</span>
                </div>
              </div>
              {selectedCustomer.detailUrl && (
                <div className="rs-modal-actions">
                  <a
                    href={selectedCustomer.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rs-external-btn"
                  >
                    Open in RouteStar ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteStarCustomersTab;
