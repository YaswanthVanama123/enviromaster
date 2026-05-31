

import React, { useState, useEffect, useMemo } from 'react';
import { companyMappingApi, CompanyMapping } from '../../../backendservice/api/companyMappingApi';
import { accountTypeApi, MapboxDetectionResult, DestinationResult } from '../../../backendservice/api/accountTypeApi';
import { getAccountTypeColor, getAccountTypeBgColor } from '../../../backendservice/types/accountType.types';
import { MdSearch, MdDirectionsCar, MdLocationOn, MdBusiness, MdSchedule } from 'react-icons/md';
import './AccountTypeDetectorTab.css';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'All Frequencies' },
  { value: '1', label: 'Weekly' },
  { value: '2', label: 'Bi-Weekly' },
  { value: '3', label: 'Monthly' },
  { value: '14', label: 'Bi-Monthly' },
  { value: '4', label: 'Quarterly' },
  { value: '5', label: 'Bi-Annual' },
  { value: '6', label: 'Annual' },
  { value: '7', label: 'One Time' },
];

interface CompanyOption {
  biginId: string;
  biginCompanyName: string;
  routeStarCustomerName: string | null;
}

export const AccountTypeDetectorTab: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<MapboxDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await companyMappingApi.getAll({ status: 'mapped', limit: 1000 });
        if (response && response.data) {
          const options: CompanyOption[] = response.data.map((m: CompanyMapping) => ({
            biginId: m.biginId,
            biginCompanyName: m.biginCompanyName,
            routeStarCustomerName: m.routeStarCustomerName
          }));
          setCompanies(options);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Failed to load companies');
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    const lower = searchTerm.toLowerCase();
    return companies.filter(
      c => c.biginCompanyName.toLowerCase().includes(lower) ||
           (c.routeStarCustomerName && c.routeStarCustomerName.toLowerCase().includes(lower))
    );
  }, [companies, searchTerm]);

  const handleDetect = async () => {
    if (!selectedCompanyId) {
      setError('Please select a company');
      return;
    }

    setDetecting(true);
    setError(null);
    setResult(null);

    try {
      const frequency = selectedFrequency ? parseInt(selectedFrequency, 10) : undefined;
      const detectionResult = await accountTypeApi.detectWithMapbox(selectedCompanyId, frequency);
      setResult(detectionResult);
      if (!detectionResult.success && detectionResult.error) {
        setError(detectionResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const selectedCompany = companies.find(c => c.biginId === selectedCompanyId);

  return (
    <div className="account-type-detector-tab">
      <div className="detector-header">
        <h2>Account Type Detector</h2>
        <p className="detector-description">
          Select a Bigin company to detect its account type based on actual driving time to nearby customers using Mapbox.
        </p>
      </div>

      <div className="detector-controls">
        <div className="company-selector">
          <label htmlFor="company-search">Select Bigin Company:</label>
          <div className="search-input-wrapper">
            <MdSearch className="search-icon" />
            <input
              type="text"
              id="company-search"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loadingCompanies}
            />
          </div>
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setResult(null);
              setError(null);
            }}
            disabled={loadingCompanies}
            size={Math.min(10, filteredCompanies.length + 1)}
          >
            <option value="">-- Select a company --</option>
            {filteredCompanies.map(company => (
              <option key={company.biginId} value={company.biginId}>
                {company.biginCompanyName}
                {company.routeStarCustomerName && ` → ${company.routeStarCustomerName}`}
              </option>
            ))}
          </select>
          {loadingCompanies && <span className="loading-text">Loading companies...</span>}
        </div>

        <div className="frequency-selector">
          <label htmlFor="frequency-select">
            <MdSchedule className="label-icon" />
            Filter by Frequency:
          </label>
          <select
            id="frequency-select"
            value={selectedFrequency}
            onChange={(e) => {
              setSelectedFrequency(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="frequency-dropdown"
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="detect-button"
          onClick={handleDetect}
          disabled={!selectedCompanyId || detecting}
        >
          {detecting ? (
            <>
              <span className="spinner"></span>
              Detecting...
            </>
          ) : (
            <>
              <MdDirectionsCar size={20} />
              Detect Account Type
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && result.success && (
        <div className="detection-result">
          <div className="result-header">
            <div className="company-info">
              <div className="info-row">
                <MdBusiness className="info-icon" />
                <div>
                  <span className="label">Bigin Company:</span>
                  <span className="value">{result.biginCompany}</span>
                </div>
              </div>
              <div className="info-row">
                <MdLocationOn className="info-icon" />
                <div>
                  <span className="label">Mapped to:</span>
                  <span className="value">{result.routeStarCustomer}</span>
                </div>
              </div>
              <div className="info-row address-row">
                <span className="label">Address:</span>
                <span className="value">{result.fromAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          {result.destinations && result.destinations.length > 0 && (
            <div className="destinations-section">
              <h4>Nearest Destinations</h4>
              <div className="destinations-table">
                <div className="table-header">
                  <span>#</span>
                  <span>Customer</span>
                  <span>Stored Distance</span>
                  <span>Mapbox Distance</span>
                  <span>Driving Time</span>
                </div>
                {result.destinations.map((dest: DestinationResult, idx: number) => (
                  <div key={idx} className={`table-row ${idx === 0 ? 'nearest' : ''}`}>
                    <span className="row-num">{idx + 1}</span>
                    <span className="dest-name">{dest.destination}</span>
                    <span>{dest.storedDistanceMiles?.toFixed(1) || '-'} mi</span>
                    <span>{dest.mapboxDistanceMiles?.toFixed(1) || '-'} mi</span>
                    <span className="driving-time">
                      {dest.drivingTimeMinutes ? (
                        <>
                          <MdDirectionsCar className="time-icon" />
                          {dest.drivingTimeMinutes.toFixed(1)} min
                        </>
                      ) : dest.error || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="account-type-result">
            <div className="result-label">Account Type:</div>
            <div
              className="account-type-badge"
              style={{
                backgroundColor: getAccountTypeBgColor(result.accountType || 'Pit'),
                color: getAccountTypeColor(result.accountType || 'Pit')
              }}
            >
              {result.accountType}
            </div>
            <div className="result-reason">
              {result.reason}
            </div>
          </div>

          {result.thresholds && (
            <div className="thresholds-info">
              <span>Thresholds: Bread5 &le; {result.thresholds.bread5MaxMinutes} min | Bread15 &le; {result.thresholds.bread15MaxMinutes} min | Pit &gt; {result.thresholds.bread15MaxMinutes} min</span>
            </div>
          )}
        </div>
      )}

      {result && !result.success && !error && (
        <div className="no-result">
          <p>{result.error || 'Could not detect account type'}</p>
          {result.biginCompany && <p>Company: {result.biginCompany}</p>}
          {result.routeStarCustomer && <p>Mapped to: {result.routeStarCustomer}</p>}
        </div>
      )}
    </div>
  );
};

export default AccountTypeDetectorTab;
