/**
 * Map Distance Tab Component
 * Admin panel screen for fetching map distance from RouteStar
 */

import React, { useState, useEffect, useRef } from 'react';
import { mapDistanceApi, RouteStarCustomerOption, MapDistanceResult } from '../../../backendservice/api/mapDistanceApi';
import { MdSearch, MdDirectionsCar, MdLocationOn, MdAccessTime, MdStraighten, MdPerson, MdCalendarToday } from 'react-icons/md';
import './MapDistanceTab.css';

export const MapDistanceTab: React.FC = () => {
  // State
  const [customers, setCustomers] = useState<RouteStarCustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<RouteStarCustomerOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [results, setResults] = useState<MapDistanceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedCustomer, setLastFetchedCustomer] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    const data = await mapDistanceApi.getCustomers();
    setCustomers(data);
    setLoadingCustomers(false);
  };

  const handleSelectCustomer = (customer: RouteStarCustomerOption) => {
    setSelectedCustomer(customer);
    setDropdownOpen(false);
    setDropdownSearch('');
  };

  const handleFetchDistance = async () => {
    if (!selectedCustomer) return;

    setFetching(true);
    setError(null);
    setResults([]);

    const response = await mapDistanceApi.fetchDistance(selectedCustomer.name);

    setFetching(false);

    if (response.success) {
      setResults(response.data);
      setLastFetchedCustomer(response.customerName);
      setFetchedAt(response.fetchedAt);
    } else {
      setError(response.error || 'Failed to fetch distance');
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    if (!dropdownSearch) return true;
    const search = dropdownSearch.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      (customer.company && customer.company.toLowerCase().includes(search)) ||
      (customer.city && customer.city.toLowerCase().includes(search))
    );
  });

  return (
    <div className="map-distance-tab">
      {/* Header */}
      <div className="md-header">
        <h2>Map Distance</h2>
        <p className="md-subtitle">
          Select a RouteStar customer to fetch their driving distance information
        </p>
      </div>

      {/* Search Section */}
      <div className="md-search-section">
        <div className="md-search-group">
          <label className="md-search-label">Select Customer</label>
          <div className="md-dropdown" ref={dropdownRef}>
            <button
              className="md-dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={loadingCustomers}
            >
              <span className={selectedCustomer ? 'md-dropdown-value' : 'md-dropdown-placeholder'}>
                {selectedCustomer ? (
                  <>
                    {selectedCustomer.name}
                    {selectedCustomer.city && ` - ${selectedCustomer.city}`}
                  </>
                ) : (
                  'Select a customer...'
                )}
              </span>
              <MdSearch size={18} />
            </button>

            {dropdownOpen && (
              <div className="md-dropdown-menu">
                <input
                  type="text"
                  className="md-dropdown-search"
                  placeholder="Search customers..."
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  autoFocus
                />
                <div className="md-dropdown-options">
                  {loadingCustomers ? (
                    <div className="md-dropdown-loading">Loading customers...</div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="md-dropdown-empty">No customers found</div>
                  ) : (
                    filteredCustomers.slice(0, 100).map((customer) => (
                      <div
                        key={customer._id}
                        className={`md-dropdown-option ${selectedCustomer?._id === customer._id ? 'selected' : ''}`}
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="md-option-name">{customer.name}</div>
                        <div className="md-option-details">
                          {customer.company && <span>{customer.company}</span>}
                          {customer.city && <span>{customer.city}</span>}
                          {customer.state && <span>{customer.state}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          className="md-fetch-btn"
          onClick={handleFetchDistance}
          disabled={!selectedCustomer || fetching}
        >
          <MdDirectionsCar size={18} />
          {fetching ? 'Fetching...' : 'Get Distance'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="md-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {fetching && (
        <div className="md-loading">
          <div className="md-loading-spinner" />
          <div className="md-loading-text">Fetching Distance Data</div>
          <div className="md-loading-subtext">
            Automating RouteStar to get map distance for {selectedCustomer?.name}...
          </div>
        </div>
      )}

      {/* Results */}
      {!fetching && results.length > 0 && (
        <div className="md-results">
          <div className="md-results-header">
            <h3>Distance Results for {lastFetchedCustomer}</h3>
            {fetchedAt && (
              <span className="md-results-meta">
                Fetched at {new Date(fetchedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="md-table-container">
            <table className="md-table">
              <thead>
                <tr>
                  <th><MdPerson size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Assigned To</th>
                  <th>Frequency</th>
                  <th><MdCalendarToday size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Date</th>
                  <th><MdLocationOn size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Customer</th>
                  <th>Day</th>
                  <th>Stop</th>
                  <th><MdStraighten size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Distance (mi.)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>{result.assignedTo || '-'}</td>
                    <td>{result.frequency || '-'}</td>
                    <td>{result.date || '-'}</td>
                    <td className="md-location-name">{result.customer || '-'}</td>
                    <td>{result.day || '-'}</td>
                    <td>{result.stop || '-'}</td>
                    <td className="md-distance">{result.distance || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State (after fetch with no results) */}
      {!fetching && lastFetchedCustomer && results.length === 0 && !error && (
        <div className="md-empty">
          <div className="md-empty-icon">
            <MdLocationOn size={48} />
          </div>
          <h3>No Distance Data Found</h3>
          <p>No map distance information was found for {lastFetchedCustomer}</p>
        </div>
      )}

      {/* Initial Empty State */}
      {!fetching && !lastFetchedCustomer && results.length === 0 && !error && (
        <div className="md-empty">
          <div className="md-empty-icon">
            <MdDirectionsCar size={48} />
          </div>
          <h3>Select a Customer</h3>
          <p>Choose a RouteStar customer from the dropdown above and click "Get Distance" to fetch their map distance information</p>
        </div>
      )}
    </div>
  );
};

export default MapDistanceTab;
