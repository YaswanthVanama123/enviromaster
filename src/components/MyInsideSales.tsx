

import React, { useState, useEffect } from 'react';
import { biginAuditApi } from '../backendservice/api/biginAuditApi';
import { useAuthContext } from './auth';
import './MyInsideSales.css';

interface InsideSalesResult {
  salespersonName: string;
  isInsideSales: boolean;
  matchCount: number;
  totalAgreementsByUser?: number;
  agreementCount?: number;
  biginIdCount?: number;
  allBiginIds?: string[];
  agreementDetails?: Array<{
    agreementId?: string;
    biginId: string | null;
    title: string;
    createdAt: string;
    createdBy?: string;
    dealName?: string;
  }>;
  matchedBiginIds?: string[];
  message?: string;
  matchDetails: Array<{
    recordId?: string;
    recordName: string;
    action: string;
    timestamp: string;
    module: string;
  }>;
}

export const MyInsideSales: React.FC = () => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<InsideSalesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const checkEligibility = async () => {
    const salespersonName = user?.fullName || user?.username;

    if (!salespersonName) {
      setError('User not logged in');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Checking inside sales for:', salespersonName);
      const response = await biginAuditApi.checkInsideSalesEligibility(salespersonName);

      if (response?.success && response.data) {
        setResult(response.data);
        setLastChecked(new Date());
      } else {
        setError('Failed to check inside sales eligibility');
      }
    } catch (err) {
      console.error('Error checking inside sales:', err);
      setError('Error checking inside sales eligibility');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, [user?.fullName, user?.username]);

  return (
    <div className="my-inside-sales">
      {}
      <div className="mis-header">
        <div className="mis-header-content">
          <h1>My Inside Sales Status</h1>
          <p className="mis-subtitle">
            View your Inside Sales eligibility based on your agreements in Lisa Rothwell's audit history
          </p>
        </div>
        <button
          className="mis-refresh-btn"
          onClick={checkEligibility}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="mis-spinner"></span>
              Checking...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-2.52-6.25" />
                <path d="M21 3v6h-6" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mis-error-card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !result && (
        <div className="mis-loading-card">
          <div className="mis-spinner-large"></div>
          <p>Checking your Inside Sales eligibility...</p>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <>
          <div className={`mis-status-card ${result.isInsideSales ? 'has-deduction' : 'no-deduction'}`}>
            <div className="mis-status-header">
              <div className="mis-status-icon">
                {result.isInsideSales ? (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </div>
              <div className="mis-status-info">
                <h2 className={result.isInsideSales ? 'status-has-deduction' : 'status-no-deduction'}>
                  {result.isInsideSales ? 'Inside Sales (3% Deduction)' : 'No Inside Sales Deduction'}
                </h2>
                <p className="mis-status-details">
                  {result.totalAgreementsByUser || 0} total agreement{(result.totalAgreementsByUser || 0) !== 1 ? 's' : ''} | {' '}
                  {result.agreementCount || 0} uploaded to Bigin | {' '}
                  {result.matchCount} found in audit
                </p>
                {result.message && (
                  <p className="mis-status-message">{result.message}</p>
                )}
                {lastChecked && (
                  <p className="mis-last-checked">Last checked: {formatDate(lastChecked.toISOString())}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mis-stats-row">
            <div className="mis-stat-card">
              <div className="mis-stat-value">{result.totalAgreementsByUser || 0}</div>
              <div className="mis-stat-label">Total Agreements</div>
            </div>
            <div className="mis-stat-card">
              <div className="mis-stat-value">{result.agreementCount || 0}</div>
              <div className="mis-stat-label">Uploaded to Bigin</div>
            </div>
            <div className="mis-stat-card">
              <div className="mis-stat-value">{result.matchCount}</div>
              <div className="mis-stat-label">Found in Lisa's Audit</div>
            </div>
          </div>

          {}
          {result.matchCount > 0 && result.matchDetails.length > 0 && (
            <div className="mis-section-card">
              <h3>Matching Audit Records</h3>
              <p className="mis-section-subtitle">
                These agreements were found in Lisa Rothwell's audit history (last 1 year)
              </p>
              <div className="mis-table-wrapper">
                <table className="mis-table">
                  <thead>
                    <tr>
                      <th>Bigin ID</th>
                      <th>Record Name</th>
                      <th>Action</th>
                      <th>Module</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matchDetails.map((match, idx) => (
                      <tr key={idx}>
                        <td className="mis-monospace">{match.recordId || '-'}</td>
                        <td>{match.recordName || '-'}</td>
                        <td>
                          <span className="mis-action-badge">{match.action}</span>
                        </td>
                        <td>{match.module || '-'}</td>
                        <td>{formatDate(match.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Agreements */}
          <div className="mis-section-card">
            <h3>Your Agreements ({result.totalAgreementsByUser || 0} total, {result.agreementCount || 0} uploaded to Bigin)</h3>
            <p className="mis-section-subtitle">
              List of your agreements and their Bigin upload status
            </p>
            {result.agreementDetails && result.agreementDetails.length > 0 ? (
              <div className="mis-table-wrapper">
                <table className="mis-table">
                  <thead>
                    <tr>
                      <th>Agreement Title</th>
                      <th>Bigin Deal ID</th>
                      <th>Deal Name</th>
                      <th>Created At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.agreementDetails.map((agreement, idx) => {
                      const hasBiginId = agreement.biginId && agreement.biginId.trim() !== '';
                      const isMatched = hasBiginId && result.matchedBiginIds?.includes(agreement.biginId!);
                      return (
                        <tr key={idx} className={isMatched ? 'row-matched' : !hasBiginId ? 'row-not-uploaded' : ''}>
                          <td>{agreement.title}</td>
                          <td className="mis-monospace">
                            {hasBiginId ? agreement.biginId : <span className="text-muted">Not uploaded</span>}
                          </td>
                          <td>{agreement.dealName || '-'}</td>
                          <td>{formatDate(agreement.createdAt)}</td>
                          <td>
                            {!hasBiginId ? (
                              <span className="mis-badge badge-pending">Not Uploaded</span>
                            ) : isMatched ? (
                              <span className="mis-badge badge-success">Found in Audit</span>
                            ) : (
                              <span className="mis-badge badge-neutral">Not in Audit</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mis-empty-message">
                No agreements found. Create agreements and upload them to Bigin to track your Inside Sales eligibility.
              </p>
            )}
          </div>

          {/* Info Card */}
          <div className="mis-info-card">
            <h4>How Inside Sales Works</h4>
            <ul>
              <li>When you create and upload agreements to Bigin, they get a Bigin Deal ID</li>
              <li>Lisa Rothwell processes these deals, creating audit records</li>
              <li>If any of your agreement's Bigin IDs appear in Lisa's audit history within the last year, you are classified as <strong>Inside Sales</strong></li>
              <li><strong>Inside Sales = 3% deduction</strong> from your commission</li>
              <li><strong>No matches = No deduction</strong> - you keep your full commission</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default MyInsideSales;
