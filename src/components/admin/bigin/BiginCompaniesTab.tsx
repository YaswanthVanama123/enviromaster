

import React, { useState, useEffect, useCallback } from 'react';
import { biginCompanyApi, type BiginCompany, type FetchStatus, type CompanyStats } from '../../../backendservice/api/biginCompanyApi';
import './BiginCompaniesTab.css';

export const BiginCompaniesTab: React.FC = () => {
  const [companies, setCompanies] = useState<BiginCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [selectedCompany, setSelectedCompany] = useState<BiginCompany | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const result = await biginCompanyApi.getAll({
      search: searchTerm || undefined,
      city: cityFilter || undefined,
      state: stateFilter || undefined,
      owner: ownerFilter || undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setCompanies(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, cityFilter, stateFilter, ownerFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await biginCompanyApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadFetchStatus = useCallback(async () => {
    const result = await biginCompanyApi.getFetchStatus();
    if (result) {
      setFetchStatus(result);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    loadStats();
    loadFetchStatus();
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (fetchStatus?.isRunning) {
      const interval = setInterval(() => {
        loadFetchStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (fetchStatus?.lastFetchResult === 'success') {
      
      loadCompanies();
      loadStats();
    }
  }, [fetchStatus?.isRunning, fetchStatus?.lastFetchResult, loadFetchStatus, loadCompanies, loadStats]);

  const handleFetch = async () => {
    const result = await biginCompanyApi.startFetch();
    if (result) {
      loadFetchStatus();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadCompanies();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="bigin-companies-tab">
      {}
      <div className="bc-header">
        <div className="bc-header-content">
          <h2>Bigin Companies</h2>
          <p className="bc-subtitle">View and sync companies from Zoho Bigin CRM</p>
        </div>
        <div className="bc-header-actions">
          <button
            className={`bc-fetch-btn ${fetchStatus?.isRunning ? 'fetching' : ''}`}
            onClick={handleFetch}
            disabled={fetchStatus?.isRunning}
          >
            {fetchStatus?.isRunning ? (
              <>
                <span className="fetch-spinner"></span>
                Fetching... {fetchStatus.progress}%
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Fetch Companies
              </>
            )}
          </button>
        </div>
      </div>

      {}
      <div className="bc-stats-grid">
        <div className="bc-stat-card">
          <div className="bc-stat-value">{stats?.total || 0}</div>
          <div className="bc-stat-label">Total Companies</div>
        </div>
        <div className="bc-stat-card">
          <div className="bc-stat-value bc-stat-cities">{stats?.uniqueCities || 0}</div>
          <div className="bc-stat-label">Cities</div>
        </div>
        <div className="bc-stat-card">
          <div className="bc-stat-value bc-stat-states">{stats?.uniqueStates || 0}</div>
          <div className="bc-stat-label">States</div>
        </div>
        <div className="bc-stat-card">
          <div className="bc-stat-value">{stats?.uniqueOwners || 0}</div>
          <div className="bc-stat-label">Owners</div>
        </div>
      </div>

      {}
      {fetchStatus && (
        <div className={`bc-fetch-status ${fetchStatus.lastFetchResult || ''}`}>
          <div className="bc-fetch-info">
            <span className="bc-fetch-label">Last Sync:</span>
            <span className="bc-fetch-time">{formatDate(fetchStatus.lastFetchAt)}</span>
            {fetchStatus.lastFetchResult && (
              <span className={`bc-fetch-result ${fetchStatus.lastFetchResult}`}>
                {fetchStatus.lastFetchResult === 'success' ? '✓ Success' : '✗ Failed'}
              </span>
            )}
            {fetchStatus.totalCompanies > 0 && (
              <span className="bc-total-companies">{fetchStatus.totalCompanies} companies stored</span>
            )}
          </div>
          {fetchStatus.isRunning && (
            <div className="bc-fetch-progress">
              <div className="bc-progress-bar">
                <div className="bc-progress-fill" style={{ width: `${fetchStatus.progress}%` }}></div>
              </div>
              <span className="bc-progress-text">{fetchStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="bc-filters">
        <form onSubmit={handleSearch} className="bc-search-form">
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bc-search-input"
          />
          <button type="submit" className="bc-search-btn">Search</button>
        </form>

        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="bc-filter-select"
        >
          <option value="">All Cities</option>
          {stats?.cities?.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="bc-filter-select"
        >
          <option value="">All States</option>
          {stats?.states?.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => {
            setOwnerFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="bc-filter-select"
        >
          <option value="">All Owners</option>
          {stats?.owners?.map(owner => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        <span className="bc-results-count">
          {pagination.total} companies found
        </span>
      </div>

      {}
      {loading ? (
        <div className="bc-loading">
          <div className="bc-loading-spinner"></div>
          <p>Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="bc-empty">
          <div className="bc-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z" />
              <path d="M8 14v3M12 14v3M16 14v3" />
            </svg>
          </div>
          <h3>No Companies Found</h3>
          <p>Click "Fetch Companies" to sync companies from your Bigin account.</p>
        </div>
      ) : (
        <div className="bc-table-container">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>City</th>
                <th>State</th>
                <th>Owner</th>
                <th>Last Synced</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company._id}>
                  <td className="bc-company-name">
                    <strong>{company.companyName}</strong>
                    {company.industry && <span className="bc-industry">{company.industry}</span>}
                  </td>
                  <td className="bc-phone">{company.phone || '-'}</td>
                  <td className="bc-address">{company.street || '-'}</td>
                  <td>{company.city || '-'}</td>
                  <td>{company.state || '-'}</td>
                  <td className="bc-owner">{company.owner || '-'}</td>
                  <td className="bc-synced">{formatDate(company.lastSyncedAt)}</td>
                  <td className="bc-actions">
                    <button
                      className="bc-view-btn"
                      onClick={() => setSelectedCompany(company)}
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
        <div className="bc-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="bc-page-btn"
          >
            Previous
          </button>
          <span className="bc-page-info">
            {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="bc-page-btn"
          >
            Next
          </button>
        </div>
      )}

      {}
      {selectedCompany && (
        <div className="bc-modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="bc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bc-modal-header">
              <h3>{selectedCompany.companyName}</h3>
              <button className="bc-close-btn" onClick={() => setSelectedCompany(null)}>x</button>
            </div>
            <div className="bc-modal-body">
              <div className="bc-detail-grid">
                <div className="bc-detail-item">
                  <label>Bigin ID</label>
                  <span className="bc-mono">{selectedCompany.biginId || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Company Name</label>
                  <span>{selectedCompany.companyName}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Phone</label>
                  <span>{selectedCompany.phone || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Email</label>
                  <span>{selectedCompany.email || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Website</label>
                  <span>{selectedCompany.website ? (
                    <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">
                      {selectedCompany.website}
                    </a>
                  ) : '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Industry</label>
                  <span>{selectedCompany.industry || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Account Type</label>
                  <span>{selectedCompany.accountType || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Owner</label>
                  <span>{selectedCompany.owner || '-'}</span>
                </div>
                <div className="bc-detail-item full-width">
                  <label>Address</label>
                  <span>
                    {[
                      selectedCompany.street,
                      selectedCompany.city,
                      selectedCompany.state,
                      selectedCompany.zipCode,
                      selectedCompany.country
                    ].filter(Boolean).join(', ') || '-'}
                  </span>
                </div>
                <div className="bc-detail-item">
                  <label>Pipeline</label>
                  <span>{selectedCompany.pipeline || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Stage</label>
                  <span>{selectedCompany.stage || '-'}</span>
                </div>
                <div className="bc-detail-item full-width">
                  <label>Description</label>
                  <span>{selectedCompany.description || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Last Synced</label>
                  <span>{formatDate(selectedCompany.lastSyncedAt)}</span>
                </div>
                <div className="bc-detail-item">
                  <label>Created At</label>
                  <span>{formatDate(selectedCompany.createdAt)}</span>
                </div>
              </div>
              {selectedCompany.rawData && Object.keys(selectedCompany.rawData).length > 0 && (
                <div className="bc-raw-data">
                  <label>Raw Data</label>
                  <pre>{JSON.stringify(selectedCompany.rawData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiginCompaniesTab;
