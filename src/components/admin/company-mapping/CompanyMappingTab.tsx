

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  companyMappingApi,
  type CompanyMapping,
  type MappingStats,
  type RouteStarCustomerOption,
} from '../../../backendservice/api/companyMappingApi';
import './CompanyMappingTab.css';

type FilterTab = 'all' | 'mapped' | 'unmapped';

interface PendingChange {
  biginId: string;
  routeStarId: string | null;
  routeStarCustomerName: string | null;
}

export const CompanyMappingTab: React.FC = () => {
  const [mappings, setMappings] = useState<CompanyMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MappingStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [routeStarOptions, setRouteStarOptions] = useState<RouteStarCustomerOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    const result = await companyMappingApi.getAll({
      search: searchTerm || undefined,
      status: activeTab,
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setMappings(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, activeTab, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await companyMappingApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadRouteStarOptions = useCallback(async (search?: string) => {
    setLoadingOptions(true);
    const result = await companyMappingApi.getAvailableRouteStarCustomers(search, true);
    if (result) {
      setRouteStarOptions(result);
    }
    setLoadingOptions(false);
  }, []);

  useEffect(() => {
    loadMappings();
    loadStats();
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setDropdownSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownOpen = (biginId: string) => {
    if (openDropdown === biginId) {
      setOpenDropdown(null);
      setDropdownSearch('');
    } else {
      setOpenDropdown(biginId);
      setDropdownSearch('');
      loadRouteStarOptions();
    }
  };

  const handleDropdownSearch = (value: string) => {
    setDropdownSearch(value);
    loadRouteStarOptions(value);
  };

  const handleSelectRouteStar = (mapping: CompanyMapping, customer: RouteStarCustomerOption | null) => {
    const newPendingChanges = new Map(pendingChanges);

    if (customer) {
      newPendingChanges.set(mapping.biginId, {
        biginId: mapping.biginId,
        routeStarId: customer.routeStarId,
        routeStarCustomerName: customer.name,
      });
    } else {
      newPendingChanges.set(mapping.biginId, {
        biginId: mapping.biginId,
        routeStarId: null,
        routeStarCustomerName: null,
      });
    }

    setPendingChanges(newPendingChanges);
    setOpenDropdown(null);
    setDropdownSearch('');
  };

  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) {
      console.log('[MAPPING] No pending changes to save');
      return;
    }

    console.log('[MAPPING] Saving all pending changes:', pendingChanges.size);
    setSaving(true);

    const mappingsToSave = Array.from(pendingChanges.values()).map(change => ({
      biginId: change.biginId,
      routeStarId: change.routeStarId,
    }));

    console.log('[MAPPING] Mappings to save:', mappingsToSave);

    try {
      const result = await companyMappingApi.bulkSave(mappingsToSave);
      console.log('[MAPPING] Bulk save result:', result);

      if (result) {
        console.log('[MAPPING] Saved successfully:', result.saved, 'of', result.total);
        if (result.errors > 0) {
          console.error('[MAPPING] Errors:', result.errorDetails);
        }
        setPendingChanges(new Map());
        loadMappings();
        loadStats();
      } else {
        console.error('[MAPPING] Bulk save returned null');
      }
    } catch (error) {
      console.error('[MAPPING] Error in bulk save:', error);
    }

    setSaving(false);
  };

  const handleSaveRow = async (biginId: string) => {
    const pending = pendingChanges.get(biginId);
    if (!pending) {
      console.log('[MAPPING] No pending change for biginId:', biginId);
      return;
    }

    console.log('[MAPPING] Saving single row:', pending);
    setSavingRow(biginId);

    try {
      const result = await companyMappingApi.saveMapping(pending.biginId, pending.routeStarId);
      console.log('[MAPPING] Single save result:', result);

      if (result) {
        console.log('[MAPPING] Row saved successfully');
        
        const newPendingChanges = new Map(pendingChanges);
        newPendingChanges.delete(biginId);
        setPendingChanges(newPendingChanges);

        setMappings(prev => prev.map(m =>
          m.biginId === biginId
            ? {
                ...m,
                routeStarId: pending.routeStarId,
                routeStarCustomerName: pending.routeStarCustomerName,
                mappingStatus: pending.routeStarId ? 'mapped' : 'unmapped'
              }
            : m
        ));
        loadStats();
      } else {
        console.error('[MAPPING] Save returned null');
      }
    } catch (error) {
      console.error('[MAPPING] Error saving row:', error);
    }

    setSavingRow(null);
  };

  const handleInitialize = async () => {
    setInitializing(true);
    const result = await companyMappingApi.initialize();
    if (result) {
      loadMappings();
      loadStats();
    }
    setInitializing(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadMappings();
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, skip: 0 }));
  };

  const getDisplayValue = (mapping: CompanyMapping): string => {
    const pending = pendingChanges.get(mapping.biginId);
    if (pending) {
      return pending.routeStarCustomerName || 'Not mapped';
    }
    return mapping.routeStarCustomerName || 'Select customer...';
  };

  const hasPendingChange = (mapping: CompanyMapping): boolean => {
    return pendingChanges.has(mapping.biginId);
  };

  const getEffectiveStatus = (mapping: CompanyMapping): 'mapped' | 'unmapped' => {
    const pending = pendingChanges.get(mapping.biginId);
    if (pending) {
      return pending.routeStarId ? 'mapped' : 'unmapped';
    }
    return mapping.mappingStatus;
  };

  return (
    <div className="company-mapping-tab">
      {}
      <div className="cm-header">
        <div className="cm-header-content">
          <h2>Company Mapping</h2>
          <p className="cm-subtitle">Map Bigin Companies to RouteStar Customers</p>
        </div>
        <div className="cm-header-actions">
          <button
            className="cm-init-btn"
            onClick={handleInitialize}
            disabled={initializing}
          >
            {initializing ? 'Initializing...' : 'Initialize Mappings'}
          </button>
          <button
            className="cm-refresh-btn"
            onClick={() => { loadMappings(); loadStats(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
          <button
            className={`cm-save-btn ${pendingChanges.size > 0 ? 'has-changes' : ''}`}
            onClick={handleSaveAll}
            disabled={pendingChanges.size === 0 || saving}
          >
            {saving ? 'Saving...' : `Save All (${pendingChanges.size})`}
          </button>
        </div>
      </div>

      {}
      <div className="cm-toolbar">
        <div className="cm-tabs">
          <button
            className={`cm-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            All Companies
          </button>
          <button
            className={`cm-tab ${activeTab === 'mapped' ? 'active' : ''}`}
            onClick={() => handleTabChange('mapped')}
          >
            Mapped
          </button>
          <button
            className={`cm-tab ${activeTab === 'unmapped' ? 'active' : ''}`}
            onClick={() => handleTabChange('unmapped')}
          >
            Unmapped
          </button>
        </div>
        <form onSubmit={handleSearch} className="cm-search-form">
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cm-search-input"
          />
          <button type="submit" className="cm-search-btn">Search</button>
        </form>
      </div>

      {}
      <div className="cm-stats-bar">
        <span className="cm-stat">{stats?.total || 0} total</span>
        <span className="cm-stat cm-stat-mapped">{stats?.mapped || 0} mapped</span>
        <span className="cm-stat cm-stat-unmapped">{stats?.unmapped || 0} unmapped</span>
      </div>

      {}
      {loading ? (
        <div className="cm-loading">
          <div className="cm-loading-spinner"></div>
          <p>Loading mappings...</p>
        </div>
      ) : mappings.length === 0 ? (
        <div className="cm-empty">
          <div className="cm-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h3>No Mappings Found</h3>
          <p>Click "Initialize Mappings" to create mapping records from Bigin companies.</p>
        </div>
      ) : (
        <div className="cm-table-container">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Bigin Company</th>
                <th>Phone</th>
                <th>City</th>
                <th>Status</th>
                <th>RouteStar Mapping</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) => (
                <tr key={mapping._id} className={hasPendingChange(mapping) ? 'has-pending' : ''}>
                  <td className="cm-company-name">
                    <strong>{mapping.biginCompanyName}</strong>
                  </td>
                  <td className="cm-phone">{mapping.biginPhone || '-'}</td>
                  <td className="cm-city">
                    {mapping.biginCity || '-'}
                    {mapping.biginState ? `, ${mapping.biginState}` : ''}
                  </td>
                  <td className="cm-status">
                    <span className={`cm-status-badge ${getEffectiveStatus(mapping)}`}>
                      {getEffectiveStatus(mapping) === 'mapped' ? 'Mapped' : 'Unmapped'}
                    </span>
                  </td>
                  <td className="cm-mapping">
                    <div className="cm-dropdown" ref={openDropdown === mapping.biginId ? dropdownRef : null}>
                      <button
                        className={`cm-dropdown-trigger ${hasPendingChange(mapping) ? 'pending' : ''}`}
                        onClick={() => handleDropdownOpen(mapping.biginId)}
                      >
                        <span className="cm-dropdown-value">{getDisplayValue(mapping)}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {openDropdown === mapping.biginId && (
                        <div className="cm-dropdown-menu">
                          <input
                            type="text"
                            placeholder="Search customers..."
                            value={dropdownSearch}
                            onChange={(e) => handleDropdownSearch(e.target.value)}
                            className="cm-dropdown-search"
                            autoFocus
                          />
                          <div className="cm-dropdown-options">
                            {mapping.mappingStatus === 'mapped' && (
                              <div
                                className="cm-dropdown-option cm-clear-option"
                                onClick={() => handleSelectRouteStar(mapping, null)}
                              >
                                Clear mapping
                              </div>
                            )}
                            {loadingOptions ? (
                              <div className="cm-dropdown-loading">Loading...</div>
                            ) : routeStarOptions.length === 0 ? (
                              <div className="cm-dropdown-empty">No customers found</div>
                            ) : (
                              routeStarOptions.map((customer) => (
                                <div
                                  key={customer._id}
                                  className={`cm-dropdown-option ${
                                    mapping.routeStarId === customer.routeStarId ? 'selected' : ''
                                  }`}
                                  onClick={() => handleSelectRouteStar(mapping, customer)}
                                >
                                  <div className="cm-option-name">{customer.name}</div>
                                  <div className="cm-option-details">
                                    {customer.company && <span>{customer.company}</span>}
                                    {customer.city && <span>{customer.city}</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="cm-action">
                    {hasPendingChange(mapping) && (
                      <button
                        className="cm-row-save-btn"
                        onClick={() => handleSaveRow(mapping.biginId)}
                        disabled={savingRow === mapping.biginId}
                      >
                        {savingRow === mapping.biginId ? 'Saving...' : 'Save'}
                      </button>
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
        <div className="cm-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="cm-page-btn"
          >
            Previous
          </button>
          <span className="cm-page-info">
            {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="cm-page-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyMappingTab;
